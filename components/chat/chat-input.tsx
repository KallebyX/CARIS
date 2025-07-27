"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<void>
}

export function ChatInput({ onSendMessage }: ChatInputProps) {
  const [content, setContent] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsSending(true)
    await onSendMessage(content)
    setContent("")
    setIsSending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Digite sua mensagem..."
        className="flex-1 bg-white"
        disabled={isSending}
      />
      <Button type="submit" disabled={isSending || !content.trim()}>
        <Send className="w-4 h-4" />
        <span className="sr-only">Enviar</span>
      </Button>
    </form>
  )
}
