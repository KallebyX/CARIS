# PWA Integration Example

This document shows practical examples of integrating PWA features into CÁRIS pages.

## Complete Example: Diary Entry Form with Offline Support

This example demonstrates a diary entry form with full offline support, network status detection, and automatic sync.

```typescript
// app/dashboard/patient/diary/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { saveDiaryEntryOffline } from '@/lib/offline-storage'
import { queueRequest } from '@/lib/offline-detection'
import { OfflineMessage } from '@/components/offline-fallback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function NewDiaryEntryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isOnline, status } = useOnlineStatus()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    const entryData = {
      title,
      content,
      mood,
      tags: []
    }

    try {
      if (isOnline) {
        // Online: Send directly to server
        const response = await fetch('/api/patient/diary/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData)
        })

        if (!response.ok) {
          throw new Error('Failed to save entry')
        }

        toast({
          title: 'Entrada salva!',
          description: 'Seu diário foi atualizado com sucesso.'
        })

        router.push('/dashboard/patient/diary')
      } else {
        // Offline: Save locally and queue for sync
        await saveDiaryEntryOffline(entryData)

        toast({
          title: 'Salvo offline',
          description: 'Sua entrada será sincronizada quando você voltar online.',
          variant: 'default'
        })

        router.push('/dashboard/patient/diary')
      }
    } catch (error) {
      console.error('Failed to save entry:', error)

      // If online request failed, save offline as fallback
      if (isOnline) {
        try {
          await saveDiaryEntryOffline(entryData)
          queueRequest('/api/patient/diary/entries', 'POST', entryData)

          toast({
            title: 'Salvo localmente',
            description: 'Não foi possível salvar no servidor, mas sua entrada está segura e será sincronizada automaticamente.'
          })
        } catch (offlineError) {
          toast({
            title: 'Erro ao salvar',
            description: 'Não foi possível salvar sua entrada. Por favor, tente novamente.',
            variant: 'destructive'
          })
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Nova Entrada no Diário</h1>
        <p className="text-muted-foreground mt-2">
          Registre seus pensamentos e sentimentos
        </p>
      </div>

      {/* Show offline warning */}
      {!isOnline && (
        <OfflineMessage className="mb-6" />
      )}

      {/* Show slow connection warning */}
      {status === 'slow' && (
        <div className="mb-6 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Conexão lenta detectada. Sua entrada será salva, mas pode demorar para sincronizar.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Digite um título..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mood">Como você está se sentindo?</Label>
          <Select value={mood} onValueChange={setMood} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um humor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="very_happy">Muito Feliz 😄</SelectItem>
              <SelectItem value="happy">Feliz 😊</SelectItem>
              <SelectItem value="neutral">Neutro 😐</SelectItem>
              <SelectItem value="sad">Triste 😢</SelectItem>
              <SelectItem value="very_sad">Muito Triste 😭</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Conteúdo</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva sobre seu dia..."
            rows={10}
            required
          />
        </div>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Entrada'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
        </div>

        {/* Show sync status */}
        {!isOnline && (
          <p className="text-sm text-muted-foreground text-center">
            Você está offline. A entrada será salva localmente e sincronizada automaticamente quando você voltar online.
          </p>
        )}
      </form>
    </div>
  )
}
```

## Example: Dashboard with Network Status

```typescript
// app/dashboard/patient/page.tsx
'use client'

import { useOnlineStatus } from '@/hooks/use-online-status'
import { OfflineIndicator } from '@/components/offline-indicator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PatientDashboard() {
  const {
    isOnline,
    pendingRequestsCount,
    syncPendingRequests,
    isSyncing
  } = useOnlineStatus()

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao CÁRIS
          </p>
        </div>

        {/* Show sync button if there are pending items */}
        {pendingRequestsCount > 0 && (
          <Button
            onClick={syncPendingRequests}
            disabled={!isOnline || isSyncing}
            variant="outline"
          >
            {isSyncing ? 'Sincronizando...' : `Sincronizar (${pendingRequestsCount})`}
          </Button>
        )}
      </div>

      {/* Dashboard content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Diário</CardTitle>
            <CardDescription>Suas entradas recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Diary entries */}
          </CardContent>
        </Card>

        {/* More cards... */}
      </div>

      {/* Offline indicator */}
      <OfflineIndicator position="bottom-right" showSync />
    </div>
  )
}
```

