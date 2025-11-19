import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { medications, medicationSchedules } from "@/db/schema"
import { getUserIdFromRequest } from "@/lib/auth"
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from "@/lib/api-response"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

// ============================================================================
// SCHEMAS
// ============================================================================

const UpdateMedicationSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  genericName: z.string().optional(),
  dosage: z.string().min(1, "Dosagem é obrigatória").optional(),
  form: z.enum(["tablet", "capsule", "liquid", "injection", "topical", "inhaler", "other"]).optional(),
  purpose: z.string().optional(),
  prescribingDoctor: z.string().optional(),
  prescriptionNumber: z.string().optional(),
  pharmacy: z.string().optional(),
  instructions: z.string().optional(),
  foodInstructions: z.string().optional(),
  sideEffects: z.string().optional(),
  interactions: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  refillDate: z.string().optional(),
  refillCount: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isAsNeeded: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  notes: z.string().optional(),
})

// ============================================================================
// GET /api/patient/medications/[id] - Get single medication
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    const medicationId = parseInt(params.id)
    if (isNaN(medicationId)) {
      return apiError("ID de medicamento inválido", 400)
    }

    // Fetch medication with schedules
    const medication = await db.query.medications.findFirst({
      where: and(
        eq(medications.id, medicationId),
        eq(medications.userId, userId)
      ),
      with: {
        schedules: {
          where: eq(medicationSchedules.isActive, true),
        },
      },
    })

    if (!medication) {
      return apiNotFound("Medicamento não encontrado")
    }

    return apiSuccess(medication)
  } catch (error) {
    console.error("Error fetching medication:", error)
    return apiError("Erro ao buscar medicamento", 500)
  }
}

// ============================================================================
// PATCH /api/patient/medications/[id] - Update medication
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    const medicationId = parseInt(params.id)
    if (isNaN(medicationId)) {
      return apiError("ID de medicamento inválido", 400)
    }

    // Verify ownership
    const existingMedication = await db.query.medications.findFirst({
      where: and(
        eq(medications.id, medicationId),
        eq(medications.userId, userId)
      ),
    })

    if (!existingMedication) {
      return apiNotFound("Medicamento não encontrado")
    }

    const body = await request.json()
    const validatedData = UpdateMedicationSchema.parse(body)

    // Build update object (only include defined fields)
    const updateData: any = {}

    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.genericName !== undefined) updateData.genericName = validatedData.genericName
    if (validatedData.dosage !== undefined) updateData.dosage = validatedData.dosage
    if (validatedData.form !== undefined) updateData.form = validatedData.form
    if (validatedData.purpose !== undefined) updateData.purpose = validatedData.purpose
    if (validatedData.prescribingDoctor !== undefined) updateData.prescribingDoctor = validatedData.prescribingDoctor
    if (validatedData.prescriptionNumber !== undefined) updateData.prescriptionNumber = validatedData.prescriptionNumber
    if (validatedData.pharmacy !== undefined) updateData.pharmacy = validatedData.pharmacy
    if (validatedData.instructions !== undefined) updateData.instructions = validatedData.instructions
    if (validatedData.foodInstructions !== undefined) updateData.foodInstructions = validatedData.foodInstructions
    if (validatedData.sideEffects !== undefined) updateData.sideEffects = validatedData.sideEffects
    if (validatedData.interactions !== undefined) updateData.interactions = validatedData.interactions
    if (validatedData.startDate !== undefined) updateData.startDate = new Date(validatedData.startDate)
    if (validatedData.endDate !== undefined) updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null
    if (validatedData.refillDate !== undefined) updateData.refillDate = validatedData.refillDate ? new Date(validatedData.refillDate) : null
    if (validatedData.refillCount !== undefined) updateData.refillCount = validatedData.refillCount
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive
    if (validatedData.isAsNeeded !== undefined) updateData.isAsNeeded = validatedData.isAsNeeded
    if (validatedData.stockQuantity !== undefined) updateData.stockQuantity = validatedData.stockQuantity
    if (validatedData.lowStockThreshold !== undefined) updateData.lowStockThreshold = validatedData.lowStockThreshold
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes

    // Update medication
    const [updatedMedication] = await db
      .update(medications)
      .set(updateData)
      .where(and(
        eq(medications.id, medicationId),
        eq(medications.userId, userId)
      ))
      .returning()

    return apiSuccess(updatedMedication)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Dados inválidos: " + error.errors.map((e) => e.message).join(", "), 400)
    }
    console.error("Error updating medication:", error)
    return apiError("Erro ao atualizar medicamento", 500)
  }
}

// ============================================================================
// DELETE /api/patient/medications/[id] - Delete medication (soft delete)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    const medicationId = parseInt(params.id)
    if (isNaN(medicationId)) {
      return apiError("ID de medicamento inválido", 400)
    }

    // Verify ownership
    const existingMedication = await db.query.medications.findFirst({
      where: and(
        eq(medications.id, medicationId),
        eq(medications.userId, userId)
      ),
    })

    if (!existingMedication) {
      return apiNotFound("Medicamento não encontrado")
    }

    // Soft delete (set isActive to false)
    await db
      .update(medications)
      .set({ isActive: false })
      .where(and(
        eq(medications.id, medicationId),
        eq(medications.userId, userId)
      ))

    // Also deactivate all schedules
    await db
      .update(medicationSchedules)
      .set({ isActive: false })
      .where(eq(medicationSchedules.medicationId, medicationId))

    return apiSuccess({ message: "Medicamento desativado com sucesso" })
  } catch (error) {
    console.error("Error deleting medication:", error)
    return apiError("Erro ao deletar medicamento", 500)
  }
}
