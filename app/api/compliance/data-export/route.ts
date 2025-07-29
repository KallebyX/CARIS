import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { requestDataExport, getUserExports } from "@/lib/data-export"
import { getRequestInfo } from "@/lib/audit"
import { z } from "zod"

const ExportRequestSchema = z.object({
  format: z.enum(['json', 'csv']),
})

/**
 * POST /api/compliance/data-export
 * Solicita exportação de dados do usuário
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
    const { format } = ExportRequestSchema.parse(body)
    const { ipAddress, userAgent } = getRequestInfo(request)

    const exportRecord = await requestDataExport({
      userId,
      format,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      data: exportRecord,
      message: "Solicitação de exportação criada com sucesso. Você será notificado quando estiver pronta."
    })

  } catch (error) {
    console.error("Erro ao solicitar exportação:", error)
    
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
      { success: false, error: error instanceof Error ? error.message : "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/compliance/data-export
 * Lista exportações do usuário
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

    const exports = await getUserExports(userId)

    return NextResponse.json({
      success: true,
      data: exports,
    })

  } catch (error) {
    console.error("Erro ao buscar exportações:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}