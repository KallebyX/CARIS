import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { alertConfigurations, generatedAlerts } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") // 'configurations' ou 'alerts'

  try {
    if (type === "configurations") {
      const configurations = await db.query.alertConfigurations.findMany({
        where: eq(alertConfigurations.psychologistId, psychologistId),
        orderBy: (configs, { asc }) => [asc(configs.alertType)],
      })

      return NextResponse.json({ success: true, data: configurations })
    } else {
      // Buscar alertas gerados
      const alerts = await db.query.generatedAlerts.findMany({
        where: eq(generatedAlerts.psychologistId, psychologistId),
        with: {
          patient: {
            columns: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: (alerts, { desc }) => [desc(alerts.createdAt)],
      })

      return NextResponse.json({ success: true, data: alerts })
    }
  } catch (error) {
    console.error("Erro ao buscar alertas:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, ...data } = body

    if (action === "create_configuration") {
      const { alertType, threshold, frequency, notificationMethod, isEnabled } = data

      if (!alertType || !frequency || !notificationMethod) {
        return NextResponse.json({ 
          error: "Tipo de alerta, frequência e método de notificação são obrigatórios" 
        }, { status: 400 })
      }

      const [newConfig] = await db.insert(alertConfigurations).values({
        psychologistId,
        alertType,
        threshold,
        frequency,
        notificationMethod,
        isEnabled: Boolean(isEnabled),
      }).returning()

      return NextResponse.json({ success: true, data: newConfig })

    } else if (action === "update_configuration") {
      const { configId, ...updateData } = data

      if (!configId) {
        return NextResponse.json({ error: "ID da configuração é obrigatório" }, { status: 400 })
      }

      const [updatedConfig] = await db.update(alertConfigurations)
        .set(updateData)
        .where(and(
          eq(alertConfigurations.id, parseInt(configId)),
          eq(alertConfigurations.psychologistId, psychologistId)
        ))
        .returning()

      return NextResponse.json({ success: true, data: updatedConfig })

    } else if (action === "mark_alert_read") {
      const { alertId } = data

      if (!alertId) {
        return NextResponse.json({ error: "ID do alerta é obrigatório" }, { status: 400 })
      }

      const [updatedAlert] = await db.update(generatedAlerts)
        .set({ isRead: true })
        .where(and(
          eq(generatedAlerts.id, parseInt(alertId)),
          eq(generatedAlerts.psychologistId, psychologistId)
        ))
        .returning()

      return NextResponse.json({ success: true, data: updatedAlert })

    } else if (action === "resolve_alert") {
      const { alertId } = data

      if (!alertId) {
        return NextResponse.json({ error: "ID do alerta é obrigatório" }, { status: 400 })
      }

      const [resolvedAlert] = await db.update(generatedAlerts)
        .set({ 
          isResolved: true, 
          resolvedAt: new Date(),
          isRead: true 
        })
        .where(and(
          eq(generatedAlerts.id, parseInt(alertId)),
          eq(generatedAlerts.psychologistId, psychologistId)
        ))
        .returning()

      return NextResponse.json({ success: true, data: resolvedAlert })

    } else {
      return NextResponse.json({ error: "Ação não reconhecida" }, { status: 400 })
    }

  } catch (error) {
    console.error("Erro ao processar alertas:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}