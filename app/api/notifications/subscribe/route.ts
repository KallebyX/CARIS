import { NextResponse } from "next/server"
import { db } from "@/db"
import { userSettings } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { subscription } = await request.json()

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Subscription inválida" }, { status: 400 })
    }

    // Salvar/atualizar a subscription no banco
    await db
      .update(userSettings)
      .set({
        pushSubscription: JSON.stringify(subscription),
        pushNotifications: true,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))

    return NextResponse.json({ message: "Subscription salva com sucesso" })
  } catch (error) {
    console.error("Erro ao salvar subscription:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
