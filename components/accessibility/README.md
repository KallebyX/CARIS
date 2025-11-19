# Accessibility Components

Accessible components and utilities for the CÁRIS platform to maintain WCAG 2.1 Level AA compliance.

## Quick Start

```tsx
import {
  SkipLink,
  LiveAnnouncer,
  VisuallyHidden,
  useAnnounce,
} from '@/components/accessibility'
```

---

## Components

### SkipLink

Provides a "Skip to main content" link for keyboard users (WCAG 2.1 Level A - 2.4.1 Bypass Blocks).

**Usage**:
```tsx
// In root layout (app/layout.tsx)
import { SkipLinkPT } from '@/components/accessibility'

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <SkipLinkPT />
        <header>...</header>
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  )
}
```

**Features**:
- Visually hidden by default
- Becomes visible when focused
- Styled with primary colors
- Keyboard accessible
- Available in English (`SkipLink`) and Portuguese (`SkipLinkPT`)

---

### LiveAnnouncer

Announces dynamic content changes to screen readers (WCAG 2.1 Level AA - 4.1.3 Status Messages).

**Basic Usage**:
```tsx
import { LiveAnnouncer } from '@/components/accessibility'

function FormSubmit() {
  const [status, setStatus] = useState('')

  const handleSubmit = async () => {
    setStatus('Submitting...')
    await submitForm()
    setStatus('Form submitted successfully')
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* form fields */}
      </form>
      <LiveAnnouncer message={status} />
    </>
  )
}
```

**Props**:
- `message` (string, required): Message to announce
- `priority` ('polite' | 'assertive'): Announcement priority
  - `'polite'`: Waits for pause in speech (default)
  - `'assertive'`: Interrupts current speech
- `atomic` (boolean): Announce entire region vs just changes (default: true)
- `clearAfter` (number): Clear message after delay in ms

**Priority Guidelines**:
- Use `'polite'` for most announcements (status updates, success messages)
- Use `'assertive'` for urgent messages (errors, warnings, alerts)

**Examples**:

```tsx
// Success message (polite)
<LiveAnnouncer message="Saved successfully" priority="polite" />

// Error message (assertive)
<LiveAnnouncer message="Error: Please try again" priority="assertive" />

// Clear after 3 seconds
<LiveAnnouncer message={status} clearAfter={3000} />
```

---

### LoadingAnnouncer

Specialized announcer for loading states.

**Usage**:
```tsx
import { LoadingAnnouncer } from '@/components/accessibility'

function DataTable() {
  const { data, isLoading } = useQuery('data')

  return (
    <>
      <LoadingAnnouncer
        loading={isLoading}
        loadingMessage="Loading table data..."
        completeMessage="Table data loaded successfully"
      />
      {isLoading ? <Skeleton /> : <Table data={data} />}
    </>
  )
}
```

---

### useAnnounce Hook

Programmatic announcements without mounting a component.

**Usage**:
```tsx
import { useAnnounce } from '@/components/accessibility'

function EditForm() {
  const announce = useAnnounce()

  const handleSave = async () => {
    try {
      await saveChanges()
      announce('Changes saved successfully', 'polite')
    } catch (error) {
      announce('Error saving changes', 'assertive')
    }
  }

  const handleDelete = async () => {
    announce('Item deleted', 'polite')
  }

  return <form onSubmit={handleSave}>...</form>
}
```

**Parameters**:
- `message` (string): Message to announce
- `priority` ('polite' | 'assertive'): Priority level (default: 'polite')

---

### VisuallyHidden

Hides content visually while keeping it accessible to screen readers.

**Usage**:
```tsx
import { VisuallyHidden } from '@/components/accessibility'

// Icon-only button
function DeleteButton() {
  return (
    <button onClick={handleDelete}>
      <TrashIcon />
      <VisuallyHidden>Delete item</VisuallyHidden>
    </button>
  )
}

// Avatar link with context
function UserAvatar() {
  return (
    <a href="/profile">
      <Avatar src={user.avatar} />
      <VisuallyHidden>View profile for {user.name}</VisuallyHidden>
    </a>
  )
}

// Search input label
function SearchBar() {
  return (
    <>
      <VisuallyHidden as="label" htmlFor="search">
        Search the site
      </VisuallyHidden>
      <input
        id="search"
        type="search"
        placeholder="Search..."
      />
    </>
  )
}
```

**Props**:
- `children` (ReactNode, required): Content to hide
- `className` (string): Additional CSS classes
- `as` ('span' | 'div' | 'p' | 'label'): Element type (default: 'span')

**When to Use**:
- Icon-only buttons that need accessible labels
- Additional context for screen readers
- Form labels when design doesn't show them
- Instructions that aren't visually necessary

**Don't Use**:
- Content that should be visible to everyone
- Content that's duplicated elsewhere
- As a replacement for proper semantic HTML

---

### FocusVisible

Makes content visible only when focused (useful for skip links).

**Usage**:
```tsx
import { FocusVisible } from '@/components/accessibility'

<FocusVisible>
  <a href="#main">Skip to main content</a>
</FocusVisible>
```

---

## Utility Functions

### hasAccessibleText

Checks if an element has accessible text for screen readers.

