/**
 * Accessible Form Components
 * WCAG 2.1 Level AA Compliant Form Utilities
 *
 * Features:
 * - Automatic error announcements for screen readers
 * - Required field indicators
 * - Field descriptions and help text
 * - Validation feedback
 * - Error summary at top of form
 */

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { generateId, formatErrorMessage, ariaLabels } from "@/lib/accessibility-utils"
import { useAnnouncer } from "@/lib/accessibility-utils"
import { AlertCircle, Info } from "lucide-react"

/**
 * Form context to manage form-level errors and validation
 */
interface FormContextValue {
  errors: Record<string, string | string[]>
  touched: Record<string, boolean>
  registerField: (name: string) => void
  setFieldError: (name: string, error: string | string[]) => void
  setFieldTouched: (name: string) => void
}

const FormContext = React.createContext<FormContextValue | undefined>(undefined)

function useFormContext() {
  const context = React.useContext(FormContext)
  if (!context) {
    throw new Error("Form components must be used within AccessibleForm")
  }
  return context
}

/**
 * Main Form component with error summary and accessibility features
 */
interface AccessibleFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /**
   * Form errors by field name
   */
  errors?: Record<string, string | string[]>
  /**
   * Whether to show error summary at top of form
   */
  showErrorSummary?: boolean
  /**
   * Custom error summary title
   */
  errorSummaryTitle?: string
  /**
   * Callback when form submission fails validation
   */
  onValidationError?: (errors: Record<string, string | string[]>) => void
}

export function AccessibleForm({
  children,
  errors = {},
  showErrorSummary = true,
  errorSummaryTitle = "Please fix the following errors:",
  onValidationError,
  onSubmit,
  className,
  ...props
}: AccessibleFormProps) {
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  const [fields, setFields] = React.useState<Set<string>>(new Set())
  const errorSummaryRef = React.useRef<HTMLDivElement>(null)
  const announce = useAnnouncer('assertive')

  const hasErrors = Object.keys(errors).length > 0

  // Focus error summary when errors appear
  React.useEffect(() => {
    if (hasErrors && errorSummaryRef.current) {
      errorSummaryRef.current.focus()
      announce(`Form has ${Object.keys(errors).length} errors. ${errorSummaryTitle}`)
    }
  }, [hasErrors, errorSummaryTitle, announce])

  const registerField = React.useCallback((name: string) => {
    setFields((prev) => new Set(prev).add(name))
  }, [])

  const setFieldError = React.useCallback((name: string, error: string | string[]) => {
    // This would integrate with your form library
  }, [])

  const setFieldTouched = React.useCallback((name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
  }, [])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (hasErrors) {
      event.preventDefault()
      onValidationError?.(errors)
      return
    }
    onSubmit?.(event)
  }

  const contextValue: FormContextValue = {
    errors,
    touched,
    registerField,
    setFieldError,
    setFieldTouched
  }

  const errorEntries = Object.entries(errors)

  return (
    <FormContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        className={cn("space-y-6", className)}
        noValidate
        {...props}
      >
        {showErrorSummary && hasErrors && (
          <div
            ref={errorSummaryRef}
            role="alert"
            aria-labelledby="error-summary-title"
            tabIndex={-1}
            className="rounded-lg border border-destructive bg-destructive/10 p-4 focus:outline-none focus:ring-2 focus:ring-destructive"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <h2 id="error-summary-title" className="text-sm font-semibold text-destructive mb-2">
                  {errorSummaryTitle}
                </h2>
                <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                  {errorEntries.map(([fieldName, fieldErrors]) => {
                    const errorArray = Array.isArray(fieldErrors) ? fieldErrors : [fieldErrors]
                    return errorArray.map((error, index) => (
                      <li key={`${fieldName}-${index}`}>
                        <a
                          href={`#${fieldName}`}
                          className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-destructive rounded"
                          onClick={(e) => {
                            e.preventDefault()
                            document.getElementById(fieldName)?.focus()
                          }}
                        >
                          {fieldName}: {error}
                        </a>
                      </li>
                    ))
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}
        {children}
      </form>
    </FormContext.Provider>
  )
}

/**
 * Form Field wrapper with label, description, and error handling
 */
interface FormFieldProps {
  /**
   * Field name (must be unique)
   */
  name: string
  /**
   * Field label
   */
  label: string
  /**
   * Whether field is required
   */
  required?: boolean
  /**
   * Help text or description
   */
  description?: string
  /**
   * Custom error message (overrides context errors)
   */
  error?: string | string[]
  /**
   * Additional CSS class
   */
  className?: string
  /**
   * Child input element
   */
  children: React.ReactNode
}

export function FormField({
  name,
  label,
  required = false,
  description,
  error: customError,
  className,
  children
}: FormFieldProps) {
  const { errors, touched, registerField, setFieldTouched } = useFormContext()
  const fieldId = React.useId()
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = `${fieldId}-error`

  React.useEffect(() => {
    registerField(name)
  }, [name, registerField])

  const fieldError = customError || errors[name]
  const showError = fieldError && touched[name]
  const errorArray = fieldError ? (Array.isArray(fieldError) ? fieldError : [fieldError]) : []

  // Clone children to add ARIA attributes
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        id: name,
        name,
        'aria-required': required,
        'aria-invalid': showError ? true : undefined,
        'aria-describedby': cn(
          descriptionId,
          showError && errorId
        ),
        onBlur: () => setFieldTouched(name),
        ...child.props
      } as any)
    }
    return child
  })

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={name}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{description}</span>
        </p>
      )}

      {enhancedChildren}

      {showError && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive flex items-start gap-2"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            {errorArray.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Accessible Input Field
 */
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Input error state
   */
  isInvalid?: boolean
}

export const AccessibleInput = React.forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ className, isInvalid, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          isInvalid && "border-destructive focus-visible:ring-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
AccessibleInput.displayName = "AccessibleInput"

/**
 * Accessible Textarea Field
 */
interface AccessibleTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Textarea error state
   */
  isInvalid?: boolean
}

export const AccessibleTextarea = React.forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(
  ({ className, isInvalid, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          isInvalid && "border-destructive focus-visible:ring-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
AccessibleTextarea.displayName = "AccessibleTextarea"

/**
 * Required Field Indicator
 */
export function RequiredIndicator({ className }: { className?: string }) {
  return (
    <abbr
      title="required"
      aria-label="required"
      className={cn("text-destructive no-underline ml-1", className)}
    >
      *
    </abbr>
  )
}

/**
 * Field Help Text
 */
interface FieldHelpTextProps {
  children: React.ReactNode
  id?: string
  className?: string
}

export function FieldHelpText({ children, id, className }: FieldHelpTextProps) {
  return (
    <p id={id} className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  )
}

/**
 * Field Error Message
 */
interface FieldErrorProps {
  children: React.ReactNode
  id?: string
  className?: string
}

export function FieldError({ children, id, className }: FieldErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={cn("text-sm text-destructive", className)}
    >
      {children}
    </p>
  )
}
