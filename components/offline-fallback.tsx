'use client'

import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, Home } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export interface OfflineFallbackProps {
  /**
   * Title of the fallback message
   */
  title?: string

  /**
   * Description/message
   */
  message?: string

  /**
   * Show retry button
   */
  showRetry?: boolean

  /**
   * Show home button
   */
  showHome?: boolean

  /**
   * Custom className
   */
  className?: string

  /**
   * Callback when retry is clicked
   */
  onRetry?: () => void
}

export function OfflineFallback({
  title = 'Você está offline',
  message = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.',
  showRetry = true,
  showHome = true,
  className,
  onRetry
}: OfflineFallbackProps) {
  const { isOnline, checkConnectivity } = useOnlineStatus()
  const [isChecking, setIsChecking] = useState(false)

  const handleRetry = async () => {
    setIsChecking(true)

    if (onRetry) {
      onRetry()
    }

    await checkConnectivity()

    // Reload page if online
    if (navigator.onLine) {
      window.location.reload()
    }

    setIsChecking(false)
  }

  // Auto-reload when connection is restored
  useEffect(() => {
    if (isOnline) {
      window.location.reload()
    }
  }, [isOnline])

  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center bg-background p-4',
        className
      )}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <WifiOff className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{message}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted p-4">
            <h4 className="mb-2 font-medium">Dicas:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Verifique se o Wi-Fi ou dados móveis estão ativados</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Tente alternar entre Wi-Fi e dados móveis</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Verifique se o modo avião está desativado</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Suas alterações foram salvas localmente e serão sincronizadas quando você voltar online</span>
              </li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          {showRetry && (
            <Button
              onClick={handleRetry}
              disabled={isChecking}
              className="w-full sm:flex-1"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </>
              )}
            </Button>
          )}
          {showHome && (
            <Button
              variant="outline"
              asChild
              className="w-full sm:flex-1"
            >
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Voltar ao Início
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

/**
 * Simplified offline fallback for embedded use
 */
export function OfflineMessage({ className }: { className?: string }) {
  const { isOnline } = useOnlineStatus({ enablePing: false })

  if (isOnline) {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-destructive/50 bg-destructive/10 p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <WifiOff className="h-5 w-5 text-destructive" />
        <div className="flex-1">
          <h4 className="mb-1 font-medium text-destructive">Você está offline</h4>
          <p className="text-sm text-muted-foreground">
            Suas alterações serão salvas localmente e sincronizadas quando você voltar online.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Full page offline fallback
 */
export function OfflinePage() {
  return (
    <OfflineFallback
      title="Você está offline"
      message="Esta página requer uma conexão com a internet. Por favor, verifique sua conexão e tente novamente."
      showRetry={true}
      showHome={true}
    />
  )
}
