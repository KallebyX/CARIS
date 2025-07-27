import { NextResponse } from "next/server"
import { db } from "@/db"
import { sessions, users, patientProfiles } from "@/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"
import { z } from "zod"

// Schema para validação da atualização de sessão
const updateSessionSchema = z.object({
  sessionDate: z.string().datetime("Data da sessão deve estar no formato ISO").optional(),
  durationMinutes: z
    .number()
    .min(15, "Duração mínima é 15 minutos")
    .max(180, "Duração máxima é 180 minutos")
    .optional(),
  type: z.enum(["online", "presencial"], { message: "Tipo deve ser 'online' ou 'presencial'" }).optional(),
  status: z.enum(["agendada", "confirmada", "realizada", "cancelada"]).optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/psychologist/sessions/[id]
 * Busca uma sessão específica
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const sessionId = Number.parseInt(params.id)
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "ID da sessão inválido" }, { status: 400 })
    }

    const sessionData = await db
      .select({
        id: sessions.id,
        sessionDate: sessions.sessionDate,
        durationMinutes: sessions.durationMinutes,
        type: sessions.type,
        status: sessions.status,
        notes: sessions.notes,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        patient: {
          id: users.id,
          name: users.name,
          email: users.email,
          currentCycle: patientProfiles.currentCycle,
        },
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.patientId, users.id))
      .leftJoin(patientProfiles, eq(users.id, patientProfiles.userId))
      .where(and(eq(sessions.id, sessionId), eq(sessions.psychologistId, psychologistId)))
      .limit(1)

    if (sessionData.length === 0) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    }

    return NextResponse.json(sessionData[0])
  } catch (error) {
    console.error("Erro ao buscar sessão:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

/**
 * PUT /api/psychologist/sessions/[id]
 * Atualiza uma sessão específica
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const sessionId = Number.parseInt(params.id)
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "ID da sessão inválido" }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateSessionSchema.parse(body)

    // Verificar se a sessão existe e pertence ao psicólogo
    const existingSession = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.psychologistId, psychologistId)))
      .limit(1)

    if (existingSession.length === 0) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    }

    const currentSession = existingSession[0]

    // Verificar se a sessão já foi realizada (proteção)
    if (currentSession.status === "realizada" && validatedData.status !== "realizada") {
      return NextResponse.json(
        {
          error: "Não é possível alterar o status de uma sessão já realizada",
        },
        { status: 400 },
      )
    }

    // Se está alterando data/horário, verificar conflitos
    if (validatedData.sessionDate || validatedData.durationMinutes) {
      const newDate = validatedData.sessionDate ? new Date(validatedData.sessionDate) : currentSession.sessionDate
      const newDuration = validatedData.durationMinutes || currentSession.durationMinutes
      const newEndTime = new Date(newDate.getTime() + newDuration * 60000)

      // Buscar sessões conflitantes (excluindo a sessão atual)
      const conflictingSessions = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.psychologistId, psychologistId),
            gte(sessions.sessionDate, new Date(newDate.getTime() - 3 * 60 * 60 * 1000)), // 3 horas antes
            lte(sessions.sessionDate, new Date(newEndTime.getTime() + 3 * 60 * 60 * 1000)), // 3 horas depois
            eq(sessions.status, "confirmada"),
            // Excluir a sessão atual da verificação
            // Note: Drizzle doesn't have a direct "not equal" operator, so we'll handle this in the application logic
          ),
        )

      const hasConflict = conflictingSessions.some((session) => {
        if (session.id === sessionId) return false // Ignorar a sessão atual

        const sessionStart = new Date(session.sessionDate)
        const sessionEnd = new Date(sessionStart.getTime() + session.durationMinutes * 60000)

        return (
          (newDate >= sessionStart && newDate < sessionEnd) ||
          (newEndTime > sessionStart && newEndTime <= sessionEnd) ||
          (newDate <= sessionStart && newEndTime >= sessionEnd)
        )
      })

      if (hasConflict) {
        return NextResponse.json(
          {
            error: "Conflito de horário com outra sessão confirmada",
          },
          { status: 409 },
        )
      }
    }

    // Preparar dados para atualização
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (validatedData.sessionDate) {
      updateData.sessionDate = new Date(validatedData.sessionDate)
    }
    if (validatedData.durationMinutes) {
      updateData.durationMinutes = validatedData.durationMinutes
    }
    if (validatedData.type) {
      updateData.type = validatedData.type
    }
    if (validatedData.status) {
      updateData.status = validatedData.status
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    // Atualizar a sessão
    const [updatedSession] = await db.update(sessions).set(updateData).where(eq(sessions.id, sessionId)).returning()

    // Buscar dados completos da sessão atualizada
    const sessionWithPatient = await db
      .select({
        id: sessions.id,
        sessionDate: sessions.sessionDate,
        durationMinutes: sessions.durationMinutes,
        type: sessions.type,
        status: sessions.status,
        notes: sessions.notes,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        patient: {
          id: users.id,
          name: users.name,
          email: users.email,
          currentCycle: patientProfiles.currentCycle,
        },
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.patientId, users.id))
      .leftJoin(patientProfiles, eq(users.id, patientProfiles.userId))
      .where(eq(sessions.id, sessionId))
      .limit(1)

    return NextResponse.json(sessionWithPatient[0])
  } catch (error) {
    console.error("Erro ao atualizar sessão:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

/**
 * DELETE /api/psychologist/sessions/[id]
 * Remove uma sessão específica
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const sessionId = Number.parseInt(params.id)
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "ID da sessão inválido" }, { status: 400 })
    }

    // Verificar se a sessão existe e pertence ao psicólogo
    const existingSession = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.psychologistId, psychologistId)))
      .limit(1)

    if (existingSession.length === 0) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    }

    const currentSession = existingSession[0]

    // Verificar se a sessão já foi realizada (proteção)
    if (currentSession.status === "realizada") {
      return NextResponse.json(
        {
          error: "Não é possível deletar uma sessão já realizada",
        },
        { status: 400 },
      )
    }

    // Deletar a sessão
    await db.delete(sessions).where(eq(sessions.id, sessionId))

    return NextResponse.json({ message: "Sessão deletada com sucesso" })
  } catch (error) {
    console.error("Erro ao deletar sessão:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
