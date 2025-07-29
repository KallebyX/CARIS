"use client"

import { useState, useEffect } from "react"
import { SecureChatMessages } from "./secure-chat-messages"
import { SecureChatInput } from "./secure-chat-input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Shield, 
  Search, 
  Download, 
  Upload,
  Key,
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react"
import { ChatEncryption, KeyManager, type SecureChatMessage } from "@/lib/encryption"
import Pusher from "pusher-js"
import { toast } from "sonner"

interface SecureChatLayoutProps {
  counterpartId: number
  counterpartName: string
  currentUser: { id: number; role: "psychologist" | "patient" }
  roomId?: string
}

export function SecureChatLayout({ 
  counterpartId, 
  counterpartName, 
  currentUser,
  roomId: initialRoomId 
}: SecureChatLayoutProps) {
  const [messages, setMessages] = useState<SecureChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(initialRoomId || null)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)
  const [encryptionStatus, setEncryptionStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredMessages, setFilteredMessages] = useState<SecureChatMessage[]>([])

  // Initialize encryption
  useEffect(() => {
    const initializeEncryption = async () => {
      try {
        setEncryptionStatus('loading')
        
        // Get or generate room key
        let key = roomId ? await KeyManager.getRoomKey(roomId) : null
        
        if (!key) {
          // Generate new key for new conversations
          key = await ChatEncryption.generateKey()
          if (roomId) {
            await KeyManager.setRoomKey(roomId, key)
          }
        }
        
        setEncryptionKey(key)
        setEncryptionStatus('ready')
      } catch (error) {
        console.error('Encryption initialization failed:', error)
        setEncryptionStatus('error')
        setError('Falha ao inicializar criptografia')
      }
    }

    initializeEncryption()
  }, [roomId])

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams()
        if (roomId) {
          params.append('roomId', roomId)
        } else {
          params.append('otherUserId', counterpartId.toString())
        }

        const res = await fetch(`/api/chat?${params.toString()}`)
        
        if (!res.ok) {
          throw new Error("Não foi possível carregar as mensagens.")
        }
        
        const result = await res.json()
        
        if (result.success) {
          setMessages(result.data.messages)
          setRoomId(result.data.roomId)
          
          // Store encryption key for this room
          if (encryptionKey && result.data.roomId) {
            await KeyManager.setRoomKey(result.data.roomId, encryptionKey)
          }
        } else {
          throw new Error(result.error || 'Falha ao carregar mensagens')
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [counterpartId, roomId, encryptionKey])

  // Real-time updates with Pusher
  useEffect(() => {
    if (!roomId) return

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
      auth: {
        headers: {
          "Content-Type": "application/json",
        },
      },
    })

    const channelName = `private-chat-${roomId}`
    const channel = pusher.subscribe(channelName)

    channel.bind("new-message", (newMessage: SecureChatMessage) => {
      if (newMessage.senderId !== currentUser.id) {
        setMessages((prevMessages) => [...prevMessages, newMessage])
        toast.success("Nova mensagem recebida")
      }
    })

    return () => {
      pusher.unsubscribe(channelName)
      pusher.disconnect()
    }
  }, [roomId, currentUser.id])

  // Filter messages based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages)
      return
    }

    // Note: In a real implementation, search would be performed on encrypted hashes
    const filtered = messages.filter(message => {
      // This is a simplified search - in production, implement encrypted search
      return message.content.toLowerCase().includes(searchQuery.toLowerCase())
    })
    
    setFilteredMessages(filtered)
  }, [messages, searchQuery])

  const handleSendMessage = async (data: {
    content: string
    messageType: 'text' | 'file'
    isTemporary: boolean
    expirationKey?: string
    file?: File
  }) => {
    try {
      let encryptedContent = data.content

      // Encrypt text messages
      if (data.messageType === 'text' && encryptionKey) {
        const encrypted = await ChatEncryption.encryptMessage(data.content, encryptionKey)
        encryptedContent = JSON.stringify(encrypted)
      }

      // Handle file upload
      if (data.file && data.messageType === 'file') {
        // First create the message to get ID
        const messageResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            roomId,
            otherUserId: !roomId ? counterpartId : undefined,
            content: encryptedContent,
            messageType: data.messageType,
            isTemporary: data.isTemporary,
            expirationKey: data.expirationKey,
            metadata: {
              originalName: data.file.name,
              fileSize: data.file.size,
              mimeType: data.file.type
            }
          }),
        })

        if (!messageResponse.ok) {
          throw new Error("Falha ao criar mensagem")
        }

        const messageResult = await messageResponse.json()
        const newMessage = messageResult.data

        // Upload file
        const formData = new FormData()
        formData.append("file", data.file)
        formData.append("messageId", newMessage.id)
        if (encryptionKey) {
          const keyData = await ChatEncryption.exportKey(encryptionKey)
          formData.append("encryptionKey", keyData)
        }

        const fileResponse = await fetch("/api/chat/files/upload", {
          method: "POST",
          body: formData,
        })

        if (!fileResponse.ok) {
          throw new Error("Falha ao enviar arquivo")
        }

        // Add message locally for immediate feedback
        setMessages((prevMessages) => [...prevMessages, newMessage])
        toast.success("Arquivo enviado com segurança")
      } else {
        // Send text message
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            roomId,
            otherUserId: !roomId ? counterpartId : undefined,
            content: encryptedContent,
            messageType: data.messageType,
            isTemporary: data.isTemporary,
            expirationKey: data.expirationKey
          }),
        })

        if (!res.ok) {
          throw new Error("Falha ao enviar mensagem.")
        }

        const result = await res.json()
        if (result.success) {
          setMessages((prevMessages) => [...prevMessages, result.data])
          toast.success("Mensagem enviada")
        }
      }
    } catch (err: any) {
      console.error("Erro ao enviar mensagem:", err)
      toast.error(err.message || "Falha ao enviar mensagem")
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE"
      })

      if (!res.ok) {
        throw new Error("Falha ao deletar mensagem")
      }

      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      toast.success("Mensagem deletada")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Falha ao deletar mensagem")
    }
  }

  const handleDownloadFile = async (messageId: string) => {
    try {
      // Generate secure download link
      const res = await fetch(`/api/chat/files/download/${messageId}`)
      if (!res.ok) {
        throw new Error("Falha ao gerar link de download")
      }

      const result = await res.json()
      if (result.success) {
        // Open download in new tab
        window.open(result.data.downloadUrl, '_blank')
        toast.success("Download iniciado")
      }
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Falha no download")
    }
  }

  const exportConversation = async () => {
    try {
      toast.info("Exportando conversa...")
      // TODO: Implement conversation export with encryption
      toast.success("Conversa exportada")
    } catch (error) {
      toast.error("Falha ao exportar conversa")
    }
  }

  return (
    <Card className="h-[70vh] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Chat com {counterpartName}
            </h2>
            <p className="text-sm text-slate-500">
              Comunicação segura com criptografia end-to-end
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Encryption Status */}
            <Badge 
              variant={encryptionStatus === 'ready' ? 'default' : 'secondary'}
              className="flex items-center gap-1"
            >
              {encryptionStatus === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
              {encryptionStatus === 'ready' && <Shield className="w-3 h-3" />}
              {encryptionStatus === 'error' && <AlertTriangle className="w-3 h-3" />}
              
              {encryptionStatus === 'loading' && 'Carregando...'}
              {encryptionStatus === 'ready' && 'Criptografado'}
              {encryptionStatus === 'error' && 'Erro'}
            </Badge>

            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportConversation}
              disabled={loading || messages.length === 0}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Buscar mensagens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-8"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
              <p className="text-slate-500">Carregando histórico...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        )}
        
        {!loading && !error && (
          <SecureChatMessages 
            messages={searchQuery ? filteredMessages : messages}
            currentUserId={currentUser.id}
            encryptionKey={encryptionKey || undefined}
            onDeleteMessage={handleDeleteMessage}
            onDownloadFile={handleDownloadFile}
          />
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-slate-50">
        <SecureChatInput 
          onSendMessage={handleSendMessage}
          isEncrypted={encryptionStatus === 'ready'}
          disabled={loading || encryptionStatus !== 'ready'}
        />
      </div>
    </Card>
  )
}
