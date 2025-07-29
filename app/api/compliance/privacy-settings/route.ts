import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { getPrivacySettings, updatePrivacySettings } from "@/lib/consent"
import { getRequestInfo } from "@/lib/audit"
import { z } from "zod"

const PrivacySettingsSchema = z.object({
  dataProcessingConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  analyticsConsent: z.boolean().optional(),
  shareDataWithPsychologist: z.boolean().optional(),
  allowDataExport: z.boolean().optional(),
  anonymizeAfterDeletion: z.boolean().optional(),
  dataRetentionPreference: z.number().min(30).max(3650).optional(), // 30 dias a 10 anos
  notificationPreferences: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
    complianceUpdates: z.boolean().optional(),
  }).optional(),
})

/**
 * GET /api/compliance/privacy-settings
 * Obtém configurações de privacidade do usuário
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

    const settings = await getPrivacySettings(userId)

    return NextResponse.json({
      success: true,
      data: settings || {
        // Configurações padrão se não existirem
        dataProcessingConsent: false,
        marketingConsent: false,
        analyticsConsent: false,
        shareDataWithPsychologist: true,
        allowDataExport: true,
        anonymizeAfterDeletion: true,
        dataRetentionPreference: 2555, // 7 anos
        notificationPreferences: {
          email: true,
          sms: false,
          push: true,
          complianceUpdates: true,
        }
      }
    })

  } catch (error) {
    console.error("Erro ao buscar configurações de privacidade:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/compliance/privacy-settings
 * Atualiza configurações de privacidade do usuário
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = PrivacySettingsSchema.parse(body)
    const { ipAddress, userAgent } = getRequestInfo(request)

    // Converte notificationPreferences para JSON string se fornecido
    const updateData = {
      ...validatedData,
      notificationPreferences: validatedData.notificationPreferences 
        ? JSON.stringify(validatedData.notificationPreferences)
        : undefined
    }

    const updatedSettings = await updatePrivacySettings(
      userId, 
      updateData,
      ipAddress,
      userAgent
    )

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: "Configurações de privacidade atualizadas com sucesso"
    })

  } catch (error) {
    console.error("Erro ao atualizar configurações de privacidade:", error)
    
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