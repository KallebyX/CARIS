import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { clinics, clinicUsers, users, subscriptions, sessions } from "@/db/schema"
import { eq, and, count, sum, gte, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verify user is global admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Get current date for calculations
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Total clinics
    const totalClinicsResult = await db
      .select({ count: count() })
      .from(clinics)

    // Active clinics
    const activeClinicsResult = await db
      .select({ count: count() })
      .from(clinics)
      .where(eq(clinics.status, "active"))

    // Total users across all clinics
    const totalUsersResult = await db
      .select({ count: count() })
      .from(clinicUsers)
      .where(eq(clinicUsers.status, "active"))

    // New clinics this month
    const newClinicsThisMonthResult = await db
      .select({ count: count() })
      .from(clinics)
      .where(gte(clinics.createdAt, firstDayOfMonth))

    // New users this month
    const newUsersThisMonthResult = await db
      .select({ count: count() })
      .from(clinicUsers)
      .where(
        and(
          eq(clinicUsers.status, "active"),
          gte(clinicUsers.joinedAt, firstDayOfMonth)
        )
      )

    // Total revenue (sum of active subscriptions)
    const totalRevenueResult = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${subscriptions.amount}), 0)` 
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))

    // Sessions this month
    const sessionsThisMonthResult = await db
      .select({ count: count() })
      .from(sessions)
      .where(gte(sessions.createdAt, firstDayOfMonth))

    // Calculate growth rates (mock data for now)
    const clinicGrowthRate = 15.2 // Will be calculated from real data
    const userGrowthRate = 12.8
    const revenueGrowthRate = 18.7

    const stats = {
      totalClinics: totalClinicsResult[0]?.count || 0,
      activeClinics: activeClinicsResult[0]?.count || 0,
      totalUsers: totalUsersResult[0]?.count || 0,
      newClinicsThisMonth: newClinicsThisMonthResult[0]?.count || 0,
      newUsersThisMonth: newUsersThisMonthResult[0]?.count || 0,
      totalRevenue: totalRevenueResult[0]?.total || 0,
      sessionsThisMonth: sessionsThisMonthResult[0]?.count || 0,
      growthRates: {
        clinics: clinicGrowthRate,
        users: userGrowthRate,
        revenue: revenueGrowthRate
      }
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}