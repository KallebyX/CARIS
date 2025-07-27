import { NextResponse } from "next/server"
import { db } from "@/db"
import { sessions } from "@/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"
import { z } from "zod"

// Schema para validação dos parâmetros de disponibilidade
const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  duration: z.string().optional().default("50"),
})

// Horários padrão de trabalho (pode ser configurável por psicólogo no futuro)
const WORK_HOURS = {
  start: 8, // 8:00
  end: 18, // 18:00
  lunchStart: 12, // 12:00
  lunchEnd: 13, // 13:00
}

/**
 * GET /api/psychologist/availability
 * Retorna horários disponíveis para agendamento
 */
export async function GET(request: Request) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const { date, duration } = availabilitySchema.parse({
      date: searchParams.get("date"),
      duration: searchParams.get("duration"),
    })

    const durationMinutes = Number.parseInt(duration)
    const targetDate = new Date(date)

    // Verificar se a data não é no passado
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (targetDate < today) {
      return NextResponse.json({ error: "Não é possível agendar para datas passadas" }, { status: 400 })
    }

    // Buscar sessões existentes para o dia
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const existingSessions = await db
      .select({
        sessionDate: sessions.sessionDate,
        durationMinutes: sessions.durationMinutes,
        status: sessions.status,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.psychologistId, psychologistId),
          gte(sessions.sessionDate, startOfDay),
          lte(sessions.sessionDate, endOfDay),
          // Considerar apenas sessões confirmadas e agendadas
          // (canceladas não bloqueiam horário)
        ),
      )

    // Filtrar apenas sessões que não foram canceladas
    const activeSessions = existingSessions.filter((session) => session.status !== "cancelada")

    // Gerar slots de horário disponíveis
    const availableSlots: string[] = []

    for (let hour = WORK_HOURS.start; hour < WORK_HOURS.end; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Slots de 30 em 30 minutos
        // Pular horário de almoço
        if (hour >= WORK_HOURS.lunchStart && hour < WORK_HOURS.lunchEnd) {
          continue
        }

        const slotStart = new Date(targetDate)
        slotStart.setHours(hour, minute, 0, 0)

        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000)

        // Verificar se o slot não ultrapassa o horário de trabalho
        if (
          slotEnd.getHours() > WORK_HOURS.end ||
          (slotEnd.getHours() === WORK_HOURS.end && slotEnd.getMinutes() > 0)
        ) {
          continue
        }

        // Verificar se não conflita com sessões existentes
        const hasConflict = activeSessions.some((session) => {
          const sessionStart = new Date(session.sessionDate)
          const sessionEnd = new Date(sessionStart.getTime() + session.durationMinutes * 60000)

          return (
            (slotStart >= sessionStart && slotStart < sessionEnd) ||
            (slotEnd > sessionStart && slotEnd <= sessionEnd) ||
            (slotStart <= sessionStart && slotEnd >= sessionEnd)
          )
        })

        if (!hasConflict) {
          availableSlots.push(
            slotStart.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          )
        }
      }
    }

    return NextResponse.json({
      date,
      duration: durationMinutes,
      availableSlots,
      existingSessions: activeSessions.map((session) => ({
        time: new Date(session.sessionDate).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        duration: session.durationMinutes,
        status: session.status,
      })),
    })
  } catch (error) {
    console.error("Erro ao buscar disponibilidade:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