```tsx
import { hasAccessibleText } from '@/components/accessibility'

const button = document.querySelector('button')
if (!hasAccessibleText(button)) {
  console.warn('Button is missing accessible text')
}
```

Checks for:
- Text content
- `aria-label`
- `aria-labelledby`
- `title` attribute
- `alt` attribute (for images)

### warnIfNoAccessibleText

Development helper that warns about missing accessible text.

```tsx
import { warnIfNoAccessibleText } from '@/components/accessibility'

function IconButton({ onClick }) {
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    warnIfNoAccessibleText(ref.current, 'IconButton')
  }, [])

  return (
    <button ref={ref} onClick={onClick}>
      <Icon />
    </button>
  )
}
```

Only runs in development mode.

---

## Best Practices

### 1. Always Provide Text Alternatives

```tsx
// ❌ BAD: No accessible text
<button onClick={handleClick}>
  <TrashIcon />
</button>

// ✅ GOOD: Hidden text
<button onClick={handleClick}>
  <TrashIcon />
  <VisuallyHidden>Delete</VisuallyHidden>
</button>

// ✅ ALSO GOOD: aria-label
<button onClick={handleClick} aria-label="Delete">
  <TrashIcon />
</button>

// ✅ BEST: Visible text
<button onClick={handleClick}>
  <TrashIcon />
  <span>Delete</span>
</button>
```

### 2. Announce Dynamic Content

```tsx
// ❌ BAD: No announcement
function SaveButton() {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    save()
    setSaved(true) // Screen readers won't know
  }

  return <button onClick={handleSave}>Save</button>
}

// ✅ GOOD: Announce status
function SaveButton() {
  const announce = useAnnounce()

  const handleSave = () => {
    save()
    announce('Saved successfully')
  }

  return <button onClick={handleSave}>Save</button>
}
```

### 3. Provide Context for Icons

```tsx
// ❌ BAD: Icon without context
<StarIcon filled={isFavorite} />

// ✅ GOOD: With screen reader text
<span>
  <StarIcon filled={isFavorite} />
  <VisuallyHidden>
    {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
  </VisuallyHidden>
</span>
```

### 4. Use Semantic HTML

```tsx
// ❌ BAD: Div as button
<div onClick={handleClick}>
  <TrashIcon />
  <VisuallyHidden>Delete</VisuallyHidden>
</div>

// ✅ GOOD: Proper button element
<button onClick={handleClick}>
  <TrashIcon />
  <VisuallyHidden>Delete</VisuallyHidden>
</button>
```

### 5. Don't Rely Only on Color

```tsx
// ❌ BAD: Color only
<span style={{ color: 'red' }}>Error</span>

// ✅ GOOD: Color + icon + text
<span className="text-red-600">
  <AlertIcon />
  Error: Please check your input
</span>
```

---

## Testing Accessibility

### Manual Testing

1. **Keyboard Navigation**:
   ```
   - Tab through entire interface
   - Verify all interactive elements reachable
   - Check focus indicators are visible
   - Test Enter/Space to activate
   ```

2. **Screen Reader Testing**:
   ```
   - Mac: VoiceOver (Cmd+F5)
   - Windows: NVDA (free)
   - Verify announcements are heard
   - Check element descriptions make sense
   ```

3. **Zoom Testing**:
   ```
   - Zoom to 200%
   - Verify no content is cut off
   - Check no horizontal scrolling
   ```

### Automated Testing

```bash
# Install testing tools
npm install --save-dev @axe-core/react @testing-library/react

# Run in your tests
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

test('should be accessible', async () => {
  const { container } = render(<MyComponent />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

## Common Patterns

### Loading State

```tsx
import { LoadingAnnouncer } from '@/components/accessibility'

function DataView() {
  const { data, isLoading } = useData()

  return (
    <>
      <LoadingAnnouncer loading={isLoading} />
      {isLoading ? <Skeleton /> : <DataTable data={data} />}
    </>
  )
}
```

### Form Submission

```tsx
import { LiveAnnouncer, useAnnounce } from '@/components/accessibility'

function ContactForm() {
  const announce = useAnnounce()
  const [status, setStatus] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('Submitting...')

    try {
      await submitForm()
      announce('Form submitted successfully', 'polite')
      setStatus('')
    } catch (error) {
      announce('Error submitting form', 'assertive')
      setStatus('Please try again')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* fields */}
      <button type="submit">Submit</button>
      {status && <p role="alert">{status}</p>}
    </form>
  )
}
```

### Icon Button

```tsx
import { VisuallyHidden } from '@/components/accessibility'

function IconButton({ icon: Icon, label, ...props }) {
  return (
    <button {...props}>
      <Icon />
      <VisuallyHidden>{label}</VisuallyHidden>
    </button>
  )
}

// Usage
<IconButton icon={TrashIcon} label="Delete item" onClick={handleDelete} />
```

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Accessibility Audit](../../../docs/ACCESSIBILITY_AUDIT.md)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

---

## Support

For accessibility questions or issues:
1. Check the [Accessibility Audit](../../../docs/ACCESSIBILITY_AUDIT.md)
2. Review WCAG 2.1 guidelines
3. Test with screen readers
4. Consult with accessibility team
