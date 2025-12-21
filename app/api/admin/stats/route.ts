import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { clinics, clinicUsers, users, subscriptions, subscriptionPlans, sessions } from "@/db/schema"
import { eq, and, count, sum, gte, sql } from "drizzle-orm"
import { withCache, CachePresets, generateCacheKey } from "@/lib/api-cache"
import { apiUnauthorized, apiForbidden, apiSuccess, handleApiError } from "@/lib/api-response"
import { safeError } from "@/lib/safe-logger"

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    // Verify user is global admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return apiForbidden("Acesso negado")
    }

    // Cache key based on current month (stats change per month)
    const now = new Date()
    const cacheKey = generateCacheKey(['admin', 'stats', now.getFullYear(), now.getMonth() + 1])

    // Fetch stats with caching (5 minutes TTL with 1 minute SWR)
    const stats = await withCache(
      cacheKey,
      async () => {
        // Get current date for calculations
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

        // Total revenue (sum of active subscriptions joined with plans)
        const totalRevenueResult = await db
          .select({
            total: sql<number>`COALESCE(SUM(${subscriptionPlans.priceMonthly}), 0)`
          })
          .from(subscriptions)
          .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
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

        return {
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
      },
      {
        ...CachePresets.MEDIUM, // 5 minutes TTL + 1 minute SWR
        tags: ['admin-stats', 'analytics']
      }
    )

    return apiSuccess(stats)
  } catch (error) {
    safeError('[ADMIN_STATS]', 'Error fetching admin stats:', error)
    return handleApiError(error)
  }
}
