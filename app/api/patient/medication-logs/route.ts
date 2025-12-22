import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { medicationLogs, medications, medicationSchedules } from "@/db/schema"
import { getUserIdFromRequest } from "@/lib/auth"
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response"
import { eq, and, desc, gte, lte, sql } from "drizzle-orm"
import { z } from "zod"

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateLogSchema = z.object({
  medicationId: z.number().int().positive(),
  scheduleId: z.number().int().positive().optional(),
  scheduledTime: z.string(), // ISO timestamp
  actualTime: z.string().optional(), // ISO timestamp (null if skipped)
  dosageTaken: z.string().optional(),
  status: z.enum(["taken", "skipped", "missed", "pending"]),
  skipReason: z.enum(["forgot", "side_effects", "no_medication", "other"]).optional(),
  skipNotes: z.string().optional(),
  hadSideEffects: z.boolean().optional().default(false),
  sideEffectsDescription: z.string().optional(),
  effectivenessRating: z.number().int().min(1).max(5).optional(),
  effectivenessNotes: z.string().optional(),
  moodBefore: z.number().int().min(1).max(10).optional(),
  moodAfter: z.number().int().min(1).max(10).optional(),
  symptomsBefore: z.string().optional(),
  symptomsAfter: z.string().optional(),
  notes: z.string().optional(),
})

const UpdateLogSchema = CreateLogSchema.partial()

// ============================================================================
// GET /api/patient/medication-logs - Get medication logs
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    // Query parameters
    const { searchParams } = new URL(request.url)
    const medicationId = searchParams.get("medicationId")
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Build query conditions
    const conditions = [eq(medicationLogs.userId, userId)]

    if (medicationId) {
      conditions.push(eq(medicationLogs.medicationId, parseInt(medicationId)))
    }

    if (status) {
      conditions.push(eq(medicationLogs.status, status))
    }

    if (startDate) {
      conditions.push(gte(medicationLogs.scheduledTime, new Date(startDate)))
    }

    if (endDate) {
      conditions.push(lte(medicationLogs.scheduledTime, new Date(endDate)))
    }

    // Fetch logs
    const logs = await db.query.medicationLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(medicationLogs.scheduledTime)],
      limit: Math.min(limit, 100), // Max 100 records
      with: {
        medication: {
          columns: {
            id: true,
            name: true,
            dosage: true,
            form: true,
          },
        },
        schedule: {
          columns: {
            id: true,
            timeOfDay: true,
            frequency: true,
          },
        },
      },
    })

    return apiSuccess({
      logs,
      count: logs.length,
    })
  } catch (error) {
    console.error("Error fetching medication logs:", error)
    return apiError("Erro ao buscar registros de medicação", { status: 500 })
  }
}

// ============================================================================
// POST /api/patient/medication-logs - Create medication log
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    const body = await request.json()
    const validatedData = CreateLogSchema.parse(body)

    // Verify medication ownership
    const medication = await db.query.medications.findFirst({
      where: and(
        eq(medications.id, validatedData.medicationId),
        eq(medications.userId, userId)
      ),
    })

    if (!medication) {
      return apiError("Medicamento não encontrado", { status: 404 })
    }

    // Verify schedule ownership if provided
    if (validatedData.scheduleId) {
      const schedule = await db.query.medicationSchedules.findFirst({
        where: and(
          eq(medicationSchedules.id, validatedData.scheduleId),
          eq(medicationSchedules.userId, userId)
        ),
      })

      if (!schedule) {
        return apiError("Agendamento não encontrado", { status: 404 })
      }
    }

    // Create log
    const [newLog] = await db
      .insert(medicationLogs)
      .values({
        medicationId: validatedData.medicationId,
        scheduleId: validatedData.scheduleId || null,
        userId,
        scheduledTime: new Date(validatedData.scheduledTime),
        actualTime: validatedData.actualTime ? new Date(validatedData.actualTime) : null,
        dosageTaken: validatedData.dosageTaken,
        status: validatedData.status,
        skipReason: validatedData.skipReason,
        skipNotes: validatedData.skipNotes,
        hadSideEffects: validatedData.hadSideEffects ?? false,
        sideEffectsDescription: validatedData.sideEffectsDescription,
        effectivenessRating: validatedData.effectivenessRating,
        effectivenessNotes: validatedData.effectivenessNotes,
        moodBefore: validatedData.moodBefore,
        moodAfter: validatedData.moodAfter,
        symptomsBefore: validatedData.symptomsBefore,
        symptomsAfter: validatedData.symptomsAfter,
        notes: validatedData.notes,
      })
      .returning()

    return apiSuccess(newLog, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Dados inválidos: " + error.errors.map((e) => e.message).join(", "), { status: 400 })
    }
    console.error("Error creating medication log:", error)
    return apiError("Erro ao criar registro de medicação", { status: 500 })
  }
}

// ============================================================================
// PATCH /api/patient/medication-logs/[id] - Update medication log
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return apiError("ID do registro é obrigatório", { status: 400 })
    }

    const validatedData = UpdateLogSchema.parse(updateData)

    // Verify ownership
    const existingLog = await db.query.medicationLogs.findFirst({
      where: and(
        eq(medicationLogs.id, id),
        eq(medicationLogs.userId, userId)
      ),
    })

    if (!existingLog) {
      return apiError("Registro não encontrado", { status: 404 })
    }

    // Build update object
    const update: any = {}

    if (validatedData.actualTime !== undefined) {
      update.actualTime = validatedData.actualTime ? new Date(validatedData.actualTime) : null
    }
    if (validatedData.dosageTaken !== undefined) update.dosageTaken = validatedData.dosageTaken
    if (validatedData.status !== undefined) update.status = validatedData.status
    if (validatedData.skipReason !== undefined) update.skipReason = validatedData.skipReason
    if (validatedData.skipNotes !== undefined) update.skipNotes = validatedData.skipNotes
    if (validatedData.hadSideEffects !== undefined) update.hadSideEffects = validatedData.hadSideEffects
    if (validatedData.sideEffectsDescription !== undefined) update.sideEffectsDescription = validatedData.sideEffectsDescription
    if (validatedData.effectivenessRating !== undefined) update.effectivenessRating = validatedData.effectivenessRating
    if (validatedData.effectivenessNotes !== undefined) update.effectivenessNotes = validatedData.effectivenessNotes
    if (validatedData.moodBefore !== undefined) update.moodBefore = validatedData.moodBefore
    if (validatedData.moodAfter !== undefined) update.moodAfter = validatedData.moodAfter
    if (validatedData.symptomsBefore !== undefined) update.symptomsBefore = validatedData.symptomsBefore
    if (validatedData.symptomsAfter !== undefined) update.symptomsAfter = validatedData.symptomsAfter
    if (validatedData.notes !== undefined) update.notes = validatedData.notes

    // Update log
    const [updatedLog] = await db
      .update(medicationLogs)
      .set(update)
      .where(and(
        eq(medicationLogs.id, id),
        eq(medicationLogs.userId, userId)
      ))
      .returning()

    return apiSuccess(updatedLog)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Dados inválidos: " + error.errors.map((e) => e.message).join(", "), { status: 400 })
    }
    console.error("Error updating medication log:", error)
    return apiError("Erro ao atualizar registro de medicação", { status: 500 })
  }
}
