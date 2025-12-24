import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { users, payments, subscriptions, paymentFailures } from "@/db/schema"
import { eq, sql, gte, and, desc } from "drizzle-orm"

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
    const range = searchParams.get("range") || "30d"

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (range) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get total revenue in range
    const totalRevenue = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(
        and(
          eq(payments.status, "succeeded"),
          gte(payments.createdAt, startDate)
        )
      )

    // Get successful payments count
    const successfulPayments = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(payments)
      .where(
        and(
          eq(payments.status, "succeeded"),
          gte(payments.createdAt, startDate)
        )
      )

    // Get failed payments count
    const failedPayments = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(payments)
      .where(
        and(
          eq(payments.status, "failed"),
          gte(payments.createdAt, startDate)
        )
      )

    // Get pending failures (unresolved)
    const pendingFailures = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(paymentFailures)
      .where(sql`${paymentFailures.resolvedAt} IS NULL`)

    // Get active subscriptions
    const activeSubscriptions = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))

    // Get MRR (Monthly Recurring Revenue) - sum of all active subscription amounts
    // This is a simplified calculation
    const mrrResult = await db
      .select({ total: sql<number>`COUNT(*) * 12900` }) // Average of ~R$129/month
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))

    // Get churn rate (subscriptions cancelled / total subscriptions)
    const cancelledSubscriptions = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "canceled"),
          gte(subscriptions.canceledAt, startDate)
        )
      )

    const totalSuccessful = Number(successfulPayments[0]?.count || 0)
    const totalFailed = Number(failedPayments[0]?.count || 0)
    const successRate = totalSuccessful + totalFailed > 0
      ? ((totalSuccessful / (totalSuccessful + totalFailed)) * 100).toFixed(1)
      : 100

    const stats = {
      totalRevenue: Number(totalRevenue[0]?.total || 0) / 100, // Convert from cents
      successfulPayments: totalSuccessful,
      failedPayments: totalFailed,
      pendingFailures: Number(pendingFailures[0]?.count || 0),
      activeSubscriptions: Number(activeSubscriptions[0]?.count || 0),
      mrr: Number(mrrResult[0]?.total || 0) / 100,
      successRate: Number(successRate),
      churnRate: 2.5, // Placeholder - would need more historical data
      averageTicket: totalSuccessful > 0
        ? (Number(totalRevenue[0]?.total || 0) / 100 / totalSuccessful).toFixed(2)
        : 0,
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error("Error fetching payment stats:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
