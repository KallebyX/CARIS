import { db } from "@/db"
import { users, patientProfiles, psychologistProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse, NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { z } from "zod"
import { initializePrivacySettings, recordConsent, CONSENT_TYPES, LEGAL_BASIS } from "@/lib/consent"
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES, getRequestInfo } from "@/lib/audit"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["patient", "psychologist"]),
  // Campos específicos para psicólogos
  crp: z.string().optional(),
  bio: z.string().optional(),
  // Campos específicos para pacientes  
  psychologistId: z.number().optional(),
  // Consentimentos obrigatórios
  dataProcessingConsent: z.boolean().refine(val => val === true, {
    message: "Consentimento para processamento de dados é obrigatório"
  }),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "Aceitação dos termos de uso é obrigatória"
  }),
  // Consentimentos opcionais
  marketingConsent: z.boolean().optional().default(false),
  analyticsConsent: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsedBody = registerSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsedBody.error.issues }, { status: 400 })
    }

    const { 
      email, 
      password, 
      name, 
      role, 
      crp, 
      bio, 
      psychologistId,
      dataProcessingConsent,
      termsAccepted,
      marketingConsent,
      analyticsConsent 
    } = parsedBody.data

    // Verificar se o usuário já existe
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)
    const { ipAddress, userAgent } = getRequestInfo(request)

    // Criar usuário
    const [newUser] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role,
    }).returning()

    // Log de criação do usuário
    await logAuditEvent({
      userId: newUser.id,
      action: AUDIT_ACTIONS.CREATE,
      resourceType: AUDIT_RESOURCES.USER,
      resourceId: newUser.id.toString(),
      metadata: {
        role,
        registrationMethod: 'web_form',
      },
      ipAddress,
      userAgent,
    })

    // Criar perfil específico baseado no role
    if (role === "psychologist") {
      await db.insert(psychologistProfiles).values({
        userId: newUser.id,
        crp: crp || null,
        bio: bio || null,
      })

      await logAuditEvent({
        userId: newUser.id,
        action: AUDIT_ACTIONS.CREATE,
        resourceType: AUDIT_RESOURCES.PSYCHOLOGIST_PROFILE,
        resourceId: newUser.id.toString(),
        metadata: { crp: !!crp, bio: !!bio },
        ipAddress,
        userAgent,
      })
    } else if (role === "patient") {
      await db.insert(patientProfiles).values({
        userId: newUser.id,
        psychologistId: psychologistId || null,
        currentCycle: "Criar",
      })

      await logAuditEvent({
        userId: newUser.id,
        action: AUDIT_ACTIONS.CREATE,
        resourceType: AUDIT_RESOURCES.PATIENT_PROFILE,
        resourceId: newUser.id.toString(),
        metadata: { assignedPsychologist: !!psychologistId },
        ipAddress,
        userAgent,
      })
    }

    // Inicializar configurações de privacidade
    await initializePrivacySettings(newUser.id)

    // Registrar consentimentos obrigatórios
    await recordConsent({
      userId: newUser.id,
      consentType: CONSENT_TYPES.DATA_PROCESSING,
      consentGiven: dataProcessingConsent,
      purpose: 'Funcionamento básico da plataforma de saúde mental',
      legalBasis: LEGAL_BASIS.CONSENT,
      version: '1.0',
      ipAddress,
      userAgent,
    })

    // Registrar consentimentos opcionais se fornecidos
    if (marketingConsent !== undefined) {
      await recordConsent({
        userId: newUser.id,
        consentType: CONSENT_TYPES.MARKETING,
        consentGiven: marketingConsent,
        purpose: 'Envio de comunicações de marketing e novidades da plataforma',
        legalBasis: LEGAL_BASIS.CONSENT,
        version: '1.0',
        ipAddress,
        userAgent,
      })
    }

    if (analyticsConsent !== undefined) {
      await recordConsent({
        userId: newUser.id,
        consentType: CONSENT_TYPES.ANALYTICS,
        consentGiven: analyticsConsent,
        purpose: 'Análise de uso da plataforma para melhorias',
        legalBasis: LEGAL_BASIS.LEGITIMATE_INTERESTS,
        version: '1.0',
        ipAddress,
        userAgent,
      })
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role }, 
      process.env.JWT_SECRET!, 
      { expiresIn: "7d" }
    )

    // Log de login após registro
    await logAuditEvent({
      userId: newUser.id,
      action: AUDIT_ACTIONS.LOGIN,
      resourceType: AUDIT_RESOURCES.USER,
      resourceId: newUser.id.toString(),
      metadata: {
        loginMethod: 'registration',
        sessionDuration: '7d',
      },
      ipAddress,
      userAgent,
    })

    const response = NextResponse.json({
      message: "User created successfully",
      user: { 
        id: newUser.id, 
        name: newUser.name, 
        email: newUser.email, 
        role: newUser.role 
      },
    })

    // Definir cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error("Registration error:", error)
    
    // Log de erro no registro
    const { ipAddress, userAgent } = getRequestInfo(request)
    await logAuditEvent({
      action: 'registration_failed',
      resourceType: AUDIT_RESOURCES.USER,
      severity: 'critical',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}