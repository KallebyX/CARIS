import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit"
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES, getRequestInfo } from "@/lib/audit"

const passwordSchema = z.string()
  .min(12, "A senha deve ter no mínimo 12 caracteres")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número")
  .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial")

export async function POST(request: NextRequest) {
  // Apply rate limiting - sensitive operation
  const rateLimitResult = await rateLimit(request, RateLimitPresets.SENSITIVE)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { ipAddress, userAgent } = getRequestInfo(request)

  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Senhas são obrigatórias" }, { status: 400 })
    }

    // Validate new password strength
    const passwordValidation = passwordSchema.safeParse(newPassword)
    if (!passwordValidation.success) {
      return NextResponse.json({
        error: "Senha não atende aos requisitos de segurança",
        details: passwordValidation.error.issues.map(i => i.message)
      }, { status: 400 })
    }

    // Buscar usuário atual
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      await logAuditEvent({
        userId,
        action: 'password_change_failed',
        resourceType: AUDIT_RESOURCES.USER,
        resourceId: userId.toString(),
        severity: 'warning',
        metadata: { error: 'incorrect_current_password' },
        ipAddress,
        userAgent,
      })
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 })
    }

    // Hash da nova senha
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // CRITICAL: Update password and set passwordChangedAt to invalidate old tokens
    const now = new Date()
    await db.update(users).set({
      password: hashedNewPassword,
      passwordChangedAt: now,
      updatedAt: now
    }).where(eq(users.id, userId))

    // Log successful password change
    await logAuditEvent({
      userId,
      action: 'password_changed',
      resourceType: AUDIT_RESOURCES.USER,
      resourceId: userId.toString(),
      severity: 'info',
      complianceRelated: true,
      metadata: {
        passwordChangedAt: now.toISOString(),
        oldTokensInvalidated: true
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      message: "Senha alterada com sucesso",
      info: "Todas as sessões anteriores foram invalidadas por segurança"
    })
  } catch (error) {
    console.error("Erro ao alterar senha:", error)

    await logAuditEvent({
      userId,
      action: 'password_change_failed',
      resourceType: AUDIT_RESOURCES.USER,
      resourceId: userId.toString(),
      severity: 'critical',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
