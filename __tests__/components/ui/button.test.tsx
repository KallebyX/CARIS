import React from 'react'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      // Arrange & Act
      render(<Button>Click me</Button>)

      // Assert
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })

    it('should render as child component when asChild is true', () => {
      // Arrange & Act
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )

      // Assert
      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/test')
    })

    it('should apply custom className', () => {
      // Arrange & Act
      render(<Button className="custom-class">Button</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      // Arrange & Act
      render(<Button>Default</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary')
      expect(button).toHaveClass('text-primary-foreground')
    })

    it('should apply destructive variant styles', () => {
      // Arrange & Act
      render(<Button variant="destructive">Delete</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive')
      expect(button).toHaveClass('text-destructive-foreground')
    })

    it('should apply outline variant styles', () => {
      // Arrange & Act
      render(<Button variant="outline">Outline</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
      expect(button).toHaveClass('bg-background')
    })

    it('should apply secondary variant styles', () => {
      // Arrange & Act
      render(<Button variant="secondary">Secondary</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary')
    })

    it('should apply ghost variant styles', () => {
      // Arrange & Act
      render(<Button variant="ghost">Ghost</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
    })

    it('should apply link variant styles', () => {
      // Arrange & Act
      render(<Button variant="link">Link</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-primary')
      expect(button).toHaveClass('underline-offset-4')
    })
  })

  describe('Sizes', () => {
    it('should apply default size styles', () => {
      // Arrange & Act
      render(<Button>Default Size</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
      expect(button).toHaveClass('px-4')
    })

    it('should apply small size styles', () => {
      // Arrange & Act
      render(<Button size="sm">Small</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9')
      expect(button).toHaveClass('px-3')
    })

    it('should apply large size styles', () => {
      // Arrange & Act
      render(<Button size="lg">Large</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-11')
      expect(button).toHaveClass('px-8')
    })

    it('should apply icon size styles', () => {
      // Arrange & Act
      render(<Button size="icon">🔍</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
      expect(button).toHaveClass('w-10')
    })
  })

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      // Arrange & Act
      render(<Button disabled>Disabled</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:pointer-events-none')
      expect(button).toHaveClass('disabled:opacity-50')
    })

    it('should not be clickable when disabled', async () => {
      // Arrange
      const user = userEvent.setup()
      const handleClick = jest.fn()
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      )

      // Act
      const button = screen.getByRole('button')
      await user.click(button)

      // Assert
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Interactions', () => {
    it('should call onClick handler when clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)

      // Act
      const button = screen.getByRole('button')
      await user.click(button)

      // Assert
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple clicks', async () => {
      // Arrange
      const user = userEvent.setup()
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)

      // Act
      const button = screen.getByRole('button')
      await user.click(button)
      await user.click(button)
      await user.click(button)

      // Assert
      expect(handleClick).toHaveBeenCalledTimes(3)
    })

    it('should support keyboard interaction', async () => {
      // Arrange
      const user = userEvent.setup()
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Press me</Button>)

      // Act
      const button = screen.getByRole('button')
      button.focus()
      await user.keyboard('{Enter}')

      // Assert
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have correct role', () => {
      // Arrange & Act
      render(<Button>Accessible</Button>)

      // Assert
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should support aria-label', () => {
      // Arrange & Act
      render(<Button aria-label="Custom label">Icon</Button>)

      // Assert
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument()
    })

    it('should support type attribute', () => {
      // Arrange & Act
      render(<Button type="submit">Submit</Button>)

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('should be focusable', () => {
      // Arrange & Act
      render(<Button>Focusable</Button>)

      // Assert
      const button = screen.getByRole('button')
      button.focus()
      expect(button).toHaveFocus()
    })
  })

  describe('Combined Props', () => {
    it('should apply both variant and size correctly', () => {
      // Arrange & Act
      render(
        <Button variant="destructive" size="lg">
          Large Destructive
        </Button>
      )

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive')
      expect(button).toHaveClass('h-11')
    })

    it('should combine variant, size, and className', () => {
      // Arrange & Act
      render(
        <Button variant="outline" size="sm" className="custom">
          Combined
        </Button>
      )

      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
      expect(button).toHaveClass('h-9')
      expect(button).toHaveClass('custom')
    })
  })
})
