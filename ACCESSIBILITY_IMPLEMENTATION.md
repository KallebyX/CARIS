# CÁRIS Accessibility Implementation Guide

This guide helps you integrate the new accessibility features into the CÁRIS platform.

## Quick Start

### 1. Install Dependencies

The following dependency is needed for accessibility testing:

```bash
pnpm add -D jest-axe
```

All other dependencies are already installed.

### 2. Update Jest Configuration

Add the accessibility test setup to your Jest config:

**jest.config.js** (or create if doesn't exist):

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/__tests__/accessibility/setup.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
  ],
}
```

### 3. Add Global CSS for Screen Reader Classes

Add these utility classes to your global CSS file (e.g., `app/globals.css`):

```css
/* Screen reader only - visually hidden but accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Screen reader only but visible on focus */
.sr-only.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

These classes should already be in Tailwind CSS, but adding them ensures consistency.

## Integration Steps

### Step 1: Add Screen Reader Announcer Provider

Wrap your app with the `AnnouncerProvider` in your root layout:

**app/layout.tsx**:

```tsx
import { AnnouncerProvider } from '@/components/sr-announcer'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AnnouncerProvider>
          {children}
        </AnnouncerProvider>
      </body>
    </html>
  )
}
```

### Step 2: Add Skip Links

Add skip navigation links to your main layout:

**app/layout.tsx** or **components/layout/header.tsx**:

```tsx
import { SkipToMainContent, SkipLinks } from '@/components/keyboard-shortcuts'

export default function Layout({ children }) {
  return (
    <>
      {/* Option 1: Simple skip to main */}
      <SkipToMainContent targetId="main-content" />

      {/* Option 2: Multiple skip links */}
      <SkipLinks links={[
        { href: '#main-content', label: 'Skip to main content' },
        { href: '#navigation', label: 'Skip to navigation' },
        { href: '#search', label: 'Skip to search' }
      ]} />

      {/* Your layout content */}
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  )
}
```

### Step 3: Update Forms

Replace existing form components with accessible versions:

**Before**:
```tsx
<form>
  <label>Email</label>
  <input type="email" />
  {error && <span>{error}</span>}
</form>
```

**After**:
```tsx
import { AccessibleForm, FormField, AccessibleInput } from '@/components/forms/accessible-form'

<AccessibleForm errors={errors}>
  <FormField
    name="email"
    label="Email"
    required
    description="We'll never share your email"
  >
    <AccessibleInput type="email" />
  </FormField>
</AccessibleForm>
```

### Step 4: Add Loading States to Buttons

Update button components to show loading states:

**Before**:
```tsx
<button disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</button>
```

**After**:
```tsx
import { Button } from '@/components/ui/button'

<Button
  isLoading={isLoading}
  loadingText="Saving changes..."
>
  Submit
</Button>
```

### Step 5: Add Keyboard Shortcuts

Add keyboard shortcuts dialog to your app:

**components/layout/header.tsx**:

```tsx
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts'

export function Header() {
  return (
    <header>
      {/* Your header content */}
      <KeyboardShortcutsDialog />
    </header>
  )
}
```

### Step 6: Add Announcements for Dynamic Content

Add screen reader announcements for state changes:

**Example - Chat Messages**:
```tsx
import { ChatMessageAnnouncer } from '@/components/sr-announcer'

function ChatMessage({ message, sender, isOwn }) {
  return (
    <>
      <ChatMessageAnnouncer
        message={message.text}
        sender={sender.name}
        isOwnMessage={isOwn}
        timestamp={message.timestamp}
      />
      {/* Message UI */}
    </>
  )
}
```

**Example - Form Submission**:
```tsx
import { useAnnouncer } from '@/components/sr-announcer'

function MyForm() {
  const { announcePolite, announceAssertive } = useAnnouncer()

  const handleSubmit = async () => {
    try {
      announcePolite('Saving changes...')
      await saveData()
      announcePolite('Changes saved successfully')
    } catch (error) {
      announceAssertive('Error: Unable to save changes')
    }
  }
}
```

