import { getUserIdFromRequest, verifyToken } from '@/lib/auth'
import * as jose from 'jose'
import { NextRequest } from 'next/server'

describe('Auth Utilities', () => {
  const JWT_SECRET = process.env.JWT_SECRET!
  const secret = new TextEncoder().encode(JWT_SECRET)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserIdFromRequest', () => {
    it('should return userId from valid token', async () => {
      // Arrange
      const userId = 123
      const token = await new jose.SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secret)

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          cookie: `token=${token}`,
        },
      })

      // Act
      const result = await getUserIdFromRequest(request)

      // Assert
      expect(result).toBe(userId)
    })

    it('should return null when token is missing', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/test')

      // Act
      const result = await getUserIdFromRequest(request)

      // Assert
      expect(result).toBeNull()
    })

    it('should return null when token is invalid', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          cookie: 'token=invalid.token.here',
        },
      })

      // Act
      const result = await getUserIdFromRequest(request)

      // Assert
      expect(result).toBeNull()
    })

    it('should return null when token is expired', async () => {
      // Arrange
      const userId = 123
      const token = await new jose.SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('0s') // Immediately expired
        .sign(secret)

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          cookie: `token=${token}`,
        },
      })

      // Wait a bit to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100))

      // Act
      const result = await getUserIdFromRequest(request)

      // Assert
      expect(result).toBeNull()
    })

    it('should handle multiple cookies and extract token correctly', async () => {
      // Arrange
      const userId = 456
      const token = await new jose.SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secret)

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          cookie: `other=value; token=${token}; another=cookie`,
        },
      })

      // Act
      const result = await getUserIdFromRequest(request)

      // Assert
      expect(result).toBe(userId)
    })
  })

  describe('verifyToken', () => {
    it('should return payload for valid token', async () => {
      // Arrange
      const userId = 789
      const token = await new jose.SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secret)

      // Act
      const result = await verifyToken(token)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.userId).toBe(userId)
    })

    it('should return null for invalid token', async () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token'

      // Act
      const result = await verifyToken(invalidToken)

      // Assert
      expect(result).toBeNull()
    })

    it('should return null for expired token', async () => {
      // Arrange
      const userId = 789
      const token = await new jose.SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('0s')
        .sign(secret)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100))

      // Act
      const result = await verifyToken(token)

      // Assert
      expect(result).toBeNull()
    })

    it('should return null for malformed token', async () => {
      // Arrange
      const malformedToken = 'not-a-jwt'

      // Act
      const result = await verifyToken(malformedToken)

      // Assert
      expect(result).toBeNull()
    })

    it('should verify token with additional claims', async () => {
      // Arrange
      const userId = 999
      const role = 'admin'
      const token = await new jose.SignJWT({ userId, role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secret)

      // Act
      const result = await verifyToken(token)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.userId).toBe(userId)
      expect(result?.role).toBe(role)
    })
  })
})
