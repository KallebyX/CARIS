# Medication Tracking System

## Overview

The CÁRIS medication tracking system provides comprehensive medication management for patients, replacing the previous generic text field with a structured, database-backed solution that supports:

- Medication details and prescriptions
- Dosage schedules with reminders
- Adherence tracking and analytics
- Stock management with low stock alerts
- Side effects and effectiveness monitoring
- Mood correlation tracking

## Database Schema

### Tables

#### 1. `medications`

Stores core medication information.

**Key Fields:**
- `name`, `genericName`: Medication identification
- `dosage`, `form`: Dosage information (e.g., "10mg", "tablet")
- `purpose`: Why the medication is prescribed
- `prescribingDoctor`, `prescriptionNumber`, `pharmacy`: Prescription details
- `instructions`, `foodInstructions`: How to take the medication
- `sideEffects`, `interactions`: Safety information
- `startDate`, `endDate`: Treatment period
- `refillDate`, `refillCount`: Refill tracking
- `isActive`: Soft delete flag
- `isAsNeeded`: PRN (Pro Re Nata) medications
- `stockQuantity`, `lowStockThreshold`: Stock management

**Indexes:**
- `idx_medications_user_active`: Fast lookup of user's active medications
- `idx_medications_refill_date`: Alert for upcoming refills

#### 2. `medication_schedules`

Defines when and how medications should be taken.

**Key Fields:**
- `medicationId`, `userId`: Links to medication and user
- `timeOfDay`: Specific time to take medication (TIME format)
- `daysOfWeek`: Which days to take (JSONB array: `[0,1,2,3,4,5,6]`)
- `frequency`: "daily", "weekly", "monthly", "as_needed", "specific_days"
- `dosageAmount`, `dosageUnit`: Amount per dose
- `reminderEnabled`, `reminderMinutesBefore`: Reminder settings
- `notificationChannels`: JSONB array: `["push", "sms", "email"]`
- `isActive`: Soft delete flag

**Indexes:**
- `idx_medication_schedules_medication`: Fast lookup by medication
- `idx_medication_schedules_user_active`: Fast lookup of user's active schedules
- `idx_medication_schedules_time`: Query by time of day

#### 3. `medication_logs`

Tracks actual medication intake and outcomes.

**Key Fields:**
- `medicationId`, `scheduleId`, `userId`: Links
- `scheduledTime`: When medication should be taken
- `actualTime`: When actually taken (NULL if skipped)
- `dosageTaken`: Actual dosage (may differ from scheduled)
- `status`: "taken", "skipped", "missed", "pending"
- `skipReason`: "forgot", "side_effects", "no_medication", "other"
- `skipNotes`: Additional notes if skipped
- `hadSideEffects`, `sideEffectsDescription`: Side effects tracking
- `effectivenessRating` (1-5), `effectivenessNotes`: Effectiveness tracking
- `moodBefore`, `moodAfter` (1-10): Mood correlation
- `symptomsBefore`, `symptomsAfter`: Symptom tracking

**Indexes:**
- `idx_medication_logs_medication`: Fast lookup by medication and time
- `idx_medication_logs_user`: Fast lookup by user and time
- `idx_medication_logs_status`: Query pending/missed medications
- `idx_medication_logs_actual_time`: Query by actual intake time

#### 4. `medication_reminders`

Queue for scheduled medication reminders.

**Key Fields:**
- `userId`, `medicationId`, `scheduleId`, `logId`: Links
- `reminderTime`: When to send the reminder
- `medicationTime`: When the medication should be taken
- `status`: "pending", "sent", "acknowledged", "dismissed"
- `sentAt`, `acknowledgedAt`: Tracking
- `notificationChannels`: JSONB array of channels
- `sentChannels`: Which channels successfully sent

**Indexes:**
- `idx_medication_reminders_user`: Fast lookup by user and reminder time
- `idx_medication_reminders_pending`: Query pending reminders
- `idx_medication_reminders_medication`: Fast lookup by medication

### Database Views

#### `active_medications_with_schedule`

Combines active medications with their schedules, including low stock alerts.

