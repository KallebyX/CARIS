import type { NextRequest } from "next/server"
import * as jose from "jose"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { safeError, safeWarn } from "@/lib/safe-logger"

/**
 * Extracts the token from a request, handling both NextRequest and standard Request.
 * Uses the cookies API when available (NextRequest), with regex fallback for standard Request.
 */
function extractToken(request: NextRequest | Request): string | null {
  // Try to use Next.js cookies API first (more reliable, handles encoding)
  if ('cookies' in request && typeof request.cookies?.get === 'function') {
    const cookieValue = request.cookies.get("token")?.value
    if (cookieValue) {
      return cookieValue.trim()
    }
  }

  // Fallback: parse from raw cookie header for standard Request
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) {
    return null
  }

  // Match token cookie, handling potential quotes around value
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=("?)([^";]+)\1(?:;|$)/)
  if (tokenMatch) {
    // Decode URI components in case of encoding, and trim whitespace
    try {
      return decodeURIComponent(tokenMatch[2]).trim()
    } catch {
      // If decoding fails, return the raw value trimmed
      return tokenMatch[2].trim()
    }
  }

  return null
}

/**
 * Extrai o ID do usuário do token JWT na requisição.
 * Valida se o token foi emitido após a última mudança de senha.
 * @param request A requisição Next.js ou Fetch API.
 * @returns O ID do usuário como número, ou null se não autorizado.
 */
export async function getUserIdFromRequest(request: NextRequest | Request) {
  const token = extractToken(request)

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
      try {
        // First, verify the user exists with a basic query that doesn't require password_changed_at
        const userExists = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {
            id: true,
          }
        })

        if (!userExists) {
          safeWarn("[AUTH]", `User not found: ${userId}`)
          return null
        }

        // Try to check password_changed_at if the column exists
        // This uses a raw parameterized query to handle the case where the column might not exist
        try {
          const result = await db.execute<{ password_changed_at: Date | null }>(
            sql`SELECT password_changed_at FROM users WHERE id = ${userId} LIMIT 1`
          )

          if (result.rows && result.rows.length > 0 && result.rows[0].password_changed_at) {
            const passwordChangedTimestamp = Math.floor(new Date(result.rows[0].password_changed_at).getTime() / 1000)

            // If token was issued before password change, invalidate it
            if (tokenIssuedAt < passwordChangedTimestamp) {
              safeWarn("[AUTH]", `Token invalidated - issued before password change. User: ${userId}`)
              return null
            }
          }
        } catch (passwordCheckError) {
          // If the password_changed_at column doesn't exist, just skip this check
          // The token is still valid based on JWT verification
          const errorMessage = passwordCheckError instanceof Error ? passwordCheckError.message : ''
          if (errorMessage.includes('password_changed_at') || errorMessage.includes('does not exist') || errorMessage.includes('column')) {
            // Column doesn't exist yet, skip password change check
            // This is expected during initial setup or migration
          } else {
            // Other error, log it but don't fail auth
            safeWarn("[AUTH]", `Error checking password_changed_at: ${errorMessage}`)
          }
        }
      } catch (userCheckError) {
        safeError("[AUTH]", "Error verifying user:", userCheckError)
        return null
      }
    }

    return userId
  } catch (error) {
    safeError("[AUTH]", "Falha na verificação do token:", error)
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
    safeError("[AUTH]", "Falha na verificação do token:", error)
    return null
  }
}
