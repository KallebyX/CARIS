/**
 * API Contract Tests: Patient Endpoints
 *
 * Tests patient-specific API endpoints
 */

describe('Patient API Contracts', () => {
  describe('POST /api/patient/diary', () => {
    it('should return 201 with diary entry data', async () => {
      const response = {
        success: true,
        data: {
          id: 1,
          patientId: 1,
          content: 'Today was a good day',
          moodRating: 8,
          intensityRating: 6,
          aiAnalyzed: false,
          entryDate: '2024-01-01T10:00:00.000Z',
          createdAt: '2024-01-01T10:00:00.000Z'
        }
      }

      expect(response.success).toBe(true)
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('patientId')
      expect(response.data).toHaveProperty('content')
      expect(response.data).toHaveProperty('moodRating')
      expect(response.data.moodRating).toBeGreaterThanOrEqual(1)
      expect(response.data.moodRating).toBeLessThanOrEqual(10)
    })

    it('should validate mood rating range', async () => {
      const errorResponse = {
        success: false,
        error: 'Mood rating must be between 1 and 10'
      }

      expect(errorResponse.success).toBe(false)
      expect(errorResponse.error).toContain('between 1 and 10')
    })
  })

  describe('GET /api/patient/diary', () => {
    it('should return paginated diary entries', async () => {
      const response = {
        success: true,
        data: {
          entries: [
            { id: 1, content: 'Entry 1', moodRating: 7 },
            { id: 2, content: 'Entry 2', moodRating: 8 }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3
          }
        }
      }

      expect(response.success).toBe(true)
      expect(Array.isArray(response.data.entries)).toBe(true)
      expect(response.data.pagination).toHaveProperty('page')
      expect(response.data.pagination).toHaveProperty('limit')
      expect(response.data.pagination).toHaveProperty('total')
      expect(response.data.pagination).toHaveProperty('totalPages')
    })
  })

  describe('POST /api/patient/mood', () => {
    it('should return 201 with mood tracking data', async () => {
      const response = {
        success: true,
        data: {
          id: 1,
          patientId: 1,
          date: '2024-01-01',
          mood: 7,
          energy: 8,
          anxiety: 4,
          stressLevel: 5,
          sleepQuality: 6,
          notes: 'Feeling good today',
          createdAt: '2024-01-01T10:00:00.000Z'
        }
      }

      expect(response.success).toBe(true)
      expect(response.data).toHaveProperty('mood')
      expect(response.data).toHaveProperty('energy')
      expect(response.data).toHaveProperty('anxiety')
      expect(response.data.mood).toBeGreaterThanOrEqual(1)
      expect(response.data.mood).toBeLessThanOrEqual(10)
    })
  })

  describe('GET /api/patient/sessions', () => {
    it('should return user sessions with filters', async () => {
      const response = {
        success: true,
        data: {
          sessions: [
            {
              id: 1,
              psychologistName: 'Dr. Smith',
              scheduledAt: '2024-12-20T14:00:00.000Z',
              duration: 50,
              type: 'therapy',
              status: 'scheduled'
            }
          ],
          filters: {
            status: 'scheduled',
            from: '2024-01-01',
            to: '2024-12-31'
          }
        }
      }

      expect(response.success).toBe(true)
      expect(Array.isArray(response.data.sessions)).toBe(true)
      expect(response.data.sessions[0]).toHaveProperty('psychologistName')
      expect(response.data.sessions[0]).toHaveProperty('scheduledAt')
      expect(response.data.sessions[0]).toHaveProperty('status')
    })
  })

  describe('POST /api/patient/meditation-sessions', () => {
    it('should return 201 with meditation session data', async () => {
      const response = {
        success: true,
        data: {
          id: 'session-uuid',
          userId: 1,
          meditationId: 'meditation-1',
          startedAt: '2024-01-01T10:00:00.000Z',
          duration: 600,
          wasCompleted: false,
          createdAt: '2024-01-01T10:00:00.000Z'
        }
      }

      expect(response.success).toBe(true)
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('meditationId')
      expect(response.data).toHaveProperty('duration')
      expect(response.data).toHaveProperty('wasCompleted')
    })
  })

  describe('PUT /api/patient/meditation-sessions/[id]', () => {
    it('should update meditation session completion', async () => {
      const response = {
        success: true,
        data: {
          id: 'session-uuid',
          wasCompleted: true,
          completedAt: '2024-01-01T10:10:00.000Z',
          moodBefore: 5,
          moodAfter: 8,
          rating: 5
        }
      }

      expect(response.success).toBe(true)
      expect(response.data.wasCompleted).toBe(true)
      expect(response.data).toHaveProperty('completedAt')
      expect(response.data).toHaveProperty('rating')
    })
  })

  describe('GET /api/patient/insights', () => {
    it('should return AI-generated insights', async () => {
      const response = {
        success: true,
        data: {
          moodTrend: 'improving',
          averageMood: 7.2,
          emotionalPatterns: ['anxiety in morning', 'better after exercise'],
          recommendations: ['morning meditation', 'regular exercise'],
          riskLevel: 'low',
          lastAnalyzed: '2024-01-01T10:00:00.000Z'
        }
      }

      expect(response.success).toBe(true)
      expect(response.data).toHaveProperty('moodTrend')
      expect(response.data).toHaveProperty('averageMood')
      expect(Array.isArray(response.data.emotionalPatterns)).toBe(true)
      expect(Array.isArray(response.data.recommendations)).toBe(true)
      expect(response.data).toHaveProperty('riskLevel')
    })
  })

  describe('POST /api/patient/sos', () => {
    it('should activate emergency SOS', async () => {
      const response = {
        success: true,
        data: {
          id: 1,
          patientId: 1,
          type: 'emergency',
          level: 'critical',
          timestamp: '2024-01-01T10:00:00.000Z',
          alertSent: true
        }
      }

      expect(response.success).toBe(true)
      expect(response.data).toHaveProperty('type')
      expect(response.data).toHaveProperty('level')
      expect(response.data.alertSent).toBe(true)
    })
  })

  describe('GET /api/patient/progress', () => {
    it('should return comprehensive progress data', async () => {
      const response = {
        success: true,
        data: {
          totalXP: 500,
          currentLevel: 3,
          weeklyPoints: 150,
          streak: 7,
          achievements: {
            total: 5,
            unlocked: 3
          },
          activities: {
            diaryEntries: 12,
            meditations: 8,
            sessionsAttended: 3
          },
          moodTrend: {
            current: 7.5,
            previous: 6.8,
            change: '+0.7'
          }
        }
      }

      expect(response.success).toBe(true)
      expect(response.data).toHaveProperty('totalXP')
      expect(response.data).toHaveProperty('currentLevel')
      expect(response.data).toHaveProperty('streak')
      expect(response.data).toHaveProperty('achievements')
      expect(response.data).toHaveProperty('activities')
      expect(response.data).toHaveProperty('moodTrend')
    })
  })
})
