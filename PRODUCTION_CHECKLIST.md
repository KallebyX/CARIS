# Production Deployment Checklist

This checklist ensures CÁRIS is properly configured and secured before production deployment.

## Pre-Deployment Security Review

### 1. Environment Configuration

#### Required Environment Variables
- [ ] `NODE_ENV=production` set
- [ ] `POSTGRES_URL` configured with production database
- [ ] `JWT_SECRET` is strong (min 32 characters, random)
- [ ] `JWT_REFRESH_SECRET` set (separate from JWT_SECRET)
- [ ] `CSRF_SECRET` configured
- [ ] `ENCRYPTION_KEY` set for data encryption
- [ ] All API keys are production keys (not test/dev)
- [ ] `ALLOWED_ORIGINS` configured with production domains only

#### Optional but Recommended
- [ ] `SENTRY_DSN` configured for error tracking
- [ ] `UPSTASH_REDIS_REST_URL` configured for rate limiting
- [ ] `RESEND_API_KEY` for email notifications
- [ ] `TWILIO_*` credentials for SMS notifications

#### Validation
```bash
# Run environment validation
pnpm tsx -e "import { validateEnv, printSecurityAudit } from './lib/secrets'; validateEnv(); printSecurityAudit()"
```

---

### 2. Database Security

- [ ] Database uses SSL/TLS encryption (`sslmode=require` in connection string)
- [ ] Database password is strong and rotated regularly
- [ ] Database is not publicly accessible
- [ ] Database backups are configured and tested
- [ ] Row-level security (RLS) policies are enabled where needed
- [ ] Database connection pooling is configured properly
- [ ] Query timeouts are enforced
- [ ] Prepared statements used for all user inputs

#### Database Migrations
- [ ] All migrations tested in staging environment
- [ ] Rollback plan documented
- [ ] Backup created before migration

```bash
# Check database health
pnpm tsx -e "import { checkDatabaseHealth } from './lib/db-security'; await checkDatabaseHealth()"

# Run migrations
pnpm db:migrate

# Verify migrations
psql $POSTGRES_URL -c "\dt"
```

---

### 3. Authentication & Authorization

- [ ] JWT secrets are strong and unique
- [ ] JWT token expiry times are appropriate
- [ ] Refresh token rotation is enabled
- [ ] Session timeout is configured
- [ ] Password requirements enforced (min 8 chars, complexity)
- [ ] Failed login attempt limiting is active
- [ ] CSRF protection is enabled
- [ ] Session fixation protection is active
- [ ] Password reset tokens expire appropriately

#### Test Authentication
```bash
# Verify JWT configuration
pnpm tsx -e "import { getJWTConfig } from './lib/secrets'; console.log(getJWTConfig())"
```

---

### 4. Security Headers

- [ ] Content Security Policy (CSP) configured
- [ ] HSTS header enabled with appropriate max-age
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy configured
- [ ] CORS properly configured for production domains only

#### Verify Headers
```bash
# After deployment, check headers
curl -I https://your-production-domain.com | grep -E "Content-Security-Policy|Strict-Transport-Security|X-Frame-Options"
```

---

### 5. Input Validation & Sanitization

- [ ] All API endpoints use Zod validation
- [ ] XSS protection via DOMPurify for user inputs
- [ ] SQL injection prevented with parameterized queries
- [ ] Path traversal protection in file operations
- [ ] File upload validation (type, size, content)
- [ ] Rate limiting configured for all endpoints

---

### 6. API Security

- [ ] Rate limiting active on all routes
- [ ] Sensitive endpoints have stricter rate limits
- [ ] API responses don't leak sensitive information
- [ ] Error messages are production-safe (no stack traces)
- [ ] Request size limits configured
- [ ] API versioning strategy in place

#### Rate Limit Configuration
```typescript
// Example rate limits to verify:
AUTH: 10 requests/minute
WRITE: 30 requests/minute
READ: 100 requests/minute
SENSITIVE: 5 requests/minute
UPLOAD: 10 uploads/5 minutes
```

---

### 7. Data Protection & Privacy

