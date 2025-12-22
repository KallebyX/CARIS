import { db } from "@/db"
import { sessions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse, NextRequest } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"

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

    // Verificar se a sessão pode ser iniciada
    if (session.status !== 'confirmada') {
      return NextResponse.json({ 
        error: "Session cannot be started", 
        details: `Session status is ${session.status}` 
      }, { status: 400 })
    }

    // Verificar se é uma sessão online
    if (session.type !== 'online') {
      return NextResponse.json({ 
        error: "Only online sessions can be started through video call" 
      }, { status: 400 })
    }

    // Verificar horário (pode iniciar até 15 min antes e 5 min depois)
    const sessionDate = new Date(session.scheduledAt)
    const now = new Date()
    const timeDiff = sessionDate.getTime() - now.getTime()
    const minutesDiff = timeDiff / (1000 * 60)

    if (minutesDiff > 15 || minutesDiff < -5) {
      return NextResponse.json({ 
        error: "Session can only be started 15 minutes before or 5 minutes after scheduled time" 
      }, { status: 400 })
    }

    // Atualizar status da sessão para "em_andamento"
    await db
      .update(sessions)
      .set({ 
        status: 'em_andamento'
      })
      .where(eq(sessions.id, sessionId))

    return NextResponse.json({ 
      success: true, 
      message: "Session started successfully",
      sessionId: sessionId
    })

  } catch (error) {
    console.error('Error starting session:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}