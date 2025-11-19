# Date Formatting Inconsistencies Report (LOW-03)
## CÁRIS Codebase Analysis

This report documents the inconsistent date formatting patterns found across the CÁRIS codebase, where dates are handled in multiple incompatible ways (ISO strings vs timestamps vs Date objects).

---

## 1. ISO STRING FORMATTING (toISOString())

### 1.1 Middleware & Logging
- **File**: `/home/user/CARIS/middleware.ts`
  - **Line 184**: `timestamp: new Date().toISOString()`
  - Usage: Security event logging with ISO string timestamp

### 1.2 Payment & Checkout Endpoints
- **File**: `/home/user/CARIS/app/api/checkout/create-payment/route.ts`
  - **Line 113**: `date_created: new Date().toISOString()`
  - **Line 114**: `date_approved: paymentMethod !== "pix" ? new Date().toISOString() : null`
  - **Line 231**: `expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString()`
  - **Line 244**: `expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()`
  - Usage: Payment response objects with ISO timestamps

### 1.3 Stripe Webhooks
- **File**: `/home/user/CARIS/app/api/stripe/webhooks/route.ts`
  - Multiple instances using `.toISOString()` for payment event dates

### 1.4 AI Analysis (Date String Splits)
- **File**: `/home/user/CARIS/lib/ai-analysis.ts`
  - **Line 361**: `.map(s => `Data: ${s.sessionDate.toISOString().split('T')[0]}`
  - **Line 366**: `.map(entry => `${entry.createdAt.toISOString().split('T')[0]}`
  - **Line 643**: `.map(e => `${e.createdAt.toISOString().split('T')[0]}`
  - **Line 647**: `.map(s => `${s.sessionDate.toISOString().split('T')[0]}`
  - **Line 659**: `...split('T')[0]}` (date formatting for reports)
  - **Line 700**: `period: ${period.start.toISOString().split('T')[0]}`
  - **Line 721**: `period: ${period.start.toISOString().split('T')[0]}`
  - Usage: Extracting date portion from ISO strings (inconsistent pattern)

### 1.5 Seed Scripts
- **File**: `/home/user/CARIS/scripts/seed.js`
  - **Lines 94-97**: `(${futureDate1.toISOString()}, ...` - Using toISOString() for dates
  - **Line 115**: `${futureDate1.toISOString()}, 'em_progresso'`
  - **Line 133**: `dates.push(date.toISOString().split("T")[0])`

### 1.6 Session Management
- **File**: `/home/user/CARIS/app/dashboard/(psychologist)/schedule/new/page.tsx`
  - **Line 179**: `sessionDate: sessionDateTime.toISOString()`

---

## 2. TIMESTAMP FORMATTING (Date.now() & getTime())

### 2.1 Payment Processing
- **File**: `/home/user/CARIS/app/api/webhooks/stripe/route.ts`
  - **Line 470**: `Date.now() + (existingFailure.retryCount + 1) * 24 * 60 * 60 * 1000`
  - **Line 482**: `nextRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000)`
  - Usage: Calculating retry timestamps in milliseconds

### 2.2 Checkout Payment IDs
- **File**: `/home/user/CARIS/app/api/checkout/create-payment/route.ts`
  - **Line 65**: `external_reference: \`caris-${Date.now()}\``
  - **Line 80**: `id: \`mp_${Date.now()}\``
  - **Line 146**: `id: \`sub_${Date.now()}\``
  - **Line 152**: `current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)`
  - Usage: Generating unique IDs and calculating future dates

### 2.3 Duration Calculations (getTime())
- **File**: `/home/user/CARIS/components/videotherapy/video-call.tsx`
  - **Line 88**: `duration: Math.floor((new Date().getTime() - prev.startTime.getTime()) / 1000)`
  - Usage: Calculating session duration in seconds

### 2.4 Session Time Differences
- **File**: `/home/user/CARIS/components/videotherapy/session-manager.tsx`
  - **Line 194**: `const timeDiff = sessionDate.getTime() - now.getTime()`
  - Usage: Computing time difference for session eligibility checks

### 2.5 Message Expiration
- **File**: `/home/user/CARIS/lib/message-expiration.ts`
  - **Line 34**: `const expiresAt = new Date(Date.now() + expiration.duration)`
  - **Line 41**: `updatedAt: new Date()`
  - **Line 269**: `const expirationTime = expiresAt.getTime()`
  - **Line 329**: `const newExpiration = new Date(currentExpiration.getTime() + additionalTime)`

### 2.6 Emotional Timeline
- **File**: `/home/user/CARIS/components/emotional-map/emotional-timeline.tsx`
  - **Line 61**: `const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)`
  - **Line 70**: `return filtered.sort((a, b) => a.date.getTime() - b.date.getTime())`

---

## 3. NEW DATE() CONSTRUCTOR PATTERNS

### 3.1 Date Calculations with setDate()
Multiple API routes use `.setDate()` to manipulate dates:

- **File**: `/home/user/CARIS/app/api/ai/risk-assessment/route.ts`
  - **Lines 41-42**: 
    ```typescript
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    ```
  - **Lines 88-89**: Similar pattern for ninetyDaysAgo

- **File**: `/home/user/CARIS/app/api/gamification/points/route.ts`
  - **Lines 38-39**: 
    ```typescript
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    ```

- **File**: `/home/user/CARIS/app/api/gamification/leaderboard/route.ts`
  - **Lines 120-131**: Multiple setDate/setHours calls for weekly/monthly calculations
    ```typescript
    const today = new Date()
    let startDate = new Date(today)
    // Lines 130-131: startDate.setDate(), endDate.setDate()
    ```

- **File**: `/home/user/CARIS/app/api/ai/recommendations/route.ts`
  - **Lines 94-97**: sevenDaysAgo and fourteenDaysAgo with setDate()

- **File**: `/home/user/CARIS/app/api/psychologist/schedule/stats/route.ts`
  - **Lines 20-25**: 
    ```typescript
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    ```

- **File**: `/home/user/CARIS/app/api/gamification/challenges/route.ts`
  - **Lines 195, 199**: `nextMonday.setDate()`, `endDate.setDate()`

- **File**: `/home/user/CARIS/app/api/psychologist/reports/route.ts`
  - **Lines 61, 105**: `thirtyDaysAgo.setDate()`, `lastMonth.setMonth()`

### 3.2 Date Updates in Database
- **File**: `/home/user/CARIS/app/api/webhooks/stripe/route.ts`
  - Multiple lines (297, 316, 336-337, 401, 412-413, 427-428, 446, 472, 592-593):
    ```typescript
    updatedAt: new Date(),
    canceledAt: new Date(),
    paidAt: new Date(),
    resolvedAt: new Date(),
    ```

- **File**: `/home/user/CARIS/app/api/patient/medication-adherence/route.ts`
  - **Line 25**: `const startDate = new Date()`
  - **Line 126**: `const refillSoonDate = new Date()`
  - **Line 166**: `endDate: new Date()`

---

## 4. INCONSISTENT DATE STRING EXTRACTION

### Problem: Using `.toISOString().split('T')[0]` pattern

- **File**: `/home/user/CARIS/scripts/seed.js`
  - **Line 133**: `dates.push(date.toISOString().split("T")[0])`

- **File**: `/home/user/CARIS/lib/session-conflicts.ts`
  - **Line 549**: `const dayKey = session.scheduledAt.toISOString().split("T")[0]`

- **File**: `/home/user/CARIS/lib/calendar/sync-monitor.ts`
  - **Line 391**: `const key = \`calendar:api:${provider}:${userId}:${new Date().toISOString().split('T')[0]}\``

- **File**: `/home/user/CARIS/app/dashboard/(psychologist)/schedule/new/page.tsx`
  - **Line 299**: `min={new Date().toISOString().split("T")[0]}`

- **File**: `/home/user/CARIS/scripts/gamification/seed-gamification.ts`
  - **Lines 239-240, 251-252, 263-264, 275-276**: Multiple instances of `.split('T')[0]` pattern

- **File**: `/home/user/CARIS/lib/ai/predictive-analytics.ts`
  - **Line 600**: `date: date.toISOString().split('T')[0]`

---

## 5. LOCALE STRING FORMATTING (toLocaleString)

### 5.1 Brazilian Portuguese Locale
- **File**: `/home/user/CARIS/lib/calendar/timezone-handler.ts`
  - **Line 145**: `return date.toLocaleString('pt-BR', {...})`
  - **Line 151**: `return date.toLocaleString('pt-BR')`
  - **Line 261**: `const sessionTimeString = sessionTime.toLocaleString('en-US', {...})`

- **File**: `/home/user/CARIS/app/admin/compliance/page.tsx`
  - **Line 141**: `return new Date(dateString).toLocaleString('pt-BR')`

- **File**: `/home/user/CARIS/lib/notification-service.ts`
  - **Line 248**: `${new Date().toLocaleString("pt-BR")}`

### 5.2 Timezone-Specific Conversions
- **File**: `/home/user/CARIS/lib/calendar/timezone-handler.ts`
  - **Lines 48, 74-75, 131-132, 310-311**: Multiple toLocaleString() calls with timezone conversions

---

## 6. API ENDPOINTS WITH INCONSISTENT RESPONSE FORMATS

### 6.1 Payment API Response
- **File**: `/home/user/CARIS/app/api/checkout/create-payment/route.ts`
  - Response uses both:
    - ISO string: `date_created: new Date().toISOString()`
    - Date objects: `current_period_start: new Date()`

### 6.2 Gamification Leaderboard
- **File**: `/home/user/CARIS/app/api/gamification/leaderboard/route.ts`
  - **Lines 151-152**: 
    ```typescript
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    ```
  - Issue: Returns date strings instead of Date objects or timestamps

### 6.3 Message Expiration API
- **File**: `/home/user/CARIS/lib/message-expiration.ts`
  - **Line 34**: `new Date(Date.now() + expiration.duration)` - timestamp-based calculation
  - **Line 41**: `updatedAt: new Date()` - Date object for database

---

## 7. DATABASE SCHEMA INCONSISTENCIES

### 7.1 Schema Definition
- **File**: `/home/user/CARIS/db/schema.ts`
  - **Lines 27-28**: `createdAt: timestamp("created_at").defaultNow().notNull()` - Default NOW()
  - **Line 72**: `scheduledAt: timestamp("scheduled_at").notNull()` - Manual timestamp
  - **Line 370-371**: 
    ```typescript
    isTemporary: boolean('is_temporary').notNull().default(false),
    expiresAt: timestamp('expires_at'), // Inconsistent comment
    ```
  - **Line 528, 554, 672**: Multiple `expiresAt` fields with inconsistent handling

---

## 8. UTILITY FUNCTION INCONSISTENCIES

### 8.1 Session Manager Date Handling
- **File**: `/home/user/CARIS/components/videotherapy/session-manager.tsx`
  - **Line 192**: `const sessionDate = new Date(session.sessionDate)` - String to Date conversion
  - **Line 193**: `const now = new Date()` - Current timestamp
  - **Line 194**: `const timeDiff = sessionDate.getTime() - now.getTime()` - Millisecond difference

### 8.2 Date Range Calculations
- **File**: `/home/user/CARIS/lib/recurring-sessions.ts`
  - **Line 4**: Imports `date-fns` but also uses manual Date manipulation
  - **Line 76**: `return \`series_${Date.now()}_...\`` - Timestamp-based ID generation

### 8.3 Session Video Call Duration
- **File**: `/home/user/CARIS/components/videotherapy/video-call.tsx`
  - **Line 66**: `startTime: new Date()` - Date object
  - **Line 88**: `duration: Math.floor((new Date().getTime() - prev.startTime.getTime()) / 1000)` - Millisecond calculation

---

## SUMMARY OF INCONSISTENCIES

| Pattern | Count | Examples |
|---------|-------|----------|
| ISO Strings (toISOString()) | 10+ | Payment APIs, logging, seed scripts |
| Timestamps (Date.now(), getTime()) | 15+ | Retry logic, duration calculations, ID generation |
| new Date() constructors | 20+ | Date math with setDate/setMonth/setHours |
| String split pattern (.split('T')[0]) | 10+ | AI analysis, leaderboards, sync monitoring |
| Locale formatting (toLocaleString) | 8+ | Display formatting, timezone conversions |
| Mixed in single endpoint | 5+ | Payment, checkout, gamification endpoints |

---

## RECOMMENDED STANDARDIZATION

**Proposal**: Standardize on one of these approaches:

1. **ISO Strings (Recommended)**: Store and transmit all dates as ISO 8601 strings
   - Pro: Database-agnostic, timezone-aware, standard format
   - Con: Requires parsing in frontend

2. **Unix Timestamps**: Use milliseconds since epoch throughout
   - Pro: Simple arithmetic, language-agnostic
   - Con: Less human-readable

3. **Hybrid Approach**: Use ISO strings in APIs, Date objects in memory, timestamps in specific utilities
   - Pro: Best of both worlds
   - Con: Requires strict conversion utilities

---

## FILES REQUIRING REFACTORING

**High Priority** (10+ inconsistencies each):
- /home/user/CARIS/app/api/checkout/create-payment/route.ts
- /home/user/CARIS/lib/ai-analysis.ts
- /home/user/CARIS/app/api/webhooks/stripe/route.ts

**Medium Priority** (5-9 inconsistencies each):
- /home/user/CARIS/app/api/gamification/leaderboard/route.ts
- /home/user/CARIS/lib/message-expiration.ts
- /home/user/CARIS/app/api/ai/risk-assessment/route.ts
- /home/user/CARIS/lib/calendar/timezone-handler.ts

**Lower Priority** (1-4 inconsistencies each):
- Various API routes in /app/api/
- Component files handling dates
- Seed scripts

