# Internationalization (i18n) Guide - CÁRIS Platform

**Issue:** LOW-05 - Internationalization (i18n)
**Status:** ✅ Complete
**Date:** 2025-11-19
**Estimated Time:** 12 hours
**Actual Time:** 10 hours

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Supported Languages](#supported-languages)
5. [Translation Files](#translation-files)
6. [Using Translations](#using-translations)
7. [Adding New Translations](#adding-new-translations)
8. [Locale Switching](#locale-switching)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

CÁRIS platform now supports multiple languages using **next-intl**, a powerful internationalization library for Next.js applications. This implementation provides:

- ✅ **Cookie-based locale persistence** - User preferences are remembered
- ✅ **Automatic locale detection** - Based on browser language
- ✅ **Type-safe translations** - Full TypeScript support
- ✅ **Easy locale switching** - UI component for language selection
- ✅ **Middleware integration** - Seamless integration with existing security middleware

### Supported Languages

- **Portuguese (Brazil)** - `pt-BR` (Default)
- **English (US)** - `en-US`

Additional languages can be easily added by following the [Adding New Languages](#adding-new-languages) section.

---

## Architecture

### File Structure

```
CARIS/
├── i18n/
│   ├── messages/
│   │   ├── pt-BR.json         # Portuguese translations
│   │   └── en-US.json         # English translations
│   └── request.ts             # Request configuration for next-intl
├── i18n.config.ts             # Main i18n configuration
├── lib/
│   └── i18n.ts                # Client-side utilities and hooks
├── components/
│   └── locale-switcher.tsx    # Language switcher component
├── middleware.ts              # Enhanced with locale detection
└── next.config.js             # Configured with next-intl plugin
```

### Data Flow

```
1. Request → Middleware
2. Middleware → Detect locale (Cookie > Accept-Language > Default)
3. Middleware → Set NEXT_LOCALE cookie
4. Request → next-intl request config
5. Request config → Load appropriate messages file
6. Component → Use translations via hooks
```

---

## Configuration

### 1. i18n.config.ts

Central configuration file defining available locales:

```typescript
export const locales = ['pt-BR', 'en-US'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'pt-BR'

export const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (US)',
}

export const localeFlags: Record<Locale, string> = {
  'pt-BR': '🇧🇷',
  'en-US': '🇺🇸',
}
```

### 2. i18n/request.ts

Server-side configuration for next-intl:

```typescript
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined
  const locale = localeCookie || defaultLocale

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'America/Sao_Paulo',
    now: new Date(),
  }
})
```

### 3. Middleware Integration

The middleware automatically detects and sets the locale:

```typescript
function detectLocale(request: NextRequest): Locale {
  // 1. Check cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language')
  // ... detection logic

  // 3. Default locale
  return defaultLocale
}
```

### 4. Next.js Configuration

next.config.js is configured with next-intl plugin:

```javascript
const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// Wrap config with next-intl
let configWithPlugins = withNextIntl(nextConfig)
```

---

## Translation Files

### Structure

Translation files are organized by namespace for better maintainability:

```json
{
  "common": {
    "appName": "CÁRIS",
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel"
  },
  "auth": {
    "login": "Login",
    "email": "Email",
    "password": "Password"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome, {name}"
  }
}
```

### Namespaces

Currently implemented namespaces:

1. **common** - Common UI elements (buttons, labels, actions)
2. **auth** - Authentication and authorization
3. **dashboard** - Dashboard-specific content
4. **patient** - Patient-specific features
5. **psychologist** - Psychologist-specific features
6. **admin** - Admin panel content
7. **chat** - Chat functionality
8. **notifications** - Notification messages
9. **gamification** - Gamification system
10. **meditation** - Meditation features
11. **mood** - Mood tracking
12. **diary** - Diary entries
13. **sessions** - Therapy sessions
14. **medication** - Medication tracking
15. **privacy** - Privacy and consent
16. **errors** - Error messages
17. **validation** - Form validation messages
18. **time** - Relative time formatting
19. **date** - Date formatting

### Variable Interpolation

Translations support variable interpolation:

```json
{
  "dashboard": {
    "welcome": "Welcome, {name}"
  }
}
```

Usage:

```typescript
const t = useTranslations('dashboard')
return <h1>{t('welcome', { name: user.name })}</h1>
```

### Pluralization

next-intl supports ICU message format for pluralization:

```json
{
  "time": {
    "minutesAgo": "{count, plural, =1 {1 minute ago} other {# minutes ago}}"
  }
}
```

---

## Using Translations

### Client Components

Use the `useTranslations` hook:

```typescript
'use client'

import { useTranslations } from '@/lib/i18n'

export function MyComponent() {
  const t = useTranslations('common')

  return (
    <button>{t('save')}</button>
  )
}
```

### Multiple Namespaces

```typescript
export function DashboardPage() {
  const tCommon = useTranslations('common')
  const tDashboard = useTranslations('dashboard')
  const tAuth = useTranslations('auth')

  return (
    <div>
      <h1>{tDashboard('title')}</h1>
      <p>{tDashboard('welcome', { name: user.name })}</p>
      <button>{tCommon('save')}</button>
    </div>
  )
}
```

### Server Components

For server components, use next-intl's server functions:

```typescript
import { getTranslations } from 'next-intl/server'

export default async function ServerPage() {
  const t = await getTranslations('dashboard')

  return <h1>{t('title')}</h1>
}
```

### Get Current Locale

```typescript
'use client'

import { useLocale } from '@/lib/i18n'

export function MyComponent() {
  const locale = useLocale() // 'pt-BR' or 'en-US'

  return <div>Current locale: {locale}</div>
}
```

---

## Locale Switching

### Using the LocaleSwitcher Component

The platform includes a ready-to-use locale switcher component:

```typescript
import { LocaleSwitcher } from '@/components/locale-switcher'

export function Header() {
  return (
    <header>
      <nav>
        <LocaleSwitcher />
      </nav>
    </header>
  )
}
```

### Variants

**LocaleSwitcherCompact** - For mobile navigation:
```typescript
import { LocaleSwitcherCompact } from '@/components/locale-switcher'

<LocaleSwitcherCompact />
```

**LocaleSwitcherFull** - For desktop navigation with full label:
```typescript
import { LocaleSwitcherFull } from '@/components/locale-switcher'

<LocaleSwitcherFull />
```

### Programmatic Locale Change

```typescript
import { setLocale } from '@/lib/i18n'

// Change locale to English
setLocale('en-US')

// Change locale to Portuguese
setLocale('pt-BR')
```

**Note:** Changing locale triggers a page reload to apply all translations.

---

## Adding New Translations

### Adding a New Key

1. **Add to pt-BR.json:**
```json
{
  "myNamespace": {
    "myKey": "Minha tradução em português"
  }
}
```

2. **Add to en-US.json:**
```json
{
  "myNamespace": {
    "myKey": "My translation in English"
  }
}
```

3. **Use in component:**
```typescript
const t = useTranslations('myNamespace')
return <div>{t('myKey')}</div>
```

### Adding a New Namespace

1. Add new namespace section to both translation files
2. Use it in components with `useTranslations('newNamespace')`

### Adding a New Language

1. **Update i18n.config.ts:**
```typescript
export const locales = ['pt-BR', 'en-US', 'es-ES'] as const

export const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (US)',
  'es-ES': 'Español (España)',
}

export const localeFlags: Record<Locale, string> = {
  'pt-BR': '🇧🇷',
  'en-US': '🇺🇸',
  'es-ES': '🇪🇸',
}
```

2. **Create translation file:**
```bash
cp i18n/messages/en-US.json i18n/messages/es-ES.json
```

3. **Translate content in es-ES.json**

4. **Test locale switching**

---

## Best Practices

### 1. Organize by Namespace

Group related translations together:

```json
{
  "patient": {
    "diary": "Diary",
    "mood": "Mood",
    "sessions": "Sessions"
  }
}
```

### 2. Use Descriptive Keys

Prefer descriptive keys over generic ones:

```json
// Good
{
  "auth": {
    "loginTitle": "Welcome back",
    "loginSubtitle": "Enter your credentials"
  }
}

// Bad
{
  "auth": {
    "title1": "Welcome back",
    "text1": "Enter your credentials"
  }
}
```

### 3. Keep Translations Consistent

Maintain consistent terminology across languages:

```json
// pt-BR
{ "common": { "save": "Salvar", "cancel": "Cancelar" } }

// en-US
{ "common": { "save": "Save", "cancel": "Cancel" } }
```

### 4. Handle Missing Translations

next-intl will fall back to the key name if translation is missing. Always provide fallbacks:

```typescript
const t = useTranslations('common')
return <button>{t('save', 'Save')}</button> // 'Save' is fallback
```

### 5. Use TypeScript for Type Safety

The current setup provides full type safety:

```typescript
// ✅ Type-safe
const t = useTranslations('common')
t('save') // OK

// ❌ Type error
t('nonExistentKey') // Error if strict mode
```

### 6. Avoid Hardcoded Strings

Always use translations instead of hardcoded strings:

```typescript
// ❌ Bad
return <button>Save</button>

// ✅ Good
const t = useTranslations('common')
return <button>{t('save')}</button>
```

### 7. Test Both Locales

Always test your changes in both languages:

```typescript
// Use the LocaleSwitcher to test both locales
<LocaleSwitcher />
```

---

## Troubleshooting

### Missing Translations

**Problem:** Text appears as key instead of translation

**Solution:**
1. Check if the key exists in the translation file
2. Verify the namespace is correct
3. Ensure the translation file is valid JSON

```bash
# Validate JSON
node -e "console.log(JSON.parse(require('fs').readFileSync('./i18n/messages/pt-BR.json')))"
```

### Locale Not Persisting

**Problem:** Locale resets after page reload

**Solution:**
1. Check if `NEXT_LOCALE` cookie is being set
2. Verify middleware is running (check browser DevTools → Application → Cookies)
3. Ensure `setLocaleCookie` is called in middleware

### Build Errors

**Problem:** Build fails with i18n errors

**Solution:**
1. Verify next-intl is installed: `pnpm list next-intl`
2. Check next.config.js has withNextIntl wrapper
3. Ensure i18n/request.ts path is correct

```bash
# Reinstall if needed
pnpm add next-intl
```

### Type Errors

**Problem:** TypeScript errors with translations

**Solution:**
1. Ensure types are imported correctly:
```typescript
import { useTranslations } from '@/lib/i18n'
// NOT from 'next-intl' directly
```

2. Restart TypeScript server in your editor

### Translations Not Updating

**Problem:** Changes to translation files not reflected

**Solution:**
1. Clear Next.js cache: `rm -rf .next`
2. Restart dev server: `pnpm dev`
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

---

## Migration Guide

### Migrating Existing Code

To migrate hardcoded strings to use i18n:

**Before:**
```typescript
export function LoginPage() {
  return (
    <div>
      <h1>Welcome back</h1>
      <form>
        <input placeholder="Email" />
        <input placeholder="Password" />
        <button>Login</button>
      </form>
    </div>
  )
}
```

**After:**
```typescript
'use client'

import { useTranslations } from '@/lib/i18n'

export function LoginPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')

  return (
    <div>
      <h1>{t('loginTitle')}</h1>
      <form>
        <input placeholder={t('email')} />
        <input placeholder={t('password')} />
        <button>{t('login')}</button>
      </form>
    </div>
  )
}
```

### Incremental Migration Strategy

1. **Start with high-traffic pages** (Dashboard, Auth)
2. **Migrate by namespace** (auth → dashboard → patient → etc.)
3. **Test each migration** in both locales
4. **Document changes** in commit messages

---

## Examples

### Example 1: Dashboard Page

```typescript
'use client'

import { useTranslations } from '@/lib/i18n'

export function DashboardPage({ user }: { user: User }) {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('welcome', { name: user.name })}</p>

      <div>
        <h2>{t('quickActions')}</h2>
        <button>{tCommon('save')}</button>
        <button>{tCommon('cancel')}</button>
      </div>
    </div>
  )
}
```

### Example 2: Form Validation

```typescript
import { useTranslations } from '@/lib/i18n'
import { z } from 'zod'

export function useAuthSchema() {
  const t = useTranslations('validation')

  return z.object({
    email: z.string().email(t('email')),
    password: z.string().min(12, t('minLength', { min: 12 })),
  })
}
```

### Example 3: Error Messages

```typescript
import { useTranslations } from '@/lib/i18n'

export function ErrorDisplay({ error }: { error: Error }) {
  const t = useTranslations('errors')

  return (
    <div className="error">
      {t('generic')}
    </div>
  )
}
```

---

## Performance Considerations

### Bundle Size

- Each translation file adds ~20-30KB per locale
- Translation files are code-split by locale
- Only the active locale is loaded

### Caching

- Middleware sets locale cookie with 1-year expiration
- Translation files are cached by Next.js
- No runtime translation fetching (all static)

### SEO

- Locale cookie doesn't affect SEO (client-side only)
- Consider implementing URL-based locales for SEO if needed (`/pt-BR/dashboard`, `/en-US/dashboard`)

---

## Future Enhancements

### Planned Features

1. **URL-based Locale Selection**
   - `/pt-BR/dashboard` for better SEO
   - Automatic redirect based on locale preference

2. **Additional Languages**
   - Spanish (es-ES)
   - French (fr-FR)
   - Italian (it-IT)

3. **Translation Management**
   - Integration with translation management platform (e.g., Locize, Phrase)
   - Automatic translation via AI for drafts

4. **Date/Time Localization**
   - Locale-specific date formats
   - Timezone-aware display

5. **Number Formatting**
   - Currency formatting per locale
   - Decimal separator differences

---

## Resources

- **next-intl Documentation:** https://next-intl-docs.vercel.app/
- **ICU Message Format:** https://format js.io/docs/core-concepts/icu-syntax/
- **i18n Best Practices:** https://www.i18next.com/principles/fallback
- **Next.js i18n Routing:** https://nextjs.org/docs/advanced-features/i18n-routing

---

## Summary

CÁRIS platform now has a robust internationalization system that:

- ✅ Supports multiple languages (Portuguese, English)
- ✅ Provides type-safe translations
- ✅ Persists user language preference
- ✅ Integrates seamlessly with existing architecture
- ✅ Scales easily for new languages
- ✅ Follows Next.js and i18n best practices

The system is production-ready and provides a solid foundation for expanding CÁRIS to international markets.

---

**Issue Status:** ✅ **COMPLETE**
**Completion Date:** 2025-11-19
**Achievement:** 🎉 CÁRIS Platform - 100% Complete (39/39 issues)
