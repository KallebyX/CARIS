import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { notifications } from "@/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit"

// Get user notifications
export async function GET(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(req, RateLimitPresets.READ)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query conditions
    const conditions = [
      eq(notifications.userId, userId),
      // Exclude expired notifications
      sql`(${notifications.expiresAt} IS NULL OR ${notifications.expiresAt} > NOW())`
    ]

    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false))
    }

    // Get notifications
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)

    // Get unread count
    const [{ count: unreadCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          sql`(${notifications.expiresAt} IS NULL OR ${notifications.expiresAt} > NOW())`
        )
      )

    return NextResponse.json({
      success: true,
      data: {
        notifications: userNotifications,
        unreadCount: Number(unreadCount),
        pagination: {
          limit,
          offset,
          hasMore: userNotifications.length === limit
        }
      }
    })
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Mark notification as read
export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(req, RateLimitPresets.WRITE)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { notificationId, notificationIds, markAllRead } = body

    if (markAllRead) {
      // Mark all unread notifications as read
      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        )

      return NextResponse.json({
        success: true,
        message: "Todas as notificações marcadas como lidas"
      })
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notifications.userId, userId),
            sql`${notifications.id} = ANY(${notificationIds})`
          )
        )

      return NextResponse.json({
        success: true,
        message: `${notificationIds.length} notificações marcadas como lidas`
      })
    }

    if (notificationId) {
      // Single notification (legacy support)
      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.id, notificationId)
          )
        )

      return NextResponse.json({
        success: true,
        message: "Notificação marcada como lida"
      })
    }

    return NextResponse.json(
      { error: "notificationId, notificationIds ou markAllRead deve ser fornecido" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[NOTIFICATIONS_POST]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Send new notification (for internal use)
export async function PUT(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(req, RateLimitPresets.WRITE)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const currentUserId = await getUserIdFromRequest(req)
    if (!currentUserId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { recipientId, type, title, message, priority, category, actionUrl, actionLabel, metadata, expiresAt } = body

    if (!recipientId || !type || !message) {
      return NextResponse.json({ error: "recipientId, type e message são obrigatórios" }, { status: 400 })
    }

    // TODO: Add role-based access control to check if user can send notifications

    // Create notification
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: recipientId,
        type,
        title: title || type,
        message,
        priority: priority || 'normal',
        category,
        actionUrl,
        actionLabel,
        metadata: metadata || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning()

    // TODO: Send real-time notification via Pusher
    // await pusherServer.trigger(`user-${recipientId}`, 'notification', notification)

    return NextResponse.json({
      success: true,
      message: "Notificação enviada com sucesso",
      data: { notification }
    })
  } catch (error) {
    console.error("[NOTIFICATIONS_PUT]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}