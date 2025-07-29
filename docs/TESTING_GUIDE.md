# CÁRIS SaaS Pro - Manual Testing Guide
# Complete User Flow Testing Instructions

## 🎯 Pre-Testing Setup

### Environment Configuration
1. Copy `.env.local` (already created) 
2. Set up PostgreSQL database or use development environment
3. Run database migrations: `npm run db:migrate`
4. Seed initial data: `npm run db:seed` (if available)

### Development Server
```bash
# Install dependencies (if needed)
npm install --force

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

## 🧪 Critical User Flow Testing

### 1. 🔐 Authentication Flow
**Test Scenario:** Complete registration and login process

```
✅ Landing Page Tests:
- [ ] Navigate to http://localhost:3000
- [ ] Verify landing page loads with CÁRIS branding
- [ ] Click "Registrar" / "Register" button

✅ Registration Tests:
- [ ] Fill registration form with test data:
  - Name: "Test Patient"
  - Email: "patient@test.com"  
  - Role: "Paciente"
  - Password: "test123456"
- [ ] Submit form and verify success
- [ ] Check redirect to dashboard

✅ Login Tests:
- [ ] Logout if logged in
- [ ] Navigate to /login
- [ ] Login with credentials above
- [ ] Verify role-based redirect (patient → /dashboard/journey)
- [ ] Test psychologist role with different account
```

### 2. 📊 Dashboard Navigation
**Test Scenario:** Verify all dashboard features are accessible

```
✅ Patient Dashboard Tests:
- [ ] Verify sidebar navigation shows all patient features:
  - Dashboard, Jornada, Diário, Mapa Emocional
  - Videoterapia, Chat, Sessões, Tarefas
  - Meditação, Progresso, SOS, Configurações
- [ ] Click each navigation item and verify pages load
- [ ] Test mobile responsiveness (resize browser)
- [ ] Verify hamburger menu works on mobile

✅ Psychologist Dashboard Tests:
- [ ] Register/login as psychologist
- [ ] Verify different navigation structure:
  - Dashboard, Pacientes, Agenda, Relatórios
  - Biblioteca, Configurações  
- [ ] Test all psychologist-specific features
```

### 3. 📝 Emotional Diary System
**Test Scenario:** Complete diary entry with AI analysis

```
✅ Diary Entry Tests:
- [ ] Navigate to /dashboard/diary
- [ ] Create new diary entry with emotional content
- [ ] Verify entry saves successfully
- [ ] Check if AI analysis triggers (may need API keys)
- [ ] Test editing existing entries
- [ ] Verify entries display in timeline/list view
```

### 4. 🧠 Emotional Map Visualization  
**Test Scenario:** Interactive emotional mapping

```
✅ Emotional Map Tests:
- [ ] Navigate to /dashboard/emotional-map
- [ ] Verify D3.js charts load (Plutchik radar)
- [ ] Test interactive features (hover, click)
- [ ] Check emotional timeline displays
- [ ] Verify data visualization updates with new entries
```

### 5. 🆘 SOS Crisis System
**Test Scenario:** Emergency activation flow

```
✅ SOS System Tests:
- [ ] Navigate to /dashboard/sos
- [ ] Test crisis button activation
- [ ] Verify different crisis types (immediate, urgent, support)
- [ ] Check notification triggers (may need Pusher keys)
- [ ] Test deactivation process
- [ ] Verify emergency contact displays
```

### 6. 💬 Real-time Chat System
**Test Scenario:** Patient-psychologist communication

```
✅ Chat System Tests:
- [ ] Navigate to /dashboard/chat
- [ ] Verify chat interface loads
- [ ] Test message composition
- [ ] Check message history displays
- [ ] Test with multiple browser windows (real-time)
- [ ] Verify file sharing capabilities (if implemented)
```

### 7. 🎥 Video Therapy System
**Test Scenario:** WebRTC video session

```
✅ Video Therapy Tests:
- [ ] Navigate to /dashboard/videotherapy
- [ ] Test camera/microphone permissions
- [ ] Verify video call interface loads
- [ ] Test video/audio controls (mute, camera off)
- [ ] Check session management features
- [ ] Test screen sharing (if implemented)
```

### 8. 📚 Task Library System
**Test Scenario:** Therapeutic task assignment and completion

```
✅ Task Library Tests:
- [ ] Navigate to /dashboard/tasks
- [ ] Verify task library loads (200+ tasks)
- [ ] Test task categories and filtering
- [ ] Assign tasks to self (patient view)
- [ ] Mark tasks as complete
- [ ] Check progress tracking
```

### 9. 🧘 Meditation System
**Test Scenario:** Guided meditation sessions

```
✅ Meditation Tests:
- [ ] Navigate to /dashboard/meditation
- [ ] Verify meditation library loads
- [ ] Test audio player functionality
- [ ] Start guided meditation session
- [ ] Test timer and progress tracking
- [ ] Check session history
```

### 10. 🔔 Notification System
**Test Scenario:** Multi-channel notifications

```
✅ Notification Tests:
- [ ] Verify notification center icon in header
- [ ] Test in-app notifications
- [ ] Trigger notifications via other actions
- [ ] Check notification history
- [ ] Test notification settings
```

## 🔍 Technical Verification

### API Endpoint Testing
```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test protected endpoints (with token)
curl -X GET http://localhost:3000/api/users/me \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Test SOS endpoint
curl -X GET http://localhost:3000/api/sos
```

### Database Verification
```sql
-- Check user tables
SELECT * FROM users LIMIT 5;
SELECT * FROM patient_profiles LIMIT 5;
SELECT * FROM psychologist_profiles LIMIT 5;

