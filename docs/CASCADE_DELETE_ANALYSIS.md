# CASCADE DELETE Analysis - CÁRIS Platform

## Foreign Key Delete Behavior Strategy

### Guidelines:
- **CASCADE**: Child records have no meaning without parent (strong ownership)
- **SET NULL**: Optional reference that can exist without parent (weak reference)
- **RESTRICT**: Parent cannot be deleted if children exist (protect integrity)

---

## 1. User-Related Cascades

### ✅ CASCADE (Delete child when user deleted)
- `psychologistProfiles.userId` → CASCADE (profile is user-specific)
- `patientProfiles.userId` → CASCADE (profile is user-specific)
- `diaryEntries.patientId` → CASCADE (diary belongs to patient)
- `moodTracking.patientId` → CASCADE (mood data belongs to patient)
- `pointActivities.userId` → CASCADE (gamification points belong to user)
- `userAchievements.userId` → CASCADE (achievements belong to user)
- `userChallenges.userId` → CASCADE (challenges belong to user)
- `userRewards.userId` → CASCADE (rewards belong to user)
- `chatFiles.uploadedBy` → CASCADE (user's uploaded files)
- `favorites.userId` → CASCADE (user's favorites)
- `completedSessions.userId` → CASCADE (user's completed sessions)
- `trackProgress.userId` → CASCADE (user's track progress)
- `calendarSettings.userId` → CASCADE (user's calendar settings)
- `customers.userId` → CASCADE (Stripe customer is user-specific)
- `privacySettings.userId` → CASCADE (privacy settings are user-specific)
- `dataConsents.userId` → CASCADE (consents belong to user)

### ⚠️ SET NULL (Keep record but remove reference)
- `patientProfiles.psychologistId` → SET NULL (patient can exist without psychologist)
- `patientProfiles.clinicId` → SET NULL (patient can change clinic)
- `sessions.psychologistId` → SET NULL (keep session record for billing/audit)
- `sessions.patientId` → SET NULL (keep session record for billing/audit)
- `sessions.clinicId` → SET NULL (keep session history)
- `chatMessages.senderId` → SET NULL (preserve message, anonymize sender)
- `chatRooms.patient1Id/patient2Id` → SET NULL (preserve chat history)
- `auditLogs.userId` → SET NULL (preserve audit trail)
- `clinicalAlerts.patientId/psychologistId` → SET NULL (preserve alert history)
- `goalProgress.patientId/psychologistId` → SET NULL (preserve progress data)
- `customFieldValues.patientId/psychologistId` → SET NULL (preserve data)
- `sosUsages.patientId` → SET NULL (preserve emergency records for analysis)
- `sosUsages.resolvedBy` → SET NULL (preserve resolution data)

### 🚫 RESTRICT (Prevent deletion if children exist)
- Generally not used in this platform since we prefer soft deletes
- Could be used for `clinics.id` if clinic has active sessions

---

## 2. Clinic-Related Cascades

### ✅ CASCADE
- `clinicMembers.clinicId` → CASCADE (membership belongs to clinic)
- `clinicAdmins.clinicId` → CASCADE (admin role belongs to clinic)

### ⚠️ SET NULL
- `sessions.clinicId` → SET NULL (preserve session history)
- `patientProfiles.clinicId` → SET NULL (patient can be independent)

---

## 3. Chat-Related Cascades

### ✅ CASCADE
- `chatFiles.messageId` → CASCADE (file attachment belongs to message)
- `messageReadReceipts.messageId` → CASCADE (receipt belongs to message)
- `chatParticipants.roomId` → CASCADE (participant link belongs to room)
- `notifications.userId` → CASCADE (user notifications)

### ⚠️ SET NULL
- `chatMessages.senderId` → SET NULL (preserve messages for compliance)
- `messageReadReceipts.userId` → SET NULL (preserve read history)

---

## 4. Gamification-Related Cascades

### ✅ CASCADE
- `userAchievements.achievementId` → CASCADE (invalid if achievement deleted)
- `userChallenges.challengeId` → CASCADE (invalid if challenge deleted)
- `userRewards.rewardId` → CASCADE (invalid if reward deleted)
- `leaderboardEntries.leaderboardId` → CASCADE (entry belongs to leaderboard)

---

## 5. Meditation-Related Cascades

### ✅ CASCADE
- `meditationAudios.categoryId` → CASCADE (audio belongs to category)
- `meditationTracks.categoryId` → CASCADE (track belongs to category)
- `trackAudios.trackId/audioId` → CASCADE (association table)
- `favorites.audioId` → CASCADE (favorite is invalid if audio deleted)
- `completedSessions.audioId` → CASCADE (session belongs to audio)
- `trackProgress.trackId` → CASCADE (progress belongs to track)

### ⚠️ SET NULL
- `meditationAudios.createdBy` → SET NULL (preserve audio, anonymize creator)
- `meditationTracks.createdBy` → SET NULL (preserve track, anonymize creator)

---

## 6. Payment-Related Cascades

### ✅ CASCADE
- `subscriptions.customerId` → CASCADE (subscription belongs to customer)
- `payments.subscriptionId` → CASCADE (payment belongs to subscription)
- `invoices.subscriptionId` → CASCADE (invoice belongs to subscription)
- `refunds.paymentId` → CASCADE (refund belongs to payment)

---

## 7. Custom Fields & Goals

### ✅ CASCADE
- `customFieldValues.fieldId` → CASCADE (value belongs to field)
- `goalProgress.goalId` → CASCADE (progress belongs to goal)

### ⚠️ SET NULL
- `customFieldValues.patientId/psychologistId` → SET NULL (preserve data)
- `goalProgress.patientId/psychologistId` → SET NULL (preserve progress)

---

## Implementation Priority

1. **Phase 1 (High Priority):**
   - User profiles (psychologist, patient)
   - Diary entries and mood tracking
   - Gamification data
   - Chat files and receipts

2. **Phase 2 (Medium Priority):**
   - Meditation-related cascades
   - Payment-related cascades
   - Custom fields and goals

3. **Phase 3 (Low Priority):**
   - SET NULL conversions for audit trails
   - Clinic-related updates

---

## LGPD/HIPAA Compliance Notes

For "right to be forgotten" (LGPD Article 18):
- User deletion MUST cascade to all personal data (diary, mood, profile)
- Audit logs and session history should use SET NULL to preserve compliance records
- Chat messages should be anonymized (SET NULL) not deleted for legal protection
- Payment records must be retained for 7 years (SET NULL)

---

## Testing Strategy

1. Test user deletion cascades
2. Verify orphaned records don't exist
3. Confirm audit logs preserve user IDs as NULL
4. Validate chat history preservation
5. Check billing records remain intact
