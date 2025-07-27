import { NextResponse } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import * as jose from "jose"

async function getUserIdFromToken(request: Request) {
  const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0]
  if (!token) return null
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  const { payload } = await jose.jwtVerify(token, secret)
  return payload.userId as number
}

export async function GET(request: Request) {
  const userId = await getUserIdFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
    with: {
      psychologistProfile: {
        columns: { crp: true },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}
