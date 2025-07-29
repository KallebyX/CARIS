import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { 
  recordConsent, 
  getUserConsents, 
  revokeConsent,
  CONSENT_TYPES,
  LEGAL_BASIS 
} from "@/lib/consent"
import { getRequestInfo } from "@/lib/audit"
import { z } from "zod"

const ConsentSchema = z.object({
  consentType: z.enum([
    'data_processing',
    'marketing', 
    'analytics',
    'research',
    'share_with_psychologist',
    'ai_analysis',
    'session_recording',
    'emergency_contact'
  ]),
  consentGiven: z.boolean(),
  purpose: z.string().min(1, "Finalidade é obrigatória"),
  legalBasis: z.enum(['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests']),
  version: z.string().optional(),
  dataRetentionPeriod: z.number().optional(),
})

/**
 * POST /api/compliance/consents
 * Registra um novo consentimento
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = ConsentSchema.parse(body)
    const { ipAddress, userAgent } = getRequestInfo(request)

    const consent = await recordConsent({
      userId,
      ...validatedData,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      data: consent,
      message: "Consentimento registrado com sucesso"
    })

  } catch (error) {
    console.error("Erro ao registrar consentimento:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Dados inválidos",
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/compliance/consents
 * Obtém todos os consentimentos do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      )
    }

    const consents = await getUserConsents(userId)

    // Agrupa consentimentos por tipo (mostra apenas o mais recente de cada tipo)
    const groupedConsents = consents.reduce((acc, consent) => {
      const existing = acc[consent.consentType]
      if (!existing || new Date(consent.consentDate) > new Date(existing.consentDate)) {
        acc[consent.consentType] = consent
      }
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      data: {
        currentConsents: Object.values(groupedConsents),
        allConsents: consents,
        availableTypes: Object.values(CONSENT_TYPES),
        legalBasisOptions: Object.values(LEGAL_BASIS),
      }
    })

  } catch (error) {
    console.error("Erro ao buscar consentimentos:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}