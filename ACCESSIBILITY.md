# CÁRIS Platform Accessibility Guide

CÁRIS is committed to providing an inclusive, accessible mental health platform that meets WCAG 2.1 Level AA standards. This document outlines our accessibility features, guidelines, and best practices.

## Table of Contents

- [Overview](#overview)
- [Accessibility Features](#accessibility-features)
- [Keyboard Navigation](#keyboard-navigation)
- [Screen Reader Support](#screen-reader-support)
- [Color and Contrast](#color-and-contrast)
- [Focus Management](#focus-management)
- [Form Accessibility](#form-accessibility)
- [Testing Guidelines](#testing-guidelines)
- [Known Issues](#known-issues)
- [Resources](#resources)

## Overview

### Our Commitment

CÁRIS is designed to be accessible to all users, including those who:
- Use screen readers (NVDA, JAWS, VoiceOver, TalkBack)
- Navigate with keyboard only
- Require high contrast modes
- Need reduced motion settings
- Use voice control software
- Require assistive technologies

### Standards Compliance

We follow:
- **WCAG 2.1 Level AA** as our baseline standard
- **WAI-ARIA 1.2** for rich interactive components
- **Section 508** compliance for US accessibility requirements
- **EN 301 549** for European accessibility standards

### Mental Health Specific Considerations

As a mental health platform, we pay special attention to:
- **Crisis accessibility**: Emergency features are highly accessible
- **Privacy**: Screen reader announcements respect confidentiality
- **Cognitive load**: Clear, simple interactions with minimal distraction
- **Stress reduction**: Calm, predictable interface with reduced motion support

## Accessibility Features

### 1. Keyboard Navigation

All functionality is fully accessible via keyboard:

#### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + 0` | Skip to main content |
| `Alt + 1` | Skip to navigation |
| `Alt + H` | Go to home/dashboard |
| `Alt + C` | Open chat/messages |
| `Alt + S` | View sessions |
| `Alt + D` | Open diary entries |
| `Alt + P` | Go to profile/settings |
| `?` | Show keyboard shortcuts help |
| `Ctrl + K` | Open command palette/search |
| `Escape` | Close dialog/modal |

#### Chat Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Send message |
| `Alt + Up` | Previous message |
| `Alt + Down` | Next message |

#### Form Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save form (when applicable) |
| `Tab` | Move to next field |
| `Shift + Tab` | Move to previous field |
| `Enter` | Submit form/activate button |
| `Space` | Toggle checkbox/radio |

### 2. Skip Links

Every page includes skip navigation links for keyboard users:
- Skip to main content
- Skip to navigation
- Skip to search

These links are visually hidden but become visible when focused.

### 3. Focus Management

#### Focus Indicators
- All interactive elements have visible focus indicators
- Focus ring follows platform conventions (2px outline)
- Keyboard focus is distinct from mouse hover

#### Focus Traps
- Modals and dialogs trap focus within themselves
- Tab cycles through modal contents
- Escape key closes modals
- Focus returns to trigger element when modal closes

#### Auto-Focus
- Forms auto-focus the first field when opened
- Error summaries auto-focus when validation fails
- Search inputs auto-focus when search is opened

### 4. Screen Reader Support

#### Live Regions
Screen readers announce:
- Form validation errors
- Status messages (success, error, info)
- Loading states
- New chat messages
- Notifications
- Route changes

#### ARIA Labels
All interactive elements have clear, descriptive labels:
- Buttons describe their action
- Form inputs have associated labels
- Icons include text alternatives
- Complex widgets use ARIA patterns

#### Semantic HTML
We use semantic HTML elements:
- `<main>` for main content
- `<nav>` for navigation
- `<article>` for diary entries
- `<section>` for content sections
- Proper heading hierarchy (h1-h6)

### 5. Visual Accessibility

#### Color Contrast
- Text contrast meets WCAG AA (4.5:1 minimum)
- Large text contrast meets WCAG AA (3:1 minimum)
- UI components meet contrast requirements
- Color is never the only indicator

#### Responsive Text
- All text can be resized up to 200% without loss of functionality
- Uses relative units (rem/em) for text sizing
- Supports browser zoom up to 400%

#### Reduced Motion
- Respects `prefers-reduced-motion` setting
- Animations can be disabled
- Essential motion is preserved (e.g., loading indicators)

#### High Contrast
- Works in Windows High Contrast Mode
- Forced colors mode supported
- Custom high contrast theme available

## Keyboard Navigation

### General Navigation

#### Tab Order
Tab order follows visual layout:
1. Skip links (when focused)
2. Main navigation
3. Page header
4. Main content (left to right, top to bottom)
5. Sidebar (if present)
6. Footer

#### Arrow Key Navigation
Lists and grids support arrow key navigation:
- `↑↓` Navigate vertically
- `←→` Navigate horizontally
- `Home` First item
- `End` Last item
- `Page Up/Down` Scroll by page

### Modal Dialogs

When a modal opens:
1. Focus moves to the modal
2. Tab cycles through modal elements
3. Shift+Tab cycles backward
4. Escape closes the modal
5. Focus returns to trigger element

Example:
```tsx
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

<Dialog>
  <DialogContent>
    <DialogTitle>Accessible Dialog</DialogTitle>
    {/* Focus is automatically managed */}
    <input type="text" /> {/* Auto-focused */}
    <button>Save</button>
  </DialogContent>
</Dialog>
```

### Forms

#### Field Navigation
- Tab moves between fields
- Arrow keys select options in dropdowns
- Enter submits forms
- Space toggles checkboxes

#### Error Handling
When validation fails:
1. Error summary appears at top
2. Error summary receives focus
3. Errors link to respective fields
4. Fields marked with aria-invalid
5. Error messages announced to screen readers

### Chat Interface

The chat interface is fully keyboard accessible:

1. **Message List**
   - Tab into message list
   - ↑↓ arrows navigate messages
   - Enter opens message actions

2. **Compose Message**
   - Tab to message input
   - Type message
   - Ctrl+Enter sends message
   - Escape cancels editing

3. **Attachments**
   - Tab to attachment button
   - Enter/Space to open file picker
   - Standard file dialog keyboard shortcuts

## Screen Reader Support

### Tested Screen Readers

CÁRIS is tested with:
- **NVDA** (Windows) - Primary
- **JAWS** (Windows) - Secondary
- **VoiceOver** (macOS/iOS) - Primary
- **TalkBack** (Android) - Secondary

### Announcements

#### Status Updates
```tsx
import { useAnnouncer } from '@/components/sr-announcer'

function MyComponent() {
  const { announcePolite, announceAssertive } = useAnnouncer()

  const handleSave = async () => {
    announcePolite('Saving changes...')
    await save()
    announcePolite('Changes saved successfully')
  }

  const handleError = () => {
    announceAssertive('Error: Unable to save changes')
  }
}
```

#### Live Regions
We use ARIA live regions for dynamic content:
- `aria-live="polite"` for non-critical updates
- `aria-live="assertive"` for important alerts
- `role="status"` for status messages
- `role="alert"` for error messages

#### Form Errors
```tsx
import { AccessibleForm, FormField } from '@/components/forms/accessible-form'

<AccessibleForm errors={errors}>
  {/* Error summary announced automatically */}
  <FormField name="email" label="Email" required>
    <input type="email" />
    {/* Errors announced when field is validated */}
  </FormField>
</AccessibleForm>
```

### Best Practices

1. **Descriptive Labels**: All interactive elements have clear labels
2. **Context**: Related information is grouped logically
3. **Feedback**: Actions provide immediate feedback
4. **Errors**: Clear, actionable error messages
5. **Progress**: Loading states are announced

## Color and Contrast

### Contrast Ratios

We meet WCAG AA standards:

| Element Type | Minimum Ratio | Our Standard |
|--------------|--------------|--------------|
| Normal text | 4.5:1 | 4.5:1+ |
| Large text | 3:1 | 4.5:1+ |
| UI components | 3:1 | 3:1+ |
| Graphics | 3:1 | 3:1+ |

### Checking Contrast

Use our built-in contrast checker:

```typescript
import { checkContrast } from '@/lib/color-contrast'

const result = checkContrast('#000000', '#ffffff')
console.log(result.ratio) // 21
console.log(result.passesAA) // true
console.log(result.score) // 'AAA'
```

### Color Independence

Information is never conveyed by color alone:
- Links are underlined
- Errors use icons + text
- Status uses icons + labels
- Charts use patterns + colors

### Theme Support

CÁRIS supports multiple themes:
- Light mode (default)
- Dark mode
- High contrast mode
- Custom themes (maintaining contrast)

## Focus Management

### Focus Indicators

All focusable elements have clear indicators:
- 2px outline ring
- Contrasting color
- Visible in all themes
- Respects system preferences

### Focus Trapping

Modals and dialogs trap focus:

```tsx
import { useFocusTrap } from '@/hooks/use-focus-trap'

function Modal({ isOpen }) {
  const ref = useFocusTrap({
    enabled: isOpen,
    onEscape: closeModal,
    restoreFocus: true
  })

  return <div ref={ref}>{/* Modal content */}</div>
}
```

### Focus Restoration

When closing overlays:
1. Focus returns to trigger element
2. Scroll position is maintained
3. Context is preserved

### Roving Tabindex

Lists use roving tabindex pattern:

```tsx
import { useRovingTabIndex } from '@/hooks/use-focus-management'

function List({ items }) {
  const { getItemProps } = useRovingTabIndex(items.length)

  return (
    <div role="list">
      {items.map((item, index) => (
        <div
          role="listitem"
          {...getItemProps(index)}
        >
          {item.name}
        </div>
      ))}
    </div>
  )
}
```

## Form Accessibility

### Labels and Descriptions

Every form field has:
- Associated `<label>` element
- Required indicator (*)
- Help text (when needed)
- Error messages (when invalid)

Example:
```tsx
<FormField
  name="email"
  label="Email Address"
  required
  description="We'll never share your email"
  error={errors.email}
>
  <AccessibleInput type="email" />
</FormField>
```

### Error Handling

Form validation follows these principles:

1. **Error Summary**
   - Appears at top of form
   - Receives focus automatically
   - Lists all errors
   - Links to problem fields

2. **Inline Errors**
   - Appear below field
   - Associated with aria-describedby
   - Announced to screen readers
   - Include suggestions for fixing

3. **Visual Indicators**
   - Red border for invalid fields
   - Error icon
   - Error message text
   - Maintains color contrast

### Required Fields

Required fields are clearly marked:
- Visual asterisk (*)
- aria-required="true"
- Label includes "(required)"
- Screen reader announces requirement

### Input Constraints

Provide helpful constraints:
- Format examples (e.g., "MM/DD/YYYY")
- Character limits
- Validation rules
- Real-time feedback

## Testing Guidelines

### Manual Testing

#### Keyboard Testing Checklist

- [ ] Can reach all interactive elements with Tab
- [ ] Tab order is logical
- [ ] All actions work with keyboard
- [ ] Focus indicators are visible
- [ ] No keyboard traps
- [ ] Escape closes dialogs
- [ ] Enter activates buttons
- [ ] Arrow keys navigate lists

#### Screen Reader Testing Checklist

- [ ] All images have alt text
- [ ] All buttons have labels
- [ ] Form fields have labels
- [ ] Errors are announced
- [ ] Page title is descriptive
- [ ] Headings are hierarchical
- [ ] Live regions announce updates
- [ ] Loading states are announced

#### Visual Testing Checklist

- [ ] Text at 200% zoom is readable
- [ ] Page works at 400% zoom
- [ ] High contrast mode works
- [ ] Reduced motion works
- [ ] Color contrast meets AA
- [ ] No information by color only

### Automated Testing

Run automated accessibility tests:

```bash
# Run all accessibility tests
pnpm test __tests__/accessibility

# Run specific component tests
pnpm test __tests__/accessibility/button.test.tsx

# Generate coverage report
pnpm test __tests__/accessibility --coverage
```

### Browser Extensions

Recommended testing tools:
- **axe DevTools** - Comprehensive accessibility testing
- **WAVE** - Visual feedback on accessibility
- **Lighthouse** - Automated accessibility audit
- **NVDA** - Free screen reader for testing

## Known Issues

### Current Limitations

1. **Chat Message Threading**
   - Screen reader navigation could be improved
   - Working on better ARIA relationships

2. **Mood Tracking Graphs**
   - Data tables available as alternative
   - Improving chart accessibility

3. **File Upload Drag-and-Drop**
   - Keyboard alternative provided
   - Improving feedback

### Planned Improvements

- [ ] Voice control optimization
- [ ] Better keyboard shortcuts documentation
- [ ] Improved screen reader announcements for real-time features
- [ ] Enhanced focus management for complex workflows
- [ ] Additional high contrast themes

### Reporting Issues

If you encounter accessibility barriers:

1. **Email**: accessibility@caris-platform.com
2. **GitHub**: Open an issue with [A11Y] prefix
3. **In-app**: Use the accessibility feedback form

Please include:
- Description of the barrier
- Your assistive technology setup
- Steps to reproduce
- Expected vs actual behavior

## Best Practices for Developers

### Component Development

When creating components:

1. **Use Semantic HTML**
   ```tsx
   // Good
   <button onClick={handleClick}>Save</button>

   // Avoid
   <div onClick={handleClick}>Save</div>
   ```

2. **Add ARIA When Needed**
   ```tsx
   <button
     aria-label="Close dialog"
     aria-pressed={isPressed}
   >
     <X />
   </button>
   ```

3. **Test with Keyboard**
   - Tab through your component
   - Try all interactions
   - Check focus indicators

4. **Run Automated Tests**
   ```tsx
   it('should not have accessibility violations', async () => {
     const { container } = render(<MyComponent />)
     const results = await axe(container)
     expect(results).toHaveNoViolations()
   })
   ```

### Common Patterns

#### Loading States
```tsx
<Button isLoading loadingText="Saving changes...">
  Save
</Button>
```

#### Icon Buttons
```tsx
<Button size="icon" aria-label="Delete item">
  <Trash2 aria-hidden="true" />
</Button>
```

#### Form Fields
```tsx
<FormField
  name="password"
  label="Password"
  required
  description="Must be at least 8 characters"
>
  <AccessibleInput type="password" />
</FormField>
```

#### Announcements
```tsx
const { announcePolite } = useAnnouncer()

useEffect(() => {
  if (dataLoaded) {
    announcePolite('Data loaded successfully')
  }
}, [dataLoaded])
```

## Resources

### Standards and Guidelines

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

### Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

### Training

- [WebAIM Articles](https://webaim.org/articles/)
- [Deque University](https://dequeuniversity.com/)
- [Google Accessibility Course](https://web.dev/accessibility/)
- [Microsoft Accessibility Fundamentals](https://docs.microsoft.com/en-us/learn/paths/accessibility-fundamentals/)

### Community

- [A11y Slack](https://web-a11y.slack.com/)
- [WebAIM Discussion List](https://webaim.org/discussion/)
- [Stack Overflow - Accessibility](https://stackoverflow.com/questions/tagged/accessibility)

## Support

For accessibility support or questions:

- **Documentation**: Check this guide and inline code comments
- **Issues**: Report via GitHub with [A11Y] tag
- **Email**: accessibility@caris-platform.com
- **Internal**: #accessibility Slack channel

---

*Last updated: 2025-11-12*
*WCAG 2.1 Level AA Compliant*
*Tested with NVDA, JAWS, VoiceOver, and TalkBack*
