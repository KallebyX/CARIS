# Known Issues - CÁRIS Platform

**Version:** 1.0.0
**Last Updated:** 2024-11-12

This document tracks known limitations, bugs, and issues in the CÁRIS platform that are documented but not yet resolved. These issues are being monitored and will be addressed in future releases.

---

## Critical Issues 🔴

**No critical issues at this time.**

---

## High Priority Issues 🟠

### AUTH-001: Account Lockout Not Implemented
**Status:** Not Implemented
**Priority:** High
**Impact:** Security
**Affected Components:** Authentication system

**Description:**
The system does not currently implement automatic account lockout after repeated failed login attempts. This could make accounts vulnerable to brute-force attacks.

**Workaround:**
Rate limiting is in place at the API level (100 requests/minute), which provides some protection against brute-force attacks.

**Planned Fix:**
Version 1.1.0 (Planned for Q1 2025)

**Tracking Issue:** #AUTH-001

---

### NOTIF-001: Email Notification Delays
**Status:** In Progress
**Priority:** High
**Impact:** User Experience
**Affected Components:** Notification system

**Description:**
Some users experience delays (up to 5 minutes) in receiving email notifications for session reminders and clinical alerts during peak hours.

**Root Cause:**
Email queue processing bottleneck during high-traffic periods.

**Workaround:**
- SMS notifications work reliably and can be used as backup
- Push notifications are instant and recommended for time-sensitive alerts

**Planned Fix:**
- Implement Redis-based queue system
- Scale email processing workers
- Target: Version 1.0.1 (December 2024)

**Tracking Issue:** #NOTIF-001

---

### PERF-001: Dashboard Load Time on Mobile
**Status:** Investigating
**Priority:** High
**Impact:** Performance, Mobile UX
**Affected Components:** Patient dashboard, Psychologist dashboard

**Description:**
Dashboard initial load time on mobile devices (especially iOS Safari) can exceed 3 seconds on slower networks (3G).

**Metrics:**
- Desktop: 1.2s average
- Mobile (4G): 2.1s average
- Mobile (3G): 3.8s average ⚠️

**Workaround:**
- Use WiFi connection when possible
- Dashboard data is cached after first load

**Planned Fix:**
- Implement progressive loading strategy
- Reduce initial bundle size
- Add skeleton screens for better perceived performance
- Target: Version 1.0.2 (January 2025)

**Tracking Issue:** #PERF-001

---

## Medium Priority Issues 🟡

### UI-001: Calendar Sync Occasionally Fails
**Status:** Under Investigation
**Priority:** Medium
**Impact:** Session Management
**Affected Components:** Google Calendar, Outlook Calendar integration

**Description:**
Approximately 2% of calendar sync operations fail with "token refresh error". Users need to reconnect their calendar.

**Frequency:** Intermittent (2% of operations)

**Workaround:**
1. Go to Settings → Integrations
2. Disconnect calendar
3. Reconnect calendar
4. Re-sync events

**Root Cause:**
OAuth token refresh mechanism needs improvement for edge cases where tokens expire during API calls.

**Planned Fix:**
Version 1.0.1 (December 2024)

**Tracking Issue:** #UI-001

---

### AI-001: AI Analysis Timeout on Very Long Diary Entries
**Status:** Known Limitation
**Priority:** Medium
**Impact:** AI Analysis
**Affected Components:** Diary AI analysis

**Description:**
Diary entries longer than 5000 characters may timeout during AI analysis, resulting in incomplete emotional analysis.

**Frequency:** Rare (< 1% of diary entries)

**Workaround:**
Split very long entries into multiple shorter entries.

**Planned Fix:**
- Implement chunking for long text analysis
- Increase timeout limits
- Add progress indicator for long-running analysis
- Target: Version 1.1.0 (Q1 2025)

**Tracking Issue:** #AI-001

---

### CHAT-001: File Upload Progress Not Shown
**Status:** Enhancement Needed
**Priority:** Medium
**Impact:** User Experience
**Affected Components:** Chat file attachments

**Description:**
When uploading files in chat, there is no progress indicator. Users don't know if large files (> 2MB) are still uploading or if upload failed.

**Workaround:**
Wait patiently. Files up to 10MB are supported but may take 10-20 seconds on slower connections.

**Planned Fix:**
Add upload progress bar with percentage and cancel button.
Target: Version 1.0.2 (January 2025)

**Tracking Issue:** #CHAT-001

---

### MOBILE-001: PWA Offline Mode Limited
**Status:** Known Limitation
**Priority:** Medium
**Impact:** Offline Usage
**Affected Components:** Progressive Web App

**Description:**
Offline mode only caches recently viewed pages. Features requiring real-time data (chat, session booking) don't work offline.

**Workaround:**
Stay connected to internet for full functionality. Basic browsing of previously loaded content works offline.

**Planned Fix:**
- Expand offline cache strategy
- Add offline indicators
- Queue actions for sync when back online
- Target: Version 2.0.0 (Q2 2025)

**Tracking Issue:** #MOBILE-001

---

## Low Priority Issues 🟢

### UI-002: Date Picker Issues on Safari < 16
**Status:** Known Limitation
**Priority:** Low
**Impact:** User Experience
**Affected Components:** Date picker components

**Description:**
Custom date picker styling may not display correctly on Safari versions older than 16.

**Affected Versions:** Safari 15 and older

**Workaround:**
Update to Safari 16+ or use Chrome/Firefox. Functionality still works, just styling is affected.

**Planned Fix:**
Add polyfill for older Safari versions or accept limitation (< 1% of users).

**Tracking Issue:** #UI-002

