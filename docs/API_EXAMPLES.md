# CÁRIS API Code Examples

Practical code examples for common use cases in the CÁRIS API.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Diary Management](#diary-management)
4. [Chat System](#chat-system)
5. [Session Booking](#session-booking)
6. [Meditation Tracking](#meditation-tracking)
7. [Gamification](#gamification)
8. [SOS Emergency System](#sos-emergency-system)
9. [Patient Management (Psychologist)](#patient-management-psychologist)
10. [Real-time Features](#real-time-features)

---

## Getting Started

### Installation

```bash
npm install @/lib/api-client
# or
yarn add @/lib/api-client
```

### Basic Setup

```typescript
import { apiClient, ApiError } from '@/lib/api-client'

// The client is pre-configured and ready to use
// All requests automatically include authentication cookies
```

---

## Authentication

### Example 1: User Login

```typescript
import { apiClient } from '@/lib/api-client'

async function loginUser(email: string, password: string) {
  try {
    const response = await apiClient.auth.login(email, password)
    console.log('Logged in as:', response.user.name)
    console.log('Role:', response.user.role)
    return response.user
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('Login failed:', error.message)
      if (error.statusCode === 401) {
        console.error('Invalid email or password')
      }
    }
    throw error
  }
}

// Usage
await loginUser('patient@example.com', 'SecurePassword123!')
```

---

### Example 2: User Registration with Validation

```typescript
import { apiClient } from '@/lib/api-client'
import { z } from 'zod'

// Registration form schema
const registrationSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  role: z.enum(['patient', 'psychologist'])
})

async function registerUser(data: z.infer<typeof registrationSchema>) {
  try {
    // Validate data
    const validated = registrationSchema.parse(data)

    // Register user
    const response = await apiClient.auth.register(validated)
    console.log('Registration successful:', response.user)

    // Automatically logged in after registration
    return response.user
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.issues)
      throw new Error('Please check your input')
    }
    if (error instanceof ApiError && error.statusCode === 409) {
      console.error('Email already exists')
    }
    throw error
  }
}

// Usage
await registerUser({
  name: 'João Silva',
  email: 'joao@example.com',
  password: 'SecurePassword123!',
  role: 'patient'
})
```

---

### Example 3: Protected Component with Auth Check

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import type { User } from '@/lib/api-client'

export default function ProtectedPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const response = await apiClient.user.me()
      setUser(response.user)
    } catch (error) {
      // Not authenticated, redirect to login
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return null // Redirecting...
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Role: {user.role}</p>
      <p>Level: {user.currentLevel}</p>
      <p>XP: {user.totalXP}</p>
    </div>
  )
}
```

---

## Diary Management

### Example 4: Create Diary Entry with AI Analysis

```typescript
import { apiClient } from '@/lib/api-client'

async function createDiaryEntry() {
  try {
    const response = await apiClient.diary.createEntry({
      moodRating: 3,
      intensityRating: 7,
      content: `Today was a significant day. I managed to face a situation
                that would normally cause me anxiety. I felt more confident
                and in control. The breathing exercises really helped.`,
      cycle: 'crescer',
      emotions: ['confiança', 'orgulho', 'esperança']
    })

    console.log('Entry created:', response.entry.id)

    // AI Analysis results
    if (response.entry.aiAnalysis) {
      console.log('Dominant emotion:', response.entry.dominantEmotion)
      console.log('Sentiment score:', response.entry.sentimentScore)
      console.log('Risk level:', response.entry.riskLevel)
      console.log('Insights:', response.entry.aiAnalysis.insights)
      console.log('Suggested actions:', response.entry.aiAnalysis.suggestedActions)
    }

    return response.entry
  } catch (error) {
    console.error('Failed to create entry:', error)
    throw error
  }
}
```

---

### Example 5: Multimodal Diary Entry (Audio + Image)

```typescript
import { apiClient } from '@/lib/api-client'

async function createMultimodalEntry(
  audioFile: File,
  imageFile: File
) {
  try {
    // 1. Upload audio
    const audioFormData = new FormData()
    audioFormData.append('file', audioFile)
    const audioResponse = await fetch('/api/upload', {
      method: 'POST',
      body: audioFormData,
      credentials: 'include'
    })
    const { url: audioUrl } = await audioResponse.json()

    // 2. Upload image
    const imageFormData = new FormData()
    imageFormData.append('file', imageFile)
    const imageResponse = await fetch('/api/upload', {
      method: 'POST',
      body: imageFormData,
      credentials: 'include'
    })
    const { url: imageUrl } = await imageResponse.json()

    // 3. Create entry with multimodal content
    const response = await apiClient.diary.createEntry({
      moodRating: 3,
      intensityRating: 7,
      content: 'Recorded my thoughts today',
      cycle: 'cuidar',
      emotions: ['peace', 'gratitude'],
      audioUrl,
      audioTranscription: 'Will be transcribed automatically',
      imageUrl,
      imageDescription: 'A moment of peace in nature'
    })

    console.log('Multimodal entry created:', response.entry.id)
    return response.entry
  } catch (error) {
    console.error('Failed to create multimodal entry:', error)
    throw error
  }
}
```

---

### Example 6: Fetch and Display Diary Entries

```typescript
'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import type { DiaryEntry } from '@/lib/api-client'

export default function DiaryList() {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadEntries()
  }, [page])

  async function loadEntries() {
    try {
      const response = await apiClient.diary.getEntries({
        limit: 10,
        offset: page * 10
      })

      setEntries(prev => [...prev, ...response.entries])
      setHasMore(response.pagination.hasMore)
    } catch (error) {
      console.error('Failed to load entries:', error)
    } finally {
      setLoading(false)
    }
  }

  function loadMore() {
    setPage(prev => prev + 1)
  }

  if (loading && entries.length === 0) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>My Diary</h1>
      {entries.map(entry => (
        <div key={entry.id} className="diary-entry">
          <div className="header">
            <span className="date">
              {new Date(entry.entryDate).toLocaleDateString()}
            </span>
            <span className={`risk-level ${entry.riskLevel}`}>
              {entry.riskLevel}
            </span>
          </div>
          <div className="mood">
            Mood: {entry.moodRating}/4 | Intensity: {entry.intensityRating}/10
          </div>
          <div className="content">{entry.content}</div>

          {entry.aiAnalyzed && entry.aiAnalysis && (
            <div className="ai-insights">
              <h3>AI Insights</h3>
              <ul>
                {entry.aiAnalysis.insights.map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
              <h3>Suggested Actions</h3>
              <ul>
                {entry.aiAnalysis.suggestedActions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  )
}
```

---

## Chat System

### Example 7: Real-time Chat Implementation

```typescript
'use client'

import { useEffect, useState, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import type { ChatMessage } from '@/lib/api-client'
import Pusher from 'pusher-js'

interface ChatProps {
  otherUserId: number
  otherUserName: string
}

export default function Chat({ otherUserId, otherUserName }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [roomId, setRoomId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const pusherRef = useRef<Pusher | null>(null)

  useEffect(() => {
    loadMessages()
    setupPusher()

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect()
      }
    }
  }, [otherUserId])

  async function loadMessages() {
    try {
      const response = await apiClient.chat.getMessages({ otherUserId })
      setMessages(response.data.messages)
      setRoomId(response.data.roomId)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  function setupPusher() {
    if (!roomId) return

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!
    })

    const channel = pusher.subscribe(`chat-room-${roomId}`)
    channel.bind('new-message', (data: ChatMessage) => {
      setMessages(prev => [...prev, data])
    })

    channel.bind('message-read', (data: any) => {
      setMessages(prev => prev.map(msg =>
        msg.id === data.messageId
          ? { ...msg, readReceipts: [...msg.readReceipts || [], { userId: data.readBy, readAt: data.readAt }] }
          : msg
      ))
    })

    pusherRef.current = pusher
  }

  async function sendMessage() {
    if (!inputValue.trim() || sending) return

    setSending(true)
    try {
      const response = await apiClient.chat.sendMessage({
        otherUserId,
        content: inputValue,
        messageType: 'text'
      })

      setInputValue('')
      // Message will be added via Pusher event
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  async function markAsRead(messageId: string) {
    try {
      await apiClient.chat.markAsRead(messageId)
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat with {otherUserName}</h2>
      </div>

      <div className="messages">
        {messages.map(message => (
          <div
            key={message.id}
            className={`message ${message.senderId === otherUserId ? 'received' : 'sent'}`}
            onMouseEnter={() => markAsRead(message.id)}
          >
            <div className="content">{message.content}</div>
            <div className="meta">
              <span className="time">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
              {message.readReceipts && message.readReceipts.length > 0 && (
                <span className="read">✓✓</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="input-area">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          disabled={sending}
        />
        <button onClick={sendMessage} disabled={sending || !inputValue.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
```

---

## Session Booking

### Example 8: Book Recurring Therapy Sessions

```typescript
import { apiClient } from '@/lib/api-client'

async function bookRecurringSessions(
  patientId: number,
  startDate: Date,
  numberOfWeeks: number
) {
  try {
    // Check for conflicts
    const conflictCheck = await apiClient.sessions.checkConflicts(
      startDate.toISOString(),
      50 // 50 minutes duration
    )

    if (conflictCheck.hasConflict) {
      console.error('Schedule conflict detected:', conflictCheck.conflicts)
      throw new Error('This time slot is not available')
    }

    // Create recurring session
    const response = await apiClient.sessions.createSession({
      patientId,
      scheduledAt: startDate.toISOString(),
      duration: 50,
      type: 'therapy',
      recurrencePattern: 'weekly',
      notes: 'Recurring weekly therapy session'
    })

    console.log('Recurring sessions created:', response.session)
    console.log('Sessions will repeat weekly for', numberOfWeeks, 'weeks')

    return response.session
  } catch (error) {
    console.error('Failed to book sessions:', error)
    throw error
  }
}

// Usage: Book sessions every Monday at 3 PM for 8 weeks
const startDate = new Date('2024-01-22T15:00:00')
await bookRecurringSessions(1, startDate, 8)
```

---

### Example 9: Session Management Dashboard

```typescript
'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import type { Session } from '@/lib/api-client'

export default function SessionsDashboard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming')

  useEffect(() => {
    loadSessions()
  }, [filter])

  async function loadSessions() {
    try {
      const params: any = {}

      if (filter === 'upcoming') {
        params.status = 'scheduled'
        params.startDate = new Date().toISOString()
      } else if (filter === 'completed') {
        params.status = 'completed'
      }

      const response = await apiClient.sessions.getSessions(params)
      setSessions(response.sessions)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  async function startSession(sessionId: number) {
    try {
      await apiClient.sessions.startSession(sessionId)
      await loadSessions()
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  async function endSession(sessionId: number, notes: string) {
    try {
      await apiClient.sessions.endSession(sessionId, notes)
      await loadSessions()
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  return (
    <div>
      <div className="filters">
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('upcoming')}>Upcoming</button>
        <button onClick={() => setFilter('completed')}>Completed</button>
      </div>

      <div className="sessions">
        {sessions.map(session => (
          <div key={session.id} className={`session ${session.status}`}>
            <div className="time">
              {new Date(session.scheduledAt).toLocaleString()}
            </div>
            <div className="duration">{session.duration} minutes</div>
            <div className="type">{session.type}</div>
            <div className="status">{session.status}</div>

            {session.status === 'scheduled' && (
              <button onClick={() => startSession(session.id)}>
                Start Session
              </button>
            )}

            {session.notes && (
              <div className="notes">{session.notes}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Meditation Tracking

### Example 10: Meditation Library with Filtering

```typescript
'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import type { MeditationAudio } from '@/lib/api-client'

export default function MeditationLibrary() {
  const [audios, setAudios] = useState<MeditationAudio[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [filters, setFilters] = useState({
    categoryId: '',
    difficulty: '' as '' | 'iniciante' | 'intermediario' | 'avancado',
    search: ''
  })

  useEffect(() => {
    loadLibrary()
  }, [filters])

  async function loadLibrary() {
    try {
      const response = await apiClient.meditation.getLibrary(filters)
      setAudios(response.audios)
      setCategories(response.categories)
    } catch (error) {
      console.error('Failed to load meditation library:', error)
    }
  }

  async function startMeditation(audio: MeditationAudio) {
    // Track when meditation starts
    const startTime = Date.now()

    // Play audio (implement your audio player)
    // ...

    // When completed, record the session
    const duration = Math.floor((Date.now() - startTime) / 1000)

    try {
      await apiClient.meditation.recordSession({
        meditationId: audio.id,
        duration,
        wasCompleted: true,
        moodBefore: 6,
        moodAfter: 8,
        rating: 5
      })

      console.log('Meditation session recorded')
    } catch (error) {
      console.error('Failed to record session:', error)
    }
  }

  return (
    <div>
      <div className="filters">
        <select
          value={filters.categoryId}
          onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={filters.difficulty}
          onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as any })}
        >
          <option value="">All Levels</option>
          <option value="iniciante">Beginner</option>
          <option value="intermediario">Intermediate</option>
          <option value="avancado">Advanced</option>
        </select>

        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="audios">
        {audios.map(audio => (
          <div key={audio.id} className="audio-card">
            {audio.thumbnailUrl && (
              <img src={audio.thumbnailUrl} alt={audio.title} />
            )}
            <h3>{audio.title}</h3>
            <p>{audio.description}</p>
            <div className="meta">
              <span>{Math.floor(audio.duration / 60)} min</span>
              <span>{audio.difficulty}</span>
              <span>⭐ {audio.averageRating.toFixed(1)}</span>
            </div>
            <button onClick={() => startMeditation(audio)}>
              Start Meditation
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Gamification

### Example 11: Display User Progress and Achievements

```typescript
'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

export default function GamificationDashboard() {
  const [points, setPoints] = useState<any>(null)
  const [achievements, setAchievements] = useState<any>(null)

  useEffect(() => {
    loadGamificationData()
  }, [])

  async function loadGamificationData() {
    try {
      const [pointsData, achievementsData] = await Promise.all([
        apiClient.gamification.getPoints(),
        apiClient.gamification.getAchievements()
      ])

      setPoints(pointsData.data)
      setAchievements(achievementsData)
    } catch (error) {
      console.error('Failed to load gamification data:', error)
    }
  }

  if (!points || !achievements) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="level-progress">
        <h2>Level {points.currentLevel}</h2>
        <div className="xp-bar">
          <div
            className="xp-fill"
            style={{
              width: `${(points.totalXP % points.xpToNextLevel) / points.xpToNextLevel * 100}%`
            }}
          />
        </div>
        <p>{points.totalXP} / {points.xpToNextLevel} XP</p>
      </div>

      <div className="stats">
        <div className="stat">
          <h3>Weekly Points</h3>
          <p>{points.weeklyPoints}</p>
        </div>
        <div className="stat">
          <h3>Monthly Points</h3>
          <p>{points.monthlyPoints}</p>
        </div>
        <div className="stat">
          <h3>Streak</h3>
          <p>{points.streak} days 🔥</p>
        </div>
      </div>

      <div className="achievements">
        <h2>Achievements</h2>
        <div className="unlocked">
          <h3>Unlocked ({achievements.unlocked.length})</h3>
          {achievements.unlocked.map((achievement: any) => (
            <div key={achievement.id} className={`achievement ${achievement.rarity}`}>
              <span className="icon">{achievement.icon}</span>
              <div>
                <h4>{achievement.name}</h4>
                <p>{achievement.description}</p>
                <span className="xp">+{achievement.xpReward} XP</span>
              </div>
            </div>
          ))}
        </div>

        <div className="available">
          <h3>In Progress ({achievements.available.length})</h3>
          {achievements.available.map((achievement: any) => (
            <div key={achievement.id} className="achievement locked">
              <span className="icon gray">{achievement.icon}</span>
              <div>
                <h4>{achievement.name}</h4>
                <p>{achievement.description}</p>
                <div className="progress">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${(achievement.progress / achievement.requirement) * 100}%`
                    }}
                  />
                  <span>{achievement.progress} / {achievement.requirement}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="recent-activity">
        <h2>Recent Activity</h2>
        {points.recentActivities.map((activity: any) => (
          <div key={activity.id} className="activity">
            <span className="type">{activity.activityType}</span>
            <span className="description">{activity.description}</span>
            <span className="points">+{activity.points} pts / +{activity.xp} XP</span>
            <span className="time">
              {new Date(activity.createdAt).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## SOS Emergency System

### Example 12: Activate SOS with Severity Detection

```typescript
import { apiClient } from '@/lib/api-client'

async function activateSOS(userInput: {
  feeling: string
  severity: 'mild' | 'moderate' | 'severe' | 'emergency'
  notes?: string
}) {
  try {
    const response = await apiClient.sos.activate({
      level: userInput.severity,
      type: getSuggestedType(userInput.severity),
      notes: userInput.notes
    })

    console.log('SOS activated:', response.sosUsage)
    console.log('Recommendations:', response.recommendations)

    // Show recommended resources
    if (response.resources) {
      response.resources.forEach((resource: any) => {
        console.log(`Resource: ${resource.title}`)
        console.log(`URL: ${resource.url}`)
      })
    }

    // Notify psychologist in real-time (happens automatically)

    return response
  } catch (error) {
    console.error('Failed to activate SOS:', error)
    throw error
  }
}

function getSuggestedType(severity: string): 'breathing' | 'grounding' | 'emergency' {
  switch (severity) {
    case 'mild':
    case 'moderate':
      return 'breathing'
    case 'severe':
      return 'grounding'
    case 'emergency':
      return 'emergency'
    default:
      return 'breathing'
  }
}

// Usage
await activateSOS({
  feeling: 'anxious',
  severity: 'moderate',
  notes: 'Having difficulty breathing, chest feels tight'
})
```

---

## Patient Management (Psychologist)

### Example 13: Clinical Insights Dashboard

```typescript
'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

export default function ClinicalInsightsDashboard({ patientId }: { patientId: number }) {
  const [insights, setInsights] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [patient, setPatient] = useState<any>(null)

  useEffect(() => {
    loadClinicalData()
  }, [patientId])

  async function loadClinicalData() {
    try {
      const [insightsData, alertsData, patientData] = await Promise.all([
        apiClient.psychologist.getAiInsights(patientId),
        apiClient.psychologist.getAlerts(),
        apiClient.psychologist.getPatient(patientId)
      ])

      setInsights(insightsData)
      setAlerts(alertsData.alerts.filter((a: any) => a.patientId === patientId))
      setPatient(patientData.patient)
    } catch (error) {
      console.error('Failed to load clinical data:', error)
    }
  }

  if (!patient || !insights) {
    return <div>Loading...</div>
  }

  return (
    <div className="clinical-dashboard">
      <div className="patient-header">
        <h1>{patient.name}</h1>
        <div className="stats">
          <span>Total Sessions: {patient.statistics.totalSessions}</span>
          <span>Avg Mood: {patient.statistics.averageMood.toFixed(1)}</span>
          <span>Diary Entries: {patient.statistics.diaryEntries}</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="alerts">
          <h2>Active Alerts</h2>
          {alerts.map((alert: any) => (
            <div key={alert.id} className={`alert ${alert.severity}`}>
              <h3>{alert.title}</h3>
              <p>{alert.description}</p>
              <div className="recommendations">
                <h4>Recommendations:</h4>
                <ul>
                  {alert.recommendations.map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="insights">
        <h2>AI-Generated Insights</h2>
        {insights.insights.map((insight: any) => (
          <div key={insight.id} className={`insight ${insight.type}`}>
            <h3>{insight.title}</h3>
            {insight.content.patterns && (
              <div className="patterns">
                <h4>Patterns Detected:</h4>
                <ul>
                  {insight.content.patterns.map((pattern: string, i: number) => (
                    <li key={i}>{pattern}</li>
                  ))}
                </ul>
              </div>
            )}
            {insight.content.correlations && (
              <div className="correlations">
                <h4>Correlations:</h4>
                {Object.entries(insight.content.correlations).map(([key, value]) => (
                  <div key={key}>
                    {key}: {(value as number * 100).toFixed(0)}%
                  </div>
                ))}
              </div>
            )}
            {insight.content.recommendations && (
              <div className="recommendations">
                <h4>Recommendations:</h4>
                <ul>
                  {insight.content.recommendations.map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Real-time Features

### Example 14: Complete Pusher Integration

```typescript
// lib/pusher-client.ts
import Pusher from 'pusher-js'

class PusherClient {
  private pusher: Pusher | null = null
  private channels: Map<string, any> = new Map()

  init() {
    if (this.pusher) return this.pusher

    this.pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    })

    return this.pusher
  }

  subscribe(channelName: string) {
    if (!this.pusher) this.init()

    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)
    }

    const channel = this.pusher!.subscribe(channelName)
    this.channels.set(channelName, channel)
    return channel
  }

  unsubscribe(channelName: string) {
    if (this.channels.has(channelName)) {
      this.pusher?.unsubscribe(channelName)
      this.channels.delete(channelName)
    }
  }

  disconnect() {
    this.channels.forEach((_, channelName) => {
      this.pusher?.unsubscribe(channelName)
    })
    this.channels.clear()
    this.pusher?.disconnect()
    this.pusher = null
  }
}

export const pusherClient = new PusherClient()


// Usage in component
'use client'

import { useEffect, useState } from 'react'
import { pusherClient } from '@/lib/pusher-client'

export default function RealtimeNotifications({ userId }: { userId: number }) {
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    // Subscribe to user-specific channel
    const channel = pusherClient.subscribe(`user-${userId}`)

    // Listen for new notifications
    channel.bind('new-notification', (data: any) => {
      setNotifications(prev => [data, ...prev])
      showNotification(data)
    })

    // Listen for new messages
    channel.bind('new-chat-message', (data: any) => {
      showNotification({
        title: 'New Message',
        message: data.preview
      })
    })

    // Listen for session reminders
    channel.bind('session-reminder', (data: any) => {
      showNotification({
        title: 'Session Reminder',
        message: `Your session starts in ${data.minutesUntil} minutes`
      })
    })

    return () => {
      pusherClient.unsubscribe(`user-${userId}`)
    }
  }, [userId])

  function showNotification(data: any) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.message,
        icon: '/icon.png'
      })
    }
  }

  return (
    <div className="notifications">
      {notifications.map((notif, i) => (
        <div key={i} className="notification">
          <h4>{notif.title}</h4>
          <p>{notif.message}</p>
        </div>
      ))}
    </div>
  )
}
```

---

## Related Documentation

- [API Reference](./API_REFERENCE.md)
- [Authentication Guide](./API_AUTHENTICATION.md)
- [Error Handling](./API_ERRORS.md)
- [Rate Limits](./API_RATE_LIMITS.md)
