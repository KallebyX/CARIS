"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Clock, 
  Shield, 
  Download, 
  Eye, 
  EyeOff,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Trash2,
  Copy,
  MoreVertical
} from "lucide-react"
import { SecureFileUpload } from "@/lib/secure-file-upload"
import { MessageExpirationService } from "@/lib/message-expiration"
import { ChatEncryption, type SecureChatMessage } from "@/lib/encryption"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface SecureChatMessagesProps {
  messages: SecureChatMessage[]
  currentUserId: number
  encryptionKey?: CryptoKey
  onDeleteMessage?: (messageId: string) => void
  onDownloadFile?: (fileId: string) => void
}

export function SecureChatMessages({ 
  messages, 
  currentUserId, 
  encryptionKey,
  onDeleteMessage,
  onDownloadFile
}: SecureChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map())
  const [hideDecryptedContent, setHideDecryptedContent] = useState(false)
  const [decryptionProgress, setDecryptionProgress] = useState(0)
  const [selectedMessageToDelete, setSelectedMessageToDelete] = useState<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Decrypt messages when encryption key is available
  useEffect(() => {
    if (!encryptionKey || messages.length === 0) return

    const decryptMessages = async () => {
      const newDecrypted = new Map<string, string>()
      const totalMessages = messages.length
      
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i]
        
        try {
          if (message.messageType === 'text' && message.content) {
            // Parse encrypted message format
            const encryptedData = JSON.parse(message.content)
            const decryptedContent = await ChatEncryption.decryptMessage(encryptedData, encryptionKey)
            newDecrypted.set(message.id, decryptedContent)
          }
        } catch (error) {
          console.error(`Failed to decrypt message ${message.id}:`, error)
          newDecrypted.set(message.id, '[Falha na descriptografia]')
        }
        
        // Update progress
        setDecryptionProgress(((i + 1) / totalMessages) * 100)
      }
      
      setDecryptedMessages(newDecrypted)
      setTimeout(() => setDecryptionProgress(0), 1000)
    }

    decryptMessages()
  }, [encryptionKey, messages])

  const getMessageContent = (message: SecureChatMessage): string => {
    if (message.messageType === 'file') {
      return message.content // File messages show filename
    }
    
    if (hideDecryptedContent) {
      return '••••••••••••'
    }
    
    return decryptedMessages.get(message.id) || '[Criptografado]'
  }

  const getExpirationStatus = (message: SecureChatMessage) => {
    if (!message.isTemporary || !message.expiresAt) return null
    
    return MessageExpirationService.getExpirationStatus(message.expiresAt)
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const confirmDeleteMessage = (messageId: string) => {
    setSelectedMessageToDelete(messageId)
  }

  const executeDeleteMessage = () => {
    if (selectedMessageToDelete && onDeleteMessage) {
      onDeleteMessage(selectedMessageToDelete)
      setSelectedMessageToDelete(null)
    }
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <Shield className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-slate-500">Nenhuma mensagem ainda.</p>
          <p className="text-xs text-slate-400">Inicie uma conversa segura!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Decryption Progress */}
      {decryptionProgress > 0 && decryptionProgress < 100 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Descriptografando mensagens...</span>
          </div>
          <Progress value={decryptionProgress} className="h-2" />
        </div>
      )}

      {/* Privacy Toggle */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHideDecryptedContent(!hideDecryptedContent)}
          className="text-xs"
        >
          {hideDecryptedContent ? (
            <>
              <Eye className="w-3 h-3 mr-1" />
              Mostrar conteúdo
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3 mr-1" />
              Ocultar conteúdo
            </>
          )}
        </Button>
      </div>

      {/* Messages */}
      {messages.map((message) => {
        const isOwn = message.senderId === currentUserId
        const expirationStatus = getExpirationStatus(message)
        const content = getMessageContent(message)
        
        return (
          <div
            key={message.id}
            className={cn(
              "flex items-end gap-2",
              isOwn ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-xs md:max-w-md lg:max-w-lg rounded-2xl px-4 py-2 relative group",
                isOwn
                  ? "bg-caris-teal text-white rounded-br-none"
                  : "bg-slate-200 text-slate-800 rounded-bl-none",
                expirationStatus?.isExpired && "opacity-50"
              )}
            >
              {/* Message Content */}
              <div className="space-y-2">
                {message.messageType === 'file' ? (
                  <FileMessage 
                    message={message}
                    onDownload={() => onDownloadFile?.(message.id)}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {content}
                  </p>
                )}

                {/* Message Footer */}
                <div className="flex items-center justify-between text-xs opacity-70">
                  <div className="flex items-center gap-1">
                    {/* Encryption Indicator */}
                    <Shield className="w-3 h-3" />
                    
                    {/* Temporary Message Indicator */}
                    {message.isTemporary && (
                      <>
                        <Clock className="w-3 h-3" />
                        {expirationStatus && (
                          <span className={cn(
                            expirationStatus.isExpired ? "text-red-300" : "text-current"
                          )}>
                            {expirationStatus.timeRemainingText}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span>
                    {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* Message Actions */}
              {isOwn && (
                <div className="absolute -right-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {message.messageType === 'text' && (
                        <DropdownMenuItem onClick={() => handleCopyMessage(content)}>
                          <Copy className="w-3 h-3 mr-2" />
                          Copiar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => confirmDeleteMessage(message.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!selectedMessageToDelete} onOpenChange={() => setSelectedMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar mensagem</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será permanentemente removida da conversa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteMessage} className="bg-red-600 hover:bg-red-700">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div ref={messagesEndRef} />
    </div>
  )
}

// File Message Component
function FileMessage({ 
  message, 
  onDownload 
}: { 
  message: SecureChatMessage
  onDownload: () => void 
}) {
  const [downloading, setDownloading] = useState(false)
  
  // Extract file info from message metadata
  const fileInfo = message.metadata as any || {}
  const fileName = fileInfo.originalName || 'arquivo'
  const fileSize = fileInfo.fileSize || 0
  const mimeType = fileInfo.mimeType || 'application/octet-stream'
  const icon = SecureFileUpload.getFileIcon(mimeType)
  const formattedSize = SecureFileUpload.formatFileSize(fileSize)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await onDownload()
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-2 bg-black/10 rounded-lg">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{fileName}</p>
          <p className="text-xs opacity-70">{formattedSize}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDownload}
          disabled={downloading}
          className="shrink-0"
        >
          {downloading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      {/* File Preview (if image) */}
      {fileInfo.preview && mimeType.startsWith('image/') && (
        <div className="rounded-lg overflow-hidden max-w-sm">
          <img 
            src={fileInfo.preview} 
            alt={fileName}
            className="w-full h-auto"
          />
        </div>
      )}
    </div>
  )
}