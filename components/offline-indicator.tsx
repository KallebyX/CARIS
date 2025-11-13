'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi, WifiLow, Loader2, RefreshCw } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface OfflineIndicatorProps {
  /**
   * Show detailed status information
   */
  showDetails?: boolean

  /**
   * Show sync status
   */
  showSync?: boolean

  /**
   * Position of the indicator
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline'

  /**
   * Custom className
   */
  className?: string
}

export function OfflineIndicator({
  showDetails = false,
  showSync = true,
  position = 'bottom-right',
  className
}: OfflineIndicatorProps) {
  const {
    isOnline,
    status,
    networkInfo,
    isVerified,
    pendingRequestsCount,
    isSyncing,
    checkConnectivity,
    syncPendingRequests
  } = useOnlineStatus({
    enablePing: true,
    pingInterval: 30000
  })

  const [isVisible, setIsVisible] = useState(false)
  const [showDetails_, setShowDetails_] = useState(false)

  // Show indicator when offline or when there are pending requests
  useEffect(() => {
    setIsVisible(!isOnline || pendingRequestsCount > 0)
  }, [isOnline, pendingRequestsCount])

  // Get status icon
  const getStatusIcon = () => {
    if (isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }

    if (!isOnline) {
      return <WifiOff className="h-4 w-4" />
    }

    if (status === 'slow') {
      return <WifiLow className="h-4 w-4" />
    }

    if (isVerified) {
      return <Wifi className="h-4 w-4" />
    }

    return <WifiLow className="h-4 w-4" />
  }

  // Get status text
  const getStatusText = () => {
    if (isSyncing) {
      return 'Sincronizando...'
    }

    if (!isOnline) {
      return 'Offline'
    }

    if (status === 'slow') {
      return 'Conexão lenta'
    }

    if (!isVerified) {
      return 'Verificando conexão...'
    }

    if (pendingRequestsCount > 0) {
      return `${pendingRequestsCount} pendente${pendingRequestsCount > 1 ? 's' : ''}`
    }

    return 'Online'
  }

  // Get badge variant
  const getBadgeVariant = () => {
    if (!isOnline) {
      return 'destructive'
    }

    if (status === 'slow' || !isVerified) {
      return 'secondary'
    }

    if (pendingRequestsCount > 0) {
      return 'default'
    }

    return 'default'
  }

  // Position classes
  const getPositionClasses = () => {
    if (position === 'inline') {
      return ''
    }

    const baseClasses = 'fixed z-50'

    switch (position) {
      case 'top-left':
        return `${baseClasses} top-4 left-4`
      case 'top-right':
        return `${baseClasses} top-4 right-4`
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`
      default:
        return `${baseClasses} bottom-4 right-4`
    }
  }

  // Don't show anything if online with no pending requests (unless always visible)
  if (!isVisible && position !== 'inline') {
    return null
  }

  const content = (
    <div
      className={cn(
        getPositionClasses(),
        'transition-all duration-300',
        className
      )}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={getBadgeVariant()}
              className={cn(
                'cursor-pointer gap-2 py-2 px-3',
                isSyncing && 'animate-pulse'
              )}
              onClick={() => setShowDetails_(!showDetails_)}
            >
              {getStatusIcon()}
              <span className="text-sm font-medium">{getStatusText()}</span>
              {showSync && pendingRequestsCount > 0 && !isSyncing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    syncPendingRequests()
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{getStatusText()}</p>
              {!isOnline && (
                <p className="text-xs text-muted-foreground">
                  Você está offline. Suas alterações serão salvas localmente.
                </p>
              )}
              {isOnline && pendingRequestsCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Clique para sincronizar agora
                </p>
              )}
              {networkInfo.effectiveType && (
                <p className="text-xs text-muted-foreground">
                  Tipo de conexão: {networkInfo.effectiveType}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Detailed status panel */}
      {(showDetails || showDetails_) && (
        <div className="mt-2 rounded-lg border bg-card p-4 shadow-lg">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Status da Conexão</p>
              <p className="text-xs text-muted-foreground">
                {isOnline ? 'Conectado' : 'Desconectado'}
              </p>
            </div>

            {networkInfo.effectiveType && (
              <div>
                <p className="text-sm font-medium">Tipo de Conexão</p>
                <p className="text-xs text-muted-foreground">
                  {networkInfo.effectiveType.toUpperCase()}
                </p>
              </div>
            )}

            {networkInfo.downlink !== undefined && (
              <div>
                <p className="text-sm font-medium">Velocidade</p>
                <p className="text-xs text-muted-foreground">
                  {networkInfo.downlink} Mbps
                </p>
              </div>
            )}

            {networkInfo.rtt !== undefined && (
              <div>
                <p className="text-sm font-medium">Latência</p>
                <p className="text-xs text-muted-foreground">
                  {networkInfo.rtt} ms
                </p>
              </div>
            )}

            {pendingRequestsCount > 0 && (
              <div>
                <p className="text-sm font-medium">Pendentes</p>
                <p className="text-xs text-muted-foreground">
                  {pendingRequestsCount} {pendingRequestsCount > 1 ? 'requisições' : 'requisição'}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => checkConnectivity()}
                className="flex-1"
              >
                Verificar Conexão
              </Button>
              {pendingRequestsCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => syncPendingRequests()}
                  disabled={!isOnline || isSyncing}
                  className="flex-1"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sincronizando
                    </>
                  ) : (
                    'Sincronizar'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return content
}

/**
 * Simple inline status badge
 */
export function OnlineStatusBadge({ className }: { className?: string }) {
  const { isOnline } = useOnlineStatus({ enablePing: false })

  return (
    <Badge
      variant={isOnline ? 'default' : 'destructive'}
      className={cn('gap-1', className)}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </>
      )}
    </Badge>
  )
}
