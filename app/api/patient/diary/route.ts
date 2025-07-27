import { db } from "@/lib/db"
import { diaryEntries, patientProfiles } from "@/lib/db/schema"
import { auth } from "@clerk/nextjs"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { RealtimeNotificationService } from "@/lib/realtime-notifications"

const entrySchema = z.object({
  title: z.string().min(1, {
    message: "Title must be at least 1 character.",
  }),
  content: z.string().min(1, {
    message: "Content must be at least 1 character.",
  }),
  mood: z.string().min(1, {
    message: "Mood must be at least 1 character.",
  }),
})

export async function POST(req: Request) {
  try {
    const { userId } = auth()

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const body = entrySchema.parse(json)

    const { title, content, mood } = body

    const entry = await db.insert(diaryEntries).values({
      title,
      content,
      mood,
      userId,
    })

    // Buscar o psicólogo responsável
    const patientProfile = await db
      .select({ psychologistId: patientProfiles.psychologistId })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1)

    if (patientProfile.length > 0) {
      const realtimeService = RealtimeNotificationService.getInstance()
      await realtimeService.notifyNewDiaryEntry(userId, patientProfile[0].psychologistId, title, mood)
    }

    return NextResponse.json({ entry })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    return new NextResponse(null, { status: 500 })
  }
}
