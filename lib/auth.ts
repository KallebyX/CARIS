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

/**
 * User info returned by verifyAdminAccess
 */
export interface AdminUser {
  id: number
  role: string
  isGlobalAdmin: boolean
}

/**
 * Verifies if a user has admin access.
 * Uses raw SQL queries to handle cases where some columns might not exist in the database.
 * @param userId The user ID to check.
 * @returns AdminUser object if admin, null otherwise.
 */
export async function verifyAdminAccess(userId: number): Promise<AdminUser | null> {
  try {
    // First, try to get basic user info with columns that should always exist
    const basicResult = await db.execute<{ id: number; role: string }>(
      sql`SELECT id, role FROM users WHERE id = ${userId} LIMIT 1`
    )

    if (!basicResult.rows || basicResult.rows.length === 0) {
      return null
    }

    const user = basicResult.rows[0]
    let isGlobalAdmin = false

    // Try to get is_global_admin if the column exists
    try {
      const adminResult = await db.execute<{ is_global_admin: boolean | null }>(
        sql`SELECT is_global_admin FROM users WHERE id = ${userId} LIMIT 1`
      )
      if (adminResult.rows && adminResult.rows.length > 0 && adminResult.rows[0].is_global_admin !== null) {
        isGlobalAdmin = adminResult.rows[0].is_global_admin === true
      }
    } catch (adminCheckError) {
      // If the is_global_admin column doesn't exist, just ignore
      const errorMessage = adminCheckError instanceof Error ? adminCheckError.message : ''
      if (!errorMessage.includes('is_global_admin') && !errorMessage.includes('does not exist') && !errorMessage.includes('column')) {
        safeWarn("[AUTH]", `Error checking is_global_admin: ${errorMessage}`)
      }
    }

    // Check if user has admin access
    if (user.role !== 'admin' && !isGlobalAdmin) {
      return null
    }

    return {
      id: user.id,
      role: user.role,
      isGlobalAdmin
    }
  } catch (error) {
    safeError("[AUTH]", "Error verifying admin access:", error)
    return null
  }
}
