import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from './auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logAuditEvent } from './audit-service'
import { safeError } from './safe-logger'

/**
 * User roles in the system
 */
export type UserRole = 'patient' | 'psychologist' | 'admin'

/**
 * Granular permissions for fine-grained access control
 */
export type Permission =
  | 'read:own_data'
  | 'write:own_data'
  | 'read:patient_data'
  | 'write:patient_data'
  | 'read:all_data'
  | 'write:all_data'
  | 'manage:users'
  | 'manage:sessions'
  | 'manage:settings'
  | 'use:ai_features'
  | 'access:admin_panel'
  | 'export:data'
  | 'delete:data'

/**
 * Role-to-permissions mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  patient: [
    'read:own_data',
    'write:own_data',
    'use:ai_features',
    'export:data',
  ],
  psychologist: [
    'read:own_data',
    'write:own_data',
    'read:patient_data',
    'write:patient_data',
    'manage:sessions',
    'use:ai_features',
    'export:data',
  ],
  admin: [
    'read:own_data',
    'write:own_data',
    'read:patient_data',
    'write:patient_data',
    'read:all_data',
    'write:all_data',
    'manage:users',
    'manage:sessions',
    'manage:settings',
    'use:ai_features',
    'access:admin_panel',
    'export:data',
    'delete:data',
  ],
}

/**
 * SECURITY: Get authenticated user with role verification
 * Returns user object if authenticated, null otherwise
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<{
  id: number
  email: string
  name: string | null
  role: UserRole
} | null> {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return null
    }

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (user.length === 0) {
      return null
    }

    return user[0] as typeof user[0] & { role: UserRole }
  } catch (error) {
    safeError('[RBAC]', 'Error getting authenticated user:', error)
    return null
  }
}

/**
 * SECURITY: Require user to have a specific role
 * Returns error response if user doesn't have required role, null if authorized
 *
 * @example
 * const authError = await requireRole(req, 'admin')
 * if (authError) return authError
 */
export async function requireRole(
  req: NextRequest,
  requiredRole: UserRole
): Promise<NextResponse | null> {
  const user = await getAuthenticatedUser(req)

  if (!user) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    )
  }

  if (user.role !== requiredRole) {
    // Audit log for authorization failures
    await logAuditEvent({
      userId: user.id,
      action: 'access_denied_role',
      resourceType: 'endpoint',
      severity: 'warning',
      complianceRelated: true,
      metadata: {
        required_role: requiredRole,
        actual_role: user.role,
        url: req.url,
        method: req.method,
      },
    })

    return NextResponse.json(
      {
        error: 'Acesso Negado',
        message: `Esta ação requer perfil de ${requiredRole}`,
        requiredRole,
        actualRole: user.role,
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * SECURITY: Require user to have ANY of the specified roles
 * Returns error response if user doesn't have any required role, null if authorized
 *
 * @example
 * const authError = await requireAnyRole(req, ['admin', 'psychologist'])
 * if (authError) return authError
 */
export async function requireAnyRole(
  req: NextRequest,
  requiredRoles: UserRole[]
): Promise<NextResponse | null> {
  const user = await getAuthenticatedUser(req)

  if (!user) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    )
  }

  if (!requiredRoles.includes(user.role)) {
    // Audit log for authorization failures
    await logAuditEvent({
      userId: user.id,
      action: 'access_denied_roles',
      resourceType: 'endpoint',
      severity: 'warning',
      complianceRelated: true,
      metadata: {
        required_roles: requiredRoles,
        actual_role: user.role,
        url: req.url,
        method: req.method,
      },
    })

    return NextResponse.json(
      {
        error: 'Acesso Negado',
        message: `Esta ação requer um dos seguintes perfis: ${requiredRoles.join(', ')}`,
        requiredRoles,
        actualRole: user.role,
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * SECURITY: Require user to have a specific permission
 * Returns error response if user doesn't have required permission, null if authorized
 *
 * @example
 * const authError = await requirePermission(req, 'manage:users')
 * if (authError) return authError
 */
export async function requirePermission(
  req: NextRequest,
  requiredPermission: Permission
): Promise<NextResponse | null> {
  const user = await getAuthenticatedUser(req)

  if (!user) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    )
  }

  const userPermissions = ROLE_PERMISSIONS[user.role]

  if (!userPermissions.includes(requiredPermission)) {
    // Audit log for authorization failures
    await logAuditEvent({
      userId: user.id,
      action: 'access_denied_permission',
      resourceType: 'endpoint',
      severity: 'warning',
      complianceRelated: true,
      metadata: {
        required_permission: requiredPermission,
        user_role: user.role,
        user_permissions: userPermissions,
        url: req.url,
        method: req.method,
      },
    })

    return NextResponse.json(
      {
        error: 'Permissão Negada',
        message: `Esta ação requer a permissão: ${requiredPermission}`,
        requiredPermission,
        userRole: user.role,
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * SECURITY: Check if user has a specific permission (without returning response)
 * Returns true if user has permission, false otherwise
 *
 * @example
 * if (await hasPermission(req, 'manage:users')) {
 *   // User has permission
 * }
 */
export async function hasPermission(
  req: NextRequest,
  permission: Permission
): Promise<boolean> {
  const user = await getAuthenticatedUser(req)
  if (!user) return false

  const userPermissions = ROLE_PERMISSIONS[user.role]
  return userPermissions.includes(permission)
}

/**
 * SECURITY: Check if user has a specific role (without returning response)
 * Returns true if user has role, false otherwise
 *
 * @example
 * if (await hasRole(req, 'admin')) {
 *   // User is admin
 * }
 */
export async function hasRole(
  req: NextRequest,
  role: UserRole
): Promise<boolean> {
  const user = await getAuthenticatedUser(req)
  if (!user) return false

  return user.role === role
}

/**
 * SECURITY: Get user's permissions
 * Returns array of permissions for the authenticated user
 */
export async function getUserPermissions(req: NextRequest): Promise<Permission[]> {
  const user = await getAuthenticatedUser(req)
  if (!user) return []

  return ROLE_PERMISSIONS[user.role]
}
