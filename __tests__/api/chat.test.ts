import { GET, POST, PATCH, DELETE } from '@/app/api/chat/route'
import { db } from '@/db'
import { pusherServer } from '@/lib/pusher'
import * as auth from '@/lib/auth'
import {
  createAuthenticatedRequest,
  mockDbQueryBuilder,
  parseNextResponse,
} from '@/test-utils/api-mocks'
import { mockChatRoom, mockChatMessage, mockUser } from '@/test-utils/mocks'

jest.mock('@/lib/auth')
jest.mock('@/db')
jest.mock('@/lib/pusher')

describe('Chat API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/chat', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(null)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat?roomId=1',
        0
      )

      // Act
      const response = await GET(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Não autorizado')
    })

    it('should return 400 when neither roomId nor otherUserId is provided', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(1)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat',
        1
      )

      // Mock database to return no rooms
      ;(db.select as jest.Mock).mockReturnValue(mockDbQueryBuilder.select([]))

      // Act
      const response = await GET(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('obrigatório')
    })

    it('should return messages for existing room', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(1)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat?roomId=1',
        1
      )

      // Mock database responses
      const mockRoom = { ...mockChatRoom, participantIds: JSON.stringify([1, 2]) }
      const mockMessages = [mockChatMessage]

      ;(db.select as jest.Mock)
        .mockReturnValueOnce(mockDbQueryBuilder.select([mockRoom])) // First call: get room
        .mockReturnValueOnce(mockDbQueryBuilder.select(mockMessages)) // Second call: get messages
        .mockReturnValue(mockDbQueryBuilder.select([])) // Subsequent calls: read receipts

      // Act
      const response = await GET(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.roomId).toBe('1')
      expect(data.data.messages).toHaveLength(1)
    })

    it('should return 404 when room does not exist', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(1)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat?roomId=999',
        1
      )

      ;(db.select as jest.Mock).mockReturnValue(mockDbQueryBuilder.select([]))

      // Act
      const response = await GET(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe('Sala não encontrada')
    })

    it('should return 403 when user is not a participant', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(3)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat?roomId=1',
        3
      )

      const mockRoom = { ...mockChatRoom, participantIds: JSON.stringify([1, 2]) }
      ;(db.select as jest.Mock).mockReturnValue(mockDbQueryBuilder.select([mockRoom]))

      // Act
      const response = await GET(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe('Acesso negado')
    })
  })

  describe('POST /api/chat', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(null)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat',
        0,
        {
          method: 'POST',
          body: { content: 'Test message' },
        }
      )

      // Act
      const response = await POST(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Não autorizado')
    })

    it('should return 400 when content is missing', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(1)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat',
        1,
        {
          method: 'POST',
          body: { roomId: '1' },
        }
      )

      // Act
      const response = await POST(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('obrigatório')
    })

    it('should create and send message successfully', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(1)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat',
        1,
        {
          method: 'POST',
          body: { roomId: '1', content: 'Hello world!' },
        }
      )

      const mockRoom = { ...mockChatRoom, participantIds: JSON.stringify([1, 2]) }
      const newMessage = { ...mockChatMessage, content: 'Hello world!' }

      ;(db.select as jest.Mock).mockReturnValue(mockDbQueryBuilder.select([mockRoom]))
      ;(db.insert as jest.Mock).mockReturnValue(mockDbQueryBuilder.insert([newMessage]))

      // Act
      const response = await POST(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.message.content).toBe('Hello world!')
      expect(pusherServer.trigger).toHaveBeenCalled()
    })

    it('should create new room when messaging new user', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(1)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat',
        1,
        {
          method: 'POST',
          body: { receiverId: '2', content: 'First message' },
        }
      )

      const newRoom = { ...mockChatRoom, id: '2' }
      const newMessage = { ...mockChatMessage, content: 'First message' }

      // Mock: no existing rooms, then new room created
      ;(db.select as jest.Mock)
        .mockReturnValueOnce(mockDbQueryBuilder.select([])) // No existing rooms
        .mockReturnValueOnce(mockDbQueryBuilder.select([newRoom])) // Verify new room

      ;(db.insert as jest.Mock)
        .mockReturnValueOnce(mockDbQueryBuilder.insert([newRoom])) // Create room
        .mockReturnValueOnce(mockDbQueryBuilder.insert([newMessage])) // Create message
        .mockReturnValue(mockDbQueryBuilder.insert([])) // Read receipt

      // Act
      const response = await POST(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(db.insert).toHaveBeenCalledTimes(3) // room, message, receipt
    })

    it('should handle Pusher failures gracefully', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(1)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat',
        1,
        {
          method: 'POST',
          body: { roomId: '1', content: 'Test' },
        }
      )

      const mockRoom = { ...mockChatRoom, participantIds: JSON.stringify([1, 2]) }
      const newMessage = { ...mockChatMessage, content: 'Test' }

      ;(db.select as jest.Mock).mockReturnValue(mockDbQueryBuilder.select([mockRoom]))
      ;(db.insert as jest.Mock).mockReturnValue(mockDbQueryBuilder.insert([newMessage]))
      ;(pusherServer.trigger as jest.Mock).mockRejectedValue(new Error('Pusher error'))

      // Act
      const response = await POST(request)
      const data = await parseNextResponse(response)

      // Assert - should still succeed even if Pusher fails
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('PATCH /api/chat', () => {
    it('should mark message as read', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(2)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat',
        2,
        {
          method: 'PATCH',
          body: { messageId: '1' },
        }
      )

      ;(db.select as jest.Mock)
        .mockReturnValueOnce(mockDbQueryBuilder.select([])) // No existing receipt
        .mockReturnValueOnce(mockDbQueryBuilder.select([mockChatMessage])) // Get message

      ;(db.insert as jest.Mock).mockReturnValue(mockDbQueryBuilder.insert([]))

      // Act
      const response = await PATCH(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(db.insert).toHaveBeenCalled()
    })

    it('should return 400 when messageId is missing', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(1)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat',
        1,
        {
          method: 'PATCH',
          body: {},
        }
      )

      // Act
      const response = await PATCH(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('obrigatório')
    })
  })

  describe('DELETE /api/chat', () => {
    it('should soft delete message when user is sender', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(1)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat?messageId=1',
        1,
        { method: 'DELETE' }
      )

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockChatMessage])
      )
      ;(db.update as jest.Mock).mockReturnValue(mockDbQueryBuilder.update([]))

      // Act
      const response = await DELETE(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(db.update).toHaveBeenCalled()
    })

    it('should return 403 when user is not the sender', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(2)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat?messageId=1',
        2,
        { method: 'DELETE' }
      )

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([{ ...mockChatMessage, senderId: 1 }])
      )

      // Act
      const response = await DELETE(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toContain('só pode deletar suas próprias mensagens')
    })

    it('should return 404 when message does not exist', async () => {
      // Arrange
      jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(1)
      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/chat?messageId=999',
        1,
        { method: 'DELETE' }
      )

      ;(db.select as jest.Mock).mockReturnValue(mockDbQueryBuilder.select([]))

      // Act
      const response = await DELETE(request)
      const data = await parseNextResponse(response)

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe('Mensagem não encontrada')
    })
  })
})
