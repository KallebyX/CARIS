# i18n Migration Guide - CÁRIS Platform

**Status:** In Progress - Auth Pages Complete ✅
**Date:** 2025-11-19
**Priority:** High - Incremental Migration Strategy

## Table of Contents

1. [Overview](#overview)
2. [Migration Strategy](#migration-strategy)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Examples](#examples)
5. [Completed Migrations](#completed-migrations)
6. [Pending Migrations](#pending-migrations)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

This guide provides a systematic approach to migrating hardcoded strings in the CÁRIS platform to use the i18n system implemented with next-intl.

### Goals
- ✅ Maintain 100% functionality during migration
- ✅ Migrate incrementally (page by page)
- ✅ Ensure type safety throughout
- ✅ Test each migration before moving to next
- ✅ Document patterns for consistency

### Current Status
- **Completed:** Login page, Register page
- **Remaining:** ~50+ pages and components
- **Progress:** ~5% migrated

---

## Migration Strategy

### Phase 1: Critical Pages ✅ IN PROGRESS
**Priority:** P0 - Complete First
**Target:** Authentication and core user flows

- ✅ Login page (`/app/login/page.tsx`)
- ✅ Register page (`/app/register/page.tsx`)
- ⚪ Forgot password page
- ⚪ Dashboard layout

### Phase 2: Dashboard Pages
**Priority:** P1 - High Impact
**Target:** Main dashboard interfaces

- ⚪ Patient dashboard (`/app/dashboard/(patient)/page.tsx`)
- ⚪ Psychologist dashboard (`/app/dashboard/(psychologist)/page.tsx`)
- ⚪ Admin dashboard (`/app/admin/page.tsx`)
- ⚪ Settings pages
- ⚪ Profile pages

### Phase 3: Feature Pages
**Priority:** P2 - Medium Impact
**Target:** Core features

- ⚪ Chat components
- ⚪ Diary components
- ⚪ Sessions management
- ⚪ Meditation library
- ⚪ Mood tracking
- ⚪ Medication tracking

### Phase 4: Components & API Messages
**Priority:** P3 - Polish
**Target:** Shared components and error messages

- ⚪ Notification center
- ⚪ Toast messages
- ⚪ Error boundaries
- ⚪ API error messages
- ⚪ Form validation messages
- ⚪ Loading states

---

## Step-by-Step Guide

### 1. Identify Hardcoded Strings

Search for hardcoded strings in your target file:

```bash
# Find strings in quotes
grep -n '"[A-Z].*"' app/your-page/page.tsx
grep -n "'[A-Z].*'" app/your-page/page.tsx
```

**Common patterns to look for:**
- Button labels: "Save", "Cancel", "Submit"
- Page titles: "Dashboard", "Settings"
- Form labels: "Email", "Password"
- Error messages: "Invalid email", "Password too short"
- Success messages: "Saved successfully"
- Placeholders: "Enter your email"

### 2. Import Translation Hooks

Add imports at the top of your file:

```typescript
// For client components
import { useTranslations } from '@/lib/i18n'

// Inside component
const t = useTranslations('namespace')
const tCommon = useTranslations('common')
const tErrors = useTranslations('errors')
```

**For server components:**
```typescript
import { getTranslations } from 'next-intl/server'

// Inside async function
const t = await getTranslations('namespace')
```

### 3. Replace Hardcoded Strings

**Before:**
```typescript
<button>Save</button>
<p>Enter your email address</p>
{error && <span>Invalid credentials</span>}
```

**After:**
```typescript
<button>{tCommon('save')}</button>
<p>{t('emailPrompt')}</p>
{error && <span>{tErrors('invalidCredentials')}</span>}
```

### 4. Update Translation Files

Add missing keys to both translation files:

**`i18n/messages/pt-BR.json`:**
```json
{
  "yourNamespace": {
    "emailPrompt": "Digite seu endereço de e-mail"
  }
}
```

**`i18n/messages/en-US.json`:**
```json
{
  "yourNamespace": {
    "emailPrompt": "Enter your email address"
  }
}
```

### 5. Test Both Locales

- Switch to Portuguese (pt-BR) - verify all strings appear correctly
- Switch to English (en-US) - verify all translations work
- Test all interactive elements (buttons, forms, links)
- Verify error states and loading states

### 6. Handle Dynamic Content

**With variables:**
```typescript
// Before
<p>Welcome, {user.name}</p>

// After
<p>{t('welcome', { name: user.name })}</p>

// In translation file
"welcome": "Welcome, {name}"
```

**With pluralization:**
```typescript
// Translation file
"itemsCount": "{count, plural, =0 {no items} =1 {1 item} other {# items}}"

// Usage
<p>{t('itemsCount', { count: items.length })}</p>
```

---

## Examples

### Example 1: Login Page Migration ✅ COMPLETE

**Before:**
```typescript
export default function LoginPage() {
  return (
    <div>
      <h1>Login</h1>
      <form>
        <label>Email</label>
        <input type="email" />

        <label>Password</label>
        <input type="password" />

        <button>Sign In</button>
      </form>
      <p>Don't have an account? <a href="/register">Register</a></p>
    </div>
  )
}
```

**After:**
```typescript
import { useTranslations } from '@/lib/i18n'

export default function LoginPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')

  return (
    <div>
      <h1>{t('login')}</h1>
      <form>
        <label>{t('email')}</label>
        <input type="email" />

        <label>{t('password')}</label>
        <input type="password" />

        <button>{t('login')}</button>
      </form>
      <p>{t('registerSubtitle')} <a href="/register">{t('register')}</a></p>
    </div>
  )
}
```

### Example 2: Toast Messages

**Before:**
```typescript
toast({
  title: "Error",
  description: "Something went wrong",
  variant: "destructive",
})
```

**After:**
```typescript
const tCommon = useTranslations('common')
const tErrors = useTranslations('errors')

toast({
  title: tCommon('error'),
  description: tErrors('generic'),
  variant: "destructive",
})
```

### Example 3: Form Validation

**Before:**
```typescript
if (!email) {
  setError("Email is required")
} else if (!isValidEmail(email)) {
  setError("Invalid email format")
}
```

**After:**
```typescript
const tValidation = useTranslations('validation')

if (!email) {
  setError(tValidation('required'))
} else if (!isValidEmail(email)) {
  setError(tValidation('email'))
}
```

### Example 4: Loading States

**Before:**
```typescript
<button disabled={loading}>
  {loading ? "Saving..." : "Save"}
</button>
```

**After:**
```typescript
<button disabled={loading}>
  {loading ? tCommon('saving') : tCommon('save')}
</button>
```

---

## Completed Migrations

### ✅ Login Page
- **File:** `/app/login/page.tsx`
- **Strings Migrated:** 12
- **Namespaces Used:** `auth`, `common`, `errors`
- **Status:** Complete and tested
- **Commit:** `feat: migrate login page to i18n`

**Migrated strings:**
- Login button
- Email/Password labels
- "Remember me" checkbox
- "Forgot password" link
- "Don't have an account?" prompt
- Error messages
- Loading states

### ✅ Register Page
- **File:** `/app/register/page.tsx`
- **Strings Migrated:** 15
- **Namespaces Used:** `auth`, `common`, `errors`
- **Status:** Complete and tested
- **Commit:** `feat: migrate register page to i18n`

**Migrated strings:**
- Register button
- Form labels (Name, Email, Password, Confirm Password, Role)
- Role options (Patient, Psychologist)
- Success/Error messages
- "Already have an account?" prompt
- Validation errors

---

## Pending Migrations

### High Priority Pages

#### ⚪ Dashboard Layouts
**Estimated Effort:** 2 hours
**Files:**
- `app/dashboard/layout.tsx` - Main dashboard layout
- `app/dashboard/(patient)/layout.tsx` - Patient layout
- `app/dashboard/(psychologist)/layout.tsx` - Psychologist layout

**Strings to migrate (~30):**
- Navigation labels
- User role display
- Logout button
- Settings link
- Profile information

#### ⚪ Patient Dashboard
**Estimated Effort:** 3 hours
**Files:**
- `app/dashboard/(patient)/page.tsx`
- `app/dashboard/(patient)/journey/page.tsx`
- `app/dashboard/(patient)/diary/page.tsx`
- `app/dashboard/(patient)/mood/page.tsx`

**Strings to migrate (~50):**
- Page titles and headings
- Quick actions
- Stats labels
- Empty states
- Call-to-action buttons

#### ⚪ Psychologist Dashboard
**Estimated Effort:** 3 hours
**Files:**
- `app/dashboard/(psychologist)/page.tsx`
- `app/dashboard/(psychologist)/patients/page.tsx`
- `app/dashboard/(psychologist)/schedule/page.tsx`

**Strings to migrate (~50):**
- Patient list headers
- Session management
- Analytics labels
- Reports section

#### ⚪ Admin Dashboard
**Estimated Effort:** 2 hours
**Files:**
- `app/admin/page.tsx`
- `app/admin/users/page.tsx`
- `app/admin/settings/page.tsx`

**Strings to migrate (~40):**
- Admin navigation
- User management
- System settings
- Analytics

### Medium Priority Components

#### ⚪ Chat System
**Estimated Effort:** 2 hours
**Files:**
- `components/chat/chat-layout.tsx`
- `components/chat/chat-messages.tsx`
- `components/chat/chat-input.tsx`

**Strings to migrate (~25):**
- Message placeholders
- Send button
- File upload messages
- Online/Offline status
- Typing indicator

#### ⚪ Diary Components
**Estimated Effort:** 1.5 hours
**Files:**
- `app/dashboard/(patient)/diary/page.tsx`
- Components for diary entries

**Strings to migrate (~20):**
- Entry prompts
- Save/Delete buttons
- Risk level labels
- Tags and categories

#### ⚪ Session Management
**Estimated Effort:** 2 hours
**Files:**
- Session scheduling pages
- Session detail pages

**Strings to migrate (~30):**
- Schedule labels
- Session types
- Cancellation messages
- Confirmation dialogs

### Lower Priority

#### ⚪ Notification Center
**Estimated Effort:** 1 hour
**Files:**
- `components/notifications/notification-center.tsx`

**Strings to migrate (~15):**
- Notification types
- Mark as read
- Clear all

#### ⚪ Settings Pages
**Estimated Effort:** 2 hours
**Files:**
- Various settings pages

**Strings to migrate (~40):**
- Setting labels
- Save changes
- Privacy options

---

## Troubleshooting

### Issue 1: Missing Translation Keys

**Problem:** Text appears as the key name instead of translated text

**Solution:**
1. Check if key exists in both `pt-BR.json` and `en-US.json`
2. Verify correct namespace is being used
3. Restart dev server if keys were just added

```bash
# Search for key in translation files
grep -r "yourKey" i18n/messages/
```

### Issue 2: TypeScript Errors

**Problem:** `useTranslations` not found or type errors

**Solution:**
1. Ensure import is correct:
   ```typescript
   import { useTranslations } from '@/lib/i18n'
   ```
2. Verify file is a client component:
   ```typescript
   'use client'
   ```
3. Clear TypeScript cache and restart:
   ```bash
   rm -rf .next && pnpm dev
   ```

### Issue 3: Variables Not Interpolating

**Problem:** Variables show as `{name}` instead of actual value

**Solution:**
Use ICU message format:
```typescript
// Translation file
"greeting": "Hello, {name}!"

// Component
t('greeting', { name: user.name })
```

### Issue 4: Pluralization Not Working

**Problem:** Always shows singular/plural incorrectly

**Solution:**
Use ICU plural format:
```json
{
  "items": "{count, plural, =0 {no items} =1 {1 item} other {# items}}"
}
```

---

## Best Practices

### 1. Namespace Organization

**Use specific namespaces for each domain:**
- `auth` - Authentication pages
- `dashboard` - Dashboard-specific content
- `patient` - Patient features
- `psychologist` - Psychologist features
- `admin` - Admin panel
- `chat` - Chat system
- `diary` - Diary features
- `sessions` - Session management
- `errors` - Error messages
- `validation` - Form validation
- `common` - Shared UI elements

### 2. Key Naming Conventions

**Use descriptive, hierarchical keys:**

```json
{
  "dashboard": {
    "patient": {
      "title": "Patient Dashboard",
      "quickActions": {
        "newEntry": "New diary entry",
        "trackMood": "Track mood"
      }
    }
  }
}
```

**Not:**
```json
{
  "title1": "Patient Dashboard",
  "button1": "New diary entry"
}
```

### 3. Reuse Common Strings

**Prefer reusing from `common` namespace:**

```typescript
// ✅ Good
const tCommon = useTranslations('common')
<button>{tCommon('save')}</button>
<button>{tCommon('cancel')}</button>

// ❌ Bad (duplicating in every namespace)
const t = useTranslations('myFeature')
<button>{t('save')}</button> // Don't duplicate common words
```

### 4. Group Related Translations

**Keep related strings together:**

```json
{
  "form": {
    "labels": {
      "email": "Email",
      "password": "Password"
    },
    "placeholders": {
      "email": "Enter your email",
      "password": "Enter your password"
    },
    "errors": {
      "emailRequired": "Email is required",
      "passwordTooShort": "Password must be at least 12 characters"
    }
  }
}
```

### 5. Test Both Locales

**Always test in both languages:**

```typescript
// Add to your test checklist:
// ✅ View in Portuguese (pt-BR)
// ✅ View in English (en-US)
// ✅ Test all interactive elements
// ✅ Verify error states
// ✅ Check loading states
// ✅ Test form validation messages
```

### 6. Handle Missing Translations Gracefully

**Provide fallbacks:**

```typescript
// With explicit fallback
t('someKey', 'Default text if key missing')

// Or use try-catch for critical paths
try {
  return t('criticalMessage')
} catch {
  return 'Fallback message'
}
```

### 7. Keep Translations Concise

**Prefer short, clear translations:**

```json
{
  // ✅ Good
  "save": "Save",
  "saveChanges": "Save changes",

  // ❌ Too verbose
  "saveChangesButton": "Click here to save all your changes to the server"
}
```

### 8. Document Complex Patterns

**Add comments for complex ICU patterns:**

```json
{
  // Pluralization with zero/one/other
  "items": "{count, plural, =0 {no items} =1 {1 item} other {# items}}",

  // Multiple variables
  "userGreeting": "Hello {name}, you have {count} new {count, plural, =1 {message} other {messages}}",

  // Date formatting
  "lastSeen": "Last seen {date, date, medium} at {date, time, short}"
}
```

---

## Migration Checklist

Use this checklist for each page/component you migrate:

### Pre-Migration
- [ ] Identify all hardcoded strings in the file
- [ ] Determine which namespaces to use
- [ ] Check if translation keys already exist
- [ ] Create new translation keys if needed

### During Migration
- [ ] Add `useTranslations` imports
- [ ] Replace hardcoded strings with `t()` calls
- [ ] Handle dynamic content (variables, plurals)
- [ ] Update toast/error messages
- [ ] Test in development

### Post-Migration
- [ ] Test in Portuguese (pt-BR)
- [ ] Test in English (en-US)
- [ ] Verify all interactive elements work
- [ ] Check edge cases (errors, empty states)
- [ ] Test loading states
- [ ] Verify accessibility (screen readers)
- [ ] Commit changes with clear message

### Quality Checks
- [ ] No console errors related to i18n
- [ ] All strings translated (no keys showing)
- [ ] Variables interpolate correctly
- [ ] Plurals work correctly
- [ ] No TypeScript errors
- [ ] Component functionality unchanged

---

## Quick Reference

### Common Translation Hooks

```typescript
// Client components
import { useTranslations } from '@/lib/i18n'
const t = useTranslations('namespace')

// Server components
import { getTranslations } from 'next-intl/server'
const t = await getTranslations('namespace')

// Get current locale
import { useLocale } from '@/lib/i18n'
const locale = useLocale()

// Change locale
import { setLocale } from '@/lib/i18n'
setLocale('en-US')
```

### Common Namespaces

| Namespace | Use For |
|-----------|---------|
| `common` | Buttons, labels, actions (save, cancel, delete, etc.) |
| `auth` | Login, register, password reset |
| `errors` | Error messages |
| `validation` | Form validation messages |
| `dashboard` | Dashboard-specific content |
| `patient` | Patient features |
| `psychologist` | Psychologist features |
| `admin` | Admin panel |
| `chat` | Chat system |
| `diary` | Diary entries |
| `sessions` | Session management |
| `notifications` | Notifications |
| `time` | Relative time (minutes ago, hours ago) |

### Translation File Locations

- **Portuguese:** `/i18n/messages/pt-BR.json`
- **English:** `/i18n/messages/en-US.json`
- **Config:** `/i18n.config.ts`
- **Request config:** `/i18n/request.ts`

---

## Next Steps

### Immediate (This Week)
1. ✅ Complete auth pages (Login, Register) - DONE
2. ⚪ Migrate dashboard layouts
3. ⚪ Migrate patient dashboard pages
4. ⚪ Create migration helper script

### Short Term (Next 2 Weeks)
1. ⚪ Migrate psychologist dashboard
2. ⚪ Migrate admin dashboard
3. ⚪ Migrate chat components
4. ⚪ Migrate diary components

### Long Term (1 Month)
1. ⚪ Complete all remaining pages
2. ⚪ Migrate API error messages
3. ⚪ Add automated tests for i18n
4. ⚪ Consider adding more languages (Spanish, French)

---

## Resources

- **Main i18n Guide:** `/docs/I18N_GUIDE.md`
- **next-intl Documentation:** https://next-intl-docs.vercel.app/
- **ICU Message Format:** https://formatjs.io/docs/core-concepts/icu-syntax/
- **Translation Management:** Consider integrating with Locize or Phrase for team collaboration

---

## Summary

**Migration Strategy:**
- ✅ Incremental, page-by-page approach
- ✅ Start with critical paths (auth, dashboards)
- ✅ Test thoroughly in both locales
- ✅ Maintain code quality and type safety

**Current Progress:**
- ✅ Infrastructure complete (100%)
- ✅ Auth pages complete (100%)
- ⚪ Dashboard pages (0%)
- ⚪ Feature pages (0%)
- ⚪ Components (0%)

**Total Estimated Time:** ~40 hours for complete migration
**Time Spent:** ~12 hours (infrastructure + auth pages)
**Remaining:** ~28 hours

---

**Last Updated:** 2025-11-19
**Status:** Active Migration
**Next Milestone:** Dashboard layouts complete
