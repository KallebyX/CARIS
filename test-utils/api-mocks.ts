import { NextRequest, NextResponse } from 'next/server'

/**
 * Mock API response utilities
 */

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockNextRequest(
  url: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
    cookies?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, cookies = {} } = options

  // Build cookie string
  const cookieString = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')

  if (cookieString) {
    headers['cookie'] = cookieString
  }

  const request = new NextRequest(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  })

  return request
}

/**
 * Parse NextResponse JSON body
 */
export async function parseNextResponse(response: NextResponse): Promise<any> {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Mock successful API response
 */
export function mockSuccessResponse(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Mock error API response
 */
export function mockErrorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status })
}

/**
 * Create authenticated mock request with JWT token
 */
export function createAuthenticatedRequest(
  url: string,
  userId: number,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {} } = options

  return createMockNextRequest(url, {
    method,
    body,
    headers,
    cookies: {
      token: `mock.jwt.token.${userId}`,
    },
  })
}

/**
 * Mock database query builder responses
 */
export const mockDbQueryBuilder = {
  select: (data: any[]) => ({
    from: jest.fn(() => ({
      where: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve(data)),
        orderBy: jest.fn(() => Promise.resolve(data)),
      })),
      leftJoin: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve(data)),
        })),
        leftJoin: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve(data)),
          })),
        })),
      })),
      limit: jest.fn(() => Promise.resolve(data)),
      orderBy: jest.fn(() => Promise.resolve(data)),
    })),
  }),

  insert: (data: any[]) => ({
    values: jest.fn(() => ({
      returning: jest.fn(() => Promise.resolve(data)),
    })),
  }),

  update: (data: any[]) => ({
    set: jest.fn(() => ({
      where: jest.fn(() => Promise.resolve(data)),
    })),
  }),

  delete: (data: any[] = []) => ({
    where: jest.fn(() => Promise.resolve(data)),
  }),
}

/**
 * Reset all database mocks
 */
export function resetDbMocks() {
  const { db } = require('@/db')

  db.select.mockReturnValue(mockDbQueryBuilder.select([]))
  db.insert.mockReturnValue(mockDbQueryBuilder.insert([]))
  db.update.mockReturnValue(mockDbQueryBuilder.update([]))
  db.delete.mockReturnValue(mockDbQueryBuilder.delete([]))
}

/**
 * Mock Pusher trigger
 */
export function mockPusherTrigger(shouldFail = false) {
  const { pusherServer } = require('@/lib/pusher')

  if (shouldFail) {
    pusherServer.trigger.mockRejectedValue(new Error('Pusher error'))
  } else {
    pusherServer.trigger.mockResolvedValue({})
  }
}

/**
 * Get mock Pusher calls
 */
export function getPusherCalls() {
  const { pusherServer } = require('@/lib/pusher')
  return pusherServer.trigger.mock.calls
}

/**
 * Clear all Pusher mocks
 */
export function clearPusherMocks() {
  const { pusherServer } = require('@/lib/pusher')
  pusherServer.trigger.mockClear()
}
