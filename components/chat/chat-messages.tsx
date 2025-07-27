"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Message {
  id: number
  senderId: number
  content: string
  createdAt: string
}

interface ChatMessagesProps {
  messages: Message[]
  currentUserId: number
}

export function ChatMessages({ messages, currentUserId }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Nenhuma mensagem ainda. Inicie a conversa!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn("flex items-end gap-2", message.senderId === currentUserId ? "justify-end" : "justify-start")}
        >
          <div
            className={cn(
              "max-w-xs md:max-w-md lg:max-w-lg rounded-2xl px-4 py-2",
              message.senderId === currentUserId
                ? "bg-caris-teal text-white rounded-br-none"
                : "bg-slate-200 text-slate-800 rounded-bl-none",
            )}
          >
            <p className="text-sm">{message.content}</p>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}
