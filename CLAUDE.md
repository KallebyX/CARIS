# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CÁRIS SaaS Pro is a mental health platform built with Next.js 15, TypeScript, and PostgreSQL. It connects patients with psychologists through real-time chat, diary entries, session management, and therapeutic tools.

## Development Commands

### Core Development
```bash
# Development server
pnpm dev

# Build for production  
pnpm build

# Start production server
pnpm start

# Type checking and linting
pnpm lint
```

### Database Operations
```bash
# Generate database migrations from schema changes
pnpm db:generate

# Apply database migrations
pnpm db:migrate

# Seed database with initial data
pnpm db:seed

# Open database studio interface
pnpm db:studio
```

### Testing (if available)
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate test coverage report
pnpm test:coverage
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: Pusher for WebSocket communication
- **Authentication**: JWT with cookies
- **UI Components**: Radix UI primitives with custom styling
- **State Management**: Zustand for global state, React Query for server state

### Project Structure

```
app/                          # Next.js App Router
├── (auth)/                   # Authentication routes (login, register)
├── admin/                    # Admin dashboard routes
├── api/                      # API endpoints
│   ├── auth/                 # Authentication endpoints
│   ├── patient/              # Patient-specific APIs
│   ├── psychologist/         # Psychologist-specific APIs
│   └── notifications/        # Real-time notifications
├── dashboard/                # Main application dashboards
│   ├── (patient)/           # Patient interface routes
│   └── (psychologist)/      # Psychologist interface routes
└── checkout/                 # Payment and subscription routes

components/                   # React components
├── ui/                      # Base UI components (Radix-based)
├── chat/                    # Chat system components
├── checkout/                # Payment components
├── landing/                 # Landing page components
└── notifications/           # Notification components

db/                          # Database configuration
├── schema.ts               # Drizzle schema definitions
└── index.ts                # Database connection

lib/                         # Utility libraries
├── auth.ts                 # JWT authentication utilities
├── email.ts                # Email service integration
├── pusher.ts               # Real-time communication
├── utils.ts                # General utilities
└── notification-*.ts       # Notification services

hooks/                       # Custom React hooks
scripts/                     # Database migrations and seeds
```

### Database Schema

The database uses PostgreSQL with these main entities:
- **users**: Core user accounts (patients, psychologists, admins)
- **patientProfiles**: Patient-specific information
- **psychologistProfiles**: Psychologist credentials and info
- **sessions**: Therapy session scheduling
- **diaryEntries**: Patient diary system
- **chatMessages**: Real-time messaging
- **moodTracking**: Emotional state tracking
- **userSettings**: User preferences and notifications

### Authentication & Authorization

- JWT tokens stored in HTTP-only cookies
- Role-based access control (patient, psychologist, admin)
- Middleware protection for dashboard and API routes
- Session management with automatic refresh

### API Design Patterns

All API routes follow a consistent pattern:
```typescript
// app/api/[resource]/route.ts
export async function GET(request: NextRequest) {
  // 1. Validate authentication
  const userId = await getUserIdFromRequest(request);
  if (!userId) return unauthorized();
  
  // 2. Validate authorization (role-based)
  const user = await getUserWithRole(userId);
  if (!hasPermission(user.role, 'read:resource')) return forbidden();
  
  // 3. Process request
  const data = await service.getData(userId);
  
  // 4. Return consistent response
  return NextResponse.json({ success: true, data });
}
```

### Real-time Features

- Pusher WebSocket integration for chat and notifications
- Server-Sent Events for live updates
- Push notifications for critical alerts (SOS system)

## Common Development Tasks

### Adding New API Endpoints
1. Create route file in `app/api/[resource]/route.ts`
2. Implement authentication/authorization checks
3. Use consistent response format: `{ success: boolean, data?: any, error?: string }`
4. Add TypeScript interfaces for request/response types

### Database Schema Changes
1. Modify `db/schema.ts` with new tables/columns
2. Run `pnpm db:generate` to create migrations
3. Run `pnpm db:migrate` to apply changes
4. Update TypeScript types accordingly

### Adding UI Components
1. Create base components in `components/ui/` following Radix patterns
2. Build feature-specific components in appropriate folders
3. Use Tailwind CSS with the custom design system
4. Follow the established component composition patterns

### Environment Variables
Copy `env.template` to `.env.local` and configure:
- `POSTGRES_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `PUSHER_*`: Real-time service credentials
- Service API keys (Resend, Twilio, etc.)

## Code Style Guidelines

### TypeScript
- Use strict TypeScript configuration
- Define interfaces for all API requests/responses
- Use Drizzle schema types for database operations
- Prefer type inference over explicit typing where clear

### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Follow composition over inheritance
- Use consistent prop destructuring

### API Routes
- Always validate input data
- Implement proper error handling
- Use consistent HTTP status codes
- Include proper TypeScript types

### Database Queries
- Use Drizzle ORM for type-safe queries
- Implement proper indexing for performance
- Use transactions for data consistency
- Include proper error handling

## Important Considerations

### Security
- All sensitive data must be properly encrypted
- Implement rate limiting on API endpoints
- Validate all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper CORS policies

### Performance
- Use React Query for API caching
- Implement proper database indexing
- Optimize images and assets
- Use Next.js built-in performance optimizations

### Mental Health Compliance
- This is a mental health platform - handle all patient data with extreme care
- Implement proper audit logging for sensitive operations
- Ensure HIPAA/GDPR compliance in data handling
- Include emergency contact features for crisis situations

### Real-time Features
- Chat system requires Pusher configuration
- Implement proper presence detection
- Handle connection drops gracefully
- Maintain message delivery guarantees

## Deployment

The application is configured for deployment on:
- **Primary**: Vercel (recommended)
- **Database**: Neon PostgreSQL
- **File Storage**: Cloudflare R2 or AWS S3
- **Monitoring**: Sentry for error tracking

## MCP Configuration

The project includes comprehensive Model Context Protocol setup in `mcp-config.json` for enhanced AI development productivity. See `MCP_SETUP.md` for detailed configuration instructions.