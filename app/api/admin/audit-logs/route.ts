import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { auditLogs, users } from "@/db/schema"
import { eq, desc, and, gte, lte, like, or, sql, SQL } from "drizzle-orm"
import { z } from "zod"

const AuditLogsQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default("1"),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default("50"),
  userId: z.string().transform(Number).pipe(z.number()).optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  complianceOnly: z.string().transform(val => val === 'true').optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
})

/**
 * GET /api/admin/audit-logs
 * Lista logs de auditoria (apenas para admins)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      )
    }

    // Verifica se o usuário é admin
    const user = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user[0] || user[0].role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Acesso negado - apenas administradores" },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams)
    const {
      page,
      limit,
      userId: filterUserId,
      action,
      resourceType,
      severity,
      complianceOnly,
      dateFrom,
      dateTo,
      search
    } = AuditLogsQuerySchema.parse(queryParams)

    // Build conditions array
    const conditions: (SQL | undefined)[] = []

    if (filterUserId) {
      conditions.push(eq(auditLogs.userId, filterUserId))
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action))
    }

    if (resourceType) {
      conditions.push(eq(auditLogs.resourceType, resourceType))
    }

    if (severity) {
      conditions.push(eq(auditLogs.severity, severity))
    }

    if (complianceOnly) {
      conditions.push(eq(auditLogs.complianceRelated, true))
    }

    if (dateFrom) {
      conditions.push(gte(auditLogs.timestamp, new Date(dateFrom)))
    }

    if (dateTo) {
      conditions.push(lte(auditLogs.timestamp, new Date(dateTo)))
    }

    if (search) {
      conditions.push(
        or(
          like(auditLogs.action, `%${search}%`),
          like(auditLogs.resourceType, `%${search}%`),
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      )
    }

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Ordenação e paginação
    const offset = (page - 1) * limit

    // Execute query with all conditions
    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        metadata: auditLogs.metadata,
        timestamp: auditLogs.timestamp,
        severity: auditLogs.severity,
        complianceRelated: auditLogs.complianceRelated,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset)

    // Count query for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause)

    const totalCount = countResult[0]?.count ?? 0

    // Estatísticas rápidas
    const stats = await db
      .select({
        totalLogs: sql<number>`count(*)`,
        complianceLogs: sql<number>`count(*) filter (where compliance_related = true)`,
        criticalLogs: sql<number>`count(*) filter (where severity = 'critical')`,
        todayLogs: sql<number>`count(*) filter (where timestamp >= current_date)`,
      })
      .from(auditLogs)

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map(log => ({
          ...log,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        stats: stats[0],
      }
    })

  } catch (error) {
    console.error("Erro ao buscar logs de auditoria:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Parâmetros inválidos",
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}