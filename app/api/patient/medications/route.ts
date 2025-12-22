import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { medications, medicationSchedules } from "@/db/schema"
import { getUserIdFromRequest } from "@/lib/auth"
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response"
import { eq, and, desc } from "drizzle-orm"
import { z } from "zod"

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateMedicationSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  genericName: z.string().optional(),
  dosage: z.string().min(1, "Dosagem é obrigatória"),
  form: z.enum(["tablet", "capsule", "liquid", "injection", "topical", "inhaler", "other"]).optional(),
  purpose: z.string().optional(),
  prescribingDoctor: z.string().optional(),
  prescriptionNumber: z.string().optional(),
  pharmacy: z.string().optional(),
  instructions: z.string().optional(),
  foodInstructions: z.string().optional(),
  sideEffects: z.string().optional(),
  interactions: z.string().optional(),
  startDate: z.string(), // ISO date string
  endDate: z.string().optional(), // ISO date string
  refillDate: z.string().optional(), // ISO date string
  refillCount: z.number().int().min(0).optional(),
  isActive: z.boolean().optional().default(true),
  isAsNeeded: z.boolean().optional().default(false),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  // Optional schedule to create along with medication
  schedule: z.object({
    timeOfDay: z.string(), // "HH:MM" format
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    frequency: z.enum(["daily", "weekly", "monthly", "as_needed", "specific_days"]),
    dosageAmount: z.string(),
    dosageUnit: z.string().optional(),
    reminderEnabled: z.boolean().optional().default(true),
    reminderMinutesBefore: z.number().int().min(0).optional().default(15),
    notificationChannels: z.array(z.enum(["push", "sms", "email"])).optional(),
  }).optional(),
})

const UpdateMedicationSchema = CreateMedicationSchema.partial()

// ============================================================================
// GET /api/patient/medications - List all medications for user
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    // Query parameters for filtering
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("active") === "true"
    const includeSchedules = searchParams.get("includeSchedules") === "true"

    // Build query conditions
    const conditions = [eq(medications.userId, userId)]
    if (activeOnly) {
      conditions.push(eq(medications.isActive, true))
    }

    // Fetch medications
    const userMedications = await db.query.medications.findMany({
      where: and(...conditions),
      orderBy: [desc(medications.createdAt)],
      with: includeSchedules ? {
        schedules: {
          where: eq(medicationSchedules.isActive, true),
        },
      } : undefined,
    })

    return apiSuccess({
      medications: userMedications,
      count: userMedications.length,
    })
  } catch (error) {
    console.error("Error fetching medications:", error)
    return apiError("Erro ao buscar medicamentos", { status: 500 })
  }
}

// ============================================================================
// POST /api/patient/medications - Create new medication
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    const body = await request.json()
    const validatedData = CreateMedicationSchema.parse(body)

    // Extract schedule data if provided
    const { schedule: scheduleData, ...medicationData } = validatedData

    // Create medication
    const [newMedication] = await db
      .insert(medications)
      .values({
        userId,
        name: medicationData.name,
        genericName: medicationData.genericName,
        dosage: medicationData.dosage,
        form: medicationData.form,
        purpose: medicationData.purpose,
        prescribingDoctor: medicationData.prescribingDoctor,
        prescriptionNumber: medicationData.prescriptionNumber,
        pharmacy: medicationData.pharmacy,
        instructions: medicationData.instructions,
        foodInstructions: medicationData.foodInstructions,
        sideEffects: medicationData.sideEffects,
        interactions: medicationData.interactions,
        startDate: medicationData.startDate,
        endDate: medicationData.endDate ?? null,
        refillDate: medicationData.refillDate ?? null,
        refillCount: medicationData.refillCount ?? 0,
        isActive: medicationData.isActive ?? true,
        isAsNeeded: medicationData.isAsNeeded ?? false,
        stockQuantity: medicationData.stockQuantity,
        lowStockThreshold: medicationData.lowStockThreshold,
        notes: medicationData.notes,
      })
      .returning()

    // Create schedule if provided
    let newSchedule = null
    if (scheduleData && newMedication) {
      ;[newSchedule] = await db
        .insert(medicationSchedules)
        .values({
          medicationId: newMedication.id,
          userId,
          timeOfDay: scheduleData.timeOfDay,
          daysOfWeek: scheduleData.daysOfWeek,
          frequency: scheduleData.frequency,
          dosageAmount: scheduleData.dosageAmount,
          dosageUnit: scheduleData.dosageUnit,
          reminderEnabled: scheduleData.reminderEnabled ?? true,
          reminderMinutesBefore: scheduleData.reminderMinutesBefore ?? 15,
          notificationChannels: scheduleData.notificationChannels,
        })
        .returning()
    }

    return apiSuccess(
      {
        medication: newMedication,
        schedule: newSchedule,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Dados inválidos: " + error.errors.map((e) => e.message).join(", "), { status: 400 })
    }
    console.error("Error creating medication:", error)
    return apiError("Erro ao criar medicamento", { status: 500 })
  }
}
