import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { medicationLogs, medications } from "@/db/schema"
import { getUserIdFromRequest } from "@/lib/auth"
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response"
import { eq, and, sql, gte } from "drizzle-orm"

// ============================================================================
// GET /api/patient/medication-adherence - Get adherence statistics
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    // Query parameters
    const { searchParams } = new URL(request.url)
    const medicationId = searchParams.get("medicationId")
    const days = parseInt(searchParams.get("days") || "30") // Default: last 30 days

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get adherence statistics using the database view
    // Since Drizzle doesn't support views directly, we'll use raw SQL
    let adherenceStats

    if (medicationId) {
      // Adherence for specific medication
      adherenceStats = await db.execute(sql`
        SELECT
          ml.user_id,
          ml.medication_id,
          m.name AS medication_name,
          COUNT(*) AS total_doses,
          SUM(CASE WHEN ml.status = 'taken' THEN 1 ELSE 0 END) AS taken_doses,
          SUM(CASE WHEN ml.status = 'skipped' THEN 1 ELSE 0 END) AS skipped_doses,
          SUM(CASE WHEN ml.status = 'missed' THEN 1 ELSE 0 END) AS missed_doses,
          ROUND(
            (SUM(CASE WHEN ml.status = 'taken' THEN 1 ELSE 0 END)::numeric /
            NULLIF(COUNT(*), 0)) * 100, 2
          ) AS adherence_percentage,
          MIN(ml.scheduled_time) AS first_dose_date,
          MAX(ml.scheduled_time) AS last_dose_date
        FROM medication_logs ml
        JOIN medications m ON ml.medication_id = m.id
        WHERE ml.user_id = ${userId}
          AND ml.medication_id = ${parseInt(medicationId)}
          AND ml.scheduled_time >= ${startDate}
        GROUP BY ml.user_id, ml.medication_id, m.name
      `)
    } else {
      // Adherence for all medications
      adherenceStats = await db.execute(sql`
        SELECT
          ml.user_id,
          ml.medication_id,
          m.name AS medication_name,
          COUNT(*) AS total_doses,
          SUM(CASE WHEN ml.status = 'taken' THEN 1 ELSE 0 END) AS taken_doses,
          SUM(CASE WHEN ml.status = 'skipped' THEN 1 ELSE 0 END) AS skipped_doses,
          SUM(CASE WHEN ml.status = 'missed' THEN 1 ELSE 0 END) AS missed_doses,
          ROUND(
            (SUM(CASE WHEN ml.status = 'taken' THEN 1 ELSE 0 END)::numeric /
            NULLIF(COUNT(*), 0)) * 100, 2
          ) AS adherence_percentage,
          MIN(ml.scheduled_time) AS first_dose_date,
          MAX(ml.scheduled_time) AS last_dose_date
        FROM medication_logs ml
        JOIN medications m ON ml.medication_id = m.id
        WHERE ml.user_id = ${userId}
          AND ml.scheduled_time >= ${startDate}
        GROUP BY ml.user_id, ml.medication_id, m.name
        ORDER BY m.name
      `)
    }

    // Convert result to array (Drizzle execute returns RowList which is array-like)
    const adherenceRows = Array.from(adherenceStats) as Record<string, unknown>[]

    // Calculate overall adherence
    let overallStats = {
      totalDoses: 0,
      takenDoses: 0,
      skippedDoses: 0,
      missedDoses: 0,
      overallAdherence: 0,
    }

    if (adherenceRows.length > 0) {
      overallStats = adherenceRows.reduce<typeof overallStats>(
        (acc, row: Record<string, unknown>) => ({
          totalDoses: acc.totalDoses + parseInt(String(row.total_doses)),
          takenDoses: acc.takenDoses + parseInt(String(row.taken_doses)),
          skippedDoses: acc.skippedDoses + parseInt(String(row.skipped_doses)),
          missedDoses: acc.missedDoses + parseInt(String(row.missed_doses)),
          overallAdherence: 0, // Will calculate after
        }),
        overallStats
      )

      overallStats.overallAdherence =
        overallStats.totalDoses > 0
          ? Math.round((overallStats.takenDoses / overallStats.totalDoses) * 100 * 100) / 100
          : 0
    }

    // Get medications with low stock
    const lowStockMedications = await db.query.medications.findMany({
      where: and(
        eq(medications.userId, userId),
        eq(medications.isActive, true),
        sql`${medications.stockQuantity} IS NOT NULL AND ${medications.lowStockThreshold} IS NOT NULL AND ${medications.stockQuantity} <= ${medications.lowStockThreshold}`
      ),
      columns: {
        id: true,
        name: true,
        stockQuantity: true,
        lowStockThreshold: true,
        refillDate: true,
      },
    })

    // Get medications needing refill soon (within 7 days)
    const refillSoonDate = new Date()
    refillSoonDate.setDate(refillSoonDate.getDate() + 7)

    const refillSoonMedications = await db.query.medications.findMany({
      where: and(
        eq(medications.userId, userId),
        eq(medications.isActive, true),
        sql`${medications.refillDate} IS NOT NULL AND ${medications.refillDate} <= ${refillSoonDate}`
      ),
      columns: {
        id: true,
        name: true,
        refillDate: true,
        pharmacy: true,
      },
    })

    // Get recent side effects
    const recentSideEffects = await db.query.medicationLogs.findMany({
      where: and(
        eq(medicationLogs.userId, userId),
        eq(medicationLogs.hadSideEffects, true),
        gte(medicationLogs.scheduledTime, startDate)
      ),
      orderBy: (logs, { desc }) => [desc(logs.scheduledTime)],
      limit: 10,
      with: {
        medication: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    })

    return apiSuccess({
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
      overall: overallStats,
      byMedication: adherenceRows,
      alerts: {
        lowStock: lowStockMedications,
        refillSoon: refillSoonMedications,
      },
      recentSideEffects,
    })
  } catch (error) {
    console.error("Error fetching medication adherence:", error)
    return apiError("Erro ao buscar aderência medicamentosa", { status: 500 })
  }
}
