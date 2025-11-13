# Monitoring & Alerts Configuration

This document describes the monitoring and alerting configuration for the CÁRIS SaaS Pro platform using Sentry.

## Table of Contents

- [Overview](#overview)
- [Sentry Project Setup](#sentry-project-setup)
- [Alert Types](#alert-types)
- [Alert Configuration](#alert-configuration)
- [Notification Channels](#notification-channels)
- [Alert Routing](#alert-routing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The CÁRIS platform uses **Sentry** as the primary monitoring and alerting system for:

- **Error Tracking**: Automatic capture and reporting of application errors
- **Performance Monitoring**: Track API response times, database queries, and component renders
- **Session Replay**: Record user sessions to debug issues
- **Health Monitoring**: System health checks and uptime monitoring
- **Custom Metrics**: Business-specific metrics and KPIs

---

## Sentry Project Setup

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project:
   - **Platform**: Next.js
   - **Project Name**: `caris-saas-pro`
   - **Team**: Your organization team

3. Note your **DSN** (Data Source Name)

### 2. Configure Environment Variables

Add the following environment variables to your `.env.local` (development) and deployment platform (production):

```bash
# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id

# Sentry Project Configuration
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=caris-saas-pro

# Sentry Auth Token (for uploading source maps)
SENTRY_AUTH_TOKEN=your-auth-token

# Environment
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_RELEASE=$VERCEL_GIT_COMMIT_SHA
```

### 3. Generate Auth Token

1. Go to **Settings** > **Auth Tokens** in Sentry
2. Create a new token with the following scopes:
   - `project:read`
   - `project:releases`
   - `org:read`
3. Save the token as `SENTRY_AUTH_TOKEN`

---

## Alert Types

### 1. Error Rate Alerts

**Purpose**: Detect sudden increases in application errors

**Configuration**:
```yaml
Type: Metric Alert
Metric: Error count
Threshold: > 10 errors in 5 minutes
Severity: High
Action: Notify team immediately
```

**Sentry Setup**:
1. Go to **Alerts** > **Create Alert Rule**
2. Choose **Issues** or **Metric** alert
3. Configure:
   - **When**: `An event is seen`
   - **Conditions**: `The issue is seen more than 10 times in 5 minutes`
   - **Then**: Send notification to Slack/Email

### 2. Performance Degradation Alerts

**Purpose**: Detect slow API responses and database queries

**Configuration**:
```yaml
Type: Metric Alert
Metric: Transaction duration (p95)
Threshold: > 1000ms
Severity: Medium
Action: Notify development team
```

**Sentry Setup**:
1. Go to **Alerts** > **Create Alert Rule**
2. Choose **Metric** alert
3. Configure:
   - **When**: `avg(transaction.duration) > 1000ms`
   - **Conditions**: `For 5 minutes`
   - **Then**: Send notification

### 3. Availability Alerts

**Purpose**: Detect service downtime or health check failures

**Configuration**:
```yaml
Type: Health Check Alert
Metric: Service availability
Threshold: Health check fails 3 times consecutively
Severity: Critical
Action: Page on-call engineer
```

**External Monitoring**:
- Use **UptimeRobot** or **Pingdom** to monitor `/api/health`
- Configure alerts for:
  - Status code != 200
  - Response time > 5000ms
  - 3 consecutive failures

### 4. Resource Usage Alerts

**Purpose**: Detect high memory or CPU usage

**Configuration**:
```yaml
Type: System Alert
Metrics:
  - Memory usage > 90%
  - CPU usage > 80% for 5 minutes
Severity: High
Action: Notify DevOps team
```

**Sentry Setup**:
1. Use custom metrics to track resource usage
2. Create metric alerts for thresholds
3. See `/app/api/health/route.ts` for system metrics

### 5. Security Event Alerts

**Purpose**: Detect suspicious activity or security breaches

**Configuration**:
```yaml
Type: Security Alert
Events:
  - Failed login attempts > 5 in 1 minute
  - Unauthorized access attempts
  - SOS emergency triggers
Severity: Critical
Action: Notify security team immediately
```

**Implementation**:
- See `/lib/error-tracking.ts` for security tracking functions
- Use `trackSuspiciousAuthActivity()` for suspicious events
- `captureSosError()` for emergency events

---

## Alert Configuration

### Issue Alert Rules

Create the following issue alert rules in Sentry:

#### 1. Critical Errors Alert

```yaml
Name: Critical Errors
When: An event is seen
Conditions:
  - The event's level is equal to fatal
Then: Send a notification via Slack (immediately)
Action Interval: Send a notification at most once every 5 minutes
```

#### 2. New Error Alert

```yaml
Name: New Error Detected
When: An event is first seen
Conditions:
  - The issue is first seen in this release
Then: Send a notification via Slack
Action Interval: Send a notification at most once per issue
```

#### 3. Regression Alert

```yaml
Name: Error Regression
When: An issue changes state
Conditions:
  - The issue changes state from resolved to unresolved
Then: Send a notification via Slack and Email
```

#### 4. High Volume Alert

```yaml
Name: High Error Volume
When: An event is seen
Conditions:
  - The issue is seen more than 50 times in 1 hour
Then: Send a notification via Slack
Action Interval: Send a notification at most once every 30 minutes
```

### Metric Alert Rules

#### 1. API Response Time Alert

```yaml
Name: Slow API Responses
When: avg(transaction.duration)
Conditions:
  - Is above 1000ms for 5 minutes
Environment: production
Then: Send notification via Slack
```

#### 2. Error Rate Spike

```yaml
Name: Error Rate Spike
When: count()
Conditions:
  - Is above 100 events in 5 minutes
  - Compared to 1 hour ago, is above 200%
Then: Send notification via Slack and Email
```

#### 3. Database Query Performance

```yaml
Name: Slow Database Queries
When: avg(spans.db)
Conditions:
  - Is above 500ms for 5 minutes
Filter: span.op:db.query
Then: Send notification via Slack
```

---

## Notification Channels

### 1. Slack Integration

**Setup**:
1. Go to **Settings** > **Integrations** > **Slack**
2. Click **Add Workspace**
3. Authorize Sentry for your Slack workspace
4. Configure channels:
   - `#alerts-critical`: Fatal errors, SOS events, downtime
   - `#alerts-errors`: Application errors
   - `#alerts-performance`: Performance degradation
   - `#alerts-security`: Security events

**Slack Alert Format**:
```
🚨 [CRITICAL] Database Connection Failed
Project: caris-saas-pro
Environment: production
Error: Connection terminated unexpectedly
Users Affected: 15
Link: [View in Sentry]
```

### 2. Email Notifications

**Setup**:
1. Go to **Settings** > **Notifications**
2. Configure email preferences:
   - **Critical Alerts**: Send immediately
   - **High Priority**: Send within 5 minutes
   - **Medium Priority**: Daily digest
   - **Low Priority**: Weekly digest

**Email Recipients**:
- **Critical**: On-call engineer + tech lead
- **High**: Development team
- **Medium**: Team lead
- **Low**: Product manager

### 3. SMS/Phone Alerts (PagerDuty)

**Setup**:
1. Create PagerDuty account
2. Go to **Settings** > **Integrations** > **PagerDuty**
3. Connect Sentry to PagerDuty
4. Configure escalation policy:
   - **Critical alerts**: Page on-call engineer immediately
   - **No response in 5 minutes**: Escalate to tech lead
   - **No response in 15 minutes**: Escalate to CTO

**PagerDuty Integration**:
```yaml
Critical Alerts:
  - Service downtime (3+ consecutive health check failures)
  - Database connection failures
  - SOS emergency events
  - Security breaches
```

### 4. Microsoft Teams

**Setup**:
1. Go to **Settings** > **Integrations** > **Microsoft Teams**
2. Add Sentry app to your Teams workspace
3. Configure channels similar to Slack

---

## Alert Routing

### Routing Rules

Configure alert routing based on:

1. **Severity Level**:
   ```
   Fatal/Critical → Slack #alerts-critical + PagerDuty + Email
   Error/High     → Slack #alerts-errors + Email
   Warning/Medium → Slack #alerts-errors
   Info/Low       → Email digest
   ```

2. **Component/Service**:
   ```
   Database       → #backend-team
   API            → #backend-team
   Frontend       → #frontend-team
   Security       → #security-team
   Payment        → #backend-team + #finance-team
   ```

3. **Environment**:
   ```
   Production     → All channels (immediate)
   Staging        → Slack only (low priority)
   Development    → Console only (no alerts)
   ```

4. **Business Impact**:
   ```
   SOS Events     → PagerDuty (critical) + #alerts-critical
   Payment Errors → #alerts-critical + #finance-team
   Session Errors → #alerts-errors
   UI Errors      → #alerts-errors
   ```

### Custom Alert Routing

Use tags to route alerts:

```typescript
// Tag errors with team ownership
Sentry.setTag('team', 'backend')
Sentry.setTag('component', 'payment')
Sentry.setTag('priority', 'critical')

// Route based on tags in Sentry alert rules
```

---

## Best Practices

### 1. Alert Fatigue Prevention

- **Threshold Tuning**: Adjust thresholds to reduce false positives
- **Grouping**: Group similar errors to avoid duplicate alerts
- **Rate Limiting**: Limit alerts to once per time period
- **Muting**: Temporarily mute known issues during fixes

### 2. Alert Priority Guidelines

**Critical (P0)**:
- Service downtime (all users affected)
- Database failures
- Payment processing failures
- SOS emergency events
- Security breaches

**High (P1)**:
- Significant feature broken (>10% users affected)
- Slow API responses (>2s p95)
- High error rate (>100 errors/5min)

**Medium (P2)**:
- Minor feature broken (<10% users affected)
- Slow queries (>1s)
- Moderate error rate (10-100 errors/5min)

**Low (P3)**:
- UI glitches
- Individual user errors
- Non-critical warnings

### 3. On-Call Responsibilities

**On-Call Engineer Should**:
- Acknowledge alerts within 5 minutes
- Triage and assess impact
- Fix critical issues or escalate
- Document resolution in runbook
- Create follow-up tasks for root cause analysis

### 4. Alert Runbooks

Create runbooks for common alerts:

**Example: Database Connection Failure**
```markdown
## Alert: Database Connection Failed

### Symptoms
- Health check returns 503
- Sentry shows "Connection terminated" errors

### Immediate Actions
1. Check database status: `curl https://app.caris.com/api/health`
2. Verify database credentials in environment variables
3. Check database provider dashboard (Neon, etc.)
4. Restart application if needed

### Resolution Steps
1. If database is down: Contact provider
2. If credentials expired: Update environment variables
3. If connection pool exhausted: Scale application instances

### Post-Incident
- Document in incident log
- Create ticket for monitoring improvements
- Review connection pool settings
```

### 5. Testing Alerts

Test your alerts regularly:

```typescript
// Test error alert
import * as Sentry from '@sentry/nextjs'
Sentry.captureException(new Error('Test alert - please ignore'), {
  level: 'error',
  tags: { test: 'true' }
})

// Test performance alert
// Trigger slow API endpoint
await fetch('/api/slow-endpoint')
```

---

## Troubleshooting

### Common Issues

#### 1. Alerts Not Firing

**Possible Causes**:
- Alert rules not saved or enabled
- Notification integrations not configured
- Environment filters excluding events
- DSN not configured correctly

**Solutions**:
- Verify alert rules are enabled in Sentry
- Test notification channels manually
- Check environment tags on events
- Verify DSN in environment variables

#### 2. Too Many Alerts (Alert Fatigue)

**Possible Causes**:
- Thresholds too sensitive
- No alert grouping
- No rate limiting

**Solutions**:
- Increase error count thresholds
- Enable issue grouping by error message
- Add "at most once every X minutes" condition
- Mute known issues during fixes

#### 3. Missing Critical Alerts

**Possible Causes**:
- Alert rules too restrictive
- Errors not being captured by Sentry
- Notification channel failures

**Solutions**:
- Review and loosen alert conditions
- Verify Sentry SDK is initialized
- Check notification channel integrations
- Add multiple notification channels for critical alerts

#### 4. Source Maps Not Working

**Possible Causes**:
- Source maps not uploaded to Sentry
- SENTRY_AUTH_TOKEN not configured
- Release name mismatch

**Solutions**:
```bash
# Verify source maps in build
npm run build

# Check Sentry webpack plugin output
# Should see "Source maps uploaded successfully"

# Manually upload source maps
npx @sentry/cli releases files <RELEASE> upload-sourcemaps .next/static
```

---

## Maintenance

### Regular Tasks

**Daily**:
- Review critical alerts
- Check alert response times
- Verify on-call rotation

**Weekly**:
- Review alert metrics
- Adjust thresholds if needed
- Update runbooks

**Monthly**:
- Review alert effectiveness
- Audit notification channels
- Update escalation policies
- Test disaster recovery procedures

**Quarterly**:
- Full alert system review
- Update documentation
- Training for new team members
- Review and update SLAs

---

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)
- [Next.js Sentry Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring Guide](https://docs.sentry.io/product/performance/)
- [Alert Rules Reference](https://docs.sentry.io/product/alerts/)

---

## Support

For questions or issues with monitoring and alerts:

- **Technical Issues**: Open a ticket in project management system
- **Alert Configuration**: Contact DevOps team
- **Critical Incidents**: Use PagerDuty escalation
- **Documentation Updates**: Submit PR to this file
