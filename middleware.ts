import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import * as jose from "jose"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const { pathname } = request.nextUrl

  // Se não há token, redireciona para login
  if (!token) {
    console.log("No token found, redirecting to login")
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jose.jwtVerify(token, secret)

    // Verifica se o token não expirou
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.log("Token expired, redirecting to login")
      const response = NextResponse.redirect(new URL("/login", request.url))
      response.cookies.delete("token")
      response.cookies.delete("refresh_token")
      response.cookies.delete("user_session")
      return response
    }

    // Verifica permissões de admin
    if (pathname.startsWith("/admin") && payload.role !== "admin") {
      console.log("Non-admin trying to access admin area")
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Token válido, continua
    return NextResponse.next()
  } catch (error) {
    console.error("Invalid token:", error)
    const response = NextResponse.redirect(new URL("/login", request.url))

    // Remove todos os cookies de autenticação
    response.cookies.delete("token")
    response.cookies.delete("refresh_token")
    response.cookies.delete("user_session")

    // Headers para evitar cache
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/((?!auth).*)/:path*"],
}
