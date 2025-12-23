import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { EmailService } from "@/lib/email"
import { logAuditEvent, AUDIT_RESOURCES, getRequestInfo } from "@/lib/audit"
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit"
import { safeError } from "@/lib/safe-logger"

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  // Apply strict rate limiting to prevent abuse
  const rateLimitResult = await rateLimit(request, RateLimitPresets.AUTH)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  const { ipAddress, userAgent } = getRequestInfo(request)

  try {
    const body = await request.json()
    const parsedBody = forgotPasswordSchema.safeParse(body)

    if (!parsedBody.success) {
      // Return success to prevent email enumeration
      return NextResponse.json({
        message: "If a user with this email exists, a reset link has been sent.",
      })
    }

    const { email } = parsedBody.data

    // Check if user exists (but don't reveal this to the client)
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    // Log the attempt
    await logAuditEvent({
      userId: user?.id,
      action: 'password_reset_requested',
      resourceType: AUDIT_RESOURCES.USER,
      resourceId: user?.id?.toString(),
      metadata: {
        email: email,
        userFound: !!user,
      },
      ipAddress,
      userAgent,
    })

    if (user) {
      // TODO: Implement actual password reset email
      // For now, we'll just log that a reset was requested
      // In production, this would:
      // 1. Generate a secure reset token
      // 2. Store it in the database with expiration
      // 3. Send an email with the reset link

      const emailService = EmailService.getInstance()

      // Send a placeholder email (the actual reset functionality needs database schema updates)
      try {
        await emailService.sendEmail({
          to: email,
          subject: "Recuperação de Senha - CÁRIS",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Recuperação de Senha - CÁRIS</title>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #2D9B9B, #1E7A7A); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                  .info { background: #fff3cd; color: #856404; padding: 15px; border-radius: 6px; margin: 15px 0; }
                  .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Recuperação de Senha</h1>
                    <p>Solicitação recebida</p>
                  </div>
                  <div class="content">
                    <p>Olá, <strong>${user.name}</strong>!</p>

                    <p>Recebemos uma solicitação de recuperação de senha para sua conta no CÁRIS.</p>

                    <div class="info">
                      <strong>Importante:</strong> A funcionalidade de redefinição de senha está em desenvolvimento.
                      Por favor, entre em contato com o suporte para redefinir sua senha.
                    </div>

                    <p>Se você não solicitou esta recuperação, ignore este e-mail.</p>

                    <div class="footer">
                      <p>Equipe CÁRIS</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `,
        })
      } catch (emailError) {
        safeError("[FORGOT_PASSWORD]", "Failed to send email:", emailError)
        // Don't fail the request if email fails
      }
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({
      message: "If a user with this email exists, a reset link has been sent.",
    })
  } catch (error) {
    safeError("[FORGOT_PASSWORD]", "Error processing forgot password request:", error)

    // Return success even on error to prevent enumeration
    return NextResponse.json({
      message: "If a user with this email exists, a reset link has been sent.",
    })
  }
}
