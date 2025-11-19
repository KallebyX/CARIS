import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/rbac"
import { db } from "@/db"
import { users, clinicUsers, clinics } from "@/db/schema"
import { eq, and, count, gte } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"
import {
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiConflict,
  handleApiError
} from "@/lib/api-response"

export async function GET(request: NextRequest) {
  // SECURITY: Require admin role using centralized RBAC middleware
  const authError = await requireRole(request, 'admin')
  if (authError) return authError

  try {

    // Get all users with their clinic associations
    const allUsers = await db.query.users.findMany({
      columns: {
        password: false // Exclude password from response
      },
      with: {
        clinicMemberships: {
          with: {
            clinic: {
              columns: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Transform data to include clinic information
    const usersWithClinics = allUsers.map(user => ({
      ...user,
      clinics: user.clinicMemberships.map(membership => ({
        id: membership.clinic.id,
        name: membership.clinic.name,
        role: membership.role,
        status: membership.status
      }))
    }))

    return apiSuccess({ users: usersWithClinics })
  } catch (error) {
    console.error("Error fetching users:", error)
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    // Verify user is global admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return apiForbidden("Acesso negado")
    }

    const body = await request.json()
    const {
      name,
      email,
      password,
      role,
      isGlobalAdmin = false,
      clinicId,
      clinicRole = "patient"
    } = body

    // Validate required fields
    if (!name || !email || !password || !role) {
      return apiBadRequest("Nome, email, senha e papel são obrigatórios", {
        code: "MISSING_FIELDS",
        details: {
          required: ["name", "email", "password", "role"],
          provided: { name: !!name, email: !!email, password: !!password, role: !!role }
        }
      })
    }

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    })

    if (existingUser) {
      return apiConflict("Email já está em uso", {
        code: "DUPLICATE_EMAIL",
        details: { field: "email" }
      })
    }

    // Hash password (you should use bcrypt or similar)
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const [newUser] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role,
      isGlobalAdmin,
      status: "active"
    }).returning()

    // If clinic is specified, add user to clinic
    if (clinicId && role !== "admin") {
      // Verify clinic exists
      const clinic = await db.query.clinics.findFirst({
        where: eq(clinics.id, clinicId)
      })

      if (clinic) {
        await db.insert(clinicUsers).values({
          clinicId,
          userId: newUser.id,
          role: clinicRole,
          status: "active"
        })
      }
    }

    // Return user without password
    const { password: _, ...userResponse } = newUser

    return apiCreated({ user: userResponse })
  } catch (error) {
    console.error("Error creating user:", error)
    return handleApiError(error)
  }
}