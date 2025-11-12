# CÁRIS API Documentation

Welcome to the complete API documentation for the CÁRIS mental health platform.

---

## Documentation Index

### Getting Started

1. **[API Reference](./API_REFERENCE.md)** - Complete endpoint reference
   - All available endpoints
   - Request/response formats
   - Query parameters
   - Examples for each endpoint

2. **[Authentication Guide](./API_AUTHENTICATION.md)** - Security and auth
   - JWT token authentication
   - Cookie-based sessions
   - Role-based access control
   - Security best practices

3. **[Code Examples](./API_EXAMPLES.md)** - Practical examples
   - Real-world usage scenarios
   - Complete implementations
   - Multiple programming languages
   - Common use cases

4. **[Error Handling](./API_ERRORS.md)** - Error management
   - Error response formats
   - Status codes
   - Validation errors
   - Retry strategies

5. **[Rate Limits](./API_RATE_LIMITS.md)** - Usage limits
   - Rate limit tiers
   - Endpoint-specific limits
   - Handling rate limits
   - Best practices

---

## Quick Links

- **Interactive API Docs**: `/api-docs` - Swagger UI with try-it-out functionality
- **OpenAPI Spec**: `/openapi.json` - OpenAPI 3.0 specification
- **API Client**: `@/lib/api-client` - Type-safe TypeScript client
- **Base URL**: `https://app.caris.health/api` (Production)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install @/lib/api-client
# or
yarn add @/lib/api-client
```

### 2. Import the API Client

```typescript
import { apiClient } from '@/lib/api-client'
```

### 3. Authenticate

```typescript
const response = await apiClient.auth.login(
  'user@example.com',
  'password123'
)
console.log('Logged in:', response.user)
```

### 4. Make API Calls

```typescript
// Create diary entry
const entry = await apiClient.diary.createEntry({
  moodRating: 3,
  intensityRating: 7,
  content: 'Today was a good day...',
  cycle: 'crescer'
})

// Send chat message
const message = await apiClient.chat.sendMessage({
  receiverId: 2,
  content: 'Hello!'
})

// Get therapy sessions
const sessions = await apiClient.sessions.getSessions()
```

---

## API Features

### Core Features

- **RESTful Design** - Standard HTTP methods and status codes
- **JSON Format** - All requests and responses use JSON
- **JWT Authentication** - Secure token-based auth with HTTP-only cookies
- **Role-Based Access** - Patient, Psychologist, Admin roles
- **Rate Limiting** - Fair usage policies and protection
- **Real-time Events** - Pusher WebSocket integration
- **Pagination** - Efficient data fetching for large datasets
- **Filtering** - Query parameters for precise data retrieval

### Advanced Features

- **AI Analysis** - Automatic emotional analysis on diary entries
- **Multimodal Support** - Text, audio, and image content
- **Gamification** - Points, XP, achievements, and challenges
- **SOS System** - Emergency support activation
- **Calendar Integration** - Google Calendar and Outlook sync
- **GDPR/LGPD Compliance** - Data export and privacy controls
- **Audit Logging** - Comprehensive activity tracking
- **Session Management** - Recurring appointments and reminders

---

## Available Endpoints

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration
- POST `/api/auth/logout` - User logout

### User Management
- GET `/api/users/me` - Get current user
- GET `/api/user/settings` - Get user settings
- PUT `/api/user/settings` - Update settings
- POST `/api/user/change-password` - Change password

### Patient Endpoints
- GET `/api/patient/diary` - Get diary entries
- POST `/api/patient/diary` - Create diary entry
- GET `/api/patient/meditation-library` - Get meditation audios
- POST `/api/patient/meditation-sessions` - Record meditation
- GET `/api/patient/mood` - Get mood tracking

### Psychologist Endpoints
- GET `/api/psychologist/patients` - Get patient list
- GET `/api/psychologist/patients/:id` - Get patient details
- GET `/api/psychologist/clinical-alerts` - Get alerts
- GET `/api/psychologist/ai-insights` - Get AI insights
- POST `/api/psychologist/prescribe-task` - Assign task

### Chat System
- GET `/api/chat` - Get messages
- POST `/api/chat` - Send message
- PATCH `/api/chat` - Mark as read
- DELETE `/api/chat` - Delete message

### Session Management
- GET `/api/sessions` - Get sessions
- POST `/api/sessions` - Create session
- POST `/api/sessions/:id/start` - Start session
- POST `/api/sessions/:id/end` - End session

### Gamification
- GET `/api/gamification/points` - Get points/XP
- GET `/api/gamification/achievements` - Get achievements
- GET `/api/gamification/challenges` - Get challenges
- GET `/api/gamification/leaderboard` - Get leaderboard

### Notifications
- GET `/api/notifications` - Get notifications
- POST `/api/notifications/mark-read` - Mark as read
- POST `/api/notifications/subscribe` - Subscribe to push

### SOS System
- POST `/api/sos/activate` - Activate SOS
- POST `/api/sos/deactivate` - Deactivate SOS
- GET `/api/sos` - Get SOS history

### Admin
- GET `/api/admin/stats` - Platform statistics
- GET `/api/admin/users` - User management
- GET `/api/admin/audit-logs` - Audit logs
- GET `/api/admin/financial-reports` - Financial reports

### Compliance
- POST `/api/compliance/data-export` - Request data export
- GET `/api/compliance/privacy-settings` - Get privacy settings
- PUT `/api/compliance/privacy-settings` - Update privacy settings
- GET `/api/compliance/consents` - Get consents
- PUT `/api/compliance/consents/:type` - Update consent

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "error": "Error message",
  "message": "Detailed explanation",
  "code": "ERROR_CODE"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "hasMore": true,
    "total": 45
  }
}
```

