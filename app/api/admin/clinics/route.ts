import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest, verifyAdminAccess } from "@/lib/auth"
import { db } from "@/db"
import { clinics, clinicUsers, users } from "@/db/schema"
import { eq, and, count, sql } from "drizzle-orm"

/**
 * Safely get user count for a clinic, handling missing clinic_users table
 */
async function getClinicUserCount(clinicId: number): Promise<number> {
  try {
    const userCount = await db
      .select({ count: count() })
      .from(clinicUsers)
      .where(
        and(
          eq(clinicUsers.clinicId, clinicId),
          eq(clinicUsers.status, "active")
        )
      )
    return userCount[0]?.count || 0
  } catch (error) {
    // If clinic_users table doesn't exist, return 0
    const errorMessage = error instanceof Error ? error.message : ''
    if (errorMessage.includes('clinic_users') || errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
      return 0
    }
    throw error
  }
}

/**
 * Safely get clinic owner info using raw SQL to avoid selecting non-existent columns
 */
async function getClinicOwner(ownerId: number): Promise<{ id: number; name: string; email: string } | null> {
  try {
    const result = await db.execute<{ id: number; name: string; email: string }>(
      sql`SELECT id, name, email FROM users WHERE id = ${ownerId} LIMIT 1`
    )
    if (result.rows && result.rows.length > 0) {
      return result.rows[0]
    }
    return null
  } catch (error) {
    console.error("Error fetching clinic owner:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verify user is global admin using safe method
    const adminUser = await verifyAdminAccess(userId)
    if (!adminUser) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Get all clinics using raw SQL to avoid selecting non-existent columns
    const clinicsResult = await db.execute<{
      id: number
      name: string
      slug: string
      description: string | null
      logo_url: string | null
      website: string | null
      phone: string | null
      email: string | null
      address: string | null
      cnpj: string | null
      owner_id: number
      status: string
      plan_type: string
      max_users: number
      max_psychologists: number
      max_patients: number
      settings: unknown
      created_at: Date
      updated_at: Date
    }>(
      sql`SELECT id, name, slug, description, logo_url, website, phone, email, address, cnpj,
          owner_id, status, plan_type, max_users, max_psychologists, max_patients, settings,
          created_at, updated_at
          FROM clinics ORDER BY created_at DESC`
    )

    const allClinics = clinicsResult.rows || []

    // Get user counts and owner info for each clinic
    const clinicsWithStats = await Promise.all(
      allClinics.map(async (clinic) => {
        const [totalUsers, owner] = await Promise.all([
          getClinicUserCount(clinic.id),
          getClinicOwner(clinic.owner_id)
        ])

        return {
          id: clinic.id,
          name: clinic.name,
          slug: clinic.slug,
          description: clinic.description,
          logo: clinic.logo_url,
          website: clinic.website,
          phone: clinic.phone,
          email: clinic.email,
          address: clinic.address,
          cnpj: clinic.cnpj,
          ownerId: clinic.owner_id,
          status: clinic.status,
          planType: clinic.plan_type,
          maxUsers: clinic.max_users,
          maxPsychologists: clinic.max_psychologists,
          maxPatients: clinic.max_patients,
          settings: clinic.settings,
          createdAt: clinic.created_at,
          updatedAt: clinic.updated_at,
          owner,
          totalUsers,
          currentSubscription: null
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

    // Verify user is global admin using safe method
    const adminUser = await verifyAdminAccess(userId)
    if (!adminUser) {
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

    // Verify owner exists using raw SQL
    const ownerResult = await db.execute<{ id: number }>(
      sql`SELECT id FROM users WHERE id = ${finalOwnerId} LIMIT 1`
    )

    if (!ownerResult.rows || ownerResult.rows.length === 0) {
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

    // Try to add owner as clinic admin (may fail if clinic_users table doesn't exist)
    try {
      await db.insert(clinicUsers).values({
        clinicId: newClinic.id,
        userId: finalOwnerId,
        role: "owner",
        status: "active"
      })
    } catch (error) {
      // If clinic_users table doesn't exist, just continue
      const errorMessage = error instanceof Error ? error.message : ''
      if (!errorMessage.includes('clinic_users') && !errorMessage.includes('does not exist') && !errorMessage.includes('relation')) {
        throw error
      }
    }

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

    // Verify user is global admin using safe method
    const adminUser = await verifyAdminAccess(userId)
    if (!adminUser) {
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

    // Verify user is global admin using safe method
    const adminUser = await verifyAdminAccess(userId)
    if (!adminUser) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const clinicId = searchParams.get("id")

    if (!clinicId) {
      return NextResponse.json({ error: "ID da clinica e obrigatorio" }, { status: 400 })
    }

    // Check if clinic has users (handle missing clinic_users table)
    const clinicUserCount = await getClinicUserCount(parseInt(clinicId))

    if (clinicUserCount > 0) {
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