```sql
SELECT
  m.id AS medication_id,
  m.user_id,
  m.name,
  m.dosage,
  m.form,
  m.stock_quantity,
  m.low_stock_threshold,
  m.is_as_needed,
  ms.id AS schedule_id,
  ms.time_of_day,
  ms.frequency,
  ms.dosage_amount,
  ms.reminder_enabled,
  m.refill_date,
  CASE
    WHEN m.stock_quantity IS NOT NULL AND m.low_stock_threshold IS NOT NULL
      AND m.stock_quantity <= m.low_stock_threshold
    THEN true
    ELSE false
  END AS is_low_stock
FROM medications m
LEFT JOIN medication_schedules ms ON m.id = ms.medication_id AND ms.is_active = true
WHERE m.is_active = true
```

#### `medication_adherence_stats`

Calculates adherence statistics for the last 30 days.

```sql
SELECT
  ml.user_id,
  ml.medication_id,
  m.name AS medication_name,
  COUNT(*) AS total_doses,
  SUM(CASE WHEN ml.status = 'taken' THEN 1 ELSE 0 END) AS taken_doses,
  SUM(CASE WHEN ml.status = 'skipped' THEN 1 ELSE 0 END) AS skipped_doses,
  SUM(CASE WHEN ml.status = 'missed' THEN 1 ELSE 0 END) AS missed_doses,
  ROUND(
    (SUM(CASE WHEN ml.status = 'taken' THEN 1 ELSE 0 END)::numeric /
    NULLIF(COUNT(*), 0)) * 100, 2
  ) AS adherence_percentage,
  MIN(ml.scheduled_time) AS first_dose_date,
  MAX(ml.scheduled_time) AS last_dose_date
FROM medication_logs ml
JOIN medications m ON ml.medication_id = m.id
WHERE ml.scheduled_time >= NOW() - INTERVAL '30 days'
GROUP BY ml.user_id, ml.medication_id, m.name
```

### Database Triggers

#### `update_medications_updated_at`
Updates `updated_at` timestamp on medication changes.

#### `update_medication_schedules_updated_at`
Updates `updated_at` timestamp on schedule changes.

#### `update_medication_logs_updated_at`
Updates `updated_at` timestamp on log changes.

#### `update_medication_reminders_updated_at`
Updates `updated_at` timestamp on reminder changes.

#### `trigger_update_medication_stock`
Automatically decreases `stock_quantity` when a medication log is marked as "taken".