---

## Authentication

All authenticated endpoints require a JWT token stored in an HTTP-only cookie.

**Login to obtain token:**

```bash
curl -X POST https://app.caris.health/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response includes Set-Cookie header:**

```
Set-Cookie: token=eyJhbGc...; HttpOnly; Secure; SameSite=Strict
```

**Subsequent requests automatically include cookie:**

```bash
curl https://app.caris.health/api/users/me \
  --cookie "token=eyJhbGc..."
```

---

## Rate Limits

- **General Endpoints**: 100 requests/minute
- **Authentication**: 10 requests/15 minutes
- **Heavy Operations**: Variable limits
- **Premium Tier**: 5x higher limits

See [Rate Limits Guide](./API_RATE_LIMITS.md) for details.

---

## Error Codes

Common HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

See [Error Handling Guide](./API_ERRORS.md) for details.

---

## Support

### Documentation Issues

If you find errors or have suggestions for improving the documentation:
- Create an issue on GitHub
- Email: support@caris.health

### API Issues

For API bugs, outages, or technical support:
- Email: support@caris.health
- Status Page: https://status.caris.health

### Feature Requests

To request new API features or endpoints:
- Email: features@caris.health
- Include use case description

---

## Changelog

### Version 1.0.0 (Current)

**Released:** January 2024

**Features:**
- Complete RESTful API
- JWT authentication
- Real-time chat with Pusher
- AI-powered diary analysis
- Gamification system
- Session management
- Meditation library
- SOS emergency system
- GDPR/LGPD compliance
- Comprehensive error handling
- Rate limiting

**Future Roadmap:**
- GraphQL API
- Webhooks
- Bulk operations API
- Advanced analytics endpoints
- Video session integration
- Mobile SDK

---

## Additional Resources

### Platform Documentation
- [Architecture Overview](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Testing Guide](./TESTING_GUIDE.md)

### Feature Guides
- [Session Reminders](./SESSION_REMINDERS_AND_SCHEDULING.md)
- [PWA Implementation](./PWA_IMPLEMENTATION.md)
- [Monitoring & Alerts](./MONITORING_ALERTS.md)
- [Sentry Setup](./SENTRY_SETUP.md)

### Development
- [AI Clinical Assistant](./ai-clinical-assistant.md)
- [Meditation Audio Sources](./meditation-audio-sources.md)
- [Improvement Plan](./IMPROVEMENT_PLAN.md)

---

## License

This API documentation is proprietary to CÁRIS SaaS Pro.

Unauthorized use, distribution, or reproduction is prohibited.

© 2024 CÁRIS. All rights reserved.
