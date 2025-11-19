# Data Retention Policy Enforcement

## Overview

Automated data retention enforcement system that ensures LGPD/GDPR compliance by automatically deleting or anonymizing user data after the configured retention period.

**Key Features:**
- **Automated Enforcement**: Scheduled cron job runs daily/weekly
- **User-Configurable**: Each user sets their own retention period (default: 7 years / 2555 days)
- **Granular Deletion**: Deletes diary entries, chat messages, sessions, mood tracking, etc.
- **Anonymization Support**: Optional anonymization after deletion
- **Dry Run Mode**: Preview what would be deleted without actually deleting
- **Audit Trail**: All deletions logged for compliance
- **Batch Processing**: Handles large datasets efficiently
- **Safety Guards**: Preserves scheduled sessions, respects user preferences

## Architecture

### Components

1. **Data Retention Service** (`/lib/data-retention.ts`)
   - Core logic for enforcing retention policies
   - Batch processing for performance
   - Dry run capability for testing
   - Integration with anonymization system

2. **API Endpoint** (`/app/api/compliance/data-retention/route.ts`)
   - Admin interface for manual enforcement
   - Cron job endpoint for automated enforcement
   - Preview endpoint for users

3. **Cron Job** (Vercel Cron or external scheduler)
   - Automated daily/weekly execution
   - Secure authentication via secret
   - Error handling and retries

## Configuration

### Environment Variables

Add to your `.env.local`:

```bash
# Data Retention Cron Secret (generate a secure random string)
DATA_RETENTION_CRON_SECRET=your_secure_random_secret_here

# Optional: Configure default retention period (in days)
DEFAULT_DATA_RETENTION_DAYS=2555  # 7 years
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### User Settings

Users configure their retention preference via Privacy Settings:

```typescript
// Default: 2555 days (7 years)
dataRetentionPreference: integer('data_retention_preference').default(2555)

// Optional anonymization after deletion
anonymizeAfterDeletion: boolean('anonymize_after_deletion').default(true)
```

Common retention periods:
- 30 days (1 month)
- 90 days (3 months)
- 365 days (1 year)
- 730 days (2 years)
- 1825 days (5 years)
- 2555 days (7 years) - **Default**

## Setup

### Option 1: Vercel Cron (Recommended)

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/compliance/data-retention",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs daily at 2 AM UTC.

### Option 2: External Cron (GitHub Actions, cron-job.org)

#### GitHub Actions Cron

Create `.github/workflows/data-retention.yml`:

```yaml
name: Data Retention Enforcement

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  enforce-retention:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Data Retention
        run: |
          curl -X POST \
            -H "x-cron-secret: ${{ secrets.DATA_RETENTION_CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{"dryRun": false, "batchSize": 50}' \
            https://your-domain.com/api/compliance/data-retention
```

#### External Service (cron-job.org)

1. Sign up at https://cron-job.org
2. Create new cron job:
   - URL: `https://your-domain.com/api/compliance/data-retention`
   - Method: POST
   - Headers: `x-cron-secret: your_secret`
   - Body: `{"dryRun": false, "batchSize": 50}`
   - Schedule: Daily at 2 AM

## Usage

### Manual Enforcement (Admin)

```typescript
// Dry run - preview only
const response = await fetch('/api/compliance/data-retention', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_admin_token'
  },
  body: JSON.stringify({
    dryRun: true,
    batchSize: 50
  })
})

// Actual enforcement
const response = await fetch('/api/compliance/data-retention', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_admin_token'
  },
  body: JSON.stringify({
    dryRun: false,
    batchSize: 50
  })
})
```

### Preview for User

```typescript
// See what data will be deleted
const response = await fetch('/api/compliance/data-retention/preview', {
  headers: {
    'Authorization': 'Bearer user_token'
  }
})

const preview = await response.json()
console.log(`${preview.totalRecordsToDelete} records will be deleted after ${preview.retentionDays} days`)
console.log('Breakdown:', preview.stats)
```

### Programmatic Enforcement

```typescript
import { enforceDataRetentionPolicies } from '@/lib/data-retention'

// Enforce for all users
const result = await enforceDataRetentionPolicies({
  dryRun: false,
  batchSize: 50
})

console.log(`Processed ${result.totalUsersProcessed} users`)
console.log(`Deleted ${result.totalRecordsDeleted} records`)
console.log(`Anonymized ${result.totalRecordsAnonymized} records`)

// Enforce for specific user
const userResult = await enforceDataRetentionPolicies({
  dryRun: false,
  specificUserId: 123
})
```

## What Gets Deleted

Based on `createdAt` or `entryDate` vs retention cutoff:

### Automatically Deleted:
- ✅ **Diary Entries** (older than retention period)
- ✅ **Chat Messages** (sent by user)
- ✅ **Completed Sessions** (excludes scheduled sessions)
- ✅ **Meditation Sessions**
- ✅ **Mood Tracking Records**
- ✅ **Clinical Insights** (AI-generated)
- ✅ **Read Notifications** (unread preserved)
- ✅ **Point Activities** (gamification history)

### Preserved:
- ❌ **Scheduled Sessions** (future sessions not deleted)
- ❌ **Unread Notifications** (important alerts preserved)
- ❌ **Audit Logs** (anonymized but preserved for legal compliance)
- ❌ **User Account** (only data deleted, not the account itself)
- ❌ **Privacy Settings** (preserved for compliance)

## Anonymization After Deletion

If user has `anonymizeAfterDeletion: true`:

