import { db } from "@/db"
import { users, patientProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse, NextRequest } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { z } from "zod"

const sosActivationSchema = z.object({
  userId: z.number(),
  helpType: z.enum(['immediate', 'urgent', 'support']),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  timestamp: z.string(),
  description: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const requesterId = await getUserIdFromRequest(request)

    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = sosActivationSchema.parse(body)

    const { userId, helpType, location, timestamp, description } = validatedData

    // Verificar se o usuário logado pode ativar SOS para este userId
    if (requesterId !== userId) {
      return NextResponse.json({ error: "Cannot activate SOS for another user" }, { status: 403 })
    }

    // Buscar informações do usuário
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Buscar perfil do paciente para obter psicólogo
    const patientProfile = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, userId),
    })

    // Criar registro de SOS (você pode criar uma tabela específica para isso)
    const sosAlert = {
      id: Date.now(), // Em produção, use um UUID
      userId,
      helpType,
      location,
      timestamp: new Date(timestamp),
      description,
      status: 'active',
      createdAt: new Date()
    }

    // Enviar notificações baseadas no tipo de ajuda
    const notifications = []

    if (helpType === 'immediate') {
      // Notificação de emergência imediata
      notifications.push({
        type: 'emergency',
        priority: 'critical',
        message: `EMERGÊNCIA: ${user.name} ativou SOS imediato`,
        recipients: ['emergency_team', 'primary_psychologist']
      })

      // Integração com serviços de emergência se necessário
      await notifyEmergencyServices(sosAlert)
    }

    if (helpType === 'urgent') {
      // Notificação urgente para psicólogo
      notifications.push({
        type: 'urgent',
        priority: 'high',
        message: `URGENTE: ${user.name} precisa de ajuda urgente`,
        recipients: ['primary_psychologist', 'support_team']
      })
    }

    if (helpType === 'support') {
      // Notificação de apoio emocional
      notifications.push({
        type: 'support',
        priority: 'medium',
        message: `${user.name} solicita apoio emocional`,
        recipients: ['primary_psychologist', 'chat_support']
      })
    }

    // Enviar notificações
    for (const notification of notifications) {
      await sendNotification(notification, sosAlert)
    }

    // Log de auditoria
    console.log(`SOS ativado: User ${userId}, Type: ${helpType}, Time: ${timestamp}`)

    return NextResponse.json({
      success: true,
      message: "SOS activated successfully",
      alertId: sosAlert.id,
      estimatedResponseTime: getEstimatedResponseTime(helpType),
      nextSteps: getNextSteps(helpType)
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid input", 
        issues: error.issues 
      }, { status: 422 })
    }

    console.error('Error activating SOS:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function notifyEmergencyServices(sosAlert: any) {
  // Integração com serviços de emergência
  console.log('Notifying emergency services:', sosAlert)
  
  // Aqui você pode integrar com:
  // - APIs de serviços de emergência
  // - Sistemas de geolocalização
  // - Centrais de atendimento
}

async function sendNotification(notification: any, sosAlert: any) {
  console.log('Sending notification:', notification)
  
  // Aqui você pode integrar com:
  // - Pusher para notificações em tempo real
  // - Email (Resend/SendGrid)
  // - SMS (Twilio)
  // - WhatsApp Business API
  // - Push notifications
  
  try {
    // Exemplo com Pusher
    if (process.env.PUSHER_APP_ID) {
      const pusher = require('pusher')
      const pusherInstance = new pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        useTLS: true
      })

      await pusherInstance.trigger('sos-alerts', 'new-sos', {
        ...sosAlert,
        notification
      })
    }
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

function getEstimatedResponseTime(helpType: string): string {
  switch (helpType) {
    case 'immediate':
      return '2-5 minutos'
    case 'urgent':
      return '10-15 minutos'
    case 'support':
      return '15-30 minutos'
    default:
      return '15 minutos'
  }
}

function getNextSteps(helpType: string): string[] {
  const commonSteps = [
    'Mantenha-se em local seguro',
    'Seu pedido foi enviado para nossa equipe',
    'Você pode usar as técnicas de respiração enquanto aguarda'
  ]

  switch (helpType) {
    case 'immediate':
      return [
        'Se é uma emergência médica, ligue também para o SAMU (192)',
        ...commonSteps,
        'Um especialista entrará em contato em até 5 minutos'
      ]
    case 'urgent':
      return [
        ...commonSteps,
        'Um psicólogo de plantão será notificado',
        'Considere usar as técnicas de apoio disponíveis'
      ]
    case 'support':
      return [
        ...commonSteps,
        'Você será direcionado para um chat de apoio',
        'Explore os recursos de autoajuda disponíveis'
      ]
    default:
      return commonSteps
  }
}