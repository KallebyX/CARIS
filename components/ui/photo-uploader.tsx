"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, Upload, X, Eye } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface PhotoUploaderProps {
  onPhotoUpload: (file: File, preview: string) => void
  onPhotoRemove?: () => void
  className?: string
  maxSize?: number // in MB
}

export function PhotoUploader({ 
  onPhotoUpload, 
  onPhotoRemove,
  className,
  maxSize = 5 
}: PhotoUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [imageAnalysis, setImageAnalysis] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.')
      return
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`O arquivo deve ter no máximo ${maxSize}MB.`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string
      setPreview(previewUrl)
      
      // Call parent callback
      onPhotoUpload(file, previewUrl)
      
      // Analyze image mood automatically
      analyzeImageMood(previewUrl)
    }
    reader.readAsDataURL(file)
  }

  const analyzeImageMood = async (imageData: string) => {
    setIsAnalyzing(true)
    
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setImageAnalysis(data.analysis)
      }
    } catch (error) {
      console.error('Error analyzing image:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const removePhoto = () => {
    setPreview(null)
    setImageAnalysis(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onPhotoRemove) {
      onPhotoRemove()
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className={cn("border-2 border-dashed border-slate-200", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              Upload de Foto
            </h3>
            <p className="text-sm text-slate-500">
              {preview 
                ? "Foto carregada com sucesso" 
                : "Arraste uma foto ou clique para selecionar"
              }
            </p>
          </div>

          {!preview ? (
            <div
              className={cn(
                "border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer transition-colors",
                dragActive ? "border-blue-500 bg-blue-50" : "hover:border-slate-400 hover:bg-slate-50"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={triggerFileInput}
            >
              <motion.div
                className="flex flex-col items-center gap-4"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-slate-400" />
                </div>
                
                <div>
                  <p className="text-slate-600 font-medium mb-1">
                    Clique para selecionar ou arraste aqui
                  </p>
                  <p className="text-sm text-slate-400">
                    PNG, JPG, JPEG até {maxSize}MB
                  </p>
                </div>
                
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Escolher Arquivo
                </Button>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image preview */}
              <div className="relative rounded-lg overflow-hidden bg-slate-100">
                <Image
                  src={preview}
                  alt="Preview da foto"
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover"
                />
                
                <Button
                  onClick={removePhoto}
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 w-8 h-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Analysis status */}
              {isAnalyzing && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Analisando imagem...</span>
                  </div>
                </div>
              )}

              {/* Image analysis result */}
              {imageAnalysis && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2">
                    <Eye className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-green-800 font-medium mb-1">
                        Análise da Imagem:
                      </p>
                      <p className="text-sm text-green-700">{imageAnalysis}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={triggerFileInput}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Trocar Foto
                </Button>
                
                <Button
                  onClick={removePhoto}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  )
}