```sql
CREATE OR REPLACE FUNCTION update_medication_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'taken' AND OLD.status != 'taken' THEN
    UPDATE medications
    SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - 1)
    WHERE id = NEW.medication_id AND stock_quantity IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## API Endpoints

### 1. List Medications

```http
GET /api/patient/medications
```

**Query Parameters:**
- `active` (boolean): Filter by active medications only
- `includeSchedules` (boolean): Include medication schedules

**Response:**
```json
{
  "success": true,
  "data": {
    "medications": [
      {
        "id": 1,
        "name": "Fluoxetine",
        "genericName": "Fluoxetine Hydrochloride",
        "dosage": "20mg",
        "form": "capsule",
        "purpose": "Depression treatment",
        "isActive": true,
        "schedules": [
          {
            "id": 1,
            "timeOfDay": "08:00:00",
            "frequency": "daily",
            "dosageAmount": "1",
            "reminderEnabled": true
          }
        ]
      }
    ],
    "count": 1
  }
}
```

### 2. Get Single Medication

```http
GET /api/patient/medications/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Fluoxetine",
    "dosage": "20mg",
    "schedules": [...],
    ...
  }
}
```

### 3. Create Medication

```http
POST /api/patient/medications
```

**Request Body:**
```json
{
  "name": "Fluoxetine",
  "genericName": "Fluoxetine Hydrochloride",
  "dosage": "20mg",
  "form": "capsule",
  "purpose": "Depression treatment",
  "prescribingDoctor": "Dr. Smith",
  "prescriptionNumber": "RX12345",
  "pharmacy": "Central Pharmacy",
  "instructions": "Take with water",
  "foodInstructions": "Take with food",
  "sideEffects": "Nausea, headache",
  "interactions": "Avoid alcohol",
  "startDate": "2025-11-19",
  "endDate": null,
  "refillDate": "2025-12-19",
  "refillCount": 3,
  "isAsNeeded": false,
  "stockQuantity": 30,
  "lowStockThreshold": 5,
  "notes": "Monitor for side effects",
  "schedule": {
    "timeOfDay": "08:00",
    "frequency": "daily",
    "dosageAmount": "1",
    "dosageUnit": "capsule",
    "reminderEnabled": true,
    "reminderMinutesBefore": 15,
    "notificationChannels": ["push", "email"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "medication": {...},
    "schedule": {...}
  }
}
```

### 4. Update Medication

```http
PATCH /api/patient/medications/{id}
```

**Request Body:** (partial update)
```json
{
  "stockQuantity": 25,
  "notes": "Updated notes"
}
```

### 5. Delete Medication (Soft Delete)

```http
DELETE /api/patient/medications/{id}
```

Sets `isActive = false` for the medication and all its schedules.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Medicamento desativado com sucesso"
  }
}
```

### 6. List Medication Logs

```http
GET /api/patient/medication-logs
```

**Query Parameters:**
- `medicationId` (integer): Filter by medication
- `status` (string): Filter by status ("taken", "skipped", "missed", "pending")
- `startDate` (ISO date): Filter by start date
- `endDate` (ISO date): Filter by end date
- `limit` (integer): Max records (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "scheduledTime": "2025-11-19T08:00:00Z",
        "actualTime": "2025-11-19T08:05:00Z",
        "status": "taken",
        "hadSideEffects": false,
        "effectivenessRating": 4,
        "moodBefore": 6,
        "moodAfter": 7,
        "medication": {
          "id": 1,
          "name": "Fluoxetine",
          "dosage": "20mg"
        }
      }
    ],
    "count": 1
  }
}
```

### 7. Create Medication Log

```http
POST /api/patient/medication-logs
```

**Request Body:**
```json
{
  "medicationId": 1,
  "scheduleId": 1,
  "scheduledTime": "2025-11-19T08:00:00Z",
  "actualTime": "2025-11-19T08:05:00Z",
  "dosageTaken": "1 capsule",
  "status": "taken",
  "hadSideEffects": false,
  "effectivenessRating": 4,
  "moodBefore": 6,
  "moodAfter": 7,
  "symptomsBefore": "Feeling down",
  "symptomsAfter": "Improved",
  "notes": "Took with breakfast"
}
```

### 8. Update Medication Log

```http
PATCH /api/patient/medication-logs
```

**Request Body:**
```json
{
  "id": 1,
  "status": "taken",
  "actualTime": "2025-11-19T08:10:00Z",
  "effectivenessRating": 5
}
```

### 9. Get Adherence Statistics

```http
GET /api/patient/medication-adherence
```

**Query Parameters:**
- `medicationId` (integer): Filter by specific medication
- `days` (integer): Number of days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "days": 30,
      "startDate": "2025-10-20T00:00:00Z",
      "endDate": "2025-11-19T00:00:00Z"
    },
    "overall": {
      "totalDoses": 60,
      "takenDoses": 54,
      "skippedDoses": 4,
      "missedDoses": 2,
      "overallAdherence": 90.00
    },
    "byMedication": [
      {
        "medication_id": 1,
        "medication_name": "Fluoxetine",
        "total_doses": 30,
        "taken_doses": 27,
        "skipped_doses": 2,
        "missed_doses": 1,
        "adherence_percentage": "90.00",
        "first_dose_date": "2025-10-20T08:00:00Z",
        "last_dose_date": "2025-11-19T08:00:00Z"
      }
    ],
    "alerts": {
      "lowStock": [
        {
          "id": 1,
          "name": "Fluoxetine",
          "stockQuantity": 4,
          "lowStockThreshold": 5,
          "refillDate": "2025-11-25"
        }
      ],
      "refillSoon": [
        {
          "id": 1,
          "name": "Fluoxetine",
          "refillDate": "2025-11-25",
          "pharmacy": "Central Pharmacy"
        }
      ]
    },
    "recentSideEffects": [
      {
        "id": 5,
        "scheduledTime": "2025-11-18T08:00:00Z",
        "hadSideEffects": true,
        "sideEffectsDescription": "Mild nausea",
        "medication": {
          "id": 1,
          "name": "Fluoxetine"
        }
      }
    ]
  }
}
```

