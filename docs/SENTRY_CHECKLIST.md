# Sentry Integration Checklist

Use this checklist to ensure complete Sentry integration for CÁRIS SaaS Pro.

## Pre-Integration Checklist

- [ ] Sentry account created at [sentry.io](https://sentry.io)
- [ ] Sentry organization created
- [ ] Sentry project created (Platform: Next.js)
- [ ] DSN obtained from Sentry project settings
- [ ] Auth token generated with required scopes
- [ ] Team notified about new monitoring setup

## Configuration Checklist

### Environment Variables

- [ ] `SENTRY_DSN` added to `.env.local`
- [ ] `NEXT_PUBLIC_SENTRY_DSN` added to `.env.local`
- [ ] `SENTRY_ORG` configured
- [ ] `SENTRY_PROJECT` configured
- [ ] `SENTRY_AUTH_TOKEN` configured
- [ ] `NEXT_PUBLIC_ENVIRONMENT` set correctly
- [ ] Same variables added to production environment (Vercel/etc.)

### Files Verification

#### Core Configuration
- [x] `/sentry.client.config.ts` - Client-side Sentry configuration
- [x] `/sentry.server.config.ts` - Server-side Sentry configuration
- [x] `/instrumentation.ts` - Next.js instrumentation hook
- [x] `/next.config.js` - Updated with Sentry webpack plugin

#### Utilities & Helpers
- [x] `/lib/sentry-helpers.ts` - Sentry helper functions
- [x] `/lib/error-tracking.ts` - Custom error tracking
- [x] `/lib/sentry-performance.ts` - Performance monitoring
- [x] `/lib/logger.ts` - Structured logging

#### Components
- [x] `/components/error-boundary.tsx` - React error boundary

#### API & Monitoring
- [x] `/app/api/health/route.ts` - Enhanced health check
- [x] `/app/admin/monitoring/page.tsx` - Monitoring dashboard

#### Documentation
- [x] `/docs/SENTRY_SETUP.md` - Setup guide
- [x] `/docs/MONITORING_ALERTS.md` - Alert configuration
- [x] `/docs/SENTRY_INTEGRATION.md` - Integration overview
- [x] `/docs/SENTRY_CHECKLIST.md` - This file

#### Environment Files
- [x] `.env.production` - Updated with Sentry variables

## Development Environment Setup

- [ ] Install dependencies: `npm install` (already done)
- [ ] Configure `.env.local` with Sentry variables
- [ ] Start development server: `npm run dev`
- [ ] Navigate to `/test-sentry` (create test page)
- [ ] Trigger test error
- [ ] Verify error appears in Sentry dashboard
- [ ] Check console for Sentry initialization logs

## Testing Checklist

### Error Tracking
- [ ] Test uncaught exception
- [ ] Test promise rejection
- [ ] Test React component error
- [ ] Test API error
- [ ] Test database error
- [ ] Verify errors appear in Sentry
- [ ] Verify error grouping works
- [ ] Verify source maps work (stack traces readable)

### Performance Monitoring
- [ ] Test API endpoint tracing
- [ ] Test database query tracing
- [ ] Test custom transaction
- [ ] Verify transactions appear in Sentry Performance tab
- [ ] Check transaction details and spans

### Session Replay
- [ ] Trigger error while using the app
- [ ] Verify session replay recorded
- [ ] Check that sensitive data is masked
- [ ] Verify replay playback works

### Health Monitoring
- [ ] Access `/api/health`
- [ ] Verify response includes all health checks
- [ ] Test with database disconnected (if possible)
- [ ] Verify degraded status returned
- [ ] Check health metrics in response

### Monitoring Dashboard
- [ ] Access `/admin/monitoring`
- [ ] Verify dashboard loads
- [ ] Check real-time health status
- [ ] Verify all tabs work (Services, Checks, System, Sentry)
- [ ] Test refresh functionality

### Custom Metrics
- [ ] Track custom counter
- [ ] Track custom gauge
- [ ] Track custom distribution
- [ ] Verify metrics appear in Sentry

### Logging
- [ ] Test different log levels (debug, info, warn, error, fatal)
- [ ] Verify errors logged to Sentry
- [ ] Check structured log format
- [ ] Test request/user context logging

## Production Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured in production
- [ ] Source maps upload configured
- [ ] Sampling rates optimized for production
- [ ] PII scrubbing verified
- [ ] Team trained on monitoring dashboard

### Deployment
- [ ] Deploy to production
- [ ] Verify build logs show "Source maps uploaded to Sentry"
- [ ] Check no Sentry errors in deployment logs
- [ ] Verify application starts successfully

### Post-Deployment
- [ ] Access production health check: `https://yourdomain.com/api/health`
- [ ] Verify health status is "healthy"
- [ ] Trigger test error in production (controlled test)
- [ ] Verify error appears in Sentry
- [ ] Check source maps work (readable stack traces)
- [ ] Verify session replay works
- [ ] Check performance transactions appearing
- [ ] Test monitoring dashboard in production

## Alert Configuration Checklist

### Sentry Alert Rules
- [ ] Create "Critical Errors" alert rule
- [ ] Create "New Error Detected" alert rule
- [ ] Create "Error Regression" alert rule
- [ ] Create "High Volume" alert rule
- [ ] Create "Slow API Responses" metric alert
- [ ] Create "Error Rate Spike" metric alert
- [ ] Create "Slow Database Queries" metric alert

### Notification Channels
- [ ] Configure Slack integration
- [ ] Set up Slack channels (#alerts-critical, #alerts-errors, etc.)
- [ ] Configure email notifications
- [ ] Set up PagerDuty (if using)
- [ ] Test each notification channel

### Alert Routing
- [ ] Configure alert routing by severity
- [ ] Set up on-call rotation
- [ ] Document escalation policy
- [ ] Create runbooks for common alerts

## Monitoring & Maintenance Checklist

### Daily
- [ ] Check for critical alerts
- [ ] Review error dashboard
- [ ] Monitor performance metrics

### Weekly
- [ ] Review all alerts triggered
- [ ] Check alert thresholds
- [ ] Review error trends
- [ ] Update runbooks if needed

### Monthly
- [ ] Full monitoring system review
- [ ] Audit notification channels
- [ ] Review sampling rates
- [ ] Check Sentry quota usage
- [ ] Team training/refresher

### Quarterly
- [ ] Complete monitoring audit
- [ ] Update documentation
- [ ] Review and update SLAs
- [ ] Test disaster recovery

## Documentation Checklist

- [x] Setup guide created
- [x] Alert configuration documented
- [x] Integration overview documented
- [x] Checklist created
- [ ] Team training completed
- [ ] Runbooks created for common issues
- [ ] README updated with monitoring info

## Team Training Checklist

- [ ] Sentry dashboard access provided to team
- [ ] Team trained on monitoring dashboard
- [ ] Team trained on alert response
- [ ] Runbooks shared with team
- [ ] On-call rotation configured
- [ ] Emergency procedures documented

## Compliance Checklist

### Privacy
- [ ] PII scrubbing verified
- [ ] Session replay masking verified
- [ ] No patient data sent to Sentry
- [ ] Data retention policy configured
- [ ] GDPR compliance verified (if applicable)
- [ ] HIPAA compliance verified (if applicable)

### Security
- [ ] Sentry auth token secured
- [ ] Environment variables not in git
- [ ] Access controls configured
- [ ] Audit logging enabled
- [ ] Security alerts configured

## Success Criteria

Your Sentry integration is complete when:

- ✅ Errors are automatically tracked and reported
- ✅ Performance is monitored for all critical endpoints
- ✅ Health checks run and report status
- ✅ Alerts are configured and notifications work
- ✅ Team has access and is trained
- ✅ Documentation is complete and up to date
- ✅ Source maps work in production
- ✅ PII is properly scrubbed
- ✅ Monitoring dashboard is accessible
- ✅ All tests pass

## Common Issues & Solutions

### Issue: Events not appearing in Sentry
**Solution**:
- Check DSN configuration
- Verify environment is not "development"
- Check browser console for Sentry errors

### Issue: Source maps not working
**Solution**:
- Verify `SENTRY_AUTH_TOKEN` is set
- Check build logs for upload confirmation
- Verify release name matches

### Issue: Too many events (quota exceeded)
**Solution**:
- Reduce sampling rates
- Add more error filters
- Use `beforeSend` to filter events

### Issue: Alerts not firing
**Solution**:
- Verify alert rules are enabled
- Check notification integrations
- Test notification channels manually

## Next Steps

After completing this checklist:

1. Monitor Sentry dashboard for first few days
2. Adjust alert thresholds based on actual traffic
3. Create runbooks for common issues
4. Set up dashboards for key metrics
5. Schedule regular monitoring reviews

## Resources

- [Sentry Setup Guide](./SENTRY_SETUP.md)
- [Monitoring Alerts Guide](./MONITORING_ALERTS.md)
- [Integration Overview](./SENTRY_INTEGRATION.md)
- [Sentry Documentation](https://docs.sentry.io/)
- [Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

## Support

Need help? Contact:
- DevOps Team: devops@caris.com
- Sentry Support: support@sentry.io (if on paid plan)
- Documentation: See `/docs` folder

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
