# Security Testing Checklist for CÁRIS Platform

## Last Updated: 2024-11-12

---

## 1. Authentication & Authorization

### Authentication Testing
- [ ] Test JWT token generation and validation
- [ ] Verify token expiration works correctly
- [ ] Test refresh token mechanism
- [ ] Verify password hashing (bcrypt) strength
- [ ] Test account lockout after failed login attempts
- [ ] Verify session management and timeout
- [ ] Test "Remember Me" functionality security
- [ ] Verify multi-device login handling
- [ ] Test logout functionality clears all session data
- [ ] Verify password reset flow security

### Authorization Testing
- [ ] Test role-based access control (patient, psychologist, admin)
- [ ] Verify patients can only access their own data
- [ ] Verify psychologists can only access assigned patients
- [ ] Test admin privilege escalation prevention
- [ ] Verify API endpoint authorization checks
- [ ] Test resource-level permissions
- [ ] Verify clinic-scoped data access
- [ ] Test cross-tenant data isolation

**Tools:** Manual testing, Postman, JWT.io

---

## 2. Input Validation & Injection Prevention

### SQL Injection Testing
- [ ] Test all database queries with malicious input
- [ ] Verify parameterized queries are used everywhere
- [ ] Test search functionality with SQL keywords
- [ ] Verify ORM (Drizzle) prevents injection
- [ ] Test diary entry content with SQL injection attempts
- [ ] Test chat messages with SQL injection payloads

### XSS (Cross-Site Scripting) Testing
- [ ] Test all text inputs with XSS payloads
- [ ] Verify HTML escaping in diary entries
- [ ] Test chat messages with script tags
- [ ] Verify React's built-in XSS protection
- [ ] Test rich text editor sanitization
- [ ] Verify URL parameter XSS prevention
- [ ] Test stored XSS in user profiles
- [ ] Test reflected XSS in search results

### Command Injection Testing
- [ ] Test file upload filename handling
- [ ] Verify no shell commands are executed with user input
- [ ] Test API calls to external services

### Path Traversal Testing
- [ ] Test file download endpoints
- [ ] Verify file upload path restrictions
- [ ] Test backup/export file access
- [ ] Test avatar/image upload paths

**Test Payloads:**
```
SQL: ' OR '1'='1'; DROP TABLE users; --
XSS: <script>alert('XSS')</script>
XSS: <img src=x onerror=alert('XSS')>
Path: ../../etc/passwd
Command: ; ls -la
```

**Tools:** OWASP ZAP, Burp Suite, SQLMap

---

## 3. Authentication Bypass & Session Management

### Session Security
- [ ] Test session fixation vulnerabilities
- [ ] Verify session regeneration after login
- [ ] Test concurrent session handling
- [ ] Verify secure cookie flags (HttpOnly, Secure, SameSite)
- [ ] Test session hijacking prevention
- [ ] Verify session data encryption
- [ ] Test session timeout implementation

### Authentication Bypass
- [ ] Test direct object reference vulnerabilities
- [ ] Verify API authentication on all endpoints
- [ ] Test authentication bypass via parameter manipulation
- [ ] Test forced browsing to restricted pages
- [ ] Verify middleware authentication checks

**Tools:** Burp Suite, OWASP ZAP

---

## 4. Sensitive Data Exposure

### Data Encryption
- [ ] Verify passwords are hashed (never stored in plaintext)
- [ ] Test database encryption at rest
- [ ] Verify HTTPS/TLS for all communications
- [ ] Test chat message encryption
- [ ] Verify API keys are not exposed in client code
- [ ] Test sensitive data in logs (should be redacted)
- [ ] Verify JWT tokens don't contain sensitive data
- [ ] Test file encryption for uploaded content

### Information Disclosure
- [ ] Test error messages don't reveal system info
- [ ] Verify stack traces are not exposed to users
- [ ] Test API responses don't leak sensitive data
- [ ] Verify source maps are not accessible in production
- [ ] Test metadata in exported files
- [ ] Verify database connection strings are secure

