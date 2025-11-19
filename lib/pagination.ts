/**
 * SECURITY: Centralized pagination utilities to prevent abuse
 * Enforces maximum limits to prevent DOS attacks via large result sets
 */

export const PAGINATION_LIMITS = {
  /**
   * Maximum number of items that can be requested in a single page
   * Prevents clients from requesting ?limit=999999
   */
  MAX_LIMIT: 100,

  /**
   * Default limit when none is specified
   */
  DEFAULT_LIMIT: 20,

  /**
   * Maximum offset to prevent expensive queries
   * Beyond this point, cursor-based pagination should be used
   */
  MAX_OFFSET: 10000,
} as const

export interface PaginationParams {
  limit: number
  offset: number
  page?: number
}

/**
 * Parse and validate pagination parameters from URL search params
 * Automatically enforces maximum limits for security
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  // Parse limit with bounds checking
  const requestedLimit = parseInt(searchParams.get('limit') || String(PAGINATION_LIMITS.DEFAULT_LIMIT))
  const limit = Math.min(
    Math.max(1, requestedLimit), // At least 1
    PAGINATION_LIMITS.MAX_LIMIT    // At most MAX_LIMIT
  )

  // Parse offset with bounds checking
  const requestedOffset = parseInt(searchParams.get('offset') || '0')
  const offset = Math.min(
    Math.max(0, requestedOffset), // At least 0
    PAGINATION_LIMITS.MAX_OFFSET   // At most MAX_OFFSET
  )

  // Calculate page number if using page-based pagination
  const page = Math.floor(offset / limit) + 1

  return {
    limit,
    offset,
    page,
  }
}

/**
 * Parse page-based pagination (alternative to offset-based)
 */
export function parsePagePagination(
  searchParams: URLSearchParams,
  defaultLimit: number = PAGINATION_LIMITS.DEFAULT_LIMIT
): { limit: number; offset: number; page: number } {
  const requestedLimit = parseInt(searchParams.get('limit') || String(defaultLimit))
  const limit = Math.min(
    Math.max(1, requestedLimit),
    PAGINATION_LIMITS.MAX_LIMIT
  )

  const requestedPage = parseInt(searchParams.get('page') || '1')
  const page = Math.max(1, requestedPage)

  const offset = (page - 1) * limit

  // Enforce max offset even with page-based pagination
  const safeOffset = Math.min(offset, PAGINATION_LIMITS.MAX_OFFSET)

  return {
    limit,
    offset: safeOffset,
    page,
  }
}

/**
 * Create pagination metadata for API responses
 */
export function createPaginationMeta(params: {
  limit: number
  offset: number
  total?: number
  hasMore?: boolean
}) {
  const { limit, offset, total, hasMore } = params

  const currentPage = Math.floor(offset / limit) + 1

  const meta: {
    limit: number
    offset: number
    page: number
    total?: number
    totalPages?: number
    hasMore?: boolean
    hasPrevious: boolean
    hasNext?: boolean
  } = {
    limit,
    offset,
    page: currentPage,
    hasPrevious: offset > 0,
  }

  if (total !== undefined) {
    meta.total = total
    meta.totalPages = Math.ceil(total / limit)
    meta.hasNext = offset + limit < total
    meta.hasMore = meta.hasNext
  } else if (hasMore !== undefined) {
    meta.hasMore = hasMore
  }

  return meta
}
