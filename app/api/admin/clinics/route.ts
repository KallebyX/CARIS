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
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
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
      ownerId,
      planType = "basic",
      maxUsers = 10,
      maxPsychologists = 5,
      maxPatients = 50
    } = body

    // Validate required fields
    if (!name || !slug || !ownerId) {
      return NextResponse.json(
        { error: "Nome, slug e proprietário são obrigatórios" },
        { status: 400 }
      )
    }

    // Check if slug is unique
    const existingClinic = await db.query.clinics.findFirst({
      where: eq(clinics.slug, slug)
    })

    if (existingClinic) {
      return NextResponse.json(
        { error: "Slug já está em uso" },
        { status: 400 }
      )
    }

    // Verify owner exists
    const owner = await db.query.users.findFirst({
      where: eq(users.id, ownerId)
    })

    if (!owner) {
      return NextResponse.json(
        { error: "Proprietário não encontrado" },
        { status: 400 }
      )
    }

    // Create clinic
    const [newClinic] = await db.insert(clinics).values({
      name,
      slug,
      description,
      ownerId,
      planType,
      maxUsers,
      maxPsychologists,
      maxPatients,
      status: "active"
    }).returning()

    // Add owner as clinic admin
    await db.insert(clinicUsers).values({
      clinicId: newClinic.id,
      userId: ownerId,
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