### GDPR/LGPD Compliance
- [ ] Test data export functionality
- [ ] Verify right to be forgotten (data deletion)
- [ ] Test consent management
- [ ] Verify audit logging for data access
- [ ] Test data anonymization features
- [ ] Verify personal data inventory

**Tools:** SSL Labs, SecurityHeaders.com, Nmap

---

## 5. API Security

### API Authentication
- [ ] Test all API endpoints require authentication
- [ ] Verify Bearer token validation
- [ ] Test API key management (if applicable)
- [ ] Test OAuth integration security

### API Rate Limiting
- [ ] Test rate limiting implementation
- [ ] Verify rate limits per user/IP
- [ ] Test rate limit bypass attempts
- [ ] Verify appropriate 429 responses
- [ ] Test distributed rate limiting

### API Input Validation
- [ ] Test all endpoints with invalid data types
- [ ] Verify JSON parsing security
- [ ] Test file upload size limits
- [ ] Verify content-type validation
- [ ] Test parameter pollution attacks

### API Response Security
- [ ] Verify consistent error handling
- [ ] Test CORS configuration
- [ ] Verify no sensitive data in error responses
- [ ] Test proper HTTP status codes

**Tools:** Postman, Burp Suite, OWASP ZAP

---

## 6. File Upload Security

### Upload Validation
- [ ] Test file type validation (whitelist approach)
- [ ] Verify file size limits
- [ ] Test malicious file upload (exe, php, jsp)
- [ ] Verify filename sanitization
- [ ] Test double extension bypass (file.jpg.php)
- [ ] Verify MIME type checking
- [ ] Test ZIP bomb/decompression bomb
- [ ] Verify antivirus scanning integration

### File Storage Security
- [ ] Verify uploaded files are stored securely
- [ ] Test direct file access prevention
- [ ] Verify file encryption at rest
- [ ] Test file download authorization
- [ ] Verify metadata stripping from images

**Malicious Files to Test:**
- Executable files (.exe, .bat, .sh)
- Server-side scripts (.php, .jsp, .asp)
- SVG with embedded JavaScript
- HTML files with scripts
- Office documents with macros

**Tools:** Metasploit, Custom scripts

---

## 7. CSRF (Cross-Site Request Forgery)

### CSRF Protection
- [ ] Verify CSRF tokens on all state-changing operations
- [ ] Test CSRF token validation
- [ ] Verify SameSite cookie attribute
- [ ] Test referer header validation (as backup)
- [ ] Test CSRF on critical operations (payment, profile update)

**Tools:** Burp Suite, OWASP ZAP

---

## 8. Business Logic Vulnerabilities

### Payment Security
- [ ] Test price manipulation in checkout
- [ ] Verify subscription plan validation
- [ ] Test payment amount tampering
- [ ] Verify refund authorization
- [ ] Test race conditions in payment processing

### Gamification Security
- [ ] Test XP/points manipulation
- [ ] Verify achievement unlock validation
- [ ] Test leaderboard tampering
- [ ] Verify streak calculation integrity

### Session Booking Logic
- [ ] Test double-booking prevention
- [ ] Verify scheduling conflict detection
- [ ] Test session cancellation rules
- [ ] Verify psychologist availability logic

### Privilege Escalation
- [ ] Test patient → psychologist escalation
- [ ] Test psychologist → admin escalation
- [ ] Verify role change validation
- [ ] Test clinic permission boundaries

**Tools:** Manual testing, Burp Suite

---

## 9. Real-time Communication Security

### WebSocket Security
- [ ] Verify Pusher authentication
- [ ] Test channel authorization
- [ ] Verify message encryption
- [ ] Test message injection
- [ ] Verify rate limiting on messages

### Chat Security
- [ ] Test message access control
- [ ] Verify chat room isolation
- [ ] Test file sharing security
- [ ] Verify message deletion works properly
- [ ] Test chat encryption implementation

**Tools:** WebSocket testing tools, Browser DevTools

---

## 10. Third-Party Integration Security

### External Services
- [ ] Verify Stripe webhook signature validation
- [ ] Test Google Calendar API authentication
- [ ] Verify Outlook Calendar security
- [ ] Test OpenAI API key protection
- [ ] Verify Twilio SMS security
- [ ] Test Resend email security