#### LGPD/GDPR Compliance
- [ ] User consent system implemented
- [ ] Data export functionality available
- [ ] Right to be forgotten implemented
- [ ] Privacy policy updated and accessible
- [ ] Terms of service updated
- [ ] Cookie consent implemented
- [ ] Audit logging for data access

#### Encryption
- [ ] Sensitive data encrypted at rest
- [ ] Data encrypted in transit (HTTPS only)
- [ ] Encryption keys properly managed
- [ ] End-to-end encryption for chat messages
- [ ] PII (Personally Identifiable Information) identified and protected

---

### 8. File Upload Security

- [ ] File type validation (magic bytes)
- [ ] File size limits enforced
- [ ] Virus scanning integration (if available)
- [ ] Secure file storage (not in public directory)
- [ ] File encryption before storage
- [ ] Secure file download with time-limited URLs

---

### 9. Error Handling & Logging

- [ ] Sentry (or equivalent) configured
- [ ] Error tracking captures exceptions
- [ ] Logs don't contain sensitive data
- [ ] Audit logging for security events
- [ ] Failed login attempts logged
- [ ] Suspicious activity detection active
- [ ] Critical errors trigger alerts

#### Logging Configuration
```bash
# Verify logging is working
pnpm tsx -e "import { logError } from './lib/error-handler'; logError(new Error('Test error'))"
```

---

### 10. Monitoring & Alerting

- [ ] Uptime monitoring configured
- [ ] Performance monitoring active
- [ ] Database query monitoring
- [ ] Error rate alerts configured
- [ ] Security event alerts (brute force, etc.)
- [ ] Disk space alerts
- [ ] Memory usage alerts

---

### 11. Backup & Recovery

- [ ] Database backups configured (daily minimum)
- [ ] Backup restoration tested
- [ ] Backup retention policy defined
- [ ] File storage backups configured
- [ ] Disaster recovery plan documented
- [ ] RTO (Recovery Time Objective) defined
- [ ] RPO (Recovery Point Objective) defined

#### Backup Verification
```bash
# Test backup creation
pg_dump $POSTGRES_URL > backup_test.sql

# Test backup restoration (in test environment)
psql $TEST_DB_URL < backup_test.sql
```

---

### 12. Performance Optimization

- [ ] Database indexes created for frequent queries
- [ ] Database query optimization performed
- [ ] Static assets optimized and minified
- [ ] Image optimization configured
- [ ] CDN configured for static assets
- [ ] Caching strategy implemented
- [ ] Connection pooling configured

---

### 13. Dependencies & Updates

- [ ] All dependencies up to date
- [ ] No known security vulnerabilities
- [ ] Dependency audit passed
- [ ] License compliance verified

```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update

# Check for outdated packages
pnpm outdated
```

---

### 14. Code Quality & Testing

- [ ] TypeScript strict mode enabled
- [ ] Linting passes without errors
- [ ] All tests passing
- [ ] Code coverage > 70% (if applicable)
- [ ] Security tests included
- [ ] Load testing performed
- [ ] Penetration testing completed (recommended)

```bash
# Run linting
pnpm lint

# Run tests
pnpm test

# Build for production
pnpm build
```

---

### 15. Infrastructure

- [ ] HTTPS enabled with valid SSL certificate
- [ ] SSL certificate auto-renewal configured
- [ ] Firewall configured (only necessary ports open)
- [ ] DDoS protection configured
- [ ] Load balancer configured (if needed)
- [ ] Auto-scaling configured (if applicable)
- [ ] Geographic redundancy (if applicable)

---

### 16. Mental Health Platform Specific

#### HIPAA Compliance (if applicable)
- [ ] PHI (Protected Health Information) encrypted
- [ ] Access controls for patient data
- [ ] Audit trail for PHI access
- [ ] Business Associate Agreements signed
- [ ] Breach notification procedure documented
- [ ] Patient data segregation implemented

#### Clinical Safety
- [ ] SOS/Emergency contact feature tested
- [ ] Crisis intervention resources available
- [ ] Patient-psychologist matching verified
- [ ] Session scheduling validated
- [ ] Video call security verified (if applicable)

---

### 17. Documentation

