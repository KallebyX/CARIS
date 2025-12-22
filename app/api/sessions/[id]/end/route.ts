import { db } from "@/db"
import { sessions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse, NextRequest } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { z } from "zod"

const endSessionSchema = z.object({
  notes: z.string().optional(),
  recordingUrl: z.string().url().optional(),
})

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const sessionId = parseInt(id)
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = endSessionSchema.parse(body)

    // Buscar a sessão
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Verificar se o usuário tem permissão (é o paciente ou psicólogo da sessão)
    if (session.patientId !== userId && session.psychologistId !== userId) {
      return NextResponse.json({ error: "Not authorized for this session" }, { status: 403 })
    }

    // Verificar se a sessão está em andamento
    if (session.status !== 'em_andamento') {
      return NextResponse.json({ 
        error: "Session is not in progress", 
        details: `Session status is ${session.status}` 
      }, { status: 400 })
    }

    // Calcular duração real da sessão
    const sessionStart = new Date(session.scheduledAt)
    const sessionEnd = new Date()
    const actualDurationMinutes = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60))

    // Atualizar sessão como realizada
    const updatedSession = await db
      .update(sessions)
      .set({ 
        status: 'realizada',
        notes: validatedData.notes || session.notes,
        // Você pode adicionar campos como:
        // actualDuration: actualDurationMinutes,
        // recordingUrl: validatedData.recordingUrl,
        // endedAt: sessionEnd,
      })
      .where(eq(sessions.id, sessionId))
      .returning()

    // Aqui você pode adicionar lógica adicional como:
    // - Salvar gravação da sessão
    // - Enviar notificações
    // - Atualizar estatísticas do usuário
    // - Criar relatório da sessão

    return NextResponse.json({ 
      success: true, 
      message: "Session ended successfully",
      session: updatedSession[0],
      actualDuration: actualDurationMinutes
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid input", 
        issues: error.issues 
      }, { status: 422 })
    }

    console.error('Error ending session:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}