### API Keys & Secrets
- [ ] Verify all secrets in environment variables
- [ ] Test .env file is not accessible
- [ ] Verify no hardcoded credentials
- [ ] Test API key rotation process

**Tools:** git-secrets, truffleHog

---

## 11. Infrastructure Security

### Server Security
- [ ] Verify HTTPS is enforced
- [ ] Test TLS configuration (TLS 1.2+)
- [ ] Verify security headers (CSP, X-Frame-Options, etc.)
- [ ] Test subdomain takeover prevention
- [ ] Verify DDoS protection

### Database Security
- [ ] Test database access controls
- [ ] Verify connection string security
- [ ] Test backup encryption
- [ ] Verify database user permissions
- [ ] Test SQL injection at DB level

### Cloud Security (Vercel/AWS/Cloudflare)
- [ ] Verify IAM roles and policies
- [ ] Test bucket permissions (S3/R2)
- [ ] Verify CDN security settings
- [ ] Test serverless function security

**Tools:** SSL Labs, SecurityHeaders.com, Nmap

---

## 12. Monitoring & Incident Response

### Security Monitoring
- [ ] Verify Sentry error tracking is configured
- [ ] Test audit logging for sensitive operations
- [ ] Verify failed login attempt logging
- [ ] Test suspicious activity detection
- [ ] Verify alert mechanisms for security events

### Incident Response
- [ ] Document security incident response plan
- [ ] Test data breach notification procedures
- [ ] Verify backup and recovery processes
- [ ] Test rollback procedures

**Tools:** Sentry, CloudWatch, Custom monitoring

---

## 13. Mobile/PWA Security

### PWA Security
- [ ] Test service worker security
- [ ] Verify manifest.json configuration
- [ ] Test offline data security
- [ ] Verify push notification security
- [ ] Test app installation security

---

## 14. Compliance & Regulations

### HIPAA Compliance (if applicable)
- [ ] Verify PHI encryption
- [ ] Test access controls
- [ ] Verify audit logs
- [ ] Test breach notification procedures

### LGPD/GDPR Compliance
- [ ] Verify consent management
- [ ] Test right to access
- [ ] Test right to deletion
- [ ] Verify data portability
- [ ] Test privacy policy accessibility

---

## Security Testing Schedule

### Pre-Release
- [ ] Run automated security scans
- [ ] Perform manual penetration testing
- [ ] Review security checklist
- [ ] Fix all critical/high vulnerabilities
- [ ] Document findings and remediations

### Monthly
- [ ] Review audit logs
- [ ] Update dependencies (npm audit)
- [ ] Review security alerts
- [ ] Test backup restoration

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing by external team
- [ ] Review and update security policies
- [ ] Security training for team

---

## Automated Security Tools

### Recommended Tools
1. **OWASP ZAP** - Automated vulnerability scanner
2. **Burp Suite** - Web security testing
3. **npm audit** - Dependency vulnerability scanning
4. **Snyk** - Continuous security monitoring
5. **SonarQube** - Code quality and security
6. **git-secrets** - Prevent secret commits
7. **ESLint security plugins** - Static analysis

### CI/CD Integration
```bash
# Add to GitHub Actions
- npm audit --audit-level=high
- snyk test
- OWASP dependency check
```

---

## Critical Vulnerabilities - Immediate Action Required

If any of these are found, **DO NOT DEPLOY** until fixed:

1. ❌ Authentication bypass
2. ❌ SQL injection vulnerability
3. ❌ XSS in critical areas (admin panel, chat)
4. ❌ Exposed API keys or credentials
5. ❌ Unencrypted sensitive data storage
6. ❌ Missing authorization checks on critical endpoints
7. ❌ Payment manipulation vulnerabilities
8. ❌ Remote code execution
9. ❌ Privilege escalation

---

## Sign-off

**Security Reviewed By:** ___________________
**Date:** ___________________
**Status:** ⬜ PASSED  ⬜ FAILED  ⬜ WITH CONDITIONS

**Notes:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
