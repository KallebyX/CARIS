# Security Policy

## Overview

CÁRIS is a mental health platform that handles sensitive patient information. Security and privacy are our top priorities. This document outlines our security practices, compliance measures, and vulnerability reporting procedures.

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Data Protection](#data-protection)
3. [Authentication & Authorization](#authentication--authorization)
4. [API Security](#api-security)
5. [Compliance](#compliance)
6. [Vulnerability Reporting](#vulnerability-reporting)
7. [Security Best Practices](#security-best-practices)
8. [Incident Response](#incident-response)

---

## Security Architecture

### Defense in Depth

CÁRIS implements multiple layers of security:

1. **Network Layer**
   - HTTPS/TLS encryption for all traffic
   - DDoS protection via Cloudflare
   - Firewall rules limiting access
   - WAF (Web Application Firewall) rules

2. **Application Layer**
   - Security headers (CSP, HSTS, X-Frame-Options)
   - CSRF protection
   - XSS prevention via input sanitization
   - SQL injection prevention via parameterized queries
   - Rate limiting on all endpoints

3. **Data Layer**
   - Encryption at rest for sensitive data
   - Database access controls
   - Regular backups with encryption
   - Audit logging for all data access

### Security Components

```
┌─────────────────────────────────────────────────────┐
│                   Client Browser                     │
│  • CSP Headers  • CSRF Tokens  • Secure Cookies     │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS/TLS
┌───────────────────▼─────────────────────────────────┐
│               Security Middleware                    │
│  • Header Validation  • Rate Limiting  • CORS       │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│            Authentication Layer                      │
│  • JWT Validation  • Session Management             │
│  • 2FA (optional)  • Device Fingerprinting          │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│            Authorization Layer                       │
│  • Role-Based Access Control (RBAC)                 │
│  • Row-Level Security (RLS)                         │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│              Business Logic                          │
│  • Input Validation (Zod)  • Sanitization           │
│  • Audit Logging  • Error Handling                  │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│                 Database                             │
│  • Encrypted Connections  • Prepared Statements     │
│  • Connection Pooling  • Query Timeouts             │
└─────────────────────────────────────────────────────┘
```

---

## Data Protection

### Encryption

#### Data in Transit
- **TLS 1.3** for all HTTPS connections
- Certificate pinning for mobile apps (if applicable)
- Perfect Forward Secrecy (PFS) enabled

#### Data at Rest
- **AES-256-GCM** encryption for sensitive fields
- Database-level encryption for PostgreSQL
- Encrypted backups
- Secure key management

#### End-to-End Encryption
- Chat messages encrypted client-side
- Encryption keys derived from user passwords (optional)
- Zero-knowledge architecture for sensitive communications

### Data Classification

| Classification | Examples | Protection |
|---------------|----------|------------|
| **Public** | Marketing content, blog posts | Standard HTTPS |
| **Internal** | User names, emails | HTTPS + Access controls |
| **Confidential** | Session notes, diary entries | Encrypted at rest + strict access |
| **Restricted** | Payment info, medical records | E2E encryption + audit logging |

### Data Minimization

- Only collect necessary data
- Implement data retention policies
- Automatic deletion of expired data
- User-controlled data deletion

---

## Authentication & Authorization

### Authentication Methods

1. **Email/Password**
   - Passwords hashed with bcrypt (12 rounds)
   - Minimum password requirements enforced
   - Password strength meter
   - Breach detection via HaveIBeenPwned API

2. **JWT Tokens**
   - HS256 algorithm
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days)
   - Token rotation on use
   - Secure HTTP-only cookies

3. **Session Management**
   - Session fixation prevention
   - Concurrent session limits
   - Device fingerprinting
   - Suspicious login detection

4. **Two-Factor Authentication (Optional)**
   - TOTP (Time-based One-Time Password)
   - SMS verification
   - Backup codes

### Authorization

#### Role-Based Access Control (RBAC)

```typescript
Roles:
- patient: Can access own data, schedule sessions
- psychologist: Can access assigned patients' data, manage sessions
- admin: Full system access

Permissions:
- read:own_profile
- read:own_sessions
- read:patient_data (psychologist only)
- write:session_notes (psychologist only)
- admin:* (admin only)
```

#### Row-Level Security (RLS)

- Database-level access control
- Users can only access their own data
- Psychologists can access assigned patients
- Admins have elevated permissions

---

## API Security

### Rate Limiting

All API endpoints are rate-limited to prevent abuse:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Read Operations | 100 requests | 1 minute |
| Write Operations | 30 requests | 1 minute |
| File Uploads | 10 uploads | 5 minutes |
| Sensitive Operations | 5 requests | 1 minute |

### Input Validation

- **Zod schemas** for all API inputs
- Type checking at runtime
- Sanitization of HTML/JavaScript
- Path traversal prevention
- SQL injection prevention

### Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(self), geolocation=()
```

### CORS Configuration

- Whitelist-based origin validation
- Credentials allowed only for trusted domains
- Preflight caching enabled

---

## Compliance

### LGPD (Lei Geral de Proteção de Dados - Brazil)

CÁRIS complies with Brazilian data protection law:

- ✅ User consent management
- ✅ Right to access personal data
- ✅ Right to data portability
- ✅ Right to be forgotten
- ✅ Data breach notification
- ✅ Privacy policy transparency
- ✅ Data processing records

### GDPR (General Data Protection Regulation - EU)

For European users, CÁRIS provides:

- ✅ Lawful basis for processing
- ✅ Data subject rights
- ✅ Data Protection Officer (DPO) designated
- ✅ Privacy by design
- ✅ Data transfer safeguards

### HIPAA (Health Insurance Portability and Accountability Act - US)

For US patients, CÁRIS implements:

- ✅ PHI (Protected Health Information) encryption
- ✅ Access controls and audit trails
- ✅ Business Associate Agreements (BAA)
- ✅ Breach notification procedures
- ✅ Minimum necessary standard

### CFM Resolution (Conselho Federal de Medicina - Brazil)

Compliance with telemedicine regulations:

- ✅ Patient identification
- ✅ Informed consent
- ✅ Data confidentiality
- ✅ Professional responsibility
- ✅ Medical record keeping

---

## Vulnerability Reporting

### Responsible Disclosure

We appreciate security researchers who responsibly disclose vulnerabilities.

### How to Report

**Email**: security@caris.com.br
**PGP Key**: [Available on request]

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested mitigation (if any)

### What to Expect

1. **Acknowledgment**: Within 24 hours
2. **Initial Assessment**: Within 72 hours
3. **Regular Updates**: Every 7 days
4. **Resolution**: Timeline depends on severity

### Severity Classification

| Severity | Response Time | Examples |
|----------|--------------|----------|
| **Critical** | 24 hours | RCE, SQL injection, auth bypass |
| **High** | 3 days | XSS, CSRF, privilege escalation |
| **Medium** | 7 days | Information disclosure, DoS |
| **Low** | 14 days | Minor issues, best practice violations |

### Bug Bounty Program

We recognize and reward security researchers:
- Critical vulnerabilities: Up to R$5,000
- High severity: Up to R$2,000
- Medium severity: Up to R$500
- Honorable mentions for all valid reports

### Out of Scope

- Social engineering attacks
- Physical attacks
- DDoS attacks
- Spam/phishing
- Issues in third-party services
- Already known issues

---

## Security Best Practices

### For Developers

1. **Code Review**
   - All code reviewed before merge
   - Security-focused review for sensitive changes
   - Automated security scanning

2. **Dependencies**
   - Regular dependency updates
   - Automated vulnerability scanning
   - License compliance checking

3. **Secrets Management**
   - Never commit secrets to git
   - Use environment variables
   - Rotate secrets regularly
   - Use strong, random secrets

4. **Error Handling**
   - Never expose stack traces to users
   - Log errors securely
   - Use generic error messages

5. **Testing**
   - Unit tests for security functions
   - Integration tests for authentication
   - Security test suite
   - Regular penetration testing

### For Users

1. **Passwords**
   - Use strong, unique passwords
   - Enable two-factor authentication
   - Don't share passwords
   - Use password manager

2. **Account Security**
   - Review active sessions regularly
   - Report suspicious activity
   - Keep email secure
   - Log out from shared devices

3. **Data Privacy**
   - Review privacy settings
   - Understand data sharing
   - Request data export if needed
   - Exercise your rights (LGPD/GDPR)

---

## Incident Response

### Security Incident Process

```
1. Detection
   ↓
2. Containment
   ↓
3. Investigation
   ↓
4. Eradication
   ↓
5. Recovery
   ↓
6. Lessons Learned
```

### Incident Response Team

- **Security Lead**: Coordinates response
- **Technical Lead**: Implements fixes
- **Legal**: Ensures compliance
- **Communications**: Manages disclosure

### Data Breach Response

If a data breach occurs:

1. **Immediate Actions** (within 24 hours)
   - Contain the breach
   - Assess scope and impact
   - Notify security team

2. **Investigation** (within 72 hours)
   - Identify root cause
   - Determine data affected
   - Document timeline

3. **Notification**
   - Affected users (as required by law)
   - Data protection authority (within 72 hours under LGPD/GDPR)
   - Law enforcement (if criminal activity)

4. **Remediation**
   - Implement fixes
   - Strengthen security
   - Monitor for further issues

5. **Post-Incident**
   - Incident report
   - Lessons learned
   - Update security measures

---

## Security Audit Log

All security-relevant events are logged:

- Authentication attempts (success/failure)
- Authorization failures
- Data access (especially PHI)
- Data modifications
- Security configuration changes
- Suspicious activities

Logs are:
- Tamper-proof
- Retained for 7 years (compliance requirement)
- Encrypted at rest
- Monitored for anomalies

---

## Third-Party Security

### Vendor Assessment

All third-party services undergo security review:
- Data handling practices
- Compliance certifications
- Security incident history
- Data processing agreements

### Current Vendors

| Service | Purpose | Security Measures |
|---------|---------|------------------|
| Vercel | Hosting | SOC 2, ISO 27001 |
| Neon | Database | SOC 2, encryption |
| Pusher | Real-time | TLS, access controls |
| Stripe | Payments | PCI DSS Level 1 |
| Resend | Email | GDPR compliant |
| Sentry | Error tracking | Data scrubbing |

---

## Security Contacts

**General Security**: security@caris.com.br
**Data Protection Officer**: dpo@caris.com.br
**Emergency**: [Phone number for critical issues]

**Office Hours**: Mon-Fri, 9:00-18:00 (BRT)
**Emergency Response**: 24/7 for critical security issues

---

## Updates

This security policy is reviewed and updated quarterly.

**Last Updated**: 2025-01-12
**Next Review**: 2025-04-12
**Version**: 1.0

---

## Acknowledgments

We thank the security researchers who have responsibly disclosed vulnerabilities:

[List will be maintained here]

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [LGPD Compliance Guide](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [GDPR Official Text](https://gdpr-info.eu/)

---

**For questions or concerns about this security policy, please contact**: security@caris.com.br
