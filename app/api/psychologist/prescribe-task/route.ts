import { NextResponse, NextRequest } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { z } from "zod"

const prescribeTaskSchema = z.object({
  taskId: z.string(),
  patientId: z.number(),
  notes: z.string().optional(),
  dueDate: z.string().nullable().optional()
})

export async function POST(request: NextRequest) {
  try {
    const psychologistId = await getUserIdFromRequest(request)

    if (!psychologistId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = prescribeTaskSchema.parse(body)

    const { taskId, patientId, notes, dueDate } = validatedData

    // Verificar se o psicólogo tem permissão para prescrever para este paciente
    // (você pode implementar verificação de relacionamento terapeuta-paciente)

    // Criar registro de tarefa prescrita
    const prescribedTask = {
      id: `task_${Date.now()}`, // Em produção, use UUID
      taskId,
      patientId,
      psychologistId,
      prescribedAt: new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending',
      notes: notes || null,
      createdAt: new Date()
    }

    // Aqui você salvaria no banco de dados
    // await db.insert(prescribedTasks).values(prescribedTask)

    // Enviar notificação para o paciente
    await notifyPatient(patientId, taskId, notes)

    // Log de auditoria
    console.log(`Tarefa prescrita: ${taskId} para paciente ${patientId} por psicólogo ${psychologistId}`)

    return NextResponse.json({
      success: true,
      message: "Task prescribed successfully",
      prescribedTask
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid input", 
        issues: error.issues 
      }, { status: 422 })
    }

    console.error('Error prescribing task:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function notifyPatient(patientId: number, taskId: string, notes?: string) {
  try {
    // Notificar via Pusher
    if (process.env.PUSHER_APP_ID) {
      const pusher = require('pusher')
      const pusherInstance = new pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        useTLS: true
      })

      await pusherInstance.trigger(`patient-${patientId}`, 'task-prescribed', {
        taskId,
        notes,
        timestamp: new Date().toISOString()
      })
    }

    // Aqui você pode adicionar outros tipos de notificação:
    // - Email via Resend
    // - Push notification
    // - SMS via Twilio
    
  } catch (error) {
    console.error('Error notifying patient:', error)
  }
}