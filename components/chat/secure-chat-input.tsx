"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Send, 
  Paperclip, 
  Clock, 
  Shield, 
  Upload,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { SecureFileUpload } from "@/lib/secure-file-upload"
import { MessageExpirationService } from "@/lib/message-expiration"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface SecureChatInputProps {
  onSendMessage: (data: {
    content: string
    messageType: 'text' | 'file'
    isTemporary: boolean
    expirationKey?: string
    file?: File
  }) => Promise<void>
  isEncrypted?: boolean
  disabled?: boolean
}

export function SecureChatInput({ 
  onSendMessage, 
  isEncrypted = true, 
  disabled = false 
}: SecureChatInputProps) {
  const [content, setContent] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isTemporary, setIsTemporary] = useState(false)
  const [expirationKey, setExpirationKey] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileValidation, setFileValidation] = useState<{ isValid: boolean, error?: string } | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedFile) {
      await handleFileSend()
    } else if (content.trim()) {
      await handleTextSend()
    }
  }

  const handleTextSend = async () => {
    if (!content.trim() || isSending) return

    setIsSending(true)
    try {
      await onSendMessage({
        content,
        messageType: 'text',
        isTemporary,
        expirationKey: isTemporary ? expirationKey : undefined
      })
      
      // Reset form
      setContent("")
      setIsTemporary(false)
      setExpirationKey("")
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsSending(false)
    }
  }

  const handleFileSend = async () => {
    if (!selectedFile || isSending) return

    setIsSending(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      await onSendMessage({
        content: `📎 ${selectedFile.name}`,
        messageType: 'file',
        isTemporary,
        expirationKey: isTemporary ? expirationKey : undefined,
        file: selectedFile
      })

      clearInterval(progressInterval)
      setUploadProgress(100)
      
      // Reset form
      setTimeout(() => {
        setSelectedFile(null)
        setFileValidation(null)
        setUploadProgress(0)
        setIsTemporary(false)
        setExpirationKey("")
      }, 1000)
    } catch (error) {
      console.error("Failed to upload file:", error)
      setUploadProgress(0)
    } finally {
      setIsSending(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = SecureFileUpload.validateFile(file)
    setFileValidation(validation)
    
    if (validation.isValid) {
      setSelectedFile(file)
    } else {
      setSelectedFile(null)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setFileValidation(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const hasContent = content.trim() || selectedFile
  const canSend = hasContent && !isSending && (!selectedFile || fileValidation?.isValid)

  return (
    <div className="space-y-3">
      {/* Encryption Status */}
      {isEncrypted && (
        <div className="flex items-center gap-2 text-xs text-green-600">
          <Shield className="w-3 h-3" />
          <span>Criptografia end-to-end ativa</span>
        </div>
      )}

      {/* File Upload Area */}
      {selectedFile && (
        <div className="bg-slate-50 border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{SecureFileUpload.getFileIcon(selectedFile.type)}</span>
              <div>
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">
                  {SecureFileUpload.formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFile}
              disabled={isSending}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Validation Status */}
          {fileValidation && (
            <div className="flex items-center gap-2 text-xs">
              {fileValidation.isValid ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-green-600">Arquivo validado</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span className="text-red-600">{fileValidation.error}</span>
                </>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-slate-500">Enviando... {uploadProgress}%</p>
            </div>
          )}
        </div>
      )}

      {/* Temporary Message Settings */}
      {isTemporary && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-orange-700">
            <Clock className="w-4 h-4" />
            <span className="font-medium text-sm">Mensagem Temporária</span>
          </div>
          <Select value={expirationKey} onValueChange={setExpirationKey}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecionar duração" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MessageExpirationService.EXPIRATION_OPTIONS).map(([key, option]) => (
                <SelectItem key={key} value={key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          {!selectedFile && (
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isEncrypted ? "Digite sua mensagem criptografada..." : "Digite sua mensagem..."}
              className="bg-white"
              disabled={disabled || isSending}
              maxLength={4000}
            />
          )}
          
          {/* Character Count */}
          {content && !selectedFile && (
            <div className="text-xs text-slate-400 text-right">
              {content.length}/4000
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* File Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept={[
              'image/*',
              'application/pdf',
              'text/plain',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'audio/*',
              'video/mp4',
              'video/webm'
            ].join(',')}
            disabled={disabled || isSending}
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending || !!selectedFile}
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* Temporary Message Toggle */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={isTemporary ? "default" : "outline"}
                size="sm"
                disabled={disabled || isSending}
              >
                <Clock className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm">Mensagem Temporária</h4>
                  <p className="text-xs text-slate-500">
                    A mensagem será automaticamente deletada após o tempo especificado
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="temporary"
                    checked={isTemporary}
                    onChange={(e) => setIsTemporary(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="temporary" className="text-sm">
                    Ativar auto-destruição
                  </Label>
                </div>

                {isTemporary && (
                  <Select value={expirationKey} onValueChange={setExpirationKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Duração" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MessageExpirationService.EXPIRATION_OPTIONS).map(([key, option]) => (
                        <SelectItem key={key} value={key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Send Button */}
          <Button
            type="submit"
            disabled={!canSend}
            className="relative"
          >
            {isSending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {selectedFile ? "Enviando..." : "..."}
              </div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {selectedFile && <span className="sr-only">Enviar arquivo</span>}
                {!selectedFile && <span className="sr-only">Enviar mensagem</span>}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Security Info */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {isTemporary && "⚡ Temporária • "}
          {isEncrypted && "🔒 Criptografada • "}
          Pressione Enter para enviar
        </span>
        {selectedFile && fileValidation?.isValid && (
          <Badge variant="secondary" className="text-xs">
            Arquivo seguro
          </Badge>
        )}
      </div>
    </div>
  )
}