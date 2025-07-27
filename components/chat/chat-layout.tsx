"use client"

import { useState, useEffect } from "react"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { Card } from "@/components/ui/card"
import Pusher from "pusher-js"

interface Message {
  id: number
  senderId: number
  receiverId: number
  content: string
  createdAt: string
}

interface ChatLayoutProps {
  counterpartId: number
  counterpartName: string
  currentUser: { id: number; role: "psychologist" | "patient" }
}

export function ChatLayout({ counterpartId, counterpartName, currentUser }: ChatLayoutProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Função para criar um nome de canal consistente
  const getChannelName = (id1: number, id2: number) => {
    return `private-chat-${Math.min(id1, id2)}-${Math.max(id1, id2)}`
  }

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      setError(null)
      try {
        // Para psicólogos, precisamos passar o patientId como query param
        const apiUrl = currentUser.role === "psychologist" ? `/api/chat?patientId=${counterpartId}` : "/api/chat"

        const res = await fetch(apiUrl)
        if (!res.ok) {
          throw new Error("Não foi possível carregar as mensagens.")
        }
        const data = await res.json()
        setMessages(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Configuração do Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
      auth: {
        headers: {
          "Content-Type": "application/json",
        },
      },
    })

    const channelName = getChannelName(currentUser.id, counterpartId)
    const channel = pusher.subscribe(channelName)

    channel.bind("new-message", (newMessage: Message) => {
      // Evita adicionar a mensagem que o próprio usuário enviou (já adicionada localmente)
      if (newMessage.senderId !== currentUser.id) {
        setMessages((prevMessages) => [...prevMessages, newMessage])
      }
    })

    // Limpeza ao desmontar o componente
    return () => {
      pusher.unsubscribe(channelName)
      pusher.disconnect()
    }
  }, [counterpartId, currentUser.id])

  const handleSendMessage = async (content: string) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: counterpartId, content }),
      })

      if (!res.ok) {
        throw new Error("Falha ao enviar mensagem.")
      }

      const newMessage = await res.json()
      // Adiciona a mensagem enviada localmente para uma resposta instantânea
      setMessages((prevMessages) => [...prevMessages, newMessage])
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err)
      // Poderíamos mostrar um toast de erro aqui
    }
  }

  return (
    <Card className="h-[70vh] flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-slate-800">Chat com {counterpartName}</h2>
        <p className="text-sm text-slate-500">Comunicação segura e assíncrona</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <p className="text-center text-slate-500">Carregando histórico de mensagens...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && !error && <ChatMessages messages={messages} currentUserId={currentUser.id} />}
      </div>
      <div className="p-4 border-t bg-slate-50">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </Card>
  )
}