- [ ] API documentation updated
- [ ] README.md updated with production instructions
- [ ] SECURITY.md created with security policies
- [ ] Environment variable documentation complete
- [ ] Deployment runbook created
- [ ] Incident response plan documented
- [ ] On-call rotation defined

---

### 18. Legal & Compliance

- [ ] Privacy policy reviewed by legal
- [ ] Terms of service reviewed
- [ ] LGPD compliance verified (Brazil)
- [ ] GDPR compliance verified (EU users)
- [ ] HIPAA compliance verified (if applicable)
- [ ] Data retention policies defined
- [ ] Data deletion procedures documented

---

### 19. Third-Party Services

- [ ] All API keys rotated for production
- [ ] Service quotas/limits verified
- [ ] Webhook endpoints secured
- [ ] Third-party service status pages monitored
- [ ] Fallback plans for service outages

#### Services to Verify
- [ ] Pusher (real-time)
- [ ] Stripe (payments)
- [ ] Resend (email)
- [ ] Twilio (SMS)
- [ ] Cloudflare R2 (storage)
- [ ] Sentry (errors)

---

### 20. Final Pre-Deployment Checks

- [ ] Production database seeded with initial data
- [ ] Admin accounts created
- [ ] DNS records configured
- [ ] Email deliverability tested
- [ ] SMS delivery tested
- [ ] Payment processing tested (with test cards)
- [ ] All features tested in production-like environment
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled (if needed)

---

## Deployment Process

### 1. Pre-Deployment
```bash
# 1. Ensure all tests pass
pnpm test

# 2. Build for production
pnpm build

# 3. Run security audit
pnpm audit

# 4. Validate environment
pnpm tsx -e "import { validateEnv } from './lib/secrets'; validateEnv()"
```

### 2. Database Migration
```bash
# 1. Create backup
pg_dump $POSTGRES_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migrations
pnpm db:migrate

# 3. Verify migration
psql $POSTGRES_URL -c "SELECT * FROM drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

### 3. Deploy Application
```bash
# Using Vercel
vercel --prod

# Or using your deployment method
pnpm start
```

### 4. Post-Deployment Verification
```bash
# 1. Check application health
curl https://your-domain.com/api/health

# 2. Verify database connectivity
curl https://your-domain.com/api/health/db

# 3. Check error monitoring
# Visit Sentry dashboard

# 4. Monitor logs
# Check application logs for errors
```

---

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all critical features working
- [ ] Monitor database performance
- [ ] Check security event logs
- [ ] Verify backup creation

### First Week
- [ ] Review usage patterns
- [ ] Optimize slow queries
- [ ] Address any user-reported issues
- [ ] Review security logs
- [ ] Verify monitoring alerts working

---

## Rollback Procedure

If issues are detected:

1. **Immediate Actions**
   - Put application in maintenance mode
   - Notify team and stakeholders
   - Assess severity and impact

2. **Database Rollback**
   ```bash
   # Restore from backup
   psql $POSTGRES_URL < backup_[timestamp].sql
   ```

3. **Application Rollback**
   ```bash
   # Revert to previous deployment
   vercel rollback
   ```

4. **Post-Rollback**
   - Verify application functioning
   - Investigate root cause
   - Document incident
   - Plan remediation

---

## Security Incident Response

If a security incident is detected:

1. **Containment**
   - Isolate affected systems
   - Revoke compromised credentials
   - Block suspicious IPs

2. **Investigation**
   - Review audit logs
   - Identify scope of breach
   - Collect evidence

3. **Notification**
   - Notify affected users (as required by law)
   - Report to authorities (if required)
   - Document incident

4. **Recovery**
   - Implement fixes
   - Rotate all secrets
   - Strengthen security measures

---

## Contacts

**Technical Lead**: [Name] - [Email]
**Security Team**: [Email]
**On-Call**: [Phone/Pager]
**Legal**: [Contact]

---

## Sign-off

Deployment approved by:

- [ ] Technical Lead: ________________ Date: ________
- [ ] Security Officer: ________________ Date: ________
- [ ] Product Manager: ________________ Date: ________

---

**Last Updated**: [Date]
**Next Review**: [Date]
