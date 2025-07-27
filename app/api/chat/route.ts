import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // TODO: Implement chat functionality when messages table is added to schema
  return new NextResponse("Chat functionality not implemented yet", { status: 501 })
}
