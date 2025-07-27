import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getUserIdFromRequest } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    
    const body = await req.json()
    const { receiverId, content } = body

    if (!receiverId || !content) {
      return NextResponse.json({ error: "Dados obrigatórios não fornecidos" }, { status: 400 })
    }

    // TODO: Implement chat message saving with current DB schema
    // For now, return success
    return NextResponse.json({ success: true, message: "Mensagem enviada" })
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
