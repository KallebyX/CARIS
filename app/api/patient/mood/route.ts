import { NextResponse } from "next/server"
import { db } from "@/db"
import { moodTracking } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "30")

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const moodData = await db.query.moodTracking.findMany({
      where: and(
        eq(moodTracking.patientId, userId),
        // gte(moodTracking.date, startDate.toISOString().split('T')[0])
      ),
      orderBy: [desc(moodTracking.date)],
      limit: days,
    })

    return NextResponse.json(moodData)
  } catch (error) {
    console.error("Erro ao buscar dados de humor:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { mood, energy, anxiety, notes, date } = await request.json()

    if (!mood || !energy || !anxiety || !date) {
      return NextResponse.json({ error: "Humor, energia, ansiedade e data são obrigatórios" }, { status: 400 })
    }

    // Verificar se já existe registro para esta data
    const existingRecord = await db.query.moodTracking.findFirst({
      where: and(eq(moodTracking.patientId, userId), eq(moodTracking.date, date)),
    })

    let result
    if (existingRecord) {
      // Atualizar registro existente
      ;[result] = await db
        .update(moodTracking)
        .set({ mood, energy, anxiety, notes })
        .where(and(eq(moodTracking.patientId, userId), eq(moodTracking.date, date)))
        .returning()
    } else {
      // Criar novo registro
      ;[result] = await db
        .insert(moodTracking)
        .values({
          patientId: userId,
          mood,
          energy,
          anxiety,
          notes,
          date,
        })
        .returning()
    }

    return NextResponse.json(result, { status: existingRecord ? 200 : 201 })
  } catch (error) {
    console.error("Erro ao salvar dados de humor:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