## Usage Examples

### Example 1: Adding a New Medication with Schedule

```typescript
const response = await fetch('/api/patient/medications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Sertraline',
    dosage: '50mg',
    form: 'tablet',
    purpose: 'Anxiety management',
    startDate: new Date().toISOString(),
    stockQuantity: 30,
    lowStockThreshold: 7,
    schedule: {
      timeOfDay: '20:00',
      frequency: 'daily',
      dosageAmount: '1',
      dosageUnit: 'tablet',
      reminderEnabled: true,
      reminderMinutesBefore: 30,
      notificationChannels: ['push', 'email'],
    },
  }),
})

const { data } = await response.json()
console.log('Medication created:', data.medication.id)
```

### Example 2: Logging Medication Intake

```typescript
// User takes medication
const response = await fetch('/api/patient/medication-logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    medicationId: 1,
    scheduleId: 1,
    scheduledTime: new Date('2025-11-19T08:00:00Z').toISOString(),
    actualTime: new Date().toISOString(),
    status: 'taken',
    dosageTaken: '1 tablet',
    moodBefore: 6,
    effectivenessRating: 4,
    notes: 'Took with breakfast',
  }),
})

// Stock automatically decreases by 1
```

### Example 3: Checking Adherence

```typescript
const response = await fetch(
  '/api/patient/medication-adherence?medicationId=1&days=7'
)

const { data } = await response.json()

console.log(`Adherence: ${data.overall.overallAdherence}%`)
console.log(`Taken: ${data.overall.takenDoses}/${data.overall.totalDoses}`)

if (data.alerts.lowStock.length > 0) {
  console.log('Low stock alert:', data.alerts.lowStock)
}
```

## Best Practices

### 1. Stock Management

- Set `lowStockThreshold` to at least 7 days worth of medication
- Monitor `refillDate` and create reminders 3-7 days before
- Update `stockQuantity` when refilling

### 2. Adherence Tracking

- Log medications as soon as taken for accurate `actualTime`
- Use `status: "skipped"` with `skipReason` for meaningful analytics
- Track `moodBefore` and `moodAfter` to correlate medication effectiveness

### 3. Side Effects

- Always document side effects immediately
- Use `sideEffectsDescription` with detailed information
- Consider setting `effectivenessRating` lower if side effects are severe

### 4. Reminders

- Set `reminderMinutesBefore` based on user preference (15-30 minutes typical)
- Use multiple `notificationChannels` for critical medications
- Respect user's notification preferences

### 5. Data Retention

- Keep inactive medications (`isActive: false`) for historical tracking
- Don't hard delete medication logs (needed for adherence analytics)
- Archive old logs after 1 year if needed for performance

## Future Enhancements

1. **Automatic Reminder Generation**
   - Cron job to create `medication_reminders` based on schedules
   - Integration with notification service (Pusher, email, SMS)

2. **Prescription Photo Upload**
   - Store prescription images
   - OCR to auto-fill medication details

3. **Drug Interaction Checker**
   - API integration with drug database
   - Automatic warnings for dangerous combinations

4. **Medication Sync with Pharmacies**
   - API integration for refill automation
   - Real-time stock updates

5. **Advanced Analytics**
   - Mood correlation graphs
   - Side effect patterns
   - Optimal dosage time recommendations

6. **Healthcare Provider Portal**
   - Psychologists can view patient adherence
   - Prescribe medications directly in system
   - Receive alerts for non-adherence

## Migration

The medication tracking system was added via migration `0005_add_medication_tracking.sql`.

**To apply:**
```bash
pnpm db:migrate
```

**To rollback:**
```sql
DROP TABLE medication_reminders CASCADE;
DROP TABLE medication_logs CASCADE;
DROP TABLE medication_schedules CASCADE;
DROP TABLE medications CASCADE;
DROP VIEW active_medications_with_schedule;
DROP VIEW medication_adherence_stats;
```

## Support

For issues or questions about the medication tracking system:
- Check database logs for errors
- Verify migration was applied correctly
- Ensure user has proper permissions
- Review API response errors for validation issues
