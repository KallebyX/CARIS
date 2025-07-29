import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { db } from "@/db"
import { sessions } from "@/db/schema"
import { RealtimeNotificationService } from "@/lib/realtime-notifications"

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sessions, users } from "@/db/schema"
import { getUserIdFromRequest } from "@/lib/auth"
import { eq } from "drizzle-orm"


export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }


    const { patientId, sessionDate, durationMinutes, type, notes } = body

    // Verificar se o usuário é psicólogo
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)


    if (!user[0] || user[0].role !== 'psychologist') {
      return NextResponse.json({ error: "Acesso negado. Apenas psicólogos podem criar sessões" }, { status: 403 })
    }

    const body = await req.json()
    const { patientId, scheduledAt, duration, type, notes } = body

    if (!patientId) {
      return NextResponse.json({ error: "ID do paciente é obrigatório" }, { status: 400 })
    }


    if (!sessionDate) {
      return new NextResponse("Session date is required", {
        status: 400,
      })
    }

    const [newSession] = await db.insert(sessions).values({
      psychologistId: parseInt(userId),
      patientId: parseInt(patientId),
      sessionDate: new Date(sessionDate),
      durationMinutes: durationMinutes || 50,
      type: type || 'online',
      status: 'agendada',
      notes: notes || null,
    }).returning()

    const realtimeService = RealtimeNotificationService.getInstance()
    await realtimeService.notifySessionScheduled(userId, patientId, newSession)

    return NextResponse.json(newSession)

    if (!scheduledAt) {
      return NextResponse.json({ error: "Data e hora da sessão são obrigatórias" }, { status: 400 })
    }

    const [newSession] = await db
      .insert(sessions)
      .values({
        psychologistId: userId,
        patientId: parseInt(patientId),
        scheduledAt: new Date(scheduledAt),
        duration: duration || 50, // 50 minutos por padrão
        type: type || 'therapy',
        status: 'scheduled',
        notes: notes || null,
      })
      .returning()

    // TODO: Implementar notificação em tempo real via Pusher
    // const realtimeService = RealtimeNotificationService.getInstance()
    // await realtimeService.notifySessionUpdate(newSession.id, "created", userId)

    return NextResponse.json({ success: true, data: newSession })

  } catch (error) {
    console.error("[SESSIONS_POST]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar se o usuário é psicólogo
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user[0] || user[0].role !== 'psychologist') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const psychologistSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.psychologistId, userId))
      .orderBy(sessions.scheduledAt)
      .limit(50)

    return NextResponse.json({ success: true, data: psychologistSessions })
  } catch (error) {
    console.error("[SESSIONS_GET]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}