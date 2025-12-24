import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest, verifyAdminAccess } from "@/lib/auth"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

// GET: Fetch current settings configuration status
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Check if user is admin using safe method
    const adminUser = await verifyAdminAccess(userId)
    if (!adminUser) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Return settings configuration status (not actual values for security)
    const settings = [
      {
        id: "database",
        name: "Banco de Dados",
        keys: [
          { key: "POSTGRES_URL", isSecret: true, description: "URL de conexao do PostgreSQL", isConfigured: !!process.env.POSTGRES_URL },
          { key: "DATABASE_URL", isSecret: true, description: "URL alternativa do banco", isConfigured: !!process.env.DATABASE_URL },
        ]
      },
      {
        id: "auth",
        name: "Autenticacao",
        keys: [
          { key: "JWT_SECRET", isSecret: true, description: "Chave secreta para assinatura de tokens JWT", isConfigured: !!process.env.JWT_SECRET },
          { key: "SUPER_ADMIN_PASSWORD", isSecret: true, description: "Senha do super administrador", isConfigured: !!process.env.SUPER_ADMIN_PASSWORD },
        ]
      },
      {
        id: "email",
        name: "Email (Resend)",
        keys: [
          { key: "RESEND_API_KEY", isSecret: true, description: "API Key do Resend para envio de emails", isConfigured: !!process.env.RESEND_API_KEY },
          { key: "EMAIL_FROM", isSecret: false, description: "Email de origem para envio", isConfigured: !!process.env.EMAIL_FROM, value: process.env.EMAIL_FROM || "" },
        ]
      },
      {
        id: "payments",
        name: "Pagamentos (Stripe)",
        keys: [
          { key: "STRIPE_SECRET_KEY", isSecret: true, description: "Chave secreta do Stripe", isConfigured: !!process.env.STRIPE_SECRET_KEY },
          { key: "STRIPE_PUBLISHABLE_KEY", isSecret: false, description: "Chave publica do Stripe", isConfigured: !!process.env.STRIPE_PUBLISHABLE_KEY, value: process.env.STRIPE_PUBLISHABLE_KEY ? "pk_***" : "" },
          { key: "STRIPE_WEBHOOK_SECRET", isSecret: true, description: "Secret do webhook do Stripe", isConfigured: !!process.env.STRIPE_WEBHOOK_SECRET },
        ]
      },
      {
        id: "realtime",
        name: "Tempo Real (Pusher)",
        keys: [
          { key: "PUSHER_APP_ID", isSecret: false, description: "ID do app Pusher", isConfigured: !!process.env.PUSHER_APP_ID, value: process.env.PUSHER_APP_ID || "" },
          { key: "PUSHER_KEY", isSecret: false, description: "Chave publica do Pusher", isConfigured: !!process.env.PUSHER_KEY, value: process.env.PUSHER_KEY || "" },
          { key: "PUSHER_SECRET", isSecret: true, description: "Chave secreta do Pusher", isConfigured: !!process.env.PUSHER_SECRET },
          { key: "PUSHER_CLUSTER", isSecret: false, description: "Cluster do Pusher (ex: sa1)", isConfigured: !!process.env.PUSHER_CLUSTER, value: process.env.PUSHER_CLUSTER || "" },
        ]
      },
      {
        id: "ai",
        name: "Inteligencia Artificial",
        keys: [
          { key: "OPENAI_API_KEY", isSecret: true, description: "API Key do OpenAI para analise de IA", isConfigured: !!process.env.OPENAI_API_KEY },
          { key: "ANTHROPIC_API_KEY", isSecret: true, description: "API Key do Anthropic (Claude)", isConfigured: !!process.env.ANTHROPIC_API_KEY },
        ]
      },
      {
        id: "sms",
        name: "SMS (Twilio)",
        keys: [
          { key: "TWILIO_ACCOUNT_SID", isSecret: false, description: "Account SID do Twilio", isConfigured: !!process.env.TWILIO_ACCOUNT_SID, value: process.env.TWILIO_ACCOUNT_SID || "" },
          { key: "TWILIO_AUTH_TOKEN", isSecret: true, description: "Auth Token do Twilio", isConfigured: !!process.env.TWILIO_AUTH_TOKEN },
          { key: "TWILIO_PHONE_NUMBER", isSecret: false, description: "Numero de telefone Twilio", isConfigured: !!process.env.TWILIO_PHONE_NUMBER, value: process.env.TWILIO_PHONE_NUMBER || "" },
        ]
      },
      {
        id: "storage",
        name: "Armazenamento",
        keys: [
          { key: "CLOUDFLARE_R2_ACCESS_KEY_ID", isSecret: true, description: "Access Key ID do Cloudflare R2", isConfigured: !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID },
          { key: "CLOUDFLARE_R2_SECRET_ACCESS_KEY", isSecret: true, description: "Secret Access Key do R2", isConfigured: !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY },
          { key: "CLOUDFLARE_R2_BUCKET_NAME", isSecret: false, description: "Nome do bucket R2", isConfigured: !!process.env.CLOUDFLARE_R2_BUCKET_NAME, value: process.env.CLOUDFLARE_R2_BUCKET_NAME || "" },
          { key: "CLOUDFLARE_R2_ENDPOINT", isSecret: false, description: "Endpoint do R2", isConfigured: !!process.env.CLOUDFLARE_R2_ENDPOINT, value: process.env.CLOUDFLARE_R2_ENDPOINT || "" },
        ]
      },
    ]

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// POST: Update settings (Note: In production, this should update environment variables securely)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Check if user is admin using safe method
    const adminUser = await verifyAdminAccess(userId)
    if (!adminUser) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // In a production environment, you would:
    // 1. Store secrets in a secrets manager (AWS Secrets Manager, Vault, etc.)
    // 2. Update environment variables through your deployment platform's API
    // 3. Trigger a redeployment if necessary

    // For now, we'll just acknowledge the request
    // Real implementation would require integration with Vercel/other platform APIs

    return NextResponse.json({
      success: true,
      message: "Configuracoes recebidas. Em ambiente de producao, as variaveis de ambiente devem ser configuradas diretamente no painel do provedor (Vercel, etc)."
    })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