-- Check feature tables
SELECT * FROM sessions LIMIT 5;
SELECT * FROM diary_entries LIMIT 5;
SELECT * FROM chat_messages LIMIT 5;
```

## 🐛 Common Issues & Solutions

### Build/Development Issues
```bash
# If Next.js not found
npx next dev

# If dependencies missing
npm install --force

# If TypeScript errors
npx tsc --noEmit
```

### Database Issues
```bash
# Reset database (if needed)
npm run db:migrate

# Check database connection
node -e "const {db} = require('./db'); console.log('DB connected')"
```

## ✅ Success Criteria

### Must-Have Functionality
- [ ] All authentication flows working
- [ ] Dashboard navigation complete  
- [ ] Core patient features accessible
- [ ] API endpoints responding correctly
- [ ] Mobile interface fully responsive
- [ ] No critical JavaScript errors in console

### Should-Have Functionality  
- [ ] Real-time features working (with Pusher keys)
- [ ] AI analysis working (with OpenAI keys)
- [ ] Video calls functional (with WebRTC)
- [ ] All form validations working
- [ ] Error handling graceful throughout

### Nice-to-Have Functionality
- [ ] Performance optimized (<2s page loads)
- [ ] Accessibility standards met
- [ ] All UI components polished
- [ ] Complete feature documentation

## 📋 Bug Report Template

```markdown
**Bug Title:** Brief description

**Severity:** Critical/High/Medium/Low

**Steps to Reproduce:**
1. Navigate to...
2. Click on...
3. Enter...
4. Expected: ...
5. Actual: ...

**Environment:**
- Browser: 
- Device: 
- Screen Size:

**Console Errors:** (if any)

**Screenshots:** (if applicable)
```

## 🎯 Final Recommendations

1. **Priority 1:** Test authentication and dashboard flows
2. **Priority 2:** Verify all patient-facing features
3. **Priority 3:** Test psychologist dashboard functionality  
4. **Priority 4:** Validate API endpoints and data flow
5. **Priority 5:** Confirm mobile responsiveness

The CÁRIS SaaS Pro platform is comprehensive and well-built. Focus testing on user experience and core workflows rather than individual component details.