**Example - Route Changes**:
```tsx
import { RouteAnnouncer } from '@/components/sr-announcer'

function Page() {
  return (
    <>
      <RouteAnnouncer title="Dashboard - CÁRIS" />
      {/* Page content */}
    </>
  )
}
```

## Component-Specific Updates

### Chat Interface

```tsx
import { useKeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { ChatMessageAnnouncer } from '@/components/sr-announcer'

function ChatInterface() {
  const [messages, setMessages] = useState([])

  // Add keyboard shortcuts
  useKeyboardShortcuts([
    {
      keys: ['Ctrl', 'Enter'],
      description: 'Send message',
      action: sendMessage
    },
    {
      keys: ['Alt', 'Up'],
      description: 'Previous message',
      action: () => navigateMessages(-1)
    }
  ])

  return (
    <div>
      {messages.map(msg => (
        <>
          <ChatMessageAnnouncer
            key={msg.id}
            message={msg.text}
            sender={msg.sender}
          />
          <div>{msg.text}</div>
        </>
      ))}
    </div>
  )
}
```

### Diary Entries

```tsx
import { AccessibleForm, FormField, AccessibleTextarea } from '@/components/forms/accessible-form'
import { Button } from '@/components/ui/button'

function DiaryEntryForm({ onSubmit, errors }) {
  return (
    <AccessibleForm errors={errors} onSubmit={onSubmit}>
      <FormField
        name="title"
        label="Entry Title"
        required
        description="Give your entry a meaningful title"
      >
        <AccessibleInput />
      </FormField>

      <FormField
        name="content"
        label="Entry Content"
        required
      >
        <AccessibleTextarea rows={10} />
      </FormField>

      <Button type="submit" isLoading={isSubmitting}>
        Save Entry
      </Button>
    </AccessibleForm>
  )
}
```

### Modal Dialogs

```tsx
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

function ConfirmDialog({ isOpen, onClose, onConfirm }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        closeButtonLabel="Cancel and close dialog"
        onClose={onClose}
      >
        <DialogTitle>Confirm Action</DialogTitle>
        <p>Are you sure you want to proceed?</p>
        <div>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="destructive">
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

## Testing Your Changes

### 1. Run Automated Tests

```bash
# Run all accessibility tests
pnpm test __tests__/accessibility

# Run with coverage
pnpm test __tests__/accessibility --coverage

# Watch mode for development
pnpm test __tests__/accessibility --watch
```

### 2. Manual Keyboard Testing

1. Tab through the entire page
2. Verify all interactive elements are reachable
3. Check that focus indicators are visible
4. Test all keyboard shortcuts
5. Ensure no keyboard traps exist

### 3. Screen Reader Testing

**With NVDA (Windows)**:
1. Download NVDA from https://www.nvaccess.org/
2. Start NVDA (Ctrl+Alt+N)
3. Navigate your app with arrow keys
4. Verify all content is announced properly

**With VoiceOver (Mac)**:
1. Enable VoiceOver (Cmd+F5)
2. Navigate with VO+arrow keys
3. Test all interactive elements
4. Verify announcements are clear

### 4. Visual Testing

```bash
# Test at different zoom levels
- 100% (baseline)
- 200% (WCAG requirement)
- 400% (extreme case)

# Test different contrast modes
- Light mode
- Dark mode
- High contrast mode
```

### 5. Use Browser Extensions

- Install **axe DevTools** extension
- Run audit on each page
- Fix any violations reported

## Common Patterns

### Pattern 1: Accessible Button with Icon

```tsx
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

// Icon-only button
<Button
  size="icon"
  variant="ghost"
  aria-label="Delete entry"
>
  <Trash2 aria-hidden="true" />
</Button>

// Button with icon and text
<Button leftIcon={<Trash2 />}>
  Delete Entry
</Button>
```

### Pattern 2: Loading State

```tsx
import { Button } from '@/components/ui/button'

