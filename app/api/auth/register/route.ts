import { db } from "@/db"
import { users, patientProfiles, psychologistProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse, NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { z } from "zod"

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
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsedBody = registerSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsedBody.error.issues }, { status: 400 })
    }

    const { email, password, name, role, crp, bio, psychologistId } = parsedBody.data

    // Verificar se o usuário já existe
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Criar usuário
    const [newUser] = await db.insert(users).values({
      name,
      email,
      password_hash: hashedPassword,
      role,
    }).returning()

    // Criar perfil específico baseado no role
    if (role === "psychologist") {
      await db.insert(psychologistProfiles).values({
        userId: newUser.id,
        crp: crp || null,
        bio: bio || null,
      })
    } else if (role === "patient") {
      await db.insert(patientProfiles).values({
        userId: newUser.id,
        psychologistId: psychologistId || null,
        currentCycle: "Criar",
      })
    }

    // TODO: Criar configurações padrão quando user_settings schema estiver alinhado

    // Gerar token JWT
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role }, 
      process.env.JWT_SECRET!, 
      { expiresIn: "7d" }
    )

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}