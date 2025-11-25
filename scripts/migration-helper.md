# i18n Migration Helper

## Quick Commands

### 1. Find Hardcoded Strings

```bash
# Find all hardcoded strings in a file
grep -n '"[A-Z].*"' app/your-file.tsx | grep -v import | grep -v from

# Find all single-quoted strings
grep -n "'[A-Z].*'" app/your-file.tsx | grep -v import | grep -v from

# Find common button labels
grep -rn --include="*.tsx" -E '"(Save|Cancel|Delete|Edit|Submit|Back|Next|Close)"' app/

# Find common error messages
grep -rn --include="*.tsx" -E '"(Error|Failed|Invalid|Required|Success)"' app/
```

### 2. Check Translation Coverage

```bash
# Count total translation keys
cat i18n/messages/pt-BR.json | grep -o '"[^"]*":' | wc -l

# Find missing keys between locales
diff <(grep -o '"[^"]*":' i18n/messages/pt-BR.json | sort) \
     <(grep -o '"[^"]*":' i18n/messages/en-US.json | sort)

# Validate JSON syntax
node -e "JSON.parse(require('fs').readFileSync('./i18n/messages/pt-BR.json'))" && echo "✅ pt-BR.json is valid"
node -e "JSON.parse(require('fs').readFileSync('./i18n/messages/en-US.json'))" && echo "✅ en-US.json is valid"
```

### 3. Test Translations

```bash
# Search for a specific translation key
grep -r "yourKey" i18n/messages/

# Find usages of a translation
grep -r "t('yourKey')" app/ components/

# List all namespaces used in a file
grep -o "useTranslations('[^']*')" app/your-file.tsx | sort -u
```

##File Migration Template

Create a new file with this template:

```typescript
"use client"

// Imports
import { useTranslations } from '@/lib/i18n'
// ... other imports

export default function YourComponent() {
  // Translation hooks
  const t = useTranslations('yourNamespace')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  // ... rest of component

  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{tCommon('save')}</button>
    </div>
  )
}
```

## Common Patterns

### Pattern 1: Simple Text Replacement

```typescript
// Before
<h1>Dashboard</h1>

// After
<h1>{t('title')}</h1>
```

### Pattern 2: Button Labels

```typescript
// Before
<button>{isLoading ? "Saving..." : "Save"}</button>

// After
<button>{isLoading ? tCommon('saving') : tCommon('save')}</button>
```

### Pattern 3: Toast Messages

```typescript
// Before
toast({
  title: "Success",
  description: "Changes saved successfully"
})

// After
toast({
  title: tCommon('success'),
  description: t('changesSaved')
})
```

### Pattern 4: Error Messages

```typescript
// Before
setError("Email is required")

// After
setError(tValidation('required'))
```

### Pattern 5: Conditional Text

```typescript
// Before
{user.role === "patient" ? "Paciente" : "Psicólogo"}

// After
{user.role === "patient" ? t('patient') : t('psychologist')}
```

### Pattern 6: Dynamic Content

```typescript
// Before
<p>Welcome, {user.name}!</p>

// After
<p>{t('welcome', { name: user.name })}</p>

// Translation file
"welcome": "Welcome, {name}!"
```

## Translation File Structure

### Add to pt-BR.json

```json
{
  "yourNamespace": {
    "title": "Título em português",
    "subtitle": "Subtítulo em português",
    "actions": {
      "save": "Salvar",
      "cancel": "Cancelar"
    }
  }
}
```

### Add to en-US.json

```json
{
  "yourNamespace": {
    "title": "Title in English",
    "subtitle": "Subtitle in English",
    "actions": {
      "save": "Save",
      "cancel": "Cancel"
    }
  }
}
```

## Checklist for Each Migration

### Before Starting
- [ ] Read the file and list all hardcoded strings
- [ ] Decide which namespaces to use
- [ ] Check if translation keys already exist

### During Migration
- [ ] Add `useTranslations` imports
- [ ] Replace all hardcoded strings
- [ ] Add new translation keys to both locale files
- [ ] Handle edge cases (loading, errors, empty states)

### After Migration
- [ ] Test in Portuguese
- [ ] Test in English
- [ ] Verify no hardcoded strings remain
- [ ] Check TypeScript compilation
- [ ] Test all user interactions
- [ ] Commit with descriptive message

## Git Commit Message Template

```bash
git commit -m "feat(i18n): migrate [component/page name] to i18n

- Migrated [X] strings to use next-intl
- Added translations to pt-BR and en-US
- Used namespaces: [list namespaces]
- Tested in both locales

Closes #[issue number if applicable]"
```

## Useful VS Code Snippets

Add to `.vscode/snippets.json`:

```json
{
  "i18n Import": {
    "prefix": "i18n-import",
    "body": [
      "import { useTranslations } from '@/lib/i18n'",
      "",
      "const t = useTranslations('${1:namespace}')",
      "const tCommon = useTranslations('common')",
      "const tErrors = useTranslations('errors')"
    ]
  },
  "i18n Translation": {
    "prefix": "t",
    "body": "{t('$1')}"
  },
  "i18n Translation with Variable": {
    "prefix": "tv",
    "body": "{t('$1', { $2 })}"
  }
}
```

## Priority Order

1. **Auth pages** (login, register) - ✅ COMPLETE
2. **Dashboard layouts** - Critical navigation
3. **Main dashboards** - High visibility
4. **Settings pages** - Moderate usage
5. **Feature components** - Specific features
6. **API messages** - Error handling
7. **Toast notifications** - User feedback

## Progress Tracking

Track your progress by updating this table:

| Page/Component | Status | Strings Migrated | Commit |
|----------------|--------|------------------|--------|
| Login | ✅ Complete | 12 | abc123 |
| Register | ✅ Complete | 15 | abc124 |
| Dashboard Layout | ⚪ Pending | 0 | - |
| Patient Dashboard | ⚪ Pending | 0 | - |
| ... | ... | ... | ... |

## Common Gotchas

### 1. Server vs Client Components

- Client components: Use `useTranslations()`
- Server components: Use `getTranslations()` (async)

### 2. Don't Forget 'use client'

If using hooks, component must have `'use client'` directive.

### 3. Namespace Typos

Common mistake: `useTranslations('commons')` instead of `useTranslations('common')`

### 4. Missing Keys

Always add keys to BOTH `pt-BR.json` and `en-US.json`

### 5. JSON Syntax

Watch out for trailing commas in JSON files (not allowed)

## Need Help?

- Check: `/docs/I18N_GUIDE.md` - Complete i18n documentation
- Check: `/docs/I18N_MIGRATION_GUIDE.md` - Detailed migration guide
- Search existing migrations in git history: `git log --grep="i18n"`

---

**Happy Migrating!** 🌍🎉
