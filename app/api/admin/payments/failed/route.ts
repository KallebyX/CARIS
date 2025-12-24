import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { users, paymentFailures, subscriptions } from "@/db/schema"
import { eq, sql, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true, isGlobalAdmin: true }
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50")

    // Get unresolved payment failures
    const failures = await db
      .select({
        id: paymentFailures.id,
        userId: paymentFailures.userId,
        subscriptionId: paymentFailures.subscriptionId,
        failureCode: paymentFailures.failureCode,
        failureMessage: paymentFailures.failureMessage,
        retryCount: paymentFailures.retryCount,
        nextRetryAt: paymentFailures.nextRetryAt,
        createdAt: paymentFailures.createdAt,
      })
      .from(paymentFailures)
      .where(sql`${paymentFailures.resolvedAt} IS NULL`)
      .orderBy(desc(paymentFailures.createdAt))
      .limit(limit)

    // Get user and subscription details for each failure
    const failuresWithDetails = await Promise.all(
      failures.map(async (failure) => {
        const failureUser = await db.query.users.findFirst({
          where: eq(users.id, failure.userId),
          columns: {
            id: true,
            name: true,
            email: true,
          }
        })

        let subscription = null
        if (failure.subscriptionId) {
          subscription = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.id, failure.subscriptionId),
            columns: {
              planName: true,
              status: true,
            }
          })
        }

        return {
          ...failure,
          user: failureUser || { id: failure.userId, name: "Usuario desconhecido", email: "" },
          subscription: subscription || null,
        }
      })
    )

    return NextResponse.json({ success: true, data: failuresWithDetails })
  } catch (error) {
    console.error("Error fetching payment failures:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
