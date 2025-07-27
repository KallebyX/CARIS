import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentProfile } from "@/lib/current-profile"
import { RealtimeNotificationService } from "@/lib/realtime-notifications"

export async function POST(req: Request, { params }: { params: { patientId: string } }) {
  try {
    const profile = await currentProfile()
    const { userId, title, description, dueDate } = await req.json()
    const { patientId } = params

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!patientId) {
      return new NextResponse("Patient ID missing", { status: 400 })
    }

    if (!userId) {
      return new NextResponse("User ID missing", { status: 400 })
    }

    if (!title) {
      return new NextResponse("Title missing", { status: 400 })
    }

    const newTask = await db.task.createMany({
      data: [
        {
          patientId,
          userId,
          title,
          description,
          dueDate,
        },
      ],
    })

    const realtimeService = RealtimeNotificationService.getInstance()
    await realtimeService.notifyTaskAssigned(newTask[0].id, patientId, userId, title)

    return NextResponse.json(newTask)
  } catch (error) {
    console.log("[TASKS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
