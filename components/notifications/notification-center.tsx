"use client"

import { useState } from "react"
import { Bell, CheckCheck, X, AlertTriangle, MessageSquare, Calendar, FileText, Clipboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface NotificationCenterProps {
  userId: number
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead, clearNotifications } =
    useRealtimeNotifications(userId)
  const [isOpen, setIsOpen] = useState(false)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new-message":
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case "session-reminder":
      case "session-update":
        return <Calendar className="h-4 w-4 text-green-500" />
      case "diary-entry":
        return <FileText className="h-4 w-4 text-purple-500" />
      case "task-assigned":
        return <Clipboard className="h-4 w-4 text-orange-500" />
      case "sos-alert":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-l-red-500 bg-red-50"
      case "high":
        return "border-l-orange-500 bg-orange-50"
      case "medium":
        return "border-l-blue-500 bg-blue-50"
      default:
        return "border-l-gray-300 bg-gray-50"
    }
  }

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">{unreadCount > 0 ? `${unreadCount} notificações não lidas` : "Notificações"}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificações</h3>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs text-muted-foreground">{isConnected ? "Online" : "Offline"}</span>
            </div>
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 px-2 text-xs">
                <CheckCheck className="h-3 w-3 mr-1" />
                Marcar todas como lidas
              </Button>
              <Button variant="ghost" size="sm" onClick={clearNotifications} className="h-7 px-2 text-xs">
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          )}
        </DropdownMenuHeader>

        <Separator />

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    p-3 mb-2 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-sm
                    ${getPriorityColor(notification.priority)}
                    ${notification.read ? "opacity-60" : ""}
                  `}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium truncate">{notification.title}</h4>
                        {!notification.read && <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />}
                      </div>

                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{notification.message}</p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.timestamp), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>

                        {notification.priority === "urgent" && (
                          <Badge variant="destructive" className="text-xs">
                            Urgente
                          </Badge>
                        )}

                        {notification.priority === "high" && (
                          <Badge variant="secondary" className="text-xs">
                            Alta
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver todas as notificações
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
