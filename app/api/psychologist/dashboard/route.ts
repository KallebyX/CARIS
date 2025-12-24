import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, sessions } from "@/db/schema"
import { eq, and, count, gte } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const totalPatients = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, "patient"))) // In a real app, this would be filtered by psychologistId

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const sessionsToday = await db
      .select({ value: count() })
      .from(sessions)
      .where(and(eq(sessions.psychologistId, psychologistId), gte(sessions.scheduledAt, today)))

    const upcomingSessions = await db.query.sessions.findMany({
      where: and(eq(sessions.psychologistId, psychologistId), gte(sessions.scheduledAt, today)),
      limit: 3,
      with: {
        patient: {
          columns: { name: true },
        },
      },
      orderBy: (sessions, { asc }) => [asc(sessions.scheduledAt)],
    })

    const recentDiaryEntries = await db.query.diaryEntries.findMany({
      limit: 3,
      with: {
        patient: {
          columns: { name: true },
        },
      },
      orderBy: (diaryEntries, { desc }) => [desc(diaryEntries.entryDate)],
    })

    return NextResponse.json({
      stats: {
        totalPatients: totalPatients[0].value,
        sessionsToday: sessionsToday[0].value,
        // Add other stats here
      },
      upcomingSessions,
      recentActivities: recentDiaryEntries.map((entry) => ({
        id: entry.id,
        patient: entry.patient.name,
        action: "Completou entrada no diário",
        time: entry.entryDate.toISOString(),
        cycle: entry.cycle,
      })),
    })
  } catch (error) {
    console.error("Dashboard API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
