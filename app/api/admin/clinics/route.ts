import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { clinics, clinicUsers, users } from "@/db/schema"
import { eq, and, count } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verify user is global admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Get all clinics with their basic stats
    const allClinics = await db.query.clinics.findMany({
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Get user counts for each clinic
    const clinicsWithStats = await Promise.all(
      allClinics.map(async (clinic) => {
        const userCount = await db
          .select({ count: count() })
          .from(clinicUsers)
          .where(
            and(
              eq(clinicUsers.clinicId, clinic.id),
              eq(clinicUsers.status, "active")
            )
          )

        return {
          ...clinic,
          totalUsers: userCount[0]?.count || 0,
          currentSubscription: null // Note: Subscription relation not available on clinics
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: clinicsWithStats
    })
  } catch (error) {
    console.error("Error fetching clinics:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Verify user is global admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      slug,
      description,
      email,
      phone,
      website,
      cnpj,
      ownerId,
      planType = "basic",
      maxUsers = 10,
      maxPsychologists = 5,
      maxPatients = 50,
      status = "active"
    } = body

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: "Nome e slug sao obrigatorios" },
        { status: 400 }
      )
    }

    // Check if slug is unique
    const existingClinic = await db.query.clinics.findFirst({
      where: eq(clinics.slug, slug)
    })

    if (existingClinic) {
      return NextResponse.json(
        { error: "Slug ja esta em uso" },
        { status: 400 }
      )
    }

    // Use provided ownerId or current admin user
    const finalOwnerId = ownerId || userId

    // Verify owner exists
    const owner = await db.query.users.findFirst({
      where: eq(users.id, finalOwnerId)
    })

    if (!owner) {
      return NextResponse.json(
        { error: "Proprietario nao encontrado" },
        { status: 400 }
      )
    }

    // Create clinic
    const [newClinic] = await db.insert(clinics).values({
      name,
      slug,
      description,
      email,
      phone,
      website,
      cnpj,
      ownerId: finalOwnerId,
      planType,
      maxUsers,
      maxPsychologists,
      maxPatients,
      status
    }).returning()

    // Add owner as clinic admin
    await db.insert(clinicUsers).values({
      clinicId: newClinic.id,
      userId: finalOwnerId,
      role: "owner",
      status: "active"
    })

    return NextResponse.json({
      success: true,
      data: newClinic
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating clinic:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Verify user is global admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "ID da clinica e obrigatorio" }, { status: 400 })
    }

    // Build update object
    const updateValues: Record<string, unknown> = {}

    if (updates.name !== undefined) updateValues.name = updates.name
    if (updates.slug !== undefined) updateValues.slug = updates.slug
    if (updates.description !== undefined) updateValues.description = updates.description
    if (updates.email !== undefined) updateValues.email = updates.email
    if (updates.phone !== undefined) updateValues.phone = updates.phone
    if (updates.website !== undefined) updateValues.website = updates.website
    if (updates.cnpj !== undefined) updateValues.cnpj = updates.cnpj
    if (updates.planType !== undefined) updateValues.planType = updates.planType
    if (updates.maxUsers !== undefined) updateValues.maxUsers = updates.maxUsers
    if (updates.maxPsychologists !== undefined) updateValues.maxPsychologists = updates.maxPsychologists
    if (updates.maxPatients !== undefined) updateValues.maxPatients = updates.maxPatients
    if (updates.status !== undefined) updateValues.status = updates.status
    updateValues.updatedAt = new Date()

    // Check slug uniqueness if updating slug
    if (updates.slug) {
      const existingClinic = await db.query.clinics.findFirst({
        where: eq(clinics.slug, updates.slug)
      })
      if (existingClinic && existingClinic.id !== id) {
        return NextResponse.json({ error: "Slug ja esta em uso" }, { status: 400 })
      }
    }

    const [updatedClinic] = await db
      .update(clinics)
      .set(updateValues)
      .where(eq(clinics.id, id))
      .returning()

    if (!updatedClinic) {
      return NextResponse.json({ error: "Clinica nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: updatedClinic
    })
  } catch (error) {
    console.error("Error updating clinic:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Verify user is global admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const clinicId = searchParams.get("id")

    if (!clinicId) {
      return NextResponse.json({ error: "ID da clinica e obrigatorio" }, { status: 400 })
    }

    // Check if clinic has users
    const userCount = await db
      .select({ count: count() })
      .from(clinicUsers)
      .where(eq(clinicUsers.clinicId, parseInt(clinicId)))

    if (Number(userCount[0]?.count || 0) > 0) {
      return NextResponse.json(
        { error: "Nao e possivel excluir uma clinica com usuarios" },
        { status: 400 }
      )
    }

    await db.delete(clinics).where(eq(clinics.id, parseInt(clinicId)))

    return NextResponse.json({ success: true, message: "Clinica excluida com sucesso" })
  } catch (error) {
    console.error("Error deleting clinic:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}