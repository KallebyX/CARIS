import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest, verifyAdminAccess } from "@/lib/auth"
import { db } from "@/db"
import { users, clinicUsers } from "@/db/schema"
import { eq, and, count, gte, or, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verify user is admin using safe method
    const adminUser = await verifyAdminAccess(userId)
    if (!adminUser) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Get current date for calculations
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Total users - use raw SQL to avoid selecting non-existent columns
    const totalUsersResult = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM users`
    )

    // Active users
    const activeUsersResult = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM users WHERE status = 'active'`
    )

    // Admin users - only count by role since is_global_admin might not exist
    const adminUsersResult = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM users WHERE role IN ('admin', 'clinic_owner')`
    )

    // Clinic owners specifically
    const clinicOwnersResult = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM users WHERE role = 'clinic_owner'`
    )

    // New users this month
    const newUsersThisMonthResult = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM users WHERE created_at >= ${firstDayOfMonth}`
    )

    const stats = {
      totalUsers: Number(totalUsersResult.rows?.[0]?.count || 0),
      activeUsers: Number(activeUsersResult.rows?.[0]?.count || 0),
      adminUsers: Number(adminUsersResult.rows?.[0]?.count || 0),
      clinicOwners: Number(clinicOwnersResult.rows?.[0]?.count || 0),
      newUsersThisMonth: Number(newUsersThisMonthResult.rows?.[0]?.count || 0)
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