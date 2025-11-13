/**
 * Type-safe API Client for CÁRIS Platform
 * Provides methods for all API endpoints with automatic error handling and type safety
 */

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
    total?: number
  }
}

export interface User {
  id: number
  name: string
  email: string
  role: 'patient' | 'psychologist' | 'admin' | 'clinic_owner' | 'clinic_admin'
  avatarUrl?: string
  totalXP: number
  currentLevel: number
  createdAt: string
}

export interface DiaryEntry {
  id: number
  patientId: number
  entryDate: string
  moodRating: number
  intensityRating: number
  content: string
  cycle: 'criar' | 'cuidar' | 'crescer' | 'curar'
  emotions?: string[]
  audioUrl?: string
  audioTranscription?: string
  imageUrl?: string
  imageDescription?: string
  aiAnalyzed: boolean
  dominantEmotion?: string
  emotionIntensity?: number
  sentimentScore?: number
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  aiAnalysis?: {
    insights: string[]
    suggestedActions: string[]
    plutchikCategories?: any
  }
}

export interface Session {
  id: number
  psychologistId: number
  patientId: number
  clinicId: number
  scheduledAt: string
  duration: number
  type: 'therapy' | 'consultation' | 'group'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  isRecurring: boolean
  recurrencePattern?: 'weekly' | 'biweekly' | 'monthly'
}

export interface ChatMessage {
  id: string
  roomId: string
  senderId: number
  content: string
  messageType: 'text' | 'file' | 'system'
  isTemporary: boolean
  createdAt: string
  readReceipts?: Array<{
    userId: number
    readAt: string
  }>
}

export interface MeditationAudio {
  id: string
  title: string
  description: string
  categoryId: string
  duration: number
  difficulty: 'iniciante' | 'intermediario' | 'avancado'
  instructor: string
  audioUrl: string
  thumbnailUrl?: string
  playCount: number
  averageRating: number
}

export interface Achievement {
  id: number
  name: string
  description: string
  icon: string
  type: 'activity' | 'milestone' | 'streak' | 'special'
  category: 'diary' | 'meditation' | 'tasks' | 'sessions' | 'social'
  requirement: number
  xpReward: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface Notification {
  id: number
  userId: number
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

// ============================================================================
// API Client Class
// ============================================================================

export class ApiClient {
  private baseUrl: string
  private headers: Record<string, string>

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
    this.headers = {
      'Content-Type': 'application/json',
    }
  }

  /**
   * Set custom headers (e.g., for authentication tokens)
   */
  setHeaders(headers: Record<string, string>) {
    this.headers = { ...this.headers, ...headers }
  }

  /**
   * Internal fetch wrapper with error handling
   */
  private async fetch<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        credentials: 'include', // Include cookies
      })

      const data = await response.json()

      if (!response.ok) {
        throw new ApiError(
          data.error || 'Request failed',
          response.status,
          data
        )
      }

      return data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        null
      )
    }
  }

  // ============================================================================
  // Authentication Endpoints
  // ============================================================================

  auth = {
    /**
     * Login with email and password
     */
    login: async (email: string, password: string) => {
      return this.fetch<ApiResponse<{ user: User }>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
    },

    /**
     * Register a new user
     */
    register: async (data: {
      name: string
      email: string
      password: string
      role: 'patient' | 'psychologist'
    }) => {
      return this.fetch<ApiResponse<{ user: User }>>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Logout current user
     */
    logout: async () => {
      return this.fetch<ApiResponse>('/auth/logout', {
        method: 'POST',
      })
    },
  }

  // ============================================================================
  // User Endpoints
  // ============================================================================

  user = {
    /**
     * Get current user profile
     */
    me: async () => {
      return this.fetch<ApiResponse<{ user: User }>>('/users/me')
    },

    /**
     * Get user settings
     */
    getSettings: async () => {
      return this.fetch<ApiResponse>('/user/settings')
    },

    /**
     * Update user settings
     */
    updateSettings: async (settings: Record<string, any>) => {
      return this.fetch<ApiResponse>('/user/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
    },

    /**
     * Change password
     */
    changePassword: async (currentPassword: string, newPassword: string) => {
      return this.fetch<ApiResponse>('/user/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
    },

    /**
     * Update avatar
     */
    updateAvatar: async (avatarUrl: string) => {
      return this.fetch<ApiResponse>('/user/avatar', {
        method: 'POST',
        body: JSON.stringify({ avatarUrl }),
      })
    },
  }

  // ============================================================================
  // Diary Endpoints
  // ============================================================================

  diary = {
    /**
     * Get diary entries
     */
    getEntries: async (params?: { limit?: number; offset?: number }) => {
      const query = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      return this.fetch<PaginatedResponse<DiaryEntry>>(
        `/patient/diary${query ? `?${query}` : ''}`
      )
    },

    /**
     * Create diary entry
     */
    createEntry: async (data: {
      moodRating: number
      intensityRating: number
      content: string
      cycle: 'criar' | 'cuidar' | 'crescer' | 'curar'
      emotions?: string[]
      audioUrl?: string
      audioTranscription?: string
      imageUrl?: string
      imageDescription?: string
    }) => {
      return this.fetch<ApiResponse<{ entry: DiaryEntry }>>('/patient/diary', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Export diary entries
     */
    export: async (format: 'json' | 'pdf' | 'csv') => {
      return this.fetch<Blob>(`/patient/diary/export?format=${format}`, {
        method: 'GET',
      })
    },
  }

  // ============================================================================
  // Chat Endpoints
  // ============================================================================

  chat = {
    /**
     * Get chat messages
     */
    getMessages: async (params: { roomId?: string; otherUserId?: number }) => {
      const query = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      return this.fetch<ApiResponse<{
        roomId: string
        messages: ChatMessage[]
        participants: number[]
      }>>(`/chat?${query}`)
    },

    /**
     * Send message
     */
    sendMessage: async (data: {
      roomId?: string
      receiverId?: number
      content: string
      messageType?: 'text' | 'file'
      isTemporary?: boolean
      expiresAt?: string
    }) => {
      return this.fetch<ApiResponse<{
        message: ChatMessage
        roomId: string
      }>>('/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Mark message as read
     */
    markAsRead: async (messageId: string) => {
      return this.fetch<ApiResponse>('/chat', {
        method: 'PATCH',
        body: JSON.stringify({ messageId }),
      })
    },

    /**
     * Delete message
     */
    deleteMessage: async (messageId: string) => {
      return this.fetch<ApiResponse>(`/chat?messageId=${messageId}`, {
        method: 'DELETE',
      })
    },
  }

  // ============================================================================
  // Session Endpoints
  // ============================================================================

  sessions = {
    /**
     * Get therapy sessions
     */
    getSessions: async (params?: {
      status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
      startDate?: string
      endDate?: string
    }) => {
      const query = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      return this.fetch<ApiResponse<{ sessions: Session[] }>>(
        `/sessions${query ? `?${query}` : ''}`
      )
    },

    /**
     * Create session (psychologist only)
     */
    createSession: async (data: {
      patientId: number
      scheduledAt: string
      duration?: number
      type?: 'therapy' | 'consultation' | 'group'
      notes?: string
      recurrencePattern?: 'weekly' | 'biweekly' | 'monthly'
    }) => {
      return this.fetch<ApiResponse<{ session: Session }>>('/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Update session
     */
    updateSession: async (sessionId: number, data: Partial<Session>) => {
      return this.fetch<ApiResponse>(`/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },

    /**
     * Start session
     */
    startSession: async (sessionId: number) => {
      return this.fetch<ApiResponse>(`/sessions/${sessionId}/start`, {
        method: 'POST',
      })
    },

    /**
     * End session
     */
    endSession: async (sessionId: number, notes?: string) => {
      return this.fetch<ApiResponse>(`/sessions/${sessionId}/end`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      })
    },

    /**
     * Check for scheduling conflicts
     */
    checkConflicts: async (scheduledAt: string, duration: number) => {
      return this.fetch<ApiResponse<{ hasConflict: boolean; conflicts: Session[] }>>(
        `/sessions/check-conflicts?scheduledAt=${scheduledAt}&duration=${duration}`
      )
    },
  }

  // ============================================================================
  // Meditation Endpoints
  // ============================================================================

  meditation = {
    /**
     * Get meditation library
     */
    getLibrary: async (params?: {
      categoryId?: string
      difficulty?: 'iniciante' | 'intermediario' | 'avancado'
      search?: string
    }) => {
      const query = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      return this.fetch<ApiResponse<{
        audios: MeditationAudio[]
        categories: any[]
      }>>(`/patient/meditation-library${query ? `?${query}` : ''}`)
    },

    /**
     * Get meditation statistics
     */
    getStats: async () => {
      return this.fetch<ApiResponse>('/patient/meditation-stats')
    },

    /**
     * Get meditation sessions (history)
     */
    getSessions: async () => {
      return this.fetch<ApiResponse>('/patient/meditation-sessions')
    },

    /**
     * Record meditation session
     */
    recordSession: async (data: {
      meditationId: string
      duration: number
      wasCompleted: boolean
      rating?: number
      moodBefore?: number
      moodAfter?: number
      feedback?: string
    }) => {
      return this.fetch<ApiResponse>('/patient/meditation-sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
  }

  // ============================================================================
  // Gamification Endpoints
  // ============================================================================

  gamification = {
    /**
     * Get user points and XP
     */
    getPoints: async () => {
      return this.fetch<ApiResponse>('/gamification/points')
    },

    /**
     * Get user achievements
     */
    getAchievements: async () => {
      return this.fetch<ApiResponse<{
        unlocked: Achievement[]
        available: Achievement[]
      }>>('/gamification/achievements')
    },

    /**
     * Get weekly challenges
     */
    getChallenges: async () => {
      return this.fetch<ApiResponse>('/gamification/challenges')
    },

    /**
     * Get leaderboard
     */
    getLeaderboard: async (type?: 'weekly' | 'monthly' | 'all_time') => {
      return this.fetch<ApiResponse>(
        `/gamification/leaderboard${type ? `?type=${type}` : ''}`
      )
    },
  }

  // ============================================================================
  // SOS Endpoints
  // ============================================================================

  sos = {
    /**
     * Activate SOS support
     */
    activate: async (data: {
      level: 'mild' | 'moderate' | 'severe' | 'emergency'
      type?: 'breathing' | 'grounding' | 'emergency'
      notes?: string
    }) => {
      return this.fetch<ApiResponse>('/sos/activate', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Deactivate SOS
     */
    deactivate: async (sosId: number, feedback?: string) => {
      return this.fetch<ApiResponse>('/sos/deactivate', {
        method: 'POST',
        body: JSON.stringify({ sosId, feedback }),
      })
    },

    /**
     * Get SOS history
     */
    getHistory: async () => {
      return this.fetch<ApiResponse>('/sos')
    },
  }

  // ============================================================================
  // Notification Endpoints
  // ============================================================================

  notifications = {
    /**
     * Get notifications
     */
    getNotifications: async (params?: {
      unreadOnly?: boolean
      limit?: number
    }) => {
      const query = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      return this.fetch<ApiResponse<{
        notifications: Notification[]
        unreadCount: number
      }>>(`/notifications${query ? `?${query}` : ''}`)
    },

    /**
     * Mark notification as read
     */
    markAsRead: async (notificationIds: number[]) => {
      return this.fetch<ApiResponse>('/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ notificationIds }),
      })
    },

    /**
     * Subscribe to push notifications
     */
    subscribe: async (subscription: any) => {
      return this.fetch<ApiResponse>('/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
      })
    },
  }

  // ============================================================================
  // Psychologist Endpoints
  // ============================================================================

  psychologist = {
    /**
     * Get patients list
     */
    getPatients: async () => {
      return this.fetch<ApiResponse>('/psychologist/patients')
    },

    /**
     * Get patient details
     */
    getPatient: async (patientId: number) => {
      return this.fetch<ApiResponse>(`/psychologist/patients/${patientId}`)
    },

    /**
     * Get clinical alerts
     */
    getAlerts: async () => {
      return this.fetch<ApiResponse>('/psychologist/clinical-alerts')
    },

    /**
     * Get AI insights
     */
    getAiInsights: async (patientId: number) => {
      return this.fetch<ApiResponse>(
        `/psychologist/ai-insights?patientId=${patientId}`
      )
    },

    /**
     * Get progress reports
     */
    getProgressReports: async (patientId: number) => {
      return this.fetch<ApiResponse>(
        `/psychologist/progress-reports?patientId=${patientId}`
      )
    },

    /**
     * Prescribe task
     */
    prescribeTask: async (data: {
      patientId: number
      title: string
      description: string
      category?: string
      difficulty?: string
      dueDate?: string
      priority?: 'baixa' | 'media' | 'alta'
    }) => {
      return this.fetch<ApiResponse>('/psychologist/prescribe-task', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    /**
     * Update availability
     */
    updateAvailability: async (availability: any) => {
      return this.fetch<ApiResponse>('/psychologist/availability', {
        method: 'POST',
        body: JSON.stringify(availability),
      })
    },
  }

  // ============================================================================
  // Admin Endpoints
  // ============================================================================

  admin = {
    /**
     * Get platform statistics
     */
    getStats: async () => {
      return this.fetch<ApiResponse>('/admin/stats')
    },

    /**
     * Get users
     */
    getUsers: async (params?: { role?: string; status?: string }) => {
      const query = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      return this.fetch<ApiResponse>(`/admin/users${query ? `?${query}` : ''}`)
    },

    /**
     * Get audit logs
     */
    getAuditLogs: async (params?: {
      userId?: number
      action?: string
      startDate?: string
      endDate?: string
    }) => {
      const query = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      return this.fetch<ApiResponse>(
        `/admin/audit-logs${query ? `?${query}` : ''}`
      )
    },

    /**
     * Get financial reports
     */
    getFinancialReports: async (params?: {
      reportType?: 'monthly' | 'quarterly' | 'yearly'
      period?: string
    }) => {
      const query = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      return this.fetch<ApiResponse>(
        `/admin/financial-reports${query ? `?${query}` : ''}`
      )
    },
  }

  // ============================================================================
  // Compliance Endpoints
  // ============================================================================

  compliance = {
    /**
     * Request data export
     */
    requestDataExport: async (format: 'json' | 'csv') => {
      return this.fetch<ApiResponse>('/compliance/data-export', {
        method: 'POST',
        body: JSON.stringify({ format }),
      })
    },

    /**
     * Get privacy settings
     */
    getPrivacySettings: async () => {
      return this.fetch<ApiResponse>('/compliance/privacy-settings')
    },

    /**
     * Update privacy settings
     */
    updatePrivacySettings: async (settings: any) => {
      return this.fetch<ApiResponse>('/compliance/privacy-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
    },

    /**
     * Get consents
     */
    getConsents: async () => {
      return this.fetch<ApiResponse>('/compliance/consents')
    },

    /**
     * Update consent
     */
    updateConsent: async (consentType: string, consentGiven: boolean) => {
      return this.fetch<ApiResponse>(`/compliance/consents/${consentType}`, {
        method: 'PUT',
        body: JSON.stringify({ consentGiven }),
      })
    },
  }
}

// ============================================================================
// Custom Error Class
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const apiClient = new ApiClient()
