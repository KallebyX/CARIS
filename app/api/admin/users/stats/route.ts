import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { users, clinicUsers } from "@/db/schema"
import { eq, and, count, gte, or } from "drizzle-orm"

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

    // Total users
    const totalUsersResult = await db
      .select({ count: count() })
      .from(users)

    // Active users
    const activeUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, "active"))

    // Admin users (global admins and clinic owners)
    const adminUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(
        or(
          eq(users.isGlobalAdmin, true),
          eq(users.role, "admin"),
          eq(users.role, "clinic_owner")
        )
      )

    // Clinic owners specifically
    const clinicOwnersResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "clinic_owner"))

    // New users this month
    const newUsersThisMonthResult = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, firstDayOfMonth))

    const stats = {
      totalUsers: totalUsersResult[0]?.count || 0,
      activeUsers: activeUsersResult[0]?.count || 0,
      adminUsers: adminUsersResult[0]?.count || 0,
      clinicOwners: clinicOwnersResult[0]?.count || 0,
      newUsersThisMonth: newUsersThisMonthResult[0]?.count || 0
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}