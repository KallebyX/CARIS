'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

export function ServiceWorkerRegister() {
  const { toast } = useToast()
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[SW Register] Service Worker not supported')
      return
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        console.log('[SW Register] Registering service worker...')

        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        })

        setRegistration(reg)
        console.log('[SW Register] Service Worker registered successfully')

        // Check for updates immediately
        reg.update()

        // Check for updates every hour
        setInterval(() => {
          console.log('[SW Register] Checking for updates...')
          reg.update()
        }, 60 * 60 * 1000)

        // Listen for waiting service worker
        reg.addEventListener('updatefound', () => {
          console.log('[SW Register] Update found')
          const newWorker = reg.installing

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              console.log('[SW Register] Service Worker state:', newWorker.state)

              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('[SW Register] New version available')
                setWaitingWorker(newWorker)
                setShowUpdate(true)

                toast({
                  title: 'Atualização disponível',
                  description: 'Uma nova versão do CÁRIS está disponível.',
                  action: (
                    <button
                      onClick={() => updateServiceWorker()}
                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      Atualizar
                    </button>
                  ),
                  duration: 0 // Don't auto-dismiss
                })
              }
            })
          }
        })

        // Listen for controlling service worker change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[SW Register] Controller changed, reloading...')
          window.location.reload()
        })

        // Send message to service worker
        if (reg.active) {
          reg.active.postMessage({ type: 'CLIENT_READY' })
        }

      } catch (error) {
        console.error('[SW Register] Service Worker registration failed:', error)

        toast({
          title: 'Erro ao registrar Service Worker',
          description: 'Algumas funcionalidades offline podem não estar disponíveis.',
          variant: 'destructive'
        })
      }
    }

    registerServiceWorker()

    // Cleanup
    return () => {
      // Optional: unregister service worker if needed
    }
  }, [toast])

  const updateServiceWorker = () => {
    if (waitingWorker) {
      console.log('[SW Register] Activating new service worker...')

      // Tell the waiting service worker to skip waiting
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      setShowUpdate(false)

      toast({
        title: 'Atualizando...',
        description: 'A página será recarregada em instantes.'
      })
    }
  }

  // Listen for app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('[SW Register] App installed')

      toast({
        title: 'CÁRIS instalado!',
        description: 'Você pode acessar o CÁRIS diretamente da tela inicial.'
      })
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [toast])

  // Handle beforeinstallprompt event
  useEffect(() => {
    let deferredPrompt: any = null

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[SW Register] Before install prompt')

      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()

      // Stash the event so it can be triggered later
      deferredPrompt = e

      // Show install prompt after a delay
      setTimeout(() => {
        if (deferredPrompt) {
          toast({
            title: 'Instalar CÁRIS',
            description: 'Adicione o CÁRIS à sua tela inicial para acesso rápido.',
            action: (
              <button
                onClick={async () => {
                  if (deferredPrompt) {
                    deferredPrompt.prompt()
                    const { outcome } = await deferredPrompt.userChoice
                    console.log('[SW Register] Install prompt outcome:', outcome)
                    deferredPrompt = null
                  }
                }}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Instalar
              </button>
            ),
            duration: 10000
          })
        }
      }, 5000) // Show after 5 seconds
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [toast])

  // This component doesn't render anything
  return null
}

// Utility function to check if service worker is supported
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator
}

// Utility function to check if app is running in standalone mode (installed as PWA)
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

// Utility function to send message to service worker
export function sendMessageToSW(message: any): void {
  if (typeof window === 'undefined' || !navigator.serviceWorker.controller) {
    console.warn('[SW Register] No service worker controller available')
    return
  }

  navigator.serviceWorker.controller.postMessage(message)
}

// Utility function to trigger service worker update
export function triggerSWUpdate(): void {
  if (typeof window === 'undefined') return

  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration) {
      console.log('[SW Register] Triggering manual update check')
      registration.update()
    }
  })
}

// Utility function to unregister service worker
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      const result = await registration.unregister()
      console.log('[SW Register] Service Worker unregistered:', result)
      return result
    }
    return false
  } catch (error) {
    console.error('[SW Register] Failed to unregister service worker:', error)
    return false
  }
}
