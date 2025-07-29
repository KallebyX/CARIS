import type { NextRequest } from "next/server"
import * as jose from "jose"

/**
 * Extrai o ID do usuário do token JWT na requisição.
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
    return payload.userId as number
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
