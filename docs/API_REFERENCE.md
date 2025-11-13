# CÁRIS API Reference

Complete API reference documentation for the CÁRIS mental health platform.

**Version:** 1.0.0
**Base URL:** `https://app.caris.health/api` (Production) | `http://localhost:3000/api` (Development)

---

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Patient Endpoints](#patient-endpoints)
4. [Psychologist Endpoints](#psychologist-endpoints)
5. [Admin Endpoints](#admin-endpoints)
6. [Chat System](#chat-system)
7. [Session Management](#session-management)
8. [Diary System](#diary-system)
9. [Meditation](#meditation)
10. [Gamification](#gamification)
11. [SOS System](#sos-system)
12. [Notifications](#notifications)
13. [Compliance](#compliance)
14. [Calendar Integration](#calendar-integration)

---

## Authentication

### POST /auth/login

Authenticate a user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Logged in successfully",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "user@example.com",
    "role": "patient",
    "avatarUrl": null,
    "totalXP": 1500,
    "currentLevel": 5
  }
}
```

**Response Headers:**
- `Set-Cookie: token=<JWT_TOKEN>; HttpOnly; Secure; SameSite=Strict`

**Errors:**
- `400` - Invalid input
- `401` - Invalid credentials

---

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "SecurePassword123!",
  "role": "patient"
}
```

**Validation:**
- `name`: Required, 2-255 characters
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters, must include uppercase, lowercase, number, and special character
- `role`: Required, must be "patient" or "psychologist"

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "patient"
  }
}
```

**Errors:**
- `400` - Validation error
- `409` - Email already exists

---

### POST /auth/logout

Logout the current user.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## User Management

### GET /users/me

Get the authenticated user's profile.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "patient",
    "avatarUrl": "https://example.com/avatar.jpg",
    "totalXP": 1500,
    "currentLevel": 5,
    "weeklyPoints": 250,
    "monthlyPoints": 1100,
    "streak": 7,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### GET /user/settings

Get user settings and preferences.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "settings": {
    "userId": 1,
    "timezone": "America/Sao_Paulo",
    "theme": "light",
    "language": "pt-BR",
    "notifications": true,
    "emailNotifications": true,
    "smsNotifications": false,
    "emailRemindersEnabled": true,
    "reminderBefore24h": true,
    "reminderBefore1h": true,
    "reminderBefore15min": false
  }
}
```

---

### PUT /user/settings

Update user settings.

**Authentication:** Required

**Request Body:**
```json
{
  "theme": "dark",
  "emailNotifications": false,
  "reminderBefore24h": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

---

### POST /user/change-password

Change user password.

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Errors:**
- `401` - Current password is incorrect
- `400` - New password doesn't meet requirements

---

## Patient Endpoints

### GET /patient/diary

Get diary entries with AI analysis.

**Authentication:** Required (Patient role)

**Query Parameters:**
- `limit` (integer, default: 10): Number of entries to return
- `offset` (integer, default: 0): Number of entries to skip

**Response (200 OK):**
```json
{
  "success": true,
  "entries": [
    {
      "id": 1,
      "patientId": 1,
      "entryDate": "2024-01-20T14:30:00Z",
      "moodRating": 3,
      "intensityRating": 7,
      "content": "Today I felt more confident...",
      "cycle": "crescer",
      "emotions": ["confiança", "esperança"],
      "aiAnalyzed": true,
      "dominantEmotion": "joy",
      "emotionIntensity": 75,
      "sentimentScore": 65,
      "riskLevel": "low",
      "aiAnalysis": {
        "insights": [
          "Significant improvement in emotional state",
          "Positive coping mechanisms observed"
        ],
        "suggestedActions": [
          "Continue current practices",
          "Explore new growth opportunities"
        ]
      }
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "hasMore": true,
    "total": 45
  }
}
```

---

### POST /patient/diary

Create a new diary entry with multimodal content.

**Authentication:** Required (Patient role)

**Request Body:**
```json
{
  "moodRating": 3,
  "intensityRating": 7,
  "content": "Today I felt more confident and managed to face situations that used to cause anxiety.",
  "cycle": "crescer",
  "emotions": ["confiança", "orgulho", "esperança"],
  "audioUrl": "https://storage.example.com/audio/123.mp3",
  "audioTranscription": "Transcribed audio content...",
  "imageUrl": "https://storage.example.com/image/456.jpg",
  "imageDescription": "A peaceful sunset scene"
}
```

**Validation:**
- `moodRating`: Required, integer 0-4
- `intensityRating`: Required, integer 1-10
- `content`: Required, minimum 1 character
- `cycle`: Required, one of: "criar", "cuidar", "crescer", "curar"
- `emotions`: Optional, array of strings
- `audioUrl`, `imageUrl`: Optional, valid URLs

**Response (200 OK):**
```json
{
  "success": true,
  "entry": {
    "id": 1,
    "patientId": 1,
    "entryDate": "2024-01-20T14:30:00Z",
    "moodRating": 3,
    "intensityRating": 7,
    "content": "Today I felt more confident...",
    "cycle": "crescer",
    "emotions": ["confiança", "orgulho", "esperança"],
    "aiAnalyzed": true,
    "dominantEmotion": "joy",
    "emotionIntensity": 75,
    "sentimentScore": 65,
    "riskLevel": "low",
    "aiAnalysis": {
      "insights": ["Positive emotional state detected"],
      "suggestedActions": ["Continue growth activities"]
    }
  }
}
```

**Features:**
- Automatic AI emotional analysis
- Risk level assessment
- Plutchik emotion wheel categorization
- Gamification points awarded (10 points, 15 XP)

**Errors:**
- `403` - Data processing consent required
- `422` - Validation error

---

### GET /patient/meditation-library

Get available meditation audios.

**Authentication:** Required (Patient role)

**Query Parameters:**
- `categoryId` (string): Filter by category
- `difficulty` (string): Filter by difficulty ("iniciante", "intermediario", "avancado")
- `search` (string): Search by title or description

**Response (200 OK):**
```json
{
  "success": true,
  "audios": [
    {
      "id": "med-001",
      "title": "Meditação da Respiração Consciente",
      "description": "Uma prática suave focada na respiração...",
      "categoryId": "mindfulness",
      "duration": 600,
      "difficulty": "iniciante",
      "instructor": "Ana Silva",
      "audioUrl": "https://storage.example.com/meditation/001.mp3",
      "thumbnailUrl": "https://storage.example.com/thumbnails/001.jpg",
      "playCount": 1234,
      "averageRating": 4.7
    }
  ],
  "categories": [
    {
      "id": "mindfulness",
      "name": "Mindfulness",
      "description": "Práticas de atenção plena",
      "icon": "🧘",
      "color": "#6366f1"
    }
  ]
}
```

---

### POST /patient/meditation-sessions

Record a completed meditation session.

**Authentication:** Required (Patient role)

**Request Body:**
```json
{
  "meditationId": "med-001",
  "duration": 600,
  "wasCompleted": true,
  "rating": 5,
  "moodBefore": 6,
  "moodAfter": 8,
  "feedback": "Very relaxing session"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "session": {
    "id": "session-123",
    "userId": 1,
    "meditationId": "med-001",
    "startedAt": "2024-01-20T10:00:00Z",
    "completedAt": "2024-01-20T10:10:00Z",
    "duration": 600,
    "wasCompleted": true,
    "rating": 5,
    "moodBefore": 6,
    "moodAfter": 8
  },
  "pointsEarned": {
    "points": 15,
    "xp": 20
  }
}
```

---

### GET /patient/mood

Get mood tracking history.

**Authentication:** Required (Patient role)

**Query Parameters:**
- `startDate` (date): Filter from date
- `endDate` (date): Filter to date
- `limit` (integer): Number of records

**Response (200 OK):**
```json
{
  "success": true,
  "moodData": [
    {
      "id": 1,
      "patientId": 1,
      "date": "2024-01-20T00:00:00Z",
      "mood": 7,
      "energy": 6,
      "anxiety": 4,
      "stressLevel": 5,
      "sleepQuality": 7,
      "notes": "Good day overall"
    }
  ],
  "statistics": {
    "averageMood": 6.8,
    "averageEnergy": 6.2,
    "trendDirection": "improving"
  }
}
```

---

## Psychologist Endpoints

### GET /psychologist/patients

Get list of patients for the psychologist.

**Authentication:** Required (Psychologist role)

**Response (200 OK):**
```json
{
  "success": true,
  "patients": [
    {
      "id": 1,
      "name": "João Silva",
      "email": "joao@example.com",
      "avatarUrl": null,
      "status": "active",
      "nextSession": "2024-01-22T15:00:00Z",
      "totalSessions": 12,
      "lastSessionDate": "2024-01-15T15:00:00Z",
      "currentCycle": "crescer",
      "recentMoodTrend": "improving"
    }
  ]
}
```

---

### GET /psychologist/patients/:id

Get detailed information about a specific patient.

**Authentication:** Required (Psychologist role)

**Response (200 OK):**
```json
{
  "success": true,
  "patient": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com",
    "profile": {
      "birthDate": "1990-05-15T00:00:00Z",
      "emergencyContact": {
        "name": "Maria Silva",
        "phone": "+55 11 98765-4321",
        "relationship": "Sister"
      },
      "currentCycle": "crescer"
    },
    "statistics": {
      "totalSessions": 12,
      "completedTasks": 8,
      "diaryEntries": 45,
      "meditationSessions": 23,
      "averageMood": 6.8
    },
    "recentActivity": {
      "lastDiaryEntry": "2024-01-20T14:30:00Z",
      "lastSession": "2024-01-15T15:00:00Z",
      "lastMoodUpdate": "2024-01-20T08:00:00Z"
    }
  }
}
```

---

### GET /psychologist/clinical-alerts

Get clinical alerts for patients.

**Authentication:** Required (Psychologist role)

**Response (200 OK):**
```json
{
  "success": true,
  "alerts": [
    {
      "id": 1,
      "patientId": 1,
      "patientName": "João Silva",
      "alertType": "mood_decline",
      "severity": "medium",
      "title": "Significant mood decline detected",
      "description": "Patient's mood has decreased by 30% over the last week",
      "recommendations": [
        "Schedule check-in session",
        "Review recent diary entries",
        "Assess need for intervention"
      ],
      "isActive": true,
      "createdAt": "2024-01-20T09:00:00Z"
    }
  ],
  "unacknowledgedCount": 3
}
```

---

### GET /psychologist/ai-insights

Get AI-generated insights for a patient.

**Authentication:** Required (Psychologist role)

**Query Parameters:**
- `patientId` (integer, required): Patient ID

**Response (200 OK):**
```json
{
  "success": true,
  "insights": [
    {
      "id": 1,
      "type": "pattern_detection",
      "title": "Anxiety patterns identified",
      "content": {
        "patterns": [
          "Increased anxiety on Monday mornings",
          "Better mood after meditation sessions"
        ],
        "correlations": {
          "meditation_to_mood": 0.72,
          "sleep_to_energy": 0.85
        },
        "recommendations": [
          "Encourage morning meditation routine",
          "Focus on sleep hygiene improvement"
        ]
      },
      "severity": "info",
      "generatedAt": "2024-01-20T10:00:00Z"
    }
  ]
}
```

---

### POST /psychologist/prescribe-task

Prescribe a therapeutic task to a patient.

**Authentication:** Required (Psychologist role)

**Request Body:**
```json
{
  "patientId": 1,
  "title": "Daily Gratitude Journal",
  "description": "Write down 3 things you're grateful for each day",
  "category": "mindfulness",
  "difficulty": "easy",
  "dueDate": "2024-01-27T23:59:59Z",
  "priority": "media"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "task": {
    "id": 1,
    "patientId": 1,
    "psychologistId": 2,
    "title": "Daily Gratitude Journal",
    "description": "Write down 3 things you're grateful for each day",
    "category": "mindfulness",
    "difficulty": "easy",
    "status": "pending",
    "priority": "media",
    "dueDate": "2024-01-27T23:59:59Z",
    "assignedAt": "2024-01-20T15:00:00Z"
  }
}
```

---

## Chat System

### GET /chat

Get chat messages for a room.

**Authentication:** Required

**Query Parameters:**
- `roomId` (string): Chat room ID (optional if otherUserId is provided)
- `otherUserId` (integer): ID of the other user (creates room if doesn't exist)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roomId": "room-123",
    "messages": [
      {
        "id": "msg-001",
        "roomId": "room-123",
        "senderId": 1,
        "content": "Hello, how are you?",
        "messageType": "text",
        "isTemporary": false,
        "createdAt": "2024-01-20T10:30:00Z",
        "readReceipts": [
          {
            "userId": 2,
            "readAt": "2024-01-20T10:31:00Z"
          }
        ]
      }
    ],
    "participants": [1, 2]
  }
}
```

---

### POST /chat

Send a chat message.

**Authentication:** Required

**Request Body:**
```json
{
  "roomId": "room-123",
  "receiverId": 2,
  "content": "Hello, how are you?",
  "messageType": "text",
  "isTemporary": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg-001",
      "roomId": "room-123",
      "senderId": 1,
      "content": "Hello, how are you?",
      "messageType": "text",
      "createdAt": "2024-01-20T10:30:00Z"
    },
    "roomId": "room-123"
  }
}
```

**Real-time:** Triggers Pusher event `new-message` on channel `chat-room-{roomId}`

---

### PATCH /chat

Mark message as read.

**Authentication:** Required

**Request Body:**
```json
{
  "messageId": "msg-001"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Real-time:** Triggers Pusher event `message-read` to sender

---

## Session Management

### GET /sessions

Get therapy sessions.

**Authentication:** Required

**Query Parameters:**
- `status` (string): Filter by status ("scheduled", "confirmed", "completed", "cancelled")
- `startDate` (date): Filter from date
- `endDate` (date): Filter to date

**Response (200 OK):**
```json
{
  "success": true,
  "sessions": [
    {
      "id": 1,
      "psychologistId": 2,
      "patientId": 1,
      "scheduledAt": "2024-01-22T15:00:00Z",
      "duration": 50,
      "type": "therapy",
      "status": "scheduled",
      "notes": null,
      "isRecurring": true,
      "recurrencePattern": "weekly"
    }
  ]
}
```

---

### POST /sessions

Create a therapy session.

**Authentication:** Required (Psychologist role)

**Request Body:**
```json
{
  "patientId": 1,
  "scheduledAt": "2024-01-22T15:00:00Z",
  "duration": 50,
  "type": "therapy",
  "notes": "Initial consultation",
  "recurrencePattern": "weekly"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "session": {
    "id": 1,
    "psychologistId": 2,
    "patientId": 1,
    "scheduledAt": "2024-01-22T15:00:00Z",
    "duration": 50,
    "type": "therapy",
    "status": "scheduled",
    "isRecurring": true,
    "recurrencePattern": "weekly"
  }
}
```

---

## Gamification

### GET /gamification/points

Get user points and XP.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalXP": 1500,
    "currentLevel": 5,
    "xpToNextLevel": 350,
    "weeklyPoints": 250,
    "monthlyPoints": 1100,
    "streak": 7,
    "lastActivityDate": "2024-01-20",
    "recentActivities": [
      {
        "id": 1,
        "activityType": "diary_entry",
        "points": 10,
        "xp": 15,
        "description": "Entrada no diário",
        "createdAt": "2024-01-20T14:30:00Z"
      }
    ]
  }
}
```

---

### GET /gamification/achievements

Get user achievements.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "unlocked": [
    {
      "id": 1,
      "name": "First Steps",
      "description": "Complete your first diary entry",
      "icon": "✨",
      "type": "milestone",
      "category": "diary",
      "xpReward": 50,
      "rarity": "common",
      "unlockedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "available": [
    {
      "id": 2,
      "name": "Meditation Master",
      "description": "Complete 30 meditation sessions",
      "icon": "🧘",
      "type": "activity",
      "category": "meditation",
      "requirement": 30,
      "xpReward": 200,
      "rarity": "rare",
      "progress": 12
    }
  ]
}
```

---

## SOS System

### POST /sos/activate

Activate emergency support system.

**Authentication:** Required (Patient role)

**Request Body:**
```json
{
  "level": "moderate",
  "type": "breathing",
  "notes": "Feeling anxious"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "sosUsage": {
    "id": 1,
    "patientId": 1,
    "level": "moderate",
    "type": "breathing",
    "completed": false,
    "resolved": false,
    "timestamp": "2024-01-20T16:30:00Z"
  },
  "recommendations": [
    "Deep breathing exercises",
    "Grounding techniques",
    "Contact emergency support if needed"
  ],
  "resources": [
    {
      "type": "exercise",
      "title": "4-7-8 Breathing",
      "description": "...",
      "url": "/exercises/breathing-478"
    }
  ]
}
```

**Real-time:** Notifies assigned psychologist via Pusher

---

## Notifications

### GET /notifications

Get user notifications.

**Authentication:** Required

**Query Parameters:**
- `unreadOnly` (boolean, default: false): Return only unread notifications
- `limit` (integer, default: 20): Number of notifications

**Response (200 OK):**
```json
{
  "success": true,
  "notifications": [
    {
      "id": 1,
      "userId": 1,
      "type": "session_reminder",
      "title": "Session Reminder",
      "message": "Your therapy session is in 1 hour",
      "isRead": false,
      "createdAt": "2024-01-20T14:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

---

## Compliance

### POST /compliance/data-export

Request data export (GDPR/LGPD).

**Authentication:** Required

**Request Body:**
```json
{
  "format": "json"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "exportId": 1,
  "status": "pending",
  "estimatedTime": "30 minutes",
  "expiresAt": "2024-01-27T15:00:00Z"
}
```

---

## Response Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

## Date Formats

All dates and times are in ISO 8601 format (UTC):
```
2024-01-20T14:30:00Z
```

---

For more information:
- [Authentication Guide](./API_AUTHENTICATION.md)
- [Error Handling](./API_ERRORS.md)
- [Rate Limits](./API_RATE_LIMITS.md)
- [Code Examples](./API_EXAMPLES.md)
