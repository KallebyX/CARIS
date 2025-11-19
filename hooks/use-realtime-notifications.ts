"use client"

import { useEffect, useState, useCallback } from "react"
import { pusherClient } from "@/lib/pusher"
import { useToast } from "@/hooks/use-toast"
import type { Channel } from "pusher-js"

interface RealtimeNotification {
  id: string
  type: "session-reminder" | "new-message" | "diary-entry" | "sos-alert" | "session-update" | "task-assigned"
  title: string
  message: string
  data?: any
  priority: "low" | "medium" | "high" | "urgent"
  timestamp: string
  userId: number
  read: boolean
}

interface UseRealtimeNotificationsReturn {
  notifications: RealtimeNotification[]
  unreadCount: number
  isConnected: boolean
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
}

export function useRealtimeNotifications(userId: number | null): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const { toast } = useToast()

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  useEffect(() => {
    if (!userId) return

    let userChannel: Channel

    const connectToPusher = () => {
      try {
        // SECURITY: Subscribe to private user channel (requires authorization)
        userChannel = pusherClient.subscribe(`private-user-${userId}`)

        // Note: Removed public urgent-notifications channel for security
        // All notifications now go through the user's private channel

        // Listener para novas notificações
        userChannel.bind("notification", (notification: RealtimeNotification) => {
          console.log("Nova notificação recebida:", notification)

          setNotifications((prev) => [notification, ...prev].slice(0, 50)) // Manter apenas 50 notificações

          // Mostrar toast baseado na prioridade
          const toastVariant = notification.priority === "urgent" ? "destructive" : "default"

          toast({
            title: notification.title,
            description: notification.message,
            variant: toastVariant,
            duration: notification.priority === "urgent" ? 10000 : 5000,
          })

          // Reproduzir som para notificações importantes
          if (notification.priority === "urgent" || notification.priority === "high") {
            try {
              const audio = new Audio("/sounds/notification-urgent.mp3")
              audio.volume = 0.5
              audio.play().catch((e) => console.log("Não foi possível reproduzir o som:", e))
            } catch (error) {
              console.log("Erro ao reproduzir som:", error)
            }
          }

          // Mostrar notificação do navegador se permitido
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(notification.title, {
              body: notification.message,
              icon: "/icons/notification.png",
              badge: "/icons/badge.png",
              tag: notification.id,
              requireInteraction: notification.priority === "urgent",
            })
          }
        })

        // Listener para marcar como lida
        userChannel.bind("notification-read", (data: { notificationId: string }) => {
          markAsRead(data.notificationId)
        })

        // Listener para marcar todas como lidas
        userChannel.bind("all-notifications-read", () => {
          markAllAsRead()
        })

        // Eventos de conexão
        pusherClient.connection.bind("connected", () => {
          console.log("Conectado ao Pusher")
          setIsConnected(true)
        })

        pusherClient.connection.bind("disconnected", () => {
          console.log("Desconectado do Pusher")
          setIsConnected(false)
        })

        pusherClient.connection.bind("error", (error: any) => {
          console.error("Erro na conexão Pusher:", error)
          setIsConnected(false)
        })
      } catch (error) {
        console.error("Erro ao conectar com Pusher:", error)
        setIsConnected(false)
      }
    }

    connectToPusher()

    // Cleanup
    return () => {
      if (userChannel) {
        userChannel.unbind_all()
        pusherClient.unsubscribe(`private-user-${userId}`)
      }
    }
  }, [userId, toast, markAsRead, markAllAsRead])

  // Solicitar permissão para notificações do navegador
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Permissão de notificação:", permission)
      })
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  }
}
