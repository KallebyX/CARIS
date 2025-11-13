import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 active:scale-95",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 active:scale-95",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:scale-95",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70 active:scale-95",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:scale-95",
        link: "text-primary underline-offset-4 hover:underline active:opacity-80",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /**
   * Shows loading spinner and disables button
   */
  isLoading?: boolean
  /**
   * Text to announce to screen readers when loading
   */
  loadingText?: string
  /**
   * Icon to display before children
   */
  leftIcon?: React.ReactNode
  /**
   * Icon to display after children
   */
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    disabled,
    children,
    type = "button",
    "aria-label": ariaLabel,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Determine if button has accessible label
    const hasAccessibleLabel = ariaLabel || (typeof children === 'string' && children.length > 0)

    // For icon-only buttons, ensure aria-label is provided
    if (size === "icon" && !hasAccessibleLabel && !asChild) {
      console.warn('Icon buttons should have an aria-label for accessibility')
    }

    const content = (
      <>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : leftIcon ? (
          <span aria-hidden="true">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon ? (
          <span aria-hidden="true">{rightIcon}</span>
        ) : null}
      </>
    )

    return (
      <Comp
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        aria-disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {content}
        {isLoading && (
          <span className="sr-only">
            {loadingText || 'Loading...'}
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
