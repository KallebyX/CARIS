import type { NextRequest } from "next/server"
import * as jose from "jose"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Extrai o ID do usuário do token JWT na requisição.
 * Valida se o token foi emitido após a última mudança de senha.
 * @param request A requisição Next.js ou Fetch API.
 * @returns O ID do usuário como número, ou null se não autorizado.
 */
export async function getUserIdFromRequest(request: NextRequest | Request) {
  const tokenCookie = (request.headers.get("cookie") || "").match(/token=([^;]+)/)
  const token = tokenCookie ? tokenCookie[1] : null

  if (!token) {
    return null
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jose.jwtVerify(token, secret)
    const userId = payload.userId as number
    const tokenIssuedAt = payload.iat // Token issued at (unix timestamp in seconds)

    // SECURITY: Check if token was issued before password change
    // This invalidates all old tokens when password is changed
    if (tokenIssuedAt && userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          passwordChangedAt: true,
        }
      })

      if (user && user.passwordChangedAt) {
        const passwordChangedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000)

        // If token was issued before password change, invalidate it
        if (tokenIssuedAt < passwordChangedTimestamp) {
          console.warn(`[Auth] Token invalidated - issued before password change. User: ${userId}`)
          return null
        }
      }
    }

    return userId
  } catch (error) {
    console.error("Falha na verificação do token:", error)
    return null
  }
}

/**
 * Verifica se o token JWT é válido.
 * @param token O token JWT a ser verificado.
 * @returns O payload do token se válido, ou null se inválido.
 */
export async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jose.jwtVerify(token, secret)
    return payload
  } catch (error) {
    console.error("Falha na verificação do token:", error)
    return null
  }
}
