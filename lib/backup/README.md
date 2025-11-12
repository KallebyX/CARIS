# CÁRIS Backup & Recovery System

Production-ready automated backup and recovery system for the CÁRIS mental health platform.

## Quick Start

### 1. Environment Setup

Add to your `.env.local`:

```bash
# Required
BACKUP_DIR=/var/backups/caris
BACKUP_ENCRYPTION_KEY=your-32-character-encryption-key
POSTGRES_URL=postgresql://user:pass@host:5432/db

# Optional
BACKUP_EMAIL_NOTIFICATIONS=true
BACKUP_EMAIL_RECIPIENTS=admin@example.com
BACKUP_SLACK_NOTIFICATIONS=true
BACKUP_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 2. Create Backup Directories

```bash
mkdir -p /var/backups/caris/{metadata,temp}
chmod 700 /var/backups/caris
```

### 3. Test Backup

```bash
# Via shell script
./scripts/backup/backup-database.sh full

# Or via Node.js
import { databaseBackupService } from '@/lib/backup/database-backup';
const backup = await databaseBackupService.createFullBackup();
```

## Services Overview

### Database Backup Service (`database-backup.ts`)

Handles PostgreSQL backups with encryption and compression.

```typescript
import { databaseBackupService } from '@/lib/backup/database-backup';

// Create full backup
const backup = await databaseBackupService.createFullBackup({
  compress: true,
  encrypt: true,
});

// Create incremental backup
const incremental = await databaseBackupService.createIncrementalBackup();

// List backups
const backups = await databaseBackupService.listBackups();

// Verify backup
const isValid = await databaseBackupService.verifyBackup('backup-id');

// Apply retention policy
await databaseBackupService.applyRetentionPolicy({
  daily: 7,
  weekly: 4,
  monthly: 12,
});
```

### File Backup Service (`file-backup.ts`)

Handles file storage backups with deduplication.

```typescript
import { fileBackupService } from '@/lib/backup/file-backup';

// Create full file backup
const backup = await fileBackupService.createFullBackup();

// Create incremental backup
const incremental = await fileBackupService.createIncrementalBackup();

// Upload to cloud
await fileBackupService.uploadToCloud('backup-id', {
  provider: 's3',
  bucket: 'my-backups',
  region: 'us-east-1',
});
```

### Backup Scheduler (`backup-scheduler.ts`)

Automated backup scheduling with notifications.

```typescript
import { backupScheduler } from '@/lib/backup/backup-scheduler';

// Start automated backups
backupScheduler.start();

// Or with custom schedule
backupScheduler.start({
  daily: '0 3 * * *',      // 3 AM daily
  weekly: '0 2 * * 0',     // 2 AM Sundays
  monthly: '0 1 1 * *',    // 1 AM on 1st
});

// Run manual backup
const result = await backupScheduler.runManualBackup('full');

// Get status
const status = backupScheduler.getStatus();
console.log(status.nextRuns);
```

### Recovery Service (`recovery.ts`)

Database and file restoration with point-in-time recovery.

```typescript
import { recoveryService } from '@/lib/backup/recovery';

// Restore database
const result = await recoveryService.restoreDatabase({
  backupId: 'caris_full_2024-01-15T03-00-00',
  verify: true,
  dryRun: false,
});

// Restore files
await recoveryService.restoreFiles({
  backupId: 'file_full_2024-01-15T03-00-00',
});

// Point-in-time recovery
await recoveryService.pointInTimeRecovery({
  targetTime: new Date('2024-01-15T14:30:00Z'),
});

// Test restore (dry run)
const canRestore = await recoveryService.testRestore('backup-id');
```

## API Endpoints

### Create Backup
```http
POST /api/admin/backup/create
Content-Type: application/json

{
  "type": "full",
  "includeFiles": true
}
```

### List Backups
```http
GET /api/admin/backup/list?includeFiles=true&includeStats=true
```

### Verify Backup
```http
POST /api/admin/backup/verify
Content-Type: application/json

{
  "backupId": "caris_full_2024-01-15T03-00-00",
  "type": "database"
}
```

### Restore from Backup
```http
POST /api/admin/backup/restore
Content-Type: application/json

{
  "backupId": "caris_full_2024-01-15T03-00-00",
  "type": "database",
  "dryRun": false,
  "verify": true
}
```

### Cron Endpoint
```http
GET /api/cron/backup?type=incremental
Authorization: Bearer your-cron-secret
```

## Shell Scripts

Located in `/scripts/backup/`:

- `backup-database.sh` - Create database backup
- `restore-database.sh` - Restore from backup
- `verify-backup.sh` - Verify backup integrity
- `cleanup-old-backups.sh` - Apply retention policy

Example usage:

```bash
# Create full backup
./scripts/backup/backup-database.sh full

# Restore database
./scripts/backup/restore-database.sh caris_full_2024-01-15T03-00-00

# Verify backup
./scripts/backup/verify-backup.sh caris_full_2024-01-15T03-00-00

# Cleanup old backups
./scripts/backup/cleanup-old-backups.sh
```

## Backup Strategy

- **Daily**: Incremental backups at 3:00 AM (retain 7 days)
- **Weekly**: Full backups on Sundays at 2:00 AM (retain 4 weeks)
- **Monthly**: Archival backups on 1st at 1:00 AM (retain 12 months)

## Security Features

- ✅ **AES-256 Encryption**: All backups encrypted at rest
- ✅ **SHA-256 Checksums**: Integrity verification
- ✅ **Secure Storage**: 700 permissions on backup directory
- ✅ **Access Control**: Admin-only API access
- ✅ **Audit Logging**: All operations logged

## Monitoring

- Email notifications on backup success/failure
- Slack alerts for critical issues
- Admin dashboard at `/admin/backup`
- Automatic verification after each backup

## Troubleshooting

### Common Issues

**"POSTGRES_URL not set"**
```bash
# Check environment
echo $POSTGRES_URL
# Load from .env
source .env.local
```

**"Permission denied"**
```bash
sudo chown -R $USER:$USER /var/backups/caris
chmod 700 /var/backups/caris
```

**"Checksum mismatch"**
- Backup is corrupted, use a different backup
- DO NOT attempt to restore

**"Disk full"**
```bash
# Check usage
df -h /var/backups/caris

# Cleanup old backups
./scripts/backup/cleanup-old-backups.sh
```

## Testing

Always test backups monthly:

```bash
# 1. Verify integrity
./scripts/backup/verify-backup.sh backup-id

# 2. Test restore (dry run)
DRY_RUN=true ./scripts/backup/restore-database.sh backup-id

# 3. Document results
```

## Documentation

Full documentation: `/docs/BACKUP_RECOVERY.md`

Topics covered:
- Backup strategy and retention policies
- Disaster recovery procedures
- Point-in-time recovery
- Security best practices
- Compliance (HIPAA/GDPR)

## Support

- **Issues**: GitHub Issues
- **Docs**: /docs/BACKUP_RECOVERY.md
- **Admin Dashboard**: /admin/backup

---

**Version**: 1.0.0
**Last Updated**: 2024-01-15
