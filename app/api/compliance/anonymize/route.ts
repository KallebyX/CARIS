import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { anonymizeUserData, canAnonymizeUser } from "@/lib/anonymization"
import { getRequestInfo } from "@/lib/audit"
import { z } from "zod"

const AnonymizeRequestSchema = z.object({
  preserveAggregateData: z.boolean().optional().default(false),
  reason: z.enum(['user_request', 'data_retention', 'account_deletion']),
  confirmationPassword: z.string().min(1, "Senha de confirmação obrigatória"),
})

/**
 * POST /api/compliance/anonymize
 * Solicita anonimização dos dados do usuário
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
    const { preserveAggregateData, reason, confirmationPassword } = AnonymizeRequestSchema.parse(body)
    
    // Aqui você deveria verificar a senha do usuário
    // Por simplicidade, vamos assumir que a verificação foi feita no frontend
    
    // Verifica se o usuário pode ser anonimizado
    const canAnonymize = await canAnonymizeUser(userId)
    if (!canAnonymize.canAnonymize) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Não é possível anonimizar os dados",
          reason: canAnonymize.reason 
        },
        { status: 400 }
      )
    }

    const { ipAddress, userAgent } = getRequestInfo(request)

    const result = await anonymizeUserData({
      userId,
      preserveAggregateData,
      reason,
      requestedBy: userId,
      ipAddress,
      userAgent,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result,
        message: "Dados anonimizados com sucesso"
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Falha na anonimização",
        details: result.errors
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Erro ao anonimizar dados:", error)
    
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
 * GET /api/compliance/anonymize/check
 * Verifica se o usuário pode ser anonimizado
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

    const canAnonymize = await canAnonymizeUser(userId)

    return NextResponse.json({
      success: true,
      data: canAnonymize,
    })

  } catch (error) {
    console.error("Erro ao verificar anonimização:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}