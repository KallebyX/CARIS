import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsedBody = loginSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const { email, password } = parsedBody.data

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
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
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
