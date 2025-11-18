# Virus Scanning Setup Guide

## Overview

CÁRIS includes a comprehensive virus scanning system with multiple detection engines to protect users from malicious file uploads. The system uses a fallback chain to ensure files are always scanned:

1. **ClamAV** (Primary, Local) - Fast, open-source antivirus
2. **VirusTotal API** (Fallback, Cloud) - 70+ antivirus engines
3. **Heuristic Analysis** (Final Fallback) - Pattern-based detection

## Quick Start

### Option 1: ClamAV (Recommended for Production)

**Benefits:**
- Free and open-source
- No API limits
- Fast local scanning
- No file size limits
- HIPAA/LGPD compliant (data never leaves your infrastructure)

**Installation:**

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install clamav clamav-daemon
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon

# Update virus definitions
sudo freshclam
```

**macOS:**
```bash
brew install clamav

# Update virus definitions
freshclam

# Start the daemon
sudo brew services start clamav
```

**Docker:**
```yaml
# docker-compose.yml
services:
  clamav:
    image: clamav/clamav:latest
    ports:
      - "3310:3310"
    volumes:
      - ./clamav-data:/var/lib/clamav
```

**Verification:**
```bash
# Test that ClamAV is working
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt
clamscan eicar.txt
# Should detect: EICAR-AV-Test FOUND
rm eicar.txt
```

### Option 2: VirusTotal API (Cloud Fallback)

**Benefits:**
- 70+ antivirus engines
- Comprehensive threat intelligence
- File reputation checking
- Easy setup (just API key)

**Limitations:**
- Free tier: 500 requests/day, 4 requests/minute
- Files uploaded to VirusTotal (privacy consideration)
- File size limit: 650MB (free), 650MB (premium)

**Setup:**

1. Sign up at https://www.virustotal.com/
2. Get your API key from https://www.virustotal.com/gui/my-apikey
3. Add to environment variables:

```bash
# .env.local
VIRUSTOTAL_API_KEY=your_api_key_here
```

### Option 3: Heuristic-Only (Development)

For development environments, the system will fall back to heuristic scanning if neither ClamAV nor VirusTotal is available. This includes:

- File signature validation (magic bytes)
- Executable detection
- Script injection detection
- Obfuscation detection

**Note:** Heuristics alone are NOT sufficient for production use.

## Configuration

### Environment Variables

Add to your `.env.local` file:

```bash
# Virus Scanning Configuration
VIRUSTOTAL_API_KEY=your_api_key_here  # Optional, for VirusTotal fallback

# ClamAV Configuration (if using custom clamd)
CLAMAV_HOST=localhost                  # Optional, default: localhost
CLAMAV_PORT=3310                       # Optional, default: 3310
```

### System Status Check

You can check which scanning engines are available:

```typescript
import { VirusScanner } from '@/lib/virus-scanner'

const scanner = VirusScanner.getInstance()
const status = scanner.getStatus()

console.log('Virus Scanner Status:', status)
// {
//   clamav: true,        // ClamAV available
//   virustotal: true,    // VirusTotal API configured
//   heuristic: true      // Heuristic always available
// }
```

## How It Works

### Upload Flow

1. **User uploads file** → `/api/chat/files/upload`
2. **File validation** → Type check, size check, extension check
3. **Virus scanning** → ClamAV → VirusTotal → Heuristics
4. **Result handling:**
   - ✅ **clean**: File accepted and stored
   - ❌ **infected**: File rejected, user notified
   - ⏳ **pending**: File accepted, marked for background rescan
   - ⚠️ **error**: File rejected with error message

### Background Rescanning

Files marked as "pending" are automatically rescanned every 5 minutes by a background job. This handles:

- VirusTotal async analysis completion
- Temporary scanning failures
- Quarantined files awaiting review

To enable background scanning:

```typescript
// In your app initialization (e.g., app/api/startup/route.ts)
import { VirusScannerJob } from '@/lib/virus-scanner-job'

VirusScannerJob.start()
```

### Download Protection

Files are checked again during download:

```typescript
// /api/chat/files/download/[fileId]/route.ts

// Block infected files
if (file.virusScanStatus === 'infected') {
  return new NextResponse("File is infected", { status: 403 })
}

