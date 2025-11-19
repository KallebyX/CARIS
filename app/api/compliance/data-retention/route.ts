import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { requireRole } from "@/lib/rbac"
import {
  enforceDataRetentionPolicies,
  previewDataRetention,
} from "@/lib/data-retention"
import { apiUnauthorized, apiForbidden, apiSuccess, apiBadRequest, handleApiError } from "@/lib/api-response"
import { safeError } from "@/lib/safe-logger"
import { z } from "zod"

// Cron secret for automated calls
const CRON_SECRET = process.env.DATA_RETENTION_CRON_SECRET

const RetentionEnforcementSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  batchSize: z.number().min(1).max(100).optional().default(50),
  specificUserId: z.number().optional(),
})

/**
 * POST /api/compliance/data-retention
 * Enforces data retention policies for all users
 *
 * This endpoint can be called by:
 * 1. Admins manually (requires admin role)
 * 2. Cron job (requires CRON_SECRET in Authorization header)
 *
 * @param dryRun - If true, only simulates deletion without actually deleting
 * @param batchSize - Number of users to process in each batch (default: 50)
 * @param specificUserId - If provided, only process this user
 */
export async function POST(request: NextRequest) {
  try {
    // Check if this is a cron job request
    const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '')

    if (cronSecret === CRON_SECRET && CRON_SECRET) {
      // Authenticated via cron secret
      console.log('[DATA_RETENTION] Cron job triggered')
    } else {
      // Require admin role
      const userId = await getUserIdFromRequest(request)
      if (!userId) {
        return apiUnauthorized("Não autorizado")
      }

      const roleCheck = await requireRole(request, 'admin')
      if (roleCheck instanceof NextResponse) {
        return apiForbidden("Acesso negado: requer permissão de administrador")
      }
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { dryRun, batchSize, specificUserId } = RetentionEnforcementSchema.parse(body)

    // Execute enforcement
    const result = await enforceDataRetentionPolicies({
      dryRun,
      batchSize,
      specificUserId,
    })

    return apiSuccess({
      ...result,
      message: dryRun
        ? `Dry run completo: ${result.totalRecordsDeleted} registros seriam deletados`
        : `Enforcement completo: ${result.totalRecordsDeleted} registros deletados, ${result.totalRecordsAnonymized} anonimizados`,
    })

  } catch (error) {
    safeError('[DATA_RETENTION_API]', 'Erro ao executar enforcement de retenção:', error)

    if (error instanceof z.ZodError) {
      return apiBadRequest("Parâmetros inválidos", {
        code: "VALIDATION_ERROR",
        details: error.errors,
      })
    }

    return handleApiError(error)
  }
}

/**
 * GET /api/compliance/data-retention/preview
 * Preview what data would be deleted for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    const preview = await previewDataRetention(userId)

    return apiSuccess({
      ...preview,
      message: `${preview.totalRecordsToDelete} registros serão deletados após ${preview.retentionDays} dias`,
    })

  } catch (error) {
    safeError('[DATA_RETENTION_PREVIEW]', 'Erro ao gerar preview de retenção:', error)
    return handleApiError(error)
  }
}