---

### DASH-001: Mood Chart Doesn't Update Real-time
**Status:** By Design
**Priority:** Low
**Impact:** User Experience
**Affected Components:** Dashboard mood chart

**Description:**
Mood chart on dashboard requires page refresh to show newly added mood entries.

**Workaround:**
Refresh the page to see updated chart.

**Planned Fix:**
Implement real-time chart updates using WebSocket.
Target: Version 1.2.0 (Q2 2025)

**Tracking Issue:** #DASH-001

---

### EXPORT-001: Data Export Only Supports JSON
**Status:** Enhancement Requested
**Priority:** Low
**Impact:** User Experience
**Affected Components:** Data export feature

**Description:**
Users can only export their data in JSON format. CSV and PDF formats not yet available.

**Workaround:**
Use JSON export and convert using external tools if needed.

**Planned Fix:**
Add CSV and PDF export options.
Target: Version 1.3.0 (Q3 2025)

**Tracking Issue:** #EXPORT-001

---

## Browser-Specific Issues 🌐

### Chrome
- **CHROME-001:** Autofill occasionally doesn't work on login form
  - Status: Investigating
  - Workaround: Manually type credentials or use password manager

### Safari
- **SAFARI-001:** Push notifications require two permission prompts
  - Status: Known iOS limitation
  - Workaround: Accept both prompts to enable notifications

### Firefox
- **FIREFOX-001:** WebSocket reconnection takes longer (5-10 seconds)
  - Status: Under investigation
  - Workaround: Refresh page if chat messages are delayed

---

## Device-Specific Issues 📱

### iOS
- **IOS-001:** Background tab stops receiving real-time updates after 5 minutes
  - Status: iOS WebSocket limitation
  - Workaround: Keep app in foreground or enable push notifications

### Android
- **ANDROID-001:** Some older Android devices (< Android 10) have slower performance
  - Status: Hardware limitation
  - Workaround: Clear browser cache regularly, use lite mode (if available)

---

## Third-Party Service Issues 🔌

### Stripe
- **STRIPE-001:** 3D Secure authentication popup occasionally blocked by popup blockers
  - Status: Browser popup blocker limitation
  - Workaround: Disable popup blocker for caris.app

### Google Calendar
- **GCAL-001:** Calendar sync may fail if user has 1000+ calendar events
  - Status: Google API rate limit
  - Workaround: Sync only current month events

### Outlook Calendar
- **OUTLOOK-001:** First sync can take 30+ seconds for users with many calendars
  - Status: Microsoft API performance
  - Workaround: Be patient during first sync, subsequent syncs are faster

---

## Limitations & By Design 📋

### Feature Limitations

1. **File Upload Size Limit: 10MB**
   - Reason: Storage and bandwidth costs
   - Impact: Cannot upload large video files
   - Alternative: Use external video hosting links

2. **Chat Message History: 90 days**
   - Reason: Data retention policy and storage optimization
   - Impact: Messages older than 90 days are archived
   - Alternative: Export chat history regularly

3. **Concurrent Sessions Limit: 10 per psychologist**
   - Reason: Calendar complexity and scheduling optimization
   - Impact: Cannot book more than 10 sessions at once
   - Alternative: Book in batches

4. **Meditation Audio Limit: 50 tracks**
   - Reason: Content curation and licensing
   - Impact: Limited variety
   - Alternative: More tracks added monthly

5. **Leaderboard Updates: Every 5 minutes**
   - Reason: Performance optimization
   - Impact: Not truly real-time
   - Alternative: Refresh page for latest rankings

---

## Performance Characteristics ⚡

### Expected Behavior (Not Issues)

1. **AI Diary Analysis:** 2-5 seconds for processing
2. **Image Upload:** 3-8 seconds depending on file size
3. **Dashboard Initial Load:** 1.5-2.5 seconds
4. **Chat Message Delivery:** 50-150ms average latency
5. **Calendar Sync:** 5-15 seconds for full sync

---

## Reporting New Issues 🐛

If you encounter an issue not listed here:

1. Check if it's already reported: [GitHub Issues](https://github.com/your-org/caris/issues)
2. Use bug report template: `.github/ISSUE_TEMPLATE/bug_report.md`
3. Provide detailed reproduction steps
4. Include browser/device information
5. Add screenshots if applicable

**Report via:**
- GitHub Issues: https://github.com/your-org/caris/issues
- Email: support@caris.app
- In-app feedback button

---

## Issue Status Definitions

- **Not Implemented:** Feature not yet built
- **Known Limitation:** By design or external constraint
- **In Progress:** Actively being worked on
- **Investigating:** Root cause being investigated
- **Enhancement Needed:** Improvement required
- **By Design:** Intentional behavior
- **Fixed in Next Release:** Fix ready, pending release

---

## Workaround Priority

🔴 **Critical:** Use workaround immediately
🟠 **Important:** Recommended to use workaround
🟡 **Optional:** Workaround available if needed
🟢 **Minor:** No significant impact

---

## Version History

### v1.0.0 (Current)
- Initial release
- 8 known issues documented
- 3 high priority, 4 medium, 4 low

---

## Future Improvements

Features planned but not yet in development:

- Video calling for therapy sessions (Q2 2025)
- Mobile native apps (Q3 2025)
- Multi-language support (Q4 2025)
- Advanced analytics dashboard (Q4 2025)
- Integration with EHR systems (2026)

---

**Note:** This document is regularly updated. Check back frequently for updates on issue status and new workarounds.

**Last Review:** 2024-11-12
**Next Review:** 2024-12-12
**Reviewed By:** QA Team
