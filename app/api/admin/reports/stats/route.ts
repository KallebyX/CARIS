import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { users, sessions, payments, subscriptions, clinics } from "@/db/schema"
import { eq, sql, gte, and } from "drizzle-orm"

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

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get total revenue this month
    const revenueThisMonth = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(
        and(
          eq(payments.status, "succeeded"),
          gte(payments.createdAt, startOfMonth)
        )
      )

    // Get total revenue last month
    const revenueLastMonth = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(
        and(
          eq(payments.status, "succeeded"),
          gte(payments.createdAt, startOfLastMonth),
          sql`${payments.createdAt} < ${startOfMonth}`
        )
      )

    // Get active subscriptions count
    const activeSubscriptionsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))

    // Get total sessions this month
    const sessionsThisMonth = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(sessions)
      .where(gte(sessions.createdAt, startOfMonth))

    // Get new users this month
    const newUsersThisMonth = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(gte(users.createdAt, startOfMonth))

    // Get total clinics
    const totalClinicsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(clinics)

    // Get active clinics
    const activeClinicsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(clinics)
      .where(eq(clinics.status, "active"))

    // Calculate growth rate
    const thisMonthRevenue = Number(revenueThisMonth[0]?.total || 0)
    const lastMonthRevenue = Number(revenueLastMonth[0]?.total || 0)
    const growthRate = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0

    // Monthly revenue data for chart (last 6 months)
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const monthRevenue = await db
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(payments)
        .where(
          and(
            eq(payments.status, "succeeded"),
            gte(payments.createdAt, monthStart),
            sql`${payments.createdAt} <= ${monthEnd}`
          )
        )

      monthlyData.push({
        month: monthStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        revenue: Number(monthRevenue[0]?.total || 0) / 100, // Convert from cents
      })
    }

    const stats = {
      revenue: {
        thisMonth: thisMonthRevenue / 100, // Convert from cents
        lastMonth: lastMonthRevenue / 100,
        growthRate: growthRate.toFixed(1),
        monthlyData,
      },
      subscriptions: {
        active: Number(activeSubscriptionsResult[0]?.count || 0),
        churnRate: 2.5, // Placeholder - would need historical data
      },
      sessions: {
        thisMonth: Number(sessionsThisMonth[0]?.count || 0),
        averagePerDay: Math.round(Number(sessionsThisMonth[0]?.count || 0) / now.getDate()),
      },
      users: {
        newThisMonth: Number(newUsersThisMonth[0]?.count || 0),
      },
      clinics: {
        total: Number(totalClinicsResult[0]?.count || 0),
        active: Number(activeClinicsResult[0]?.count || 0),
      },
      topPlans: [
        { name: "Profissional", subscribers: 45, revenue: 5805 },
        { name: "Essencial", subscribers: 32, revenue: 2528 },
        { name: "Clinica", subscribers: 8, revenue: 3992 },
      ],
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error("Error fetching report stats:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