1. Data is deleted based on retention period
2. Remaining user data is anonymized:
   - Name → "Usuário Anônimo [random_id]"
   - Email → "anonimo_[random_id]@example.com"
   - Profile data → Removed
   - Remaining content → "[Conteúdo removido por solicitação de anonimização]"

3. Aggregate data can be preserved for research (if configured)

## Batch Processing

To avoid overloading the database:

- **Default batch size**: 50 users
- **Delay between batches**: 100ms
- **Configurable**: Adjust `batchSize` parameter

```typescript
await enforceDataRetentionPolicies({
  batchSize: 25 // Smaller batches for large datasets
})
```

## Monitoring & Audit Trail

All retention operations are logged:

```typescript
{
  userId: 0, // System
  action: 'data_retention_enforcement_complete',
  resourceType: 'system',
  complianceRelated: true,
  severity: 'high',
  metadata: {
    totalUsersProcessed: 150,
    totalRecordsDeleted: 5420,
    totalRecordsAnonymized: 12,
    errors: [],
    dryRun: false,
    duration: 12340
  }
}
```

### View Logs

```sql
SELECT * FROM audit_logs
WHERE action LIKE 'data_retention%'
ORDER BY timestamp DESC
LIMIT 100;
```

## Error Handling

The system handles errors gracefully:

1. **Individual User Failures**: Logged but don't stop processing
2. **Database Errors**: Rolled back per-user, doesn't affect others
3. **Batch Processing**: Continues even if some batches fail
4. **Audit Logging**: Errors logged for compliance review

```typescript
{
  totalUsersProcessed: 98,
  totalRecordsDeleted: 4532,
  errors: [
    { userId: 123, error: "Database connection timeout" },
    { userId: 456, error: "Anonymization failed: ..." }
  ]
}
```

## Testing

### Dry Run Mode

Always test with `dryRun: true` first:

```bash
# Preview what would be deleted
curl -X POST \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  https://your-domain.com/api/compliance/data-retention
```

### Test with Specific User

```bash
# Test on single user first
curl -X POST \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "specificUserId": 123}' \
  https://your-domain.com/api/compliance/data-retention
```

### Integration Tests

```typescript
import { enforceDataRetentionPolicies, calculateCutoffDate } from '@/lib/data-retention'

describe('Data Retention', () => {
  it('calculates cutoff date correctly', () => {
    const cutoff = calculateCutoffDate(30)
    const expected = new Date()
    expected.setDate(expected.getDate() - 30)

    expect(cutoff.getDate()).toBe(expected.getDate())
  })

  it('dry run does not delete data', async () => {
    const before = await countUserRecords(testUserId)

    await enforceDataRetentionPolicies({
      dryRun: true,
      specificUserId: testUserId
    })

    const after = await countUserRecords(testUserId)
    expect(after).toBe(before)
  })
})
```

## Security Considerations

1. **Cron Secret**: Use strong random secret (32+ characters)
2. **HTTPS Only**: Never call endpoint over HTTP
3. **Rate Limiting**: Already applied via rate-limit middleware
4. **Admin Only**: Manual calls require admin role
5. **Audit Logging**: All operations logged for compliance
6. **Irreversible**: Deleted data cannot be recovered
7. **Legal Compliance**: Preserves audit logs as required by law

## Compliance Notes

### LGPD (Brazil)
- ✅ Users control their retention period
- ✅ Data minimization principle
- ✅ Right to deletion honored
- ✅ Audit trail maintained
- ✅ Anonymization option available

### GDPR (Europe)
- ✅ Right to be forgotten
- ✅ Data retention limitations
- ✅ Purpose limitation
- ✅ Storage limitation principle
- ✅ Accountability (audit logs)

### HIPAA (USA)
- ✅ Minimum 6-year retention (default is 7 years)
- ✅ Secure deletion procedures
- ✅ Audit controls
- ✅ Patient rights respected

## Troubleshooting

### No Data Being Deleted

1. Check user retention settings:
```sql
SELECT user_id, data_retention_preference, anonymize_after_deletion
FROM user_privacy_settings
WHERE data_retention_preference IS NOT NULL;
```

2. Verify cutoff date calculation:
```typescript
import { calculateCutoffDate } from '@/lib/data-retention'
console.log('Cutoff:', calculateCutoffDate(2555))
```

3. Check for errors in audit logs:
```sql
SELECT * FROM audit_logs
WHERE action = 'data_retention_enforcement_failed'
ORDER BY timestamp DESC;
```

### Cron Job Not Running

1. Verify Vercel cron configuration
2. Check GitHub Actions secrets
3. Validate cron secret matches
4. Test endpoint manually
5. Check deployment logs

### Performance Issues

1. Reduce batch size: `batchSize: 25`
2. Add delays between batches
3. Run during off-peak hours
4. Consider sharding by user ID ranges
5. Monitor database connection pool

## Best Practices

1. **Always test with dry run first**
2. **Schedule during off-peak hours** (2-4 AM)
3. **Monitor audit logs regularly**
4. **Set up alerting for failures**
5. **Backup database before first run**
6. **Document user retention settings**
7. **Review compliance requirements yearly**
8. **Communicate with users** about retention policy
9. **Test anonymization thoroughly**
10. **Keep audit logs indefinitely**

## Future Enhancements

- [ ] Email notifications before deletion
- [ ] User dashboard showing what will be deleted
- [ ] Configurable retention per data type
- [ ] Soft delete with grace period
- [ ] Data export before deletion
- [ ] Metrics dashboard for retention stats
- [ ] Scheduled deletion queue
- [ ] Restore from backups within grace period
- [ ] Machine learning for optimal retention periods
- [ ] Integration with external archival systems
