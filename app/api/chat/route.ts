import { type NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { RealtimeNotificationService } from "@/lib/realtime-notifications"

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await req.json()
    const { receiverId, content } = body

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!receiverId) {
      return new NextResponse("Receiver ID is required", { status: 400 })
    }

    if (!content) {
      return new NextResponse("Content is required", { status: 400 })
    }

    const senderId = userId

    const message = await prismadb.message.create({
      data: {
        senderId,
        receiverId,
        content,
      },
    })

    const realtimeService = RealtimeNotificationService.getInstance()
    await realtimeService.notifyNewChatMessage(senderId, receiverId, content)

    return NextResponse.json(message)
  } catch (error) {
    console.log("[CHAT_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