<Button
  isLoading={isSubmitting}
  loadingText="Saving your changes..."
  onClick={handleSave}
>
  Save Changes
</Button>
```

### Pattern 3: Form with Validation

```tsx
import { AccessibleForm, FormField, AccessibleInput } from '@/components/forms/accessible-form'

function MyForm() {
  const [errors, setErrors] = useState({})

  return (
    <AccessibleForm
      errors={errors}
      onValidationError={(errors) => {
        console.log('Form has errors:', errors)
      }}
    >
      <FormField
        name="email"
        label="Email Address"
        required
        description="Enter your email"
        error={errors.email}
      >
        <AccessibleInput type="email" />
      </FormField>

      <FormField
        name="password"
        label="Password"
        required
        description="Must be at least 8 characters"
        error={errors.password}
      >
        <AccessibleInput type="password" />
      </FormField>

      <Button type="submit">Sign In</Button>
    </AccessibleForm>
  )
}
```

### Pattern 4: Announcements

```tsx
import { useAnnouncer } from '@/components/sr-announcer'

function MyComponent() {
  const { announcePolite, announceAssertive } = useAnnouncer()

  // Success - use polite
  const handleSuccess = () => {
    announcePolite('Operation completed successfully')
  }

  // Error - use assertive
  const handleError = () => {
    announceAssertive('Error: Operation failed')
  }

  // Info - use polite
  const handleInfo = () => {
    announcePolite('3 new messages received')
  }
}
```

## Checklist for New Features

When adding new features, ensure:

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] ARIA labels are provided where needed
- [ ] Form fields have labels and descriptions
- [ ] Error messages are clear and announced
- [ ] Loading states are announced
- [ ] Color contrast meets WCAG AA
- [ ] Works with screen readers
- [ ] No keyboard traps exist
- [ ] Skip links work properly
- [ ] Automated tests pass
- [ ] Manual testing completed

## Migration Guide

### Migrating Existing Components

1. **Update Button Components**
   ```diff
   - <button disabled={loading}>
   -   {loading ? 'Loading...' : 'Submit'}
   - </button>
   + <Button isLoading={loading} loadingText="Saving...">
   +   Submit
   + </Button>
   ```

2. **Update Form Components**
   ```diff
   - <input type="email" />
   + <AccessibleInput type="email" />
   ```

3. **Update Dialog Components**
   ```diff
   - <DialogContent>
   + <DialogContent closeButtonLabel="Close settings">
   ```

4. **Add Announcements**
   ```diff
   const handleSave = async () => {
   +   announcePolite('Saving changes...')
     await save()
   +   announcePolite('Changes saved')
   }
   ```

## Troubleshooting

### Issue: Tests failing with "toHaveNoViolations is not a function"

**Solution**: Ensure jest-axe is imported in test setup:
```typescript
import { toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)
```

### Issue: Screen reader not announcing changes

**Solution**: Ensure AnnouncerProvider is wrapping your app and use proper politeness:
```tsx
announceAssertive('Important message') // For errors
announcePolite('Information') // For updates
```

### Issue: Keyboard focus not visible

**Solution**: Check that focus-visible classes are applied:
```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### Issue: Form errors not showing

**Solution**: Ensure field is touched before showing errors:
```tsx
<FormField name="email" label="Email">
  <AccessibleInput onBlur={() => setFieldTouched('email')} />
</FormField>
```

## Next Steps

1. Review the [ACCESSIBILITY.md](./ACCESSIBILITY.md) for full documentation
2. Check [__tests__/accessibility/README.md](./__tests__/accessibility/README.md) for testing details
3. Run accessibility tests regularly: `pnpm test __tests__/accessibility`
4. Test with actual screen readers before major releases
5. Monitor user feedback for accessibility issues

## Support

For questions or issues:
- Check the main [ACCESSIBILITY.md](./ACCESSIBILITY.md) documentation
- Review example tests in `__tests__/accessibility/`
- Consult the component source code for usage examples

---

*Remember: Accessibility is an ongoing process, not a one-time task. Regularly test and improve!*
