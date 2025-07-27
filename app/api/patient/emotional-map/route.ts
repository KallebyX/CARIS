import { NextResponse } from "next/server"
import { db } from "@/db"
import { diaryEntries } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: Request) {
  const patientId = await getUserIdFromRequest(request)
  if (!patientId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const emotionalDataRaw = await db.query.diaryEntries.findMany({
      where: eq(diaryEntries.patientId, patientId),
      orderBy: (diaryEntries, { asc }) => [asc(diaryEntries.entryDate)],
      limit: 30,
    })

    const emotionalMapData = emotionalDataRaw.map((entry) => ({
      date: new Date(entry.entryDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      // Escala a avaliação de humor de 0-4 para 0-10 para o gráfico
      humor: (entry.moodRating ?? 0) * 2.5,
      intensidade: entry.intensityRating,
      evento: entry.content?.substring(0, 30) + "...",
    }))

    return NextResponse.json(emotionalMapData)
  } catch (error) {
    console.error(`Erro ao buscar dados do mapa emocional para o paciente ${patientId}:`, error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
