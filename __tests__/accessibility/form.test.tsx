/**
 * Accessibility tests for Form components
 * Tests WCAG 2.1 Level AA compliance
 */

import { render, screen, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import {
  AccessibleForm,
  FormField,
  AccessibleInput,
  AccessibleTextarea
} from '@/components/forms/accessible-form'

expect.extend(toHaveNoViolations)

describe('Accessible Form Components', () => {
  describe('AccessibleForm', () => {
    it('should render error summary with proper ARIA attributes', () => {
      const errors = {
        email: 'Email is required',
        password: 'Password must be at least 8 characters'
      }

      render(
        <AccessibleForm errors={errors}>
          <div>Form content</div>
        </AccessibleForm>
      )

      const errorSummary = screen.getByRole('alert')
      expect(errorSummary).toBeInTheDocument()
      expect(errorSummary).toHaveAttribute('aria-labelledby', 'error-summary-title')
    })

    it('should focus error summary when errors appear', async () => {
      const { rerender } = render(
        <AccessibleForm errors={{}}>
          <div>Form content</div>
        </AccessibleForm>
      )

      const errors = {
        email: 'Email is required'
      }

      rerender(
        <AccessibleForm errors={errors}>
          <div>Form content</div>
        </AccessibleForm>
      )

      await waitFor(() => {
        const errorSummary = screen.getByRole('alert')
        expect(errorSummary).toHaveFocus()
      })
    })

    it('should render error links that focus field on click', async () => {
      const user = userEvent.setup()
      const errors = {
        email: 'Email is required'
      }

      render(
        <AccessibleForm errors={errors}>
          <FormField name="email" label="Email">
            <AccessibleInput id="email" />
          </FormField>
        </AccessibleForm>
      )

      const errorLink = screen.getByRole('link', { name: /email: email is required/i })
      await user.click(errorLink)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveFocus()
    })

    it('should not render error summary when showErrorSummary is false', () => {
      const errors = {
        email: 'Email is required'
      }

      render(
        <AccessibleForm errors={errors} showErrorSummary={false}>
          <div>Form content</div>
        </AccessibleForm>
      )

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <AccessibleForm errors={{}}>
          <FormField name="email" label="Email" required>
            <AccessibleInput />
          </FormField>
        </AccessibleForm>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('FormField', () => {
    it('should associate label with input using htmlFor', () => {
      render(
        <AccessibleForm>
          <FormField name="email" label="Email">
            <AccessibleInput />
          </FormField>
        </AccessibleForm>
      )

      const input = screen.getByLabelText('Email')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('id', 'email')
    })

    it('should display required indicator', () => {
      render(
        <AccessibleForm>
          <FormField name="email" label="Email" required>
            <AccessibleInput />
          </FormField>
        </AccessibleForm>
      )

      const requiredIndicator = screen.getByText('*')
      expect(requiredIndicator).toBeInTheDocument()
      expect(requiredIndicator).toHaveAttribute('aria-label', 'required')
    })

    it('should associate description with input using aria-describedby', () => {
      render(
        <AccessibleForm>
          <FormField
            name="password"
            label="Password"
            description="Must be at least 8 characters"
          >
            <AccessibleInput />
          </FormField>
        </AccessibleForm>
      )

      const input = screen.getByLabelText('Password')
      const description = screen.getByText('Must be at least 8 characters')

      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(description.id))
    })

    it('should display error message with proper ARIA attributes', () => {
      const errors = {
        email: 'Email is required'
      }

      render(
        <AccessibleForm errors={errors}>
          <FormField name="email" label="Email">
            <AccessibleInput />
          </FormField>
        </AccessibleForm>
      )

      // Error won't show until field is touched
      const input = screen.getByLabelText('Email')
      input.blur()

      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })

    it('should mark input as invalid when error exists', () => {
      const errors = {
        email: 'Email is required'
      }

      render(
        <AccessibleForm errors={errors}>
          <FormField name="email" label="Email">
            <AccessibleInput />
          </FormField>
        </AccessibleForm>
      )

      const input = screen.getByLabelText('Email')
      input.blur()

      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('should mark input as required', () => {
      render(
        <AccessibleForm>
          <FormField name="email" label="Email" required>
            <AccessibleInput />
          </FormField>
        </AccessibleForm>
      )

      const input = screen.getByLabelText(/email/i)
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <AccessibleForm>
          <FormField
            name="email"
            label="Email"
            required
            description="Enter your email address"
          >
            <AccessibleInput />
          </FormField>
        </AccessibleForm>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('AccessibleInput', () => {
    it('should apply error styles when isInvalid is true', () => {
      render(<AccessibleInput isInvalid />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-destructive')
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<AccessibleInput placeholder="Type here" />)

      const input = screen.getByPlaceholderText('Type here')

      await user.tab()
      expect(input).toHaveFocus()

      await user.keyboard('Hello')
      expect(input).toHaveValue('Hello')
    })

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <label htmlFor="test-input">
          Test Input
          <AccessibleInput id="test-input" />
        </label>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('AccessibleTextarea', () => {
    it('should apply error styles when isInvalid is true', () => {
      render(<AccessibleTextarea isInvalid />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('border-destructive')
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<AccessibleTextarea placeholder="Type here" />)

      const textarea = screen.getByPlaceholderText('Type here')

      await user.tab()
      expect(textarea).toHaveFocus()

      await user.keyboard('Hello{Enter}World')
      expect(textarea).toHaveValue('Hello\nWorld')
    })

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <label htmlFor="test-textarea">
          Test Textarea
          <AccessibleTextarea id="test-textarea" />
        </label>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should allow tabbing through form fields', async () => {
      const user = userEvent.setup()

      render(
        <AccessibleForm>
          <FormField name="firstName" label="First Name">
            <AccessibleInput />
          </FormField>
          <FormField name="lastName" label="Last Name">
            <AccessibleInput />
          </FormField>
          <FormField name="email" label="Email">
            <AccessibleInput />
          </FormField>
        </AccessibleForm>
      )

      const firstName = screen.getByLabelText('First Name')
      const lastName = screen.getByLabelText('Last Name')
      const email = screen.getByLabelText('Email')

      await user.tab()
      expect(firstName).toHaveFocus()

      await user.tab()
      expect(lastName).toHaveFocus()

      await user.tab()
      expect(email).toHaveFocus()
    })

    it('should allow shift+tab to navigate backwards', async () => {
      const user = userEvent.setup()

      render(
        <AccessibleForm>
          <FormField name="firstName" label="First Name">
            <AccessibleInput />
          </FormField>
          <FormField name="lastName" label="Last Name">
            <AccessibleInput />
          </FormField>
        </AccessibleForm>
      )

      const firstName = screen.getByLabelText('First Name')
      const lastName = screen.getByLabelText('Last Name')

      lastName.focus()
      expect(lastName).toHaveFocus()

      await user.tab({ shift: true })
      expect(firstName).toHaveFocus()
    })
  })
})