## Example: Chat with Offline Queue

```typescript
// components/chat/chat-input.tsx
'use client'

import { useState } from 'react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { saveChatMessageOffline } from '@/lib/offline-storage'
import { queueRequest } from '@/lib/offline-detection'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface ChatInputProps {
  conversationId: string
  senderId: string
  onMessageSent?: () => void
}

export function ChatInput({ conversationId, senderId, onMessageSent }: ChatInputProps) {
  const { isOnline } = useOnlineStatus()
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  async function handleSend() {
    if (!message.trim()) return

    setIsSending(true)
    const messageData = {
      conversationId,
      senderId,
      content: message.trim()
    }

    try {
      if (isOnline) {
        // Send via Pusher or API
        const response = await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageData)
        })

        if (!response.ok) {
          throw new Error('Failed to send message')
        }
      } else {
        // Save offline and queue
        await saveChatMessageOffline(messageData)
        queueRequest('/api/chat/send', 'POST', messageData)
      }

      setMessage('')
      onMessageSent?.()
    } catch (error) {
      console.error('Failed to send message:', error)

      // Fallback to offline save
      if (isOnline) {
        await saveChatMessageOffline(messageData)
        queueRequest('/api/chat/send', 'POST', messageData)
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={isOnline ? 'Digite sua mensagem...' : 'Offline - mensagem será enviada quando conectar'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
        rows={1}
        className="resize-none"
      />

      <Button
        onClick={handleSend}
        disabled={isSending || !message.trim()}
        size="icon"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

## Example: Global Layout with PWA Features

```typescript
// app/dashboard/layout.tsx
'use client'

import { OfflineIndicator } from '@/components/offline-indicator'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useToast } from '@/components/ui/use-toast'

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { toast } = useToast()

  // Show toast when connection status changes
  const { isOnline } = useOnlineStatus({
    onOnline: () => {
      toast({
        title: 'Conexão restaurada',
        description: 'Você está online novamente. Sincronizando dados...'
      })
    },
    onOffline: () => {
      toast({
        title: 'Você está offline',
        description: 'Suas alterações serão salvas localmente.',
        variant: 'destructive'
      })
    }
  })

  return (
    <>
      {/* Your layout components */}
      <div className="min-h-screen">
        {children}
      </div>

      {/* Global offline indicator */}
      <OfflineIndicator
        position="bottom-right"
        showSync
        showDetails
      />
    </>
  )
}
```

## Example: Settings Page with PWA Controls

```typescript
// app/dashboard/settings/page.tsx
'use client'

import { useState } from 'react'
import { triggerSWUpdate, unregisterServiceWorker, isStandalone } from '@/app/sw-register'
import { clearAllOfflineData, getDatabaseInfo } from '@/lib/offline-storage'
import { clearPendingRequests, getPendingRequestsCount } from '@/lib/offline-detection'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

export default function SettingsPage() {
  const { toast } = useToast()
  const [dbInfo, setDbInfo] = useState<any>(null)
  const [pendingCount, setPendingCount] = useState(0)

  async function loadInfo() {
    const info = await getDatabaseInfo()
    const count = getPendingRequestsCount()
    setDbInfo(info)
    setPendingCount(count)
  }

  async function handleClearOfflineData() {
    if (confirm('Tem certeza que deseja limpar todos os dados offline?')) {
      await clearAllOfflineData()
      clearPendingRequests()

      toast({
        title: 'Dados limpos',
        description: 'Todos os dados offline foram removidos.'
      })

      loadInfo()
    }
  }

  async function handleUnregisterSW() {
    if (confirm('Deseja desinstalar o Service Worker?')) {
      const result = await unregisterServiceWorker()

      toast({
        title: result ? 'Service Worker desinstalado' : 'Falha ao desinstalar',
        description: result ? 'Recarregue a página para aplicar as mudanças.' : 'Tente novamente mais tarde.'
      })
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="mb-8 text-3xl font-bold">Configurações PWA</h1>

      <div className="space-y-6">
        {/* App Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Aplicativo</CardTitle>
            <CardDescription>Informações sobre o PWA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Modo de instalação:</span>
              <span className="font-medium">
                {isStandalone() ? 'Instalado (PWA)' : 'Browser'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Requisições pendentes:</span>
              <span className="font-medium">{pendingCount}</span>
            </div>

            <Button onClick={loadInfo} variant="outline" size="sm">
              Atualizar Informações
            </Button>
          </CardContent>
        </Card>

        {/* Database Info */}
        {dbInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Armazenamento Offline</CardTitle>
              <CardDescription>Informações do IndexedDB</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Banco de dados:</span>
                <span className="font-medium">{dbInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Versão:</span>
                <span className="font-medium">{dbInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span>Stores:</span>
                <span className="font-medium">{dbInfo.stores.length}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>Gerenciar PWA e dados offline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button onClick={triggerSWUpdate} variant="outline">
                Verificar Atualizações
              </Button>

              <Button
                onClick={handleClearOfflineData}
                variant="destructive"
              >
                Limpar Dados Offline
              </Button>

              <Button
                onClick={handleUnregisterSW}
                variant="destructive"
              >
                Desinstalar Service Worker
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

## Best Practices

### 1. Always Show Network Status

Let users know when they're offline:

```typescript
import { OfflineMessage } from '@/components/offline-fallback'

// At the top of your form
{!isOnline && <OfflineMessage />}
```

### 2. Handle Both Online and Offline Scenarios

```typescript
if (isOnline) {
  // Try server first
  await fetch('/api/endpoint', { ... })
} else {
  // Save offline immediately
  await saveOffline(data)
}
```

### 3. Provide Fallback for Failed Online Requests

```typescript
try {
  await fetch('/api/endpoint', { ... })
} catch (error) {
  // Fallback to offline save
  await saveOffline(data)
  queueRequest('/api/endpoint', 'POST', data)
}
```

### 4. Give User Feedback

```typescript
toast({
  title: isOnline ? 'Salvo!' : 'Salvo offline',
  description: isOnline
    ? 'Seus dados foram salvos.'
    : 'Será sincronizado quando você voltar online.'
})
```

### 5. Test Offline Functionality

Always test:
- Form submissions while offline
- Navigation while offline
- Background sync when coming online
- Cache behavior

## Common Patterns

### Pattern: Progressive Enhancement

```typescript
function SaveButton() {
  const { isOnline } = useOnlineStatus()

  return (
    <Button>
      {isOnline ? 'Salvar' : 'Salvar Offline'}
    </Button>
  )
}
```

### Pattern: Optimistic Updates

```typescript
async function saveData(data: any) {
  // Update UI immediately
  updateLocalState(data)

  // Try to sync
  if (isOnline) {
    try {
      await fetch('/api/endpoint', { ... })
    } catch {
      // Revert or queue
    }
  }
}
```

### Pattern: Smart Sync

```typescript
useEffect(() => {
  if (isOnline && pendingRequestsCount > 0) {
    syncPendingRequests()
  }
}, [isOnline, pendingRequestsCount])
```

---

**For more examples and documentation, see:**
- `/docs/PWA_IMPLEMENTATION.md` - Full documentation
- `/docs/PWA_QUICK_START.md` - Quick reference guide
