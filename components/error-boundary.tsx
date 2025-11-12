"use client"

import React from "react"
import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCcw, Home } from "lucide-react"

// ================================================================
// ERROR BOUNDARY FALLBACK COMPONENT
// ================================================================

interface ErrorFallbackProps {
  error: Error
  errorInfo: React.ErrorInfo | null
  resetError: () => void
}

function ErrorFallback({ error, errorInfo, resetError }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === "development"

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-card border border-destructive/20 rounded-lg shadow-lg p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-destructive/10 p-4 rounded-full">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-center mb-4">
            Algo deu errado
          </h1>

          {/* Error Message */}
          <p className="text-muted-foreground text-center mb-6">
            Pedimos desculpas, mas algo inesperado aconteceu. Nossa equipe foi
            notificada e estamos trabalhando para resolver o problema.
          </p>

          {/* Development Mode Error Details */}
          {isDevelopment && (
            <div className="mb-6 p-4 bg-muted rounded-md">
              <h2 className="text-sm font-semibold mb-2 text-destructive">
                Error Details (Development Only):
              </h2>
              <pre className="text-xs overflow-auto max-h-64 bg-background p-3 rounded border">
                <code>{error.message}</code>
              </pre>
              {errorInfo && (
                <>
                  <h3 className="text-sm font-semibold mt-4 mb-2 text-destructive">
                    Component Stack:
                  </h3>
                  <pre className="text-xs overflow-auto max-h-64 bg-background p-3 rounded border">
                    <code>{errorInfo.componentStack}</code>
                  </pre>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={resetError} className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Tentar Novamente
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Ir para Início
            </Button>
          </div>

          {/* Support Contact */}
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Se o problema persistir, entre em contato com{" "}
              <a
                href="mailto:support@caris.com"
                className="text-primary hover:underline"
              >
                support@caris.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ================================================================
// ERROR BOUNDARY COMPONENT
// ================================================================

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showDialog?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error("Error Boundary caught an error:", error, errorInfo)

    // Update state with error info
    this.setState({
      errorInfo,
    })

    // Report error to Sentry
    Sentry.captureException(error, {
      level: "error",
      tags: {
        component: "ErrorBoundary",
        errorBoundary: true,
      },
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Show error dialog if enabled (Sentry Feedback)
    if (this.props.showDialog && typeof window !== "undefined") {
      const eventId = Sentry.lastEventId()
      if (eventId) {
        Sentry.showReportDialog({
          eventId,
          title: "Parece que encontramos um problema",
          subtitle: "Nossa equipe foi notificada.",
          subtitle2:
            "Se você gostaria de nos ajudar, conte-nos o que aconteceu abaixo.",
          labelName: "Nome",
          labelEmail: "Email",
          labelComments: "O que aconteceu?",
          labelClose: "Fechar",
          labelSubmit: "Enviar",
          successMessage: "Seu feedback foi enviado. Obrigado!",
        })
      }
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Render custom fallback if provided
      const FallbackComponent = this.props.fallback || ErrorFallback

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      )
    }

    // Render children normally
    return this.props.children
  }
}

// ================================================================
// ASYNC ERROR BOUNDARY (FOR SUSPENSE)
// ================================================================

interface AsyncErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AsyncErrorBoundary({
  children,
  fallback,
}: AsyncErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center max-w-md p-6">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Erro ao carregar</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message || "Ocorreu um erro ao carregar este componente."}
            </p>
            <Button onClick={resetError} size="sm">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </div>
      )}
    >
      <React.Suspense
        fallback={
          fallback || (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  )
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

/**
 * Wrap a component with an error boundary
 * Useful for isolating errors in specific components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || "Component"
  })`

  return WrappedComponent
}

/**
 * Hook to manually trigger error boundary
 * Useful for async errors
 */
export function useErrorBoundary() {
  const [, setError] = React.useState()

  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error
      })
    },
    [setError]
  )
}
