import { NextResponse, NextRequest } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { z } from "zod"

const sosDeactivationSchema = z.object({
  userId: z.number(),
  reason: z.enum(['resolved', 'false_alarm', 'cancelled']).optional(),
  feedback: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const requesterId = await getUserIdFromRequest(request)

    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = sosDeactivationSchema.parse(body)

    const { userId, reason = 'cancelled', feedback } = validatedData

    // Verificar se o usuário logado pode desativar SOS para este userId
    if (requesterId !== userId) {
      return NextResponse.json({ error: "Cannot deactivate SOS for another user" }, { status: 403 })
    }

    // Aqui você registraria a desativação no banco
    const deactivationRecord = {
      userId,
      deactivatedAt: new Date(),
      reason,
      feedback,
      deactivatedBy: requesterId
    }

    // Notificar equipe sobre desativação
    await notifyDeactivation(deactivationRecord)

    // Log de auditoria
    console.log(`SOS desativado: User ${userId}, Reason: ${reason}, Time: ${new Date().toISOString()}`)

    return NextResponse.json({
      success: true,
      message: "SOS deactivated successfully",
      reason,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid input", 
        issues: error.issues 
      }, { status: 422 })
    }

    console.error('Error deactivating SOS:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function notifyDeactivation(deactivationRecord: any) {
  console.log('SOS deactivated:', deactivationRecord)
  
  // Notificar equipe sobre desativação via Pusher
  try {
    if (process.env.PUSHER_APP_ID) {
      const pusher = require('pusher')
      const pusherInstance = new pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        useTLS: true
      })

      await pusherInstance.trigger('sos-alerts', 'sos-deactivated', deactivationRecord)
    }
  } catch (error) {
    console.error('Error notifying deactivation:', error)
  }
}