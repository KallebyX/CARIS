# Date Formatting Guide - CÁRIS Platform

This guide establishes standardized date formatting conventions for the CÁRIS platform to ensure consistency across the codebase.

## Table of Contents

- [Overview](#overview)
- [Date Utilities Module](#date-utilities-module)
- [Conventions](#conventions)
- [Common Patterns](#common-patterns)
- [Migration Guide](#migration-guide)
- [Examples](#examples)

---

## Overview

### Problem

The codebase previously had **40+ instances** of inconsistent date formatting:

1. **ISO strings** (`.toISOString()`)
2. **Timestamps** (`Date.now()`, `.getTime()`)
3. **Date objects** (`new Date()`)
4. **String splitting** (`.toISOString().split('T')[0]`)
5. **Locale strings** (`.toLocaleString()`)

This inconsistency led to:
- Difficult-to-debug issues
- Type confusion
- API response format inconsistencies
- Database query problems

### Solution

A comprehensive **`lib/date-utils.ts`** module providing standardized functions for all date operations.

---

## Date Utilities Module

### Import

```typescript
import {
  toISOString,
  toDateString,
  addDays,
  formatDateBR,
  getLast30Days,
  // ... other utilities
} from '@/lib/date-utils'
```

### Categories

1. **Conversion** - Convert between Date, ISO strings, and timestamps
2. **Arithmetic** - Add/subtract time units
3. **Ranges** - Start/end of day/week/month
4. **Comparison** - Compare dates, check if past/future
5. **Formatting** - Display dates in Brazilian Portuguese
6. **Expiration** - Handle expiration logic
7. **Validation** - Validate date inputs

---

## Conventions

### 1. API Requests & Responses

**Always use ISO 8601 strings**

```typescript
// ✅ GOOD
return NextResponse.json({
  createdAt: toISOString(new Date()),
  scheduledAt: toISOString(session.scheduledAt),
  expiresAt: toISOString(addDays(new Date(), 30))
})

// ❌ BAD
return NextResponse.json({
  createdAt: new Date(), // Returns Date object
  scheduledAt: Date.now(), // Returns timestamp
  expiresAt: new Date().toISOString().split('T')[0] // String manipulation
})
```

### 2. Database Operations

**Use Date objects for Drizzle ORM, they convert to PostgreSQL timestamptz**

```typescript
// ✅ GOOD
await db.insert(sessions).values({
  scheduledAt: new Date(sessionDateTime),
  createdAt: new Date(),
  updatedAt: new Date(),
})

// ❌ BAD
await db.insert(sessions).values({
  scheduledAt: sessionDateTime.toISOString(), // String instead of Date
  createdAt: Date.now(), // Timestamp instead of Date
})
```

### 3. Internal Calculations

**Use Date utility functions**

```typescript
// ✅ GOOD
const fourteenDaysAgo = subtractDays(new Date(), 14)
const nextWeek = addWeeks(new Date(), 1)
const range = getLast30Days()

// ❌ BAD
const fourteenDaysAgo = new Date()
fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14) // Mutation

const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Magic numbers
```

### 4. Date-Only Strings (for HTML inputs)

**Use `toDateString()` function**

```typescript
// ✅ GOOD
<input
  type="date"
  min={toDateString(new Date())}
  value={toDateString(session.scheduledAt)}
/>

// ❌ BAD
<input
  type="date"
  min={new Date().toISOString().split('T')[0]} // String manipulation
/>
```

### 5. Duration Calculations

**Use difference functions**

```typescript
// ✅ GOOD
const daysSince = differenceInDays(new Date(), lastActivity)
const hoursBetween = differenceInHours(endTime, startTime)

// ❌ BAD
const daysSince = Math.floor(
  (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
) // Magic numbers
```

### 6. Display Formatting

**Use Brazilian Portuguese formatters**

```typescript
// ✅ GOOD
<p>Data: {formatDateBR(session.createdAt)}</p>
<p>Horário: {formatTimeBR(session.scheduledAt)}</p>
<p>Última atividade: {formatRelative(user.lastActivityDate)}</p>

// ❌ BAD
<p>Data: {new Date(session.createdAt).toLocaleString('pt-BR')}</p>
<p>Última atividade: {session.lastActivityDate.toISOString()}</p>
```

---

## Common Patterns

### Date Ranges for Queries

```typescript
// Last 30 days
const range = getLast30Days()
const recentSessions = await db
  .select()
  .from(sessions)
  .where(
    and(
      gte(sessions.scheduledAt, range.start),
      lte(sessions.scheduledAt, range.end)
    )
  )
```

### Week/Month Boundaries

```typescript
// This week
const thisWeek = getThisWeek()

// This month
const thisMonth = getThisMonth()

// Custom week
const weekStart = startOfWeek(someDate)
const weekEnd = endOfWeek(someDate)
```

### Expiration Logic

```typescript
// Create expiration (30 days from now)
const expiresAt = addDays(new Date(), 30)

// Or with helper
const expiresAt = createExpiration(30 * 24 * 60 * 60 * 1000)

// Check if expired
if (isExpired(message.expiresAt)) {
  await deleteExpiredMessage(message.id)
}

// Time remaining
const msRemaining = timeUntilExpiration(subscription.expiresAt)
```

### Relative Time Display

```typescript
// "há 2 horas" or "em 3 dias"
<span>{formatRelative(notification.createdAt)}</span>
```

---

## Migration Guide

### Before (Inconsistent)

```typescript
// API Route - BEFORE
export async function GET(request: NextRequest) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30) // Mutation

  const sessions = await db.query.sessions.findMany({
    where: gte(sessions.createdAt, thirtyDaysAgo)
  })

  return NextResponse.json({
    sessions: sessions.map(s => ({
      ...s,
      date: s.scheduledAt.toISOString().split('T')[0], // String manipulation
      createdAt: s.createdAt.toISOString(),
      updatedAt: Date.now() // Timestamp mixed with ISO
    }))
  })
}
```

### After (Standardized)

```typescript
// API Route - AFTER
import { subtractDays, toDateString, toISOString } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  const thirtyDaysAgo = subtractDays(new Date(), 30)

  const sessions = await db.query.sessions.findMany({
    where: gte(sessions.createdAt, thirtyDaysAgo)
  })

  return NextResponse.json({
    sessions: sessions.map(s => ({
      ...s,
      date: toDateString(s.scheduledAt),
      createdAt: toISOString(s.createdAt),
      updatedAt: toISOString(new Date())
    }))
  })
}
```

---

## Examples

### Example 1: Payment Expiration

```typescript
// ✅ GOOD - Using date utilities
import { addMinutes, addDays, toISOString } from '@/lib/date-utils'

const payment = {
  id: `pix_${Date.now()}`,
  date_created: toISOString(new Date()),
  date_approved: paymentMethod !== "pix" ? toISOString(new Date()) : null,
  expirationDate: paymentMethod === "pix"
    ? toISOString(addMinutes(new Date(), 30)) // 30 minutes
    : toISOString(addDays(new Date(), 3)), // 3 days
}
```

### Example 2: Medication Refill

```typescript
// ✅ GOOD - Standardized date handling
import { addDays, differenceInDays, toISOString } from '@/lib/date-utils'

const medication = {
  name: "Medication Name",
  startDate: toISOString(startDate),
  endDate: endDate ? toISOString(endDate) : null,
  refillDate: toISOString(addDays(startDate, 30)),
}

// Check if refill needed
const daysUntilRefill = differenceInDays(medication.refillDate, new Date())
const needsRefill = daysUntilRefill <= 7
```

### Example 3: Session Scheduling

```typescript
// ✅ GOOD - Clean date range calculation
import { getThisWeek, startOfDay, endOfDay, toISOString } from '@/lib/date-utils'

async function getWeeklySessions() {
  const { start, end } = getThisWeek()

  const sessions = await db.query.sessions.findMany({
    where: and(
      gte(sessions.scheduledAt, start),
      lte(sessions.scheduledAt, end)
    )
  })

  return {
    startDate: toISOString(start),
    endDate: toISOString(end),
    sessions
  }
}
```

### Example 4: Gamification Points

```typescript
// ✅ GOOD - Using predefined ranges
import { getLast30Days, toISOString } from '@/lib/date-utils'

async function getRecentPoints(userId: number) {
  const range = getLast30Days()

  const points = await db.query.pointsHistory.findMany({
    where: and(
      eq(pointsHistory.userId, userId),
      gte(pointsHistory.earnedAt, range.start)
    )
  })

  return {
    period: {
      start: toISOString(range.start),
      end: toISOString(range.end),
    },
    totalPoints: points.reduce((sum, p) => sum + p.points, 0)
  }
}
```

### Example 5: Display Formatting

```typescript
// ✅ GOOD - Proper display formatting
import { formatDateBR, formatTimeBR, formatDateTimeBR, formatRelative } from '@/lib/date-utils'

function SessionCard({ session }) {
  return (
    <div>
      <p>Data: {formatDateBR(session.scheduledAt)}</p>
      <p>Horário: {formatTimeBR(session.scheduledAt)}</p>
      <p>Criada: {formatRelative(session.createdAt)}</p>
      <p>Completa: {formatDateTimeBR(session.completedAt)}</p>
    </div>
  )
}
```

---

## Quick Reference

### Conversion
- `toDate(input)` - Convert to Date object
- `toISOString(date)` - Convert to ISO string (API/DB)
- `toDateString(date)` - Convert to YYYY-MM-DD (HTML inputs)
- `toTimestamp(date)` - Convert to milliseconds

### Arithmetic
- `addDays(date, n)` - Add days
- `addWeeks(date, n)` - Add weeks
- `addMonths(date, n)` - Add months
- `addHours(date, n)` - Add hours
- `addMinutes(date, n)` - Add minutes
- `subtractDays(date, n)` - Subtract days
- `subtractMonths(date, n)` - Subtract months

### Ranges
- `startOfDay(date)` - 00:00:00.000
- `endOfDay(date)` - 23:59:59.999
- `startOfWeek(date)` - Sunday 00:00
- `endOfWeek(date)` - Saturday 23:59
- `startOfMonth(date)` - 1st day 00:00
- `endOfMonth(date)` - Last day 23:59

### Common Ranges
- `getToday()` - Today's range
- `getThisWeek()` - This week's range
- `getThisMonth()` - This month's range
- `getLast7Days()` - Last 7 days
- `getLast14Days()` - Last 14 days
- `getLast30Days()` - Last 30 days
- `getLast90Days()` - Last 90 days

### Comparison
- `isSameDay(d1, d2)` - Same calendar day?
- `isPast(date)` - In the past?
- `isFuture(date)` - In the future?
- `isToday(date)` - Is today?
- `differenceInDays(d1, d2)` - Days between
- `differenceInHours(d1, d2)` - Hours between
- `differenceInMinutes(d1, d2)` - Minutes between

### Formatting
- `formatDateBR(date)` - 19/11/2025
- `formatDateTimeBR(date)` - 19/11/2025 14:30
- `formatTimeBR(date)` - 14:30
- `formatRelative(date)` - há 2 horas

### Expiration
- `createExpiration(ms)` - Create expiration date
- `isExpired(date)` - Has expired?
- `timeUntilExpiration(date)` - Time remaining in ms

---

## Additional Resources

- **Inconsistencies Report**: See `DATE_INCONSISTENCIES_LOW03.md` for detailed analysis of issues
- **Date Utils Source**: `lib/date-utils.ts`
- **TypeScript Support**: All functions are fully typed

---

## Best Practices

### DO ✅

1. **Always use ISO strings for API responses**
   ```typescript
   return NextResponse.json({ date: toISOString(date) })
   ```

2. **Use utility functions instead of manual calculations**
   ```typescript
   const nextWeek = addWeeks(new Date(), 1)
   ```

3. **Use predefined ranges when possible**
   ```typescript
   const range = getLast30Days()
   ```

4. **Format dates for display with Brazilian locale**
   ```typescript
   <p>{formatDateBR(session.createdAt)}</p>
   ```

### DON'T ❌

1. **Don't mix date formats in the same response**
   ```typescript
   // ❌ BAD - mixing ISO and timestamps
   { created: date.toISOString(), updated: Date.now() }
   ```

2. **Don't manually manipulate ISO strings**
   ```typescript
   // ❌ BAD
   date.toISOString().split('T')[0]
   // ✅ GOOD
   toDateString(date)
   ```

3. **Don't mutate dates with setDate/setMonth**
   ```typescript
   // ❌ BAD
   const d = new Date()
   d.setDate(d.getDate() - 7)
   // ✅ GOOD
   const d = subtractDays(new Date(), 7)
   ```

4. **Don't use magic numbers for time calculations**
   ```typescript
   // ❌ BAD
   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
   // ✅ GOOD
   addDays(new Date(), 7)
   ```

---

## Summary

The `lib/date-utils.ts` module provides a comprehensive, type-safe solution for all date operations in the CÁRIS platform. Use it consistently to ensure:

- **Consistency** across the codebase
- **Type safety** with TypeScript
- **Maintainability** with clear, descriptive functions
- **Correctness** with well-tested utilities
- **Localization** with Brazilian Portuguese formatting

For any date operation, check the date utilities module first before writing custom logic.
