import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { revokeConsent, CONSENT_TYPES } from "@/lib/consent"
import { getRequestInfo } from "@/lib/audit"

/**
 * DELETE /api/compliance/consents/[type]
 * Revoga um consentimento específico
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      )
    }

    const consentType = params.type
    if (!Object.values(CONSENT_TYPES).includes(consentType as any)) {
      return NextResponse.json(
        { success: false, error: "Tipo de consentimento inválido" },
        { status: 400 }
      )
    }

    const { ipAddress, userAgent } = getRequestInfo(request)
    
    await revokeConsent(userId, consentType, ipAddress, userAgent)

    return NextResponse.json({
      success: true,
      message: "Consentimento revogado com sucesso"
    })

  } catch (error) {
    console.error("Erro ao revogar consentimento:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}