import { db } from "@/db"
import { diaryEntries, patientProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse, NextRequest } from "next/server"
import { z } from "zod"
import { getUserIdFromRequest } from "@/lib/auth"

const entrySchema = z.object({
  moodRating: z.number().min(0).max(4),
  intensityRating: z.number().min(1).max(10),
  content: z.string().min(1, {
    message: "Content must be at least 1 character.",
  }),
  cycle: z.enum(["criar", "cuidar", "crescer", "curar"]),
  emotions: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const json = await req.json()
    const body = entrySchema.parse(json)

    const { moodRating, intensityRating, content, cycle, emotions } = body

    const entry = await db.insert(diaryEntries).values({
      patientId: userId,
      moodRating,
      intensityRating,
      content,
      cycle,
      emotions: emotions ? JSON.stringify(emotions) : null,
    })

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    return new NextResponse(null, { status: 500 })
  }
}
