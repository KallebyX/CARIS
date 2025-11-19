# Loading States Guide - CÁRIS Platform

## Overview

This guide documents the loading state patterns used throughout the CÁRIS platform, ensuring consistent user experience and proper feedback during asynchronous operations.

## Core Principles

### 1. **Always Provide Feedback**
- Never leave users wondering if something is happening
- Show immediate visual feedback for all user actions
- Indicate progress for long-running operations

### 2. **Be Contextual**
- Match loading states to the context (page load, button click, data fetch)
- Use appropriate granularity (full page, section, component, button)

### 3. **Maintain Layout Stability**
- Prevent layout shifts during loading
- Reserve space for content before it loads
- Use skeleton screens that match final content structure

### 4. **Progressive Enhancement**
- Load critical content first
- Show placeholders for secondary content
- Gracefully handle errors

## Loading State Types

### 1. Page-Level Loading

#### Next.js Loading UI (`loading.tsx`)

For route-level loading states, Next.js provides built-in support:

```tsx
// app/dashboard/(patient)/diary/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Content Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  )
}
```

**When to use:**
- Initial page loads
- Route transitions
- Full-page data fetching

**Best Practices:**
- Match the layout of the loaded content
- Use semantic HTML structure
- Keep it simple (avoid over-designing loading states)

### 2. Component-Level Loading

#### Skeleton Screens

Use the `Skeleton` component for content placeholders:

```tsx
import { Skeleton } from "@/components/ui/skeleton"

function UserCard({ isLoading, user }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-12 rounded-full" /> {/* Avatar */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" /> {/* Name */}
          <Skeleton className="h-4 w-[200px]" /> {/* Email */}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <img src={user.avatar} className="h-12 w-12 rounded-full" />
      <div>
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </div>
    </div>
  )
}
```

**When to use:**
- List items loading
- Card components
- Dashboard widgets
- Profile sections

**Pattern:**
```tsx
{isLoading ? (
  <Skeleton className="h-[height] w-[width]" />
) : (
  <ActualContent />
)}
```

#### Loading State with Data Display

For data that loads progressively:

```tsx
function SessionsList() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  if (loading && sessions.length === 0) {
    // Initial load - show skeletons
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (!loading && sessions.length === 0) {
    // Empty state
    return <EmptyState />
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
      {loading && <Skeleton className="h-20 w-full" />} {/* Loading more */}
    </div>
  )
}
```

### 3. Button Loading States

#### Primary Pattern

```tsx
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

function SubmitButton() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <Button
      onClick={handleSubmit}
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Salvando...
        </>
      ) : (
        "Salvar"
      )}
    </Button>
  )
}
```

**Key Features:**
- ✅ Disable button during loading
- ✅ Show spinner icon
- ✅ Change button text
- ✅ Maintain button size (prevent layout shift)

#### Async Button with React Query

```tsx
import { useMutation } from "@tanstack/react-query"

function DeleteButton({ itemId }: { itemId: number }) {
  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: "Item deletado com sucesso" })
    },
    onError: () => {
      toast({ title: "Erro ao deletar item", variant: "destructive" })
    }
  })

  return (
    <Button
      variant="destructive"
      onClick={() => deleteMutation.mutate(itemId)}
      disabled={deleteMutation.isPending}
    >
      {deleteMutation.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Deletando...
        </>
      ) : (
        "Deletar"
      )}
    </Button>
  )
}
```

### 4. Inline Loading States

For inline text or small UI elements:

```tsx
function UserStatus({ userId }: { userId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-status', userId],
    queryFn: () => fetchUserStatus(userId)
  })

  if (isLoading) {
    return <span className="text-muted-foreground">Carregando...</span>
  }

  return <span className={getStatusColor(data.status)}>{data.status}</span>
}
```

### 5. Table/List Loading States

#### Initial Load

```tsx
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function SessionsTable({ isLoading, sessions }) {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-8 w-20" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <Table>
      {/* Actual table content */}
    </Table>
  )
}
```

#### Pagination Loading

```tsx
function PaginatedList() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['items', page],
    queryFn: () => fetchItems(page)
  })

  return (
    <div className="space-y-4">
      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination with loading overlay */}
      <div className="relative">
        <Pagination
          page={page}
          totalPages={data?.totalPages}
          onPageChange={setPage}
          disabled={isFetching}
        />
        {isFetching && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
```

### 6. Form Loading States

```tsx
import { useForm } from "react-hook-form"

function DiaryEntryForm() {
  const form = useForm()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(data) {
    setIsSubmitting(true)
    try {
      await saveDiaryEntry(data)
      toast({ title: "Entrada salva com sucesso" })
    } catch (error) {
      toast({ title: "Erro ao salvar entrada", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting}>
        {/* Form fields */}
        <Input {...form.register("title")} />
        <Textarea {...form.register("content")} />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar"
          )}
        </Button>
      </fieldset>
    </form>
  )
}
```

**Key Pattern:**
- Wrap form in `<fieldset disabled={isSubmitting}>`
- All inputs automatically disabled
- Submit button shows loading state

### 7. Modal/Dialog Loading States

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function EditProfileDialog({ open, onOpenChange }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form>
            {/* Form fields */}
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 8. Streaming/Real-time Loading

For live data updates (chat, notifications):

```tsx
function ChatMessages() {
  const [messages, setMessages] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isConnecting, setIsConnecting] = useState(true)

  return (
    <div className="flex flex-col h-full">
      {/* Connection status */}
      {isConnecting && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 text-sm">
          <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
          Conectando ao chat...
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory ? (
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-3/4" />
            ))}
          </>
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <Input
          placeholder="Digite uma mensagem..."
          disabled={isConnecting}
        />
      </div>
    </div>
  )
}
```

## React Query Integration

CÁRIS uses `@tanstack/react-query` for data fetching. Leverage its built-in loading states:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

function SessionsList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions
  })

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (isError) {
    return <ErrorState error={error} />
  }

  return <SessionsGrid sessions={data} />
}
```

### Loading State Hierarchy

1. **`isLoading`** - Initial fetch (no cached data)
2. **`isFetching`** - Any fetch (including background refetch)
3. **`isPending`** - Mutation in progress
4. **`isRefetching`** - Background refetch

```tsx
function SmartList() {
  const { data, isLoading, isFetching } = useQuery(...)

  return (
    <div className="relative">
      {/* Show overlay for background fetches */}
      {isFetching && !isLoading && (
        <div className="absolute top-0 right-0 p-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Show skeleton for initial load */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <List items={data} />
      )}
    </div>
  )
}
```

## Common Patterns

### Pattern 1: Optimistic Updates

```tsx
function LikeButton({ postId }: { postId: number }) {
  const queryClient = useQueryClient()

  const likeMutation = useMutation({
    mutationFn: (id: number) => likePost(id),
    // Optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['post', id] })
      const previousPost = queryClient.getQueryData(['post', id])

      queryClient.setQueryData(['post', id], (old) => ({
        ...old,
        likes: old.likes + 1,
        isLiked: true
      }))

      return { previousPost }
    },
    // Rollback on error
    onError: (err, id, context) => {
      queryClient.setQueryData(['post', id], context.previousPost)
    }
  })

  return (
    <Button onClick={() => likeMutation.mutate(postId)}>
      {/* No loading state needed - optimistic! */}
      Curtir ({post.likes})
    </Button>
  )
}
```

### Pattern 2: Suspense Boundaries

For future Next.js 15 features:

```tsx
import { Suspense } from 'react'

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>

      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>

      <Suspense fallback={<ChartsSkeleton />}>
        <Charts />
      </Suspense>
    </div>
  )
}
```

## Accessibility

### ARIA Attributes

Always add proper ARIA attributes for screen readers:

```tsx
function LoadingButton({ isLoading }: { isLoading: boolean }) {
  return (
    <Button
      disabled={isLoading}
      aria-busy={isLoading}
      aria-live="polite"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Carregando...</span>
        </>
      ) : (
        "Enviar"
      )}
    </Button>
  )
}
```

### Live Regions

For dynamic content updates:

```tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {isLoading && "Carregando dados..."}
  {isSuccess && "Dados carregados com sucesso"}
  {isError && "Erro ao carregar dados"}
</div>
```

## Error Handling

Always pair loading states with error states:

```tsx
function DataComponent() {
  const { data, isLoading, isError, error } = useQuery(...)

  if (isLoading) {
    return <Skeleton />
  }

  if (isError) {
    return (
      <div className="text-center p-8 text-destructive">
        <AlertCircle className="h-12 w-12 mx-auto mb-4" />
        <h3>Erro ao carregar dados</h3>
        <p>{error.message}</p>
        <Button onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    )
  }

  return <Content data={data} />
}
```

## Performance Tips

### 1. Debounce Search

```tsx
import { useDebouncedValue } from "@/hooks/use-debounced-value"

function SearchResults() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () => searchAPI(debouncedSearch),
    enabled: debouncedSearch.length > 2
  })

  return (
    <div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isLoading && <Loader2 className="animate-spin" />}
      {data && <Results items={data} />}
    </div>
  )
}
```

### 2. Keep Previou Data

```tsx
const { data, isLoading } = useQuery({
  queryKey: ['items', page],
  queryFn: () => fetchItems(page),
  placeholderData: keepPreviousData // Show previous data while loading new page
})
```

### 3. Prefetching

```tsx
function ItemLink({ id }: { id: number }) {
  const queryClient = useQueryClient()

  return (
    <Link
      href={`/items/${id}`}
      onMouseEnter={() => {
        // Prefetch on hover
        queryClient.prefetchQuery({
          queryKey: ['item', id],
          queryFn: () => fetchItem(id)
        })
      }}
    >
      View Item
    </Link>
  )
}
```

## Testing

### Testing Loading States

```tsx
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

test('shows loading state', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
      },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <MyComponent />
    </QueryClientProvider>
  )

  // Check for loading indicator
  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(screen.getByText(/carregando/i)).toBeInTheDocument()
})
```

## Checklist

When implementing loading states, ensure:

- [ ] Initial load shows appropriate skeleton
- [ ] Buttons disable and show spinner during actions
- [ ] Forms disable inputs during submission
- [ ] Error states are handled
- [ ] Layout doesn't shift when loading completes
- [ ] ARIA attributes are present
- [ ] Loading states are cancellable (where appropriate)
- [ ] Timeout handling for long operations
- [ ] Progress indication for multi-step processes

## Resources

- [Next.js Loading UI](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [TanStack Query - Loading States](https://tanstack.com/query/latest/docs/react/guides/queries)
- [Shadcn/ui Skeleton](https://ui.shadcn.com/docs/components/skeleton)
- [ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)

---

**Last Updated:** 2025-11-19
**Status:** ✅ Complete
**Maintained By:** CÁRIS Development Team
