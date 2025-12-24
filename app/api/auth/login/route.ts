import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { z } from "zod"
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES, getRequestInfo } from "@/lib/audit"
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit"
import { safeError } from "@/lib/safe-logger"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  // Apply rate limiting to prevent brute force attacks
  const rateLimitResult = await rateLimit(request, RateLimitPresets.AUTH)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  const { ipAddress, userAgent } = getRequestInfo(request)
  let userId: number | undefined

  try {
    const body = await request.json()
    const parsedBody = loginSchema.safeParse(body)

    if (!parsedBody.success) {
      await logAuditEvent({
        action: 'login_failed',
        resourceType: AUDIT_RESOURCES.USER,
        severity: 'warning',
        metadata: {
          error: 'invalid_input',
          validationErrors: parsedBody.error.issues,
        },
        ipAddress,
        userAgent,
      })
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const { email, password } = parsedBody.data

    // Use explicit column selection to avoid issues with missing columns in the database
    // This is more resilient than db.query.users.findFirst() which selects ALL schema columns
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        password: users.password,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      await logAuditEvent({
        action: 'login_failed',
        resourceType: AUDIT_RESOURCES.USER,
        severity: 'warning',
        metadata: {
          error: 'user_not_found',
          attemptedEmail: email,
        },
        ipAddress,
        userAgent,
      })
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    userId = user.id
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      await logAuditEvent({
        userId,
        action: 'login_failed',
        resourceType: AUDIT_RESOURCES.USER,
        resourceId: userId.toString(),
        severity: 'warning',
        metadata: {
          error: 'invalid_password',
        },
        ipAddress,
        userAgent,
      })
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    })

    // Log successful login
    await logAuditEvent({
      userId,
      action: AUDIT_ACTIONS.LOGIN,
      resourceType: AUDIT_RESOURCES.USER,
      resourceId: userId.toString(),
      metadata: {
        sessionDuration: '7d',
        loginMethod: 'password',
      },
      ipAddress,
      userAgent,
    })

    const response = NextResponse.json({
      message: "Logged in successfully",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    safeError("[AUTH_LOGIN]", "Login error:", error)

    await logAuditEvent({
      userId,
      action: 'login_failed',
      resourceType: AUDIT_RESOURCES.USER,
      resourceId: userId?.toString(),
      severity: 'critical',
      metadata: {
        error: 'internal_server_error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