// Prevent pending downloads
if (file.virusScanStatus === 'pending') {
  return new NextResponse("File is still being scanned", { status: 202 })
}
```

## Performance Considerations

### ClamAV

- **Scan time**: ~100-500ms for typical files (images, documents)
- **Large files**: May take several seconds (videos, large PDFs)
- **Resource usage**: Low CPU, ~500MB RAM for daemon

### VirusTotal API

- **Scan time**: 2-10 seconds for initial scan (async)
- **Rate limits**:
  - Free: 4 requests/minute, 500/day
  - Premium: Higher limits available
- **File size limits**: 650MB (free and premium)

### Heuristics

- **Scan time**: <50ms
- **Resource usage**: Minimal
- **Detection rate**: Basic (executables, scripts, obvious threats)

## Security Best Practices

### 1. Use Multiple Layers

✅ **DO:**
```typescript
// Use all available engines
const scanner = VirusScanner.getInstance()
const result = await scanner.scanFile(buffer, mimeType)
```

❌ **DON'T:**
```typescript
// Don't rely on heuristics alone
if (process.env.NODE_ENV === 'production') {
  // Require at least one real AV engine
  const status = scanner.getStatus()
  if (!status.clamav && !status.virustotal) {
    throw new Error('No antivirus engine available!')
  }
}
```

### 2. Quarantine Pending Files

Files with `status: 'pending'` should be:
- Stored separately from user-accessible files
- Not served for download until scan completes
- Rescanned periodically

### 3. Log All Scan Results

All scan results are logged with safe-logger:
- Successful scans (clean files)
- Blocked threats (infected files)
- Scan errors (for debugging)

### 4. Update Virus Definitions

**ClamAV:**
```bash
# Manual update
sudo freshclam

# Automatic updates (Ubuntu/Debian)
sudo systemctl enable clamav-freshclam
```

**VirusTotal:**
- Automatically uses latest signatures
- No maintenance required

## Troubleshooting

### "ClamAV not available"

**Check if installed:**
```bash
which clamscan
# Should return: /usr/bin/clamscan
```

**Check if running:**
```bash
sudo systemctl status clamav-daemon
# Should show: active (running)
```

**Update definitions:**
```bash
sudo freshclam
```

### "VirusTotal API key not configured"

Add your API key to `.env.local`:
```bash
VIRUSTOTAL_API_KEY=your_actual_key_here
```

Restart your server:
```bash
pnpm dev
```

### "File security check failed"

This means ALL scanning methods failed. Check logs:
```bash
grep "VIRUS_SCANNER" logs/app.log
```

Common causes:
- ClamAV daemon not running
- VirusTotal API rate limit exceeded
- Network issues (for VirusTotal)
- File too large (>50MB by default)

## Compliance

### HIPAA

✅ **ClamAV is HIPAA-compliant** - No PHI sent to third parties
⚠️ **VirusTotal requires BAA** - Files are uploaded to VirusTotal

For HIPAA compliance, use ClamAV only:
```typescript
// Disable VirusTotal in production
if (process.env.HIPAA_MODE === 'true') {
  delete process.env.VIRUSTOTAL_API_KEY
}
```

### LGPD/GDPR

✅ **ClamAV is LGPD/GDPR-compliant** - All processing on-premises
⚠️ **VirusTotal requires disclosure** - Data sent to third-party

Include in privacy policy if using VirusTotal:
> "Files uploaded to CÁRIS may be scanned by VirusTotal, a third-party malware detection service operated by Google."

## Cost Analysis

### ClamAV
- **Setup**: Free
- **Operation**: Free
- **Scaling**: Minimal (add more server CPU/RAM)
- **Total Cost**: $0

### VirusTotal
- **Free Tier**: $0 (500 scans/day)
- **Premium**: Starts at $250/month
- **Scaling**: Pay per scan

### Recommendation

For CÁRIS mental health platform:
- **Production**: Use ClamAV (HIPAA-compliant, free, fast)
- **Fallback**: Configure VirusTotal API (for redundancy)
- **Development**: Heuristics acceptable

## Support

For issues or questions:
- ClamAV: https://docs.clamav.net/
- VirusTotal: https://developers.virustotal.com/
- CÁRIS Security: See `SECURITY.md`
