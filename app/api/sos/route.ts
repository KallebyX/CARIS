import { NextResponse } from "next/server"

// SOS API main route for crisis management
export async function GET() {
  return NextResponse.json({
    message: "SOS Crisis Management API is active",
    endpoints: {
      activate: "/api/sos/activate",
      deactivate: "/api/sos/deactivate"
    },
    status: "ready"
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, userId, location, urgency } = body

    // Basic validation
    if (!action || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: action, userId" },
        { status: 400 }
      )
    }

    // Redirect to appropriate endpoint based on action
    if (action === "activate") {
      return NextResponse.redirect(new URL("/api/sos/activate", request.url))
    } else if (action === "deactivate") {
      return NextResponse.redirect(new URL("/api/sos/deactivate", request.url))
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'activate' or 'deactivate'" },
      { status: 400 }
    )
  } catch (error) {
    console.error("SOS API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}