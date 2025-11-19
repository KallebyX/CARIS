# ESLint Configuration Guide - CÁRIS Platform

Complete guide for understanding and maintaining ESLint configuration in the CÁRIS platform.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Rules Explained](#rules-explained)
- [Running ESLint](#running-eslint)
- [Fixing Common Issues](#fixing-common-issues)
- [Best Practices](#best-practices)

---

## Overview

ESLint helps maintain code quality by catching common errors and enforcing consistent coding patterns. The CÁRIS platform uses a balanced configuration that:

✅ **Catches real errors** - Undefined variables, incorrect hooks usage
✅ **Warns about potential issues** - Missing dependencies, unescaped entities
✅ **Allows common patterns** - Console logging for debugging
✅ **Doesn't block development** - Warnings don't fail builds

### Philosophy

- **Errors**: Block builds, must be fixed
- **Warnings**: Should be addressed, but don't block progress
- **Disabled**: Rules that don't add value or have too many false positives

---

## Configuration

### File Location

`.eslintrc.json` in project root

### Current Configuration

```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    // React Hooks - Critical for correctness
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // React - Common patterns allowed
    "react/no-unescaped-entities": "warn",
    "react/jsx-no-undef": "error",
    "react/display-name": "warn",
    "react/prop-types": "off",

    // Next.js - Performance warnings
    "@next/next/no-img-element": "warn",
    "@next/next/no-page-custom-font": "warn",
    "@next/next/no-html-link-for-pages": "error",

    // General - Best practices
    "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
    "no-debugger": "warn",
    "prefer-const": "warn",
    "no-var": "error"
  }
}
```

### Build Integration

ESLint runs automatically during:
- Development (`npm run dev`) - Shows errors in terminal
- Linting (`npm run lint`) - Full project scan
- Building (`npm run build`) - Fails on errors

Configuration in `next.config.js`:

```javascript
eslint: {
  ignoreDuringBuilds: false, // ← ESLint enabled during builds
}
```

---

## Rules Explained

### React Hooks Rules

#### `react-hooks/rules-of-hooks` (ERROR)

**What it catches:**
```typescript
// ❌ ERROR: Hooks in conditionals
if (condition) {
  const [state, setState] = useState()
}

// ❌ ERROR: Hooks in loops
for (let i = 0; i < 10; i++) {
  useEffect(() => {})
}

// ✅ CORRECT
const [state, setState] = useState()
if (condition) {
  setState(newValue)
}
```

**Why:** Hooks must be called in the same order every render.

#### `react-hooks/exhaustive-deps` (WARNING)

**What it catches:**
```typescript
// ⚠️ WARNING: Missing dependency
const fetchData = async () => {
  const result = await api.get(userId)
}

useEffect(() => {
  fetchData() // fetchData not in deps
}, []) // Should be: [fetchData]

// ✅ CORRECT: All dependencies included
useEffect(() => {
  fetchData()
}, [fetchData])

// ✅ ALSO CORRECT: useCallback for stable reference
const fetchData = useCallback(async () => {
  const result = await api.get(userId)
}, [userId])

useEffect(() => {
  fetchData()
}, [fetchData])
```

**Why:** Missing dependencies can cause stale closures and bugs.

---

### React Rules

#### `react/no-unescaped-entities` (WARNING)

**What it catches:**
```typescript
// ⚠️ WARNING: Unescaped quotes
<p>Don't do this</p>
<p>Use "proper" escaping</p>

// ✅ CORRECT: Escaped entities
<p>Don&apos;t do this</p>
<p>Use &quot;proper&quot; escaping</p>

// ✅ ALSO CORRECT: Use variables
<p>{'Don\'t do this'}</p>
<p>{'Use "proper" escaping'}</p>
```

**Why:** Prevents HTML parsing issues and ensures proper rendering.

#### `react/jsx-no-undef` (ERROR)

**What it catches:**
```typescript
// ❌ ERROR: Component not imported
<ChatLayout /> // ChatLayout not defined

// ✅ CORRECT
import { ChatLayout } from '@/components/chat/chat-layout'
<ChatLayout />
```

**Why:** Catches typos and missing imports that would crash the app.

---

### Next.js Rules

#### `@next/next/no-img-element` (WARNING)

**What it catches:**
```typescript
// ⚠️ WARNING: Using <img> instead of Image
<img src="/photo.jpg" alt="Photo" />

// ✅ CORRECT: Use Next.js Image component
import Image from 'next/image'
<Image src="/photo.jpg" alt="Photo" width={500} height={300} />
```

**Why:** `next/image` provides automatic optimization, lazy loading, and responsive images.

#### `@next/next/no-page-custom-font` (WARNING)

**What it catches:**
```typescript
// ⚠️ WARNING: Font loaded in wrong place
// In app/page.tsx:
<link
  href="https://fonts.googleapis.com/css2?family=Inter"
  rel="stylesheet"
/>

// ✅ CORRECT: Load in root layout
// In app/layout.tsx:
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```

**Why:** Fonts should be loaded once in root layout for optimal performance.

---

### General Rules

#### `no-console` (WARNING)

**What it catches:**
```typescript
// ⚠️ WARNING: console.log in production
console.log('Debug message')

// ✅ ALLOWED: Proper logging methods
console.warn('Warning message')
console.error('Error message')
console.info('Info message')
```

**Why:** Debug logs should be removed before production, but error/warn logs are useful.

#### `no-debugger` (WARNING)

**What it catches:**
```typescript
// ⚠️ WARNING: Debugger statement
debugger

// ✅ CORRECT: Use browser DevTools instead
// Set breakpoints in DevTools
```

**Why:** Debugger statements should be removed before committing.

#### `no-var` (ERROR)

**What it catches:**
```typescript
// ❌ ERROR: Using var
var count = 0

// ✅ CORRECT: Use const or let
const count = 0
let total = 0
```

**Why:** `var` has confusing scoping rules, use `const` or `let` instead.

---

## Running ESLint

### Development Mode

```bash
# Start dev server (ESLint runs automatically)
npm run dev
```

Errors and warnings appear in terminal as you code.

### Manual Linting

```bash
# Lint entire project
npm run lint

# Lint specific file
npx eslint app/dashboard/page.tsx

# Lint with auto-fix
npm run lint -- --fix
```

### Build Time

```bash
# Build production (ESLint runs automatically)
npm run build
```

Build fails if there are ESLint errors.

---

## Fixing Common Issues

### Issue 1: Missing Hook Dependencies

**Error:**
```
React Hook useEffect has a missing dependency: 'fetchData'.
Either include it or remove the dependency array.
```

**Solutions:**

**Option A:** Add to dependencies
```typescript
useEffect(() => {
  fetchData()
}, [fetchData]) // ← Add fetchData
```

**Option B:** Use useCallback for stable reference
```typescript
const fetchData = useCallback(async () => {
  // fetch logic
}, [userId])

useEffect(() => {
  fetchData()
}, [fetchData])
```

**Option C:** Define function inside useEffect
```typescript
useEffect(() => {
  async function fetchData() {
    // fetch logic
  }
  fetchData()
}, [userId]) // ← Only external deps
```

### Issue 2: Unescaped Entities

**Error:**
```
`"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.
```

**Solutions:**

**Option A:** HTML entities
```typescript
<p>Use &quot;proper&quot; escaping</p>
<p>Don&apos;t do this</p>
```

**Option B:** Template literals
```typescript
<p>{'Use "proper" escaping'}</p>
<p>{"Don't do this"}</p>
```

**Option C:** Component text
```typescript
const text = `Use "proper" escaping`
<p>{text}</p>
```

### Issue 3: Undefined Component

**Error:**
```
'ChatLayout' is not defined.
```

**Solution:** Import the component
```typescript
// Add import at top of file
import { ChatLayout } from '@/components/chat/chat-layout'

// Or if named differently
import { SecureChatLayout as ChatLayout } from '@/components/chat/chat-layout'
```

### Issue 4: Using `<img>` Instead of Image

**Warning:**
```
Using `<img>` could result in slower LCP and higher bandwidth.
Consider using `<Image />` from `next/image`.
```

**Solution:**
```typescript
// Before
<img src="/photo.jpg" alt="Photo" />

// After
import Image from 'next/image'
<Image
  src="/photo.jpg"
  alt="Photo"
  width={500}
  height={300}
  priority={isAboveFold}
/>
```

### Issue 5: Console Statements

**Warning:**
```
Unexpected console statement.
```

**Solutions:**

**Option A:** Use allowed methods
```typescript
// Instead of console.log
console.info('User logged in', { userId })

// For errors
console.error('Payment failed', error)

// For warnings
console.warn('Deprecated API used')
```

**Option B:** Use proper logger
```typescript
import { logger } from '@/lib/logger'

logger.info('User logged in', { userId })
logger.error('Payment failed', error)
```

**Option C:** Remove debug logs
```typescript
// Remove before committing
// console.log('Debug:', data)
```

---

## Best Practices

### 1. Fix Errors Immediately

**Errors** block builds and indicate real problems. Fix them as soon as they appear:

```typescript
// ❌ ERROR: Component not imported
<UndefinedComponent />

// ✅ Fix immediately
import { UndefinedComponent } from '@/components/...'
```

### 2. Address Warnings Gradually

**Warnings** don't block builds but should be addressed:

```typescript
// ⚠️ WARNING: Missing dependency
useEffect(() => {
  fetchData()
}, [])

// ✅ Fix when you have time
useEffect(() => {
  fetchData()
}, [fetchData])
```

### 3. Use Auto-Fix When Possible

```bash
# Auto-fix simple issues
npm run lint -- --fix
```

Auto-fix handles:
- Unescaped entities
- Const vs let
- Missing semicolons
- Whitespace

### 4. Configure Per-File Exceptions

For specific cases, disable rules per-file:

```typescript
/* eslint-disable react-hooks/exhaustive-deps */
useEffect(() => {
  // Complex effect with valid reason to ignore deps
}, [])
/* eslint-enable react-hooks/exhaustive-deps */
```

Or for a single line:

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  init()
}, [])
```

### 5. Document Suppressions

Always comment why you're disabling a rule:

```typescript
// Disable exhaustive-deps because we only want this to run once on mount
// and fetchData is intentionally not a dependency
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  fetchData()
}, [])
```

---

## CI/CD Integration

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm run lint
```

### GitHub Actions

```yaml
# .github/workflows/lint.yml
name: Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
```

### Vercel

ESLint runs automatically during Vercel builds. Build fails if errors exist.

---

## Troubleshooting

### ESLint Not Running

```bash
# Check ESLint is installed
npm list eslint

# Reinstall if needed
npm install --save-dev eslint

# Verify configuration
npx eslint --print-config .eslintrc.json
```

### Too Many Warnings

If warnings are overwhelming:

```bash
# Show only errors
npm run lint -- --quiet

# Show summary instead of details
npm run lint -- --format compact
```

### Performance Issues

For large projects:

```bash
# Lint specific directories
npx eslint app/

# Use cache
npx eslint --cache app/

# Clear cache if stale
rm .eslintcache
```

---

## Updating Rules

To modify rules, edit `.eslintrc.json`:

```json
{
  "rules": {
    // Change severity
    "no-console": "off",          // Disable completely
    "no-console": "warn",         // Warn but don't fail
    "no-console": "error",        // Fail builds

    // Configure with options
    "no-console": ["warn", {
      "allow": ["warn", "error", "info"]
    }]
  }
}
```

After changes, run:

```bash
# Verify configuration works
npm run lint

# Test build
npm run build
```

---

## Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Next.js ESLint](https://nextjs.org/docs/app/api-reference/config/eslint)
- [React Hooks Rules](https://react.dev/warnings/invalid-hook-call-warning)
- [ESLint Rules Reference](https://eslint.org/docs/rules/)

---

## Summary

### Quick Reference

| Rule | Severity | Fix |
|------|----------|-----|
| `react-hooks/rules-of-hooks` | Error | Don't use hooks in conditionals/loops |
| `react-hooks/exhaustive-deps` | Warning | Add all dependencies to useEffect |
| `react/no-unescaped-entities` | Warning | Use `&quot;` or `{'\"'}` |
| `react/jsx-no-undef` | Error | Import component before using |
| `@next/next/no-img-element` | Warning | Use `next/image` instead |
| `no-console` | Warning | Use console.error/warn/info |
| `no-var` | Error | Use const or let |

### Commands

```bash
# Lint project
npm run lint

# Auto-fix
npm run lint -- --fix

# Lint specific file
npx eslint path/to/file.tsx

# Show only errors
npm run lint -- --quiet
```

---

## Support

For ESLint issues:
1. Check this guide first
2. Review [ESLint docs](https://eslint.org/docs/latest/)
3. Search existing issues
4. Ask team for help
