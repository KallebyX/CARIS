import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest, verifyAdminAccess } from "@/lib/auth"
import { db } from "@/db"
import { sql } from "drizzle-orm"

/**
 * GET /api/admin/settings/test
 * Tests connection to various services (database, email, etc.)
 */
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

    const category = request.nextUrl.searchParams.get("category")

    if (!category) {
      return NextResponse.json({ error: "Categoria nao especificada" }, { status: 400 })
    }

    let result: { success: boolean; message: string; details?: Record<string, unknown> }

    switch (category) {
      case "database":
        result = await testDatabase()
        break
      case "auth":
        result = testAuth()
        break
      case "email":
        result = testEmail()
        break
      case "payments":
        result = testPayments()
        break
      case "realtime":
        result = testRealtime()
        break
      case "ai":
        result = testAI()
        break
      case "sms":
        result = testSMS()
        break
      case "storage":
        result = testStorage()
        break
      default:
        return NextResponse.json({ error: "Categoria desconhecida" }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error testing settings:", error)
    return NextResponse.json(
      { success: false, error: "Erro ao testar configuracao" },
      { status: 500 }
    )
  }
}

async function testDatabase(): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> {
  try {
    // Test database connection with a simple query
    const result = await db.execute<{ now: Date }>(sql`SELECT NOW() as now`)

    if (result.rows && result.rows.length > 0) {
      return {
        success: true,
        message: "Conexao com banco de dados estabelecida com sucesso",
        details: {
          serverTime: result.rows[0].now,
          configured: !!process.env.POSTGRES_URL || !!process.env.DATABASE_URL
        }
      }
    }

    return {
      success: false,
      message: "Nao foi possivel verificar a conexao"
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro na conexao: ${error instanceof Error ? error.message : "Erro desconhecido"}`
    }
  }
}

function testAuth(): { success: boolean; message: string; details?: Record<string, unknown> } {
  const jwtConfigured = !!process.env.JWT_SECRET
  const superAdminConfigured = !!process.env.SUPER_ADMIN_PASSWORD

  if (jwtConfigured && superAdminConfigured) {
    return {
      success: true,
      message: "Configuracoes de autenticacao OK",
      details: {
        jwt: jwtConfigured,
        superAdmin: superAdminConfigured
      }
    }
  }

  return {
    success: false,
    message: "Configuracoes de autenticacao incompletas",
    details: {
      jwt: jwtConfigured,
      superAdmin: superAdminConfigured
    }
  }
}

function testEmail(): { success: boolean; message: string; details?: Record<string, unknown> } {
  const resendConfigured = !!process.env.RESEND_API_KEY
  const emailFromConfigured = !!process.env.EMAIL_FROM

  if (resendConfigured) {
    return {
      success: true,
      message: "Configuracoes de email OK",
      details: {
        resend: resendConfigured,
        emailFrom: emailFromConfigured,
        fromAddress: process.env.EMAIL_FROM || "Nao configurado"
      }
    }
  }

  return {
    success: false,
    message: "API Key do Resend nao configurada",
    details: {
      resend: resendConfigured,
      emailFrom: emailFromConfigured
    }
  }
}

function testPayments(): { success: boolean; message: string; details?: Record<string, unknown> } {
  const secretKey = !!process.env.STRIPE_SECRET_KEY
  const publishableKey = !!process.env.STRIPE_PUBLISHABLE_KEY
  const webhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET

  if (secretKey && publishableKey) {
    return {
      success: true,
      message: "Configuracoes de pagamento OK",
      details: {
        secretKey,
        publishableKey,
        webhookSecret
      }
    }
  }

  return {
    success: false,
    message: "Configuracoes do Stripe incompletas",
    details: {
      secretKey,
      publishableKey,
      webhookSecret
    }
  }
}

function testRealtime(): { success: boolean; message: string; details?: Record<string, unknown> } {
  const appId = !!process.env.PUSHER_APP_ID
  const key = !!process.env.PUSHER_KEY
  const secret = !!process.env.PUSHER_SECRET
  const cluster = !!process.env.PUSHER_CLUSTER

  if (appId && key && secret && cluster) {
    return {
      success: true,
      message: "Configuracoes de tempo real OK",
      details: {
        appId,
        key,
        secret,
        cluster,
        clusterValue: process.env.PUSHER_CLUSTER
      }
    }
  }

  return {
    success: false,
    message: "Configuracoes do Pusher incompletas",
    details: {
      appId,
      key,
      secret,
      cluster
    }
  }
}

function testAI(): { success: boolean; message: string; details?: Record<string, unknown> } {
  const openai = !!process.env.OPENAI_API_KEY
  const anthropic = !!process.env.ANTHROPIC_API_KEY

  if (openai || anthropic) {
    return {
      success: true,
      message: "Configuracoes de IA OK",
      details: {
        openai,
        anthropic
      }
    }
  }

  return {
    success: false,
    message: "Nenhuma API de IA configurada",
    details: {
      openai,
      anthropic
    }
  }
}

function testSMS(): { success: boolean; message: string; details?: Record<string, unknown> } {
  const accountSid = !!process.env.TWILIO_ACCOUNT_SID
  const authToken = !!process.env.TWILIO_AUTH_TOKEN
  const phoneNumber = !!process.env.TWILIO_PHONE_NUMBER

  if (accountSid && authToken && phoneNumber) {
    return {
      success: true,
      message: "Configuracoes de SMS OK",
      details: {
        accountSid,
        authToken,
        phoneNumber,
        phone: process.env.TWILIO_PHONE_NUMBER
      }
    }
  }

  return {
    success: false,
    message: "Configuracoes do Twilio incompletas",
    details: {
      accountSid,
      authToken,
      phoneNumber
    }
  }
}

function testStorage(): { success: boolean; message: string; details?: Record<string, unknown> } {
  const accessKey = !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretKey = !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucket = !!process.env.CLOUDFLARE_R2_BUCKET_NAME
  const endpoint = !!process.env.CLOUDFLARE_R2_ENDPOINT

  if (accessKey && secretKey && bucket) {
    return {
      success: true,
      message: "Configuracoes de armazenamento OK",
      details: {
        accessKey,
        secretKey,
        bucket,
        endpoint,
        bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME
      }
    }
  }

  return {
    success: false,
    message: "Configuracoes do Cloudflare R2 incompletas",
    details: {
      accessKey,
      secretKey,
      bucket,
      endpoint
    }
  }
}
