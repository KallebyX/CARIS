# CÁRIS Backup & Recovery System

Comprehensive guide for the automated backup and recovery system for the CÁRIS mental health platform.

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [System Architecture](#system-architecture)
4. [Environment Setup](#environment-setup)
5. [Automated Backups](#automated-backups)
6. [Manual Backup Operations](#manual-backup-operations)
7. [Restoration Procedures](#restoration-procedures)
8. [Disaster Recovery](#disaster-recovery)
9. [Testing & Verification](#testing--verification)
10. [Monitoring & Alerts](#monitoring--alerts)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

---

## Overview

The CÁRIS backup system provides comprehensive protection for:

- **PostgreSQL Database**: Patient data, session records, clinical notes, user information
- **File Storage**: Diary images, avatars, uploaded documents, chat attachments

### Key Features

- ✅ Automated daily, weekly, and monthly backups
- ✅ Incremental and full backup strategies
- ✅ AES-256 encryption for data security
- ✅ Gzip compression to reduce storage costs
- ✅ Checksum verification for data integrity
- ✅ Point-in-time recovery capabilities
- ✅ Cloud storage integration (S3/R2)
- ✅ Email and Slack notifications
- ✅ Admin dashboard for backup management
- ✅ Retention policies (7 daily, 4 weekly, 12 monthly)

---

## Backup Strategy

### 3-2-1 Backup Rule

The system implements the industry-standard 3-2-1 backup rule:

- **3 copies** of data (production + 2 backups)
- **2 different media types** (local storage + cloud storage)
- **1 offsite copy** (cloud storage in different region)

### Backup Schedule

| Type | Frequency | Time (UTC) | Retention | Purpose |
|------|-----------|------------|-----------|---------|
| **Incremental** | Daily | 3:00 AM | 7 days | Fast daily snapshots |
| **Full** | Weekly | Sunday 2:00 AM | 4 weeks | Complete weekly archives |
| **Archival** | Monthly | 1st day 1:00 AM | 12 months | Long-term retention |

### Retention Policy

```
Daily Backups:    Keep last 7 days
Weekly Backups:   Keep last 4 weeks
Monthly Backups:  Keep last 12 months
```

Old backups are automatically cleaned up based on these policies.

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Backup System                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │   Database   │    │     File     │    │   Backup    │  │
│  │    Backup    │    │    Backup    │    │  Scheduler  │  │
│  │   Service    │    │   Service    │    │             │  │
│  └──────────────┘    └──────────────┘    └─────────────┘  │
│         │                    │                    │        │
│         └────────────────────┴────────────────────┘        │
│                           │                                │
│                  ┌────────▼────────┐                       │
│                  │    Recovery     │                       │
│                  │     Service     │                       │
│                  └─────────────────┘                       │
│                                                             │
│  Storage Locations:                                        │
│  • Local: /var/backups/caris                              │
│  • Cloud: S3/R2 bucket                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
/var/backups/caris/
├── caris_full_2024-01-15T03-00-00.sql.gz.enc
├── caris_full_2024-01-22T02-00-00.sql.gz.enc
├── caris_incremental_2024-01-23T03-00-00.sql.gz.enc
├── file_full_2024-01-15T03-00-00.tar.gz
├── file_incremental_2024-01-23T03-00-00.tar.gz
├── metadata/
│   ├── caris_full_2024-01-15T03-00-00.json
│   ├── file_full_2024-01-15T03-00-00.json
│   └── ...
└── temp/
    └── (temporary extraction files)
```

---

## Environment Setup

### Required Environment Variables

Add these to your `.env.local` or `.env` file:

```bash
# Backup Configuration
BACKUP_DIR=/var/backups/caris
FILE_BACKUP_DIR=/var/backups/caris/files

# Encryption
BACKUP_ENCRYPTION_KEY=your-super-secret-encryption-key-here

# Notifications
BACKUP_EMAIL_NOTIFICATIONS=true
BACKUP_EMAIL_RECIPIENTS=admin@example.com,devops@example.com
BACKUP_SLACK_NOTIFICATIONS=true
BACKUP_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Cron Security
CRON_SECRET=your-cron-secret-key

# Cloud Storage (Optional)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_BACKUP_BUCKET=caris-backups
AWS_REGION=us-east-1
```

### System Requirements

- **PostgreSQL Client Tools**: `pg_dump`, `psql` (version matching your database)
- **OpenSSL**: For encryption/decryption
- **Tar & Gzip**: For file compression
- **Node.js**: 18+ for the backup services
- **Disk Space**: Minimum 50GB for local backups

### Installation

1. **Create backup directories**:
   ```bash
   mkdir -p /var/backups/caris/{metadata,temp}
   chmod 700 /var/backups/caris
   ```

2. **Install dependencies** (already in package.json):
   ```bash
   pnpm install
   ```

3. **Make scripts executable**:
   ```bash
   chmod +x scripts/backup/*.sh
   ```

4. **Test backup creation**:
   ```bash
   ./scripts/backup/backup-database.sh full
   ```

---

## Automated Backups

### Using Vercel Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/backup?type=incremental",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/backup?type=full",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

### Using System Cron

Add to crontab (`crontab -e`):

```bash
# Daily incremental backup at 3 AM
0 3 * * * cd /path/to/caris && ./scripts/backup/backup-database.sh incremental

# Weekly full backup at 2 AM on Sundays
0 2 * * 0 cd /path/to/caris && ./scripts/backup/backup-database.sh full

# Daily cleanup at 4 AM
0 4 * * * cd /path/to/caris && ./scripts/backup/cleanup-old-backups.sh
```

### Using Node.js Scheduler

The backup scheduler can be started programmatically:

```typescript
import { backupScheduler } from '@/lib/backup/backup-scheduler';

// Start automated backups
backupScheduler.start();

// Custom schedule
backupScheduler.start({
  daily: '0 3 * * *',
  weekly: '0 2 * * 0',
  monthly: '0 1 1 * *',
});
```

---

## Manual Backup Operations

### Via Admin Dashboard

1. Navigate to `/admin/backup`
2. Click "Create Full Backup" or "Create Incremental Backup"
3. Wait for completion (you'll see a success notification)
4. Verify the backup appears in the list

### Via API

```bash
# Create full backup
curl -X POST http://localhost:3000/api/admin/backup/create \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"type": "full", "includeFiles": true}'

# List backups
curl http://localhost:3000/api/admin/backup/list \
  -H "Cookie: your-auth-cookie"

# Verify backup
curl -X POST http://localhost:3000/api/admin/backup/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"backupId": "caris_full_2024-01-15T03-00-00", "type": "database"}'
```

### Via Shell Scripts

```bash
# Create full database backup
./scripts/backup/backup-database.sh full

# Create incremental backup
./scripts/backup/backup-database.sh incremental

# Verify backup integrity
./scripts/backup/verify-backup.sh caris_full_2024-01-15T03-00-00

# List backups
ls -lh /var/backups/caris/
```

---

## Restoration Procedures

### 🚨 Important Warnings

- **RESTORATION OVERWRITES DATA**: All current data will be replaced
- **ALWAYS TEST FIRST**: Use dry-run mode before actual restoration
- **BACKUP CURRENT STATE**: Create a backup before restoring
- **VERIFY BACKUP**: Always verify backup integrity before restoring
- **NOTIFY USERS**: Inform users before performing restoration

### Step-by-Step Restoration

#### 1. Identify the Backup

```bash
# List available backups
./scripts/backup/verify-backup.sh

# Or via admin dashboard
Visit /admin/backup and review the backup list
```

#### 2. Verify Backup Integrity

```bash
# Verify checksum
./scripts/backup/verify-backup.sh caris_full_2024-01-15T03-00-00

# Or via API
curl -X POST http://localhost:3000/api/admin/backup/verify \
  -H "Content-Type: application/json" \
  -d '{"backupId": "caris_full_2024-01-15T03-00-00", "type": "database"}'
```

#### 3. Test Restoration (Dry Run)

```bash
# Test database restoration
DRY_RUN=true ./scripts/backup/restore-database.sh caris_full_2024-01-15T03-00-00

# Or via API
curl -X POST http://localhost:3000/api/admin/backup/restore \
  -H "Content-Type: application/json" \
  -d '{"backupId": "caris_full_2024-01-15T03-00-00", "type": "database", "dryRun": true}'
```

#### 4. Create Current State Backup

```bash
# Backup current state before restoring
./scripts/backup/backup-database.sh full
```

#### 5. Perform Restoration

```bash
# Restore database
./scripts/backup/restore-database.sh caris_full_2024-01-15T03-00-00

# The script will ask for confirmation
# Type 'yes' to proceed
```

#### 6. Verify Restoration

```bash
# Check database
psql $POSTGRES_URL -c "SELECT COUNT(*) FROM users;"

# Check application
pnpm dev
# Visit http://localhost:3000 and verify functionality
```

### Point-in-Time Recovery

Restore to a specific point in time:

```typescript
import { recoveryService } from '@/lib/backup/recovery';

// Restore to specific time
const result = await recoveryService.pointInTimeRecovery({
  targetTime: new Date('2024-01-15T14:30:00Z'),
});

if (result.success) {
  console.log('Restored successfully');
  console.log('Warning:', result.warnings);
}
```

---

## Disaster Recovery

### Recovery Time Objective (RTO)

**Target**: 4 hours maximum downtime

### Recovery Point Objective (RPO)

**Target**: 24 hours maximum data loss

### Disaster Recovery Plan

#### Scenario 1: Database Corruption

1. **Immediate Actions**:
   - Put application in maintenance mode
   - Prevent new writes to database

2. **Recovery**:
   ```bash
   # Verify latest backup
   ./scripts/backup/verify-backup.sh $(ls -t /var/backups/caris/metadata/ | head -1 | sed 's/.json$//')

   # Restore database
   ./scripts/backup/restore-database.sh <backup-id>
   ```

3. **Verification**:
   - Check database integrity
   - Verify critical data (users, sessions, patient records)
   - Test application functionality

4. **Resume Operations**:
   - Remove maintenance mode
   - Monitor for issues

#### Scenario 2: Complete Server Failure

1. **Provision New Server**:
   - Deploy application to new server
   - Install dependencies

2. **Restore from Cloud Backup**:
   ```bash
   # Download backup from S3/R2
   aws s3 cp s3://caris-backups/latest/ /var/backups/caris/ --recursive

   # Restore database
   ./scripts/backup/restore-database.sh <backup-id>

   # Restore files
   tar -xzf /var/backups/caris/file_*.tar.gz -C /path/to/public/
   ```

3. **Update DNS/Configuration**:
   - Point domain to new server
   - Update environment variables

#### Scenario 3: Ransomware Attack

1. **Isolate Infected Systems**:
   - Disconnect from network immediately
   - DO NOT pay ransom

2. **Clean Server Provisioning**:
   - Provision fresh server
   - Install from clean sources

3. **Restore from Pre-Attack Backup**:
   ```bash
   # Identify last known good backup (before attack)
   # Restore from that backup
   ./scripts/backup/restore-database.sh <pre-attack-backup-id>
   ```

4. **Security Hardening**:
   - Update all credentials
   - Implement additional security measures
   - Conduct security audit

---

## Testing & Verification

### Monthly Backup Testing

**Schedule**: First Monday of each month

1. **Select Random Backup**:
   ```bash
   BACKUP_ID=$(ls /var/backups/caris/metadata/*.json | shuf -n 1 | xargs basename -s .json)
   ```

2. **Verify Integrity**:
   ```bash
   ./scripts/backup/verify-backup.sh $BACKUP_ID
   ```

3. **Test Restoration**:
   ```bash
   DRY_RUN=true ./scripts/backup/restore-database.sh $BACKUP_ID
   ```

4. **Document Results**:
   - Create test report
   - Note any issues
   - Update procedures if needed

### Automated Verification

The system automatically:
- Verifies checksum after each backup
- Tests backup file readability
- Logs verification results
- Sends alerts on failures

---

## Monitoring & Alerts

### Email Notifications

Automatic emails sent to `BACKUP_EMAIL_RECIPIENTS` for:
- ✅ Successful backups (daily summary)
- ❌ Failed backups (immediate alert)
- ⚠️ Verification failures
- 📊 Weekly backup reports

### Slack Notifications

Real-time alerts to Slack channel:
- Failed backups (high priority)
- Successful weekly/monthly backups
- Storage warnings (> 80% full)

### Monitoring Dashboard

Access `/admin/backup` to view:
- Backup history and status
- Storage usage statistics
- Backup schedule and next runs
- Verification status

### Log Files

Backup operations are logged to:
- Application logs: Check console output
- System logs: `/var/log/caris/backup.log` (if configured)

---

## Troubleshooting

### Common Issues

#### ❌ "POSTGRES_URL not set"

**Solution**:
```bash
# Check environment variable
echo $POSTGRES_URL

# If empty, load .env file
source .env.local
```

#### ❌ "pg_dump: command not found"

**Solution**:
```bash
# Install PostgreSQL client
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql
```

#### ❌ "Checksum mismatch"

**Cause**: Backup file is corrupted

**Solution**:
```bash
# DO NOT use this backup
# Use previous backup instead
ls -lt /var/backups/caris/metadata/ | grep completed
```

#### ❌ "Permission denied"

**Solution**:
```bash
# Fix backup directory permissions
sudo chown -R $USER:$USER /var/backups/caris
chmod 700 /var/backups/caris
```

#### ❌ "Disk full"

**Solution**:
```bash
# Check disk usage
df -h /var/backups/caris

# Clean up old backups
./scripts/backup/cleanup-old-backups.sh

# Or manually delete oldest backups
```

#### ⚠️ "Backup taking too long"

**Causes**:
- Large database size
- Slow disk I/O
- Network issues (cloud upload)

**Solutions**:
- Consider incremental backups instead of full
- Optimize database (VACUUM, ANALYZE)
- Schedule during low-traffic hours

---

## Best Practices

### Security

1. **Encrypt All Backups**: Always enable encryption
2. **Secure Encryption Keys**: Use strong, unique encryption keys
3. **Restrict Access**: Limit who can access backups
4. **Rotate Credentials**: Change passwords regularly
5. **Audit Access**: Log all backup/restore operations

### Reliability

1. **Test Restores Monthly**: Verify backups are restorable
2. **Monitor Success Rate**: Track backup completion rates
3. **Verify Integrity**: Always check checksums
4. **Multiple Locations**: Store backups in multiple places
5. **Document Procedures**: Keep recovery docs updated

### Compliance (HIPAA/GDPR)

1. **Encrypt at Rest**: All backups must be encrypted
2. **Encrypt in Transit**: Use HTTPS/TLS for transfers
3. **Access Logging**: Log all backup access
4. **Data Retention**: Follow legal retention requirements
5. **Secure Deletion**: Properly delete old backups

### Performance

1. **Schedule Wisely**: Run backups during low-traffic hours
2. **Use Incremental**: Daily incrementals, weekly fulls
3. **Compress Data**: Reduce storage costs
4. **Monitor Storage**: Watch disk usage
5. **Clean Up**: Apply retention policies automatically

---

## Support & Contact

For backup system issues:

- **Technical Support**: devops@caris.com
- **Emergency**: Call backup oncall (24/7)
- **Documentation**: https://docs.caris.com/backup
- **GitHub Issues**: https://github.com/caris/platform/issues

---

## Changelog

- **v1.0.0** (2024-01-15): Initial backup system implementation
  - Database backups with encryption
  - File backups with deduplication
  - Automated scheduling
  - Admin dashboard
  - Recovery procedures

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
**Maintained by**: CÁRIS DevOps Team
