/**
 * Accessibility tests for Button component
 * Tests WCAG 2.1 Level AA compliance
 */

import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

expect.extend(toHaveNoViolations)

describe('Button Accessibility', () => {
  describe('ARIA Attributes', () => {
    it('should have proper ARIA attributes for loading state', () => {
      render(<Button isLoading loadingText="Saving changes">Submit</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })

    it('should have proper ARIA attributes for disabled state', () => {
      render(<Button disabled>Submit</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-disabled', 'true')
      expect(button).toBeDisabled()
    })

    it('should have aria-label for icon-only buttons', () => {
      render(<Button size="icon" aria-label="Delete item">X</Button>)

      const button = screen.getByRole('button', { name: 'Delete item' })
      expect(button).toBeInTheDocument()
    })

    it('should warn in console when icon button lacks aria-label', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      render(<Button size="icon">X</Button>)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Icon buttons should have an aria-label for accessibility'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should be focusable via keyboard', async () => {
      const user = userEvent.setup()
      render(<Button>Click me</Button>)

      const button = screen.getByRole('button')

      await user.tab()
      expect(button).toHaveFocus()
    })

    it('should activate on Enter key', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()

      render(<Button onClick={handleClick}>Click me</Button>)

      const button = screen.getByRole('button')
      button.focus()

      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should activate on Space key', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()

      render(<Button onClick={handleClick}>Click me</Button>)

      const button = screen.getByRole('button')
      button.focus()

      await user.keyboard(' ')
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not activate when disabled', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()

      render(<Button disabled onClick={handleClick}>Click me</Button>)

      const button = screen.getByRole('button')
      button.focus()

      await user.keyboard('{Enter}')
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should not activate when loading', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()

      render(<Button isLoading onClick={handleClick}>Click me</Button>)

      const button = screen.getByRole('button')

      await user.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Focus Indicators', () => {
    it('should have visible focus indicator', () => {
      render(<Button>Click me</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:outline-none')
      expect(button).toHaveClass('focus-visible:ring-2')
    })
  })

  describe('Loading State', () => {
    it('should announce loading state to screen readers', () => {
      render(<Button isLoading>Submit</Button>)

      const loadingText = screen.getByText('Loading...')
      expect(loadingText).toHaveClass('sr-only')
    })

    it('should use custom loading text', () => {
      render(<Button isLoading loadingText="Saving changes">Submit</Button>)

      const loadingText = screen.getByText('Saving changes')
      expect(loadingText).toHaveClass('sr-only')
    })

    it('should show loading spinner with aria-hidden', () => {
      const { container } = render(<Button isLoading>Submit</Button>)

      const spinner = container.querySelector('[aria-hidden="true"]')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Semantic HTML', () => {
    it('should use button element by default', () => {
      render(<Button>Click me</Button>)

      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('should have proper type attribute', () => {
      render(<Button type="submit">Submit</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('should default to type="button"', () => {
      render(<Button>Click me</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'button')
    })
  })

  describe('Axe Accessibility Tests', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<Button>Click me</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have violations when disabled', async () => {
      const { container } = render(<Button disabled>Click me</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have violations when loading', async () => {
      const { container } = render(<Button isLoading>Click me</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have violations for icon button with aria-label', async () => {
      const { container } = render(
        <Button size="icon" aria-label="Delete">X</Button>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have violations for all variants', async () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const

      for (const variant of variants) {
        const { container } = render(<Button variant={variant}>Click me</Button>)
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      }
    })
  })
})
