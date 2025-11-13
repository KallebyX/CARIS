# Accessibility Test Suite

This directory contains automated accessibility tests for the CÁRIS platform, ensuring WCAG 2.1 Level AA compliance.

## Overview

Our accessibility testing strategy includes:

1. **Automated Testing with jest-axe**: Catches common accessibility violations
2. **Keyboard Navigation Testing**: Ensures all functionality is keyboard accessible
3. **ARIA Attribute Testing**: Validates proper use of ARIA attributes
4. **Focus Management Testing**: Ensures proper focus behavior
5. **Screen Reader Testing**: Manual testing with actual screen readers

## Running Tests

```bash
# Run all accessibility tests
pnpm test __tests__/accessibility

# Run specific test file
pnpm test __tests__/accessibility/button.test.tsx

# Run tests in watch mode
pnpm test __tests__/accessibility --watch

# Generate coverage report
pnpm test __tests__/accessibility --coverage
```

## Test Files

- `button.test.tsx` - Button component accessibility tests
- `form.test.tsx` - Form component accessibility tests
- `utils.test.ts` - Accessibility utility function tests
- `setup.ts` - Test environment configuration

## What We Test

### 1. Automated Accessibility Checks (jest-axe)

Uses the axe-core engine to automatically detect:
- Missing alt text on images
- Form inputs without labels
- Insufficient color contrast
- Invalid ARIA attributes
- Missing landmark roles
- Heading hierarchy issues
- And many more WCAG violations

### 2. Keyboard Navigation

Tests that all interactive elements:
- Are focusable via Tab key
- Can be activated with Enter or Space
- Support arrow key navigation where appropriate
- Have visible focus indicators
- Maintain logical tab order

### 3. ARIA Attributes

Validates:
- Proper use of aria-label and aria-labelledby
- Correct aria-describedby associations
- Valid aria-invalid and aria-required states
- Appropriate live region announcements
- Correct role attributes

### 4. Focus Management

Ensures:
- Focus is trapped in modals/dialogs
- Focus is restored when closing overlays
- Initial focus is set correctly
- Focus doesn't get lost during interactions

### 5. Screen Reader Compatibility

Tests that:
- Loading states are announced
- Error messages are read aloud
- Dynamic content changes are announced
- Form validation feedback is accessible
- Status updates are communicated

## Adding New Tests

When adding a new component, create a test file that covers:

```typescript
describe('Component Accessibility', () => {
  describe('ARIA Attributes', () => {
    // Test proper ARIA attributes
  })

  describe('Keyboard Navigation', () => {
    // Test keyboard interactions
  })

  describe('Focus Management', () => {
    // Test focus behavior
  })

  describe('Axe Accessibility Tests', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<Component />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})
```

## Best Practices

1. **Test with Real Screen Readers**: Automated tests catch ~50% of issues. Always test with:
   - NVDA (Windows)
   - JAWS (Windows)
   - VoiceOver (macOS/iOS)
   - TalkBack (Android)

2. **Test Keyboard Navigation Manually**: Tab through your entire application to verify:
   - Logical tab order
   - Visible focus indicators
   - All functionality is keyboard accessible
   - No keyboard traps

3. **Test with Different User Settings**:
   - High contrast mode
   - Large text sizes
   - Reduced motion preferences
   - Different zoom levels

4. **Test Real User Flows**: Don't just test individual components; test complete user journeys.

5. **Keep Tests Fast**: Use automated tests for quick feedback, manual testing for thorough validation.

## Common Issues and Solutions

### Issue: jest-axe reports color contrast violations
**Solution**: Use the color contrast checker utility to verify colors meet WCAG standards.

### Issue: Focus trap not working in tests
**Solution**: Ensure the modal/dialog is rendered in the document body and has focusable elements.

### Issue: ARIA attributes not recognized
**Solution**: Check that you're using valid ARIA attributes from the WAI-ARIA specification.

### Issue: Keyboard events not firing
**Solution**: Use `userEvent` from `@testing-library/user-event` instead of `fireEvent`.

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [Testing Library Accessibility](https://testing-library.com/docs/queries/about/#accessibility)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

## Contributing

When contributing accessibility improvements:

1. Add automated tests for new features
2. Update existing tests when changing behavior
3. Document any manual testing performed
4. Include accessibility considerations in PR descriptions
5. Test with at least one screen reader before submitting

## Accessibility Checklist

Before marking a PR as ready for review, ensure:

- [ ] All automated tests pass
- [ ] No jest-axe violations
- [ ] Keyboard navigation works correctly
- [ ] Focus indicators are visible
- [ ] ARIA attributes are correct
- [ ] Tested with a screen reader
- [ ] Color contrast meets WCAG AA
- [ ] Works with browser zoom up to 200%
- [ ] Works with large text settings
- [ ] Respects prefers-reduced-motion
