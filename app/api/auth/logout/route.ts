import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { safeError } from "@/lib/safe-logger"

export async function POST() {
  try {
    const cookieStore = await cookies()

    // Cria a resposta de sucesso
    const response = NextResponse.json({
      message: "Logout realizado com sucesso",
      success: true,
    })

    // Remove todos os cookies relacionados à autenticação
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    })

    // Remove outros cookies de sessão se existirem
    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    })

    response.cookies.set("user_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    })

    // Headers para evitar cache
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  } catch (error) {
    safeError("[AUTH_LOGOUT]", "Erro no logout:", error)
    return NextResponse.json({ error: "Erro interno do servidor", success: false }, { status: 500 })
  }
}
