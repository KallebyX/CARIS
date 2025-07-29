import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getUserIdFromRequest } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    
    const body = await req.json()
    const { patientId, startTime, endTime, notes } = body

    if (!patientId) {
      return NextResponse.json({ error: "ID do paciente é obrigatório" }, { status: 400 })
    }

    if (!startTime || !endTime) {
      return NextResponse.json({ error: "Horários de início e fim são obrigatórios" }, { status: 400 })
    }

    // TODO: Implement session creation with current DB schema
    // For now, return success
    return NextResponse.json({ success: true, message: "Sessão criada" })
  } catch (error) {
    console.error("Erro ao criar sessão:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // TODO: Implement session retrieval for psychologist
    // For now, return empty array
    return NextResponse.json({ success: true, data: [] })
  } catch (error) {
    console.error("[SESSIONS_GET]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}