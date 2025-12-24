import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, clinicUsers, clinics } from "@/db/schema"
import { eq, and, count, gte, sql } from "drizzle-orm"
import { getUserIdFromRequest, verifyAdminAccess } from "@/lib/auth"
import {
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiConflict,
  handleApiError
} from "@/lib/api-response"

/**
 * Safely get clinic memberships for a user, handling missing clinic_users table
 */
async function getUserClinicMemberships(userId: number): Promise<Array<{ clinicId: number; clinicName: string; role: string; status: string }>> {
  try {
    const result = await db.execute<{ clinic_id: number; clinic_name: string; role: string; status: string }>(
      sql`SELECT cu.clinic_id, c.name as clinic_name, cu.role, cu.status
          FROM clinic_users cu
          JOIN clinics c ON cu.clinic_id = c.id
          WHERE cu.user_id = ${userId}`
    )
    return (result.rows || []).map(row => ({
      clinicId: row.clinic_id,
      clinicName: row.clinic_name,
      role: row.role,
      status: row.status
    }))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ''
    if (errorMessage.includes('clinic_users') || errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
      return []
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized("Não autorizado")
    }

    // Verify user is admin using safe method
    const adminUser = await verifyAdminAccess(userId)
    if (!adminUser) {
      return apiForbidden("Acesso negado")
    }

    // Get all users using raw SQL to avoid selecting non-existent columns
    const usersResult = await db.execute<{
      id: number
      name: string
      email: string
      role: string
      avatar_url: string | null
      total_xp: number
      current_level: number
      weekly_points: number
      monthly_points: number
      streak: number
      last_activity_date: string | null
      status: string
      last_login_at: Date | null
      created_at: Date
      updated_at: Date
    }>(
      sql`SELECT id, name, email, role, avatar_url, total_xp, current_level, weekly_points,
          monthly_points, streak, last_activity_date, status, last_login_at, created_at, updated_at
          FROM users ORDER BY created_at DESC`
    )

    const allUsers = usersResult.rows || []

    // Get clinic memberships for each user
    const usersWithClinics = await Promise.all(
      allUsers.map(async (user) => {
        const clinicMemberships = await getUserClinicMemberships(user.id)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatar_url,
          totalXP: user.total_xp,
          currentLevel: user.current_level,
          weeklyPoints: user.weekly_points,
          monthlyPoints: user.monthly_points,
          streak: user.streak,
          lastActivityDate: user.last_activity_date,
          status: user.status,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          clinics: clinicMemberships.map(m => ({
            id: m.clinicId,
            name: m.clinicName,
            role: m.role,
            status: m.status
          }))
        }
      })
    )

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

    // Verify user is admin using safe method
    const adminUser = await verifyAdminAccess(userId)
    if (!adminUser) {
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

    // Check if email already exists using raw SQL
    const existingUserResult = await db.execute<{ id: number }>(
      sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`
    )

    if (existingUserResult.rows && existingUserResult.rows.length > 0) {
      return apiConflict("Email já está em uso", {
        code: "DUPLICATE_EMAIL",
        details: { field: "email" }
      })
    }

    // Hash password (you should use bcrypt or similar)
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user using raw SQL to handle potentially missing columns
    const createResult = await db.execute<{ id: number; name: string; email: string; role: string; status: string; created_at: Date }>(
      sql`INSERT INTO users (name, email, password_hash, role, status, created_at, updated_at)
          VALUES (${name}, ${email}, ${hashedPassword}, ${role}, 'active', NOW(), NOW())
          RETURNING id, name, email, role, status, created_at`
    )

    const newUser = createResult.rows?.[0]
    if (!newUser) {
      throw new Error("Failed to create user")
    }

    // If clinic is specified, try to add user to clinic (may fail if table doesn't exist)
    if (clinicId && role !== "admin") {
      try {
        // Verify clinic exists
        const clinicResult = await db.execute<{ id: number }>(
          sql`SELECT id FROM clinics WHERE id = ${clinicId} LIMIT 1`
        )

        if (clinicResult.rows && clinicResult.rows.length > 0) {
          await db.execute(
            sql`INSERT INTO clinic_users (clinic_id, user_id, role, status, joined_at, updated_at)
                VALUES (${clinicId}, ${newUser.id}, ${clinicRole}, 'active', NOW(), NOW())`
          )
        }
      } catch (error) {
        // If clinic_users table doesn't exist, just continue
        const errorMessage = error instanceof Error ? error.message : ''
        if (!errorMessage.includes('clinic_users') && !errorMessage.includes('does not exist') && !errorMessage.includes('relation')) {
          throw error
        }
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

export async function PUT(request: NextRequest) {
  try {
    const adminUserId = await getUserIdFromRequest(request)
    if (!adminUserId) {
      return apiUnauthorized("Nao autorizado")
    }

    // Verify user is admin using safe method
    const admin = await verifyAdminAccess(adminUserId)
    if (!admin) {
      return apiForbidden("Acesso negado")
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return apiBadRequest("ID do usuario e obrigatorio")
    }

    // Build SET clause dynamically based on provided updates
    // Only include columns that are likely to exist in the database
    const setClauses: string[] = []
    const values: unknown[] = []

    if (updates.name !== undefined) {
      setClauses.push(`name = $${values.length + 1}`)
      values.push(updates.name)
    }
    if (updates.email !== undefined) {
      setClauses.push(`email = $${values.length + 1}`)
      values.push(updates.email)
    }
    if (updates.role !== undefined) {
      setClauses.push(`role = $${values.length + 1}`)
      values.push(updates.role)
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${values.length + 1}`)
      values.push(updates.status)
    }
    if (updates.avatarUrl !== undefined) {
      setClauses.push(`avatar_url = $${values.length + 1}`)
      values.push(updates.avatarUrl)
    }

    // Handle password update
    if (updates.password) {
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash(updates.password, 10)
      setClauses.push(`password_hash = $${values.length + 1}`)
      values.push(hashedPassword)
    }

    setClauses.push(`updated_at = NOW()`)

    if (setClauses.length === 1) {
      return apiBadRequest("Nenhum campo para atualizar")
    }

    // Check email uniqueness if updating email
    if (updates.email) {
      const existingEmailResult = await db.execute<{ id: number }>(
        sql`SELECT id FROM users WHERE email = ${updates.email} AND id != ${id} LIMIT 1`
      )
      if (existingEmailResult.rows && existingEmailResult.rows.length > 0) {
        return apiConflict("Email ja esta em uso")
      }
    }

    // Execute update using raw SQL with dynamic SET clause
    values.push(id)
    const updateQuery = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING id, name, email, role, status, created_at, updated_at`

    const updateResult = await db.execute<{
      id: number
      name: string
      email: string
      role: string
      status: string
      created_at: Date
      updated_at: Date
    }>(sql.raw(updateQuery, values))

    const updatedUser = updateResult.rows?.[0]
    if (!updatedUser) {
      return apiBadRequest("Usuario nao encontrado")
    }

    return apiSuccess({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at
      }
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return handleApiError(error)
  }
}