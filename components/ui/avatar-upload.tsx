"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Camera, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AvatarUploadProps {
  currentAvatar?: string
  userName: string
  onAvatarChange: (avatarUrl: string) => void
}

export function AvatarUpload({ currentAvatar, userName, onAvatarChange }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Apenas imagens são permitidas.",
        variant: "destructive",
      })
      return
    }

    // Validar tamanho (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Máximo 5MB.",
        variant: "destructive",
      })
      return
    }

    // Criar preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload do arquivo
    uploadAvatar(file)
  }

  const uploadAvatar = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("avatar", file)

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const { avatarUrl } = await response.json()
        onAvatarChange(avatarUrl)
        setPreview(null)
        toast({
          title: "Sucesso",
          description: "Avatar atualizado com sucesso!",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Erro ao fazer upload")
      }
    } catch (error) {
      console.error("Erro no upload:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o avatar.",
        variant: "destructive",
      })
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const cancelPreview = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <Avatar className="w-20 h-20">
          <AvatarImage src={preview || currentAvatar || "/placeholder.svg?height=80&width=80"} />
          <AvatarFallback>
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-transparent"
          >
            <Camera className="w-4 h-4 mr-2" />
            {preview ? "Alterar" : "Alterar Foto"}
          </Button>

          {preview && (
            <Button type="button" variant="outline" size="sm" onClick={cancelPreview} className="bg-transparent">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Máximo 5MB.</p>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
    </div>
  )
}
