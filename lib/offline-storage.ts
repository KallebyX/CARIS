/**
 * Offline Storage - IndexedDB wrapper for storing data offline
 * Provides a simple API for storing diary entries, chat messages, and other data
 */

const DB_NAME = 'CarisOfflineDB'
const DB_VERSION = 1

// Store names
export const STORES = {
  DIARY_ENTRIES: 'diaryEntries',
  CHAT_MESSAGES: 'chatMessages',
  MOOD_TRACKING: 'moodTracking',
  PENDING_DIARY_ENTRIES: 'pendingDiaryEntries',
  PENDING_CHAT_MESSAGES: 'pendingChatMessages',
  PENDING_MOOD_TRACKING: 'pendingMoodTracking',
  SESSIONS: 'sessions',
  USER_DATA: 'userData'
} as const

export type StoreName = typeof STORES[keyof typeof STORES]

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not available in server environment'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[Offline Storage] Failed to open database:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      console.log('[Offline Storage] Upgrading database...')

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.DIARY_ENTRIES)) {
        const store = db.createObjectStore(STORES.DIARY_ENTRIES, { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('syncStatus', 'syncStatus', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.CHAT_MESSAGES)) {
        const store = db.createObjectStore(STORES.CHAT_MESSAGES, { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('conversationId', 'conversationId', { unique: false })
        store.createIndex('syncStatus', 'syncStatus', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.MOOD_TRACKING)) {
        const store = db.createObjectStore(STORES.MOOD_TRACKING, { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('date', 'date', { unique: false })
        store.createIndex('syncStatus', 'syncStatus', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.PENDING_DIARY_ENTRIES)) {
        db.createObjectStore(STORES.PENDING_DIARY_ENTRIES, { keyPath: 'id', autoIncrement: true })
      }

      if (!db.objectStoreNames.contains(STORES.PENDING_CHAT_MESSAGES)) {
        db.createObjectStore(STORES.PENDING_CHAT_MESSAGES, { keyPath: 'id', autoIncrement: true })
      }

      if (!db.objectStoreNames.contains(STORES.PENDING_MOOD_TRACKING)) {
        db.createObjectStore(STORES.PENDING_MOOD_TRACKING, { keyPath: 'id', autoIncrement: true })
      }

      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const store = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
        db.createObjectStore(STORES.USER_DATA, { keyPath: 'key' })
      }
    }
  })
}

/**
 * Generic add/put operation
 */
export async function addItem<T>(storeName: StoreName, item: T): Promise<IDBValidKey> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.add(item)

    request.onsuccess = () => {
      console.log('[Offline Storage] Added item to', storeName)
      resolve(request.result)
    }

    request.onerror = () => {
      console.error('[Offline Storage] Failed to add item:', request.error)
      reject(request.error)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Generic update operation
 */
export async function updateItem<T>(storeName: StoreName, item: T): Promise<IDBValidKey> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(item)

    request.onsuccess = () => {
      console.log('[Offline Storage] Updated item in', storeName)
      resolve(request.result)
    }

    request.onerror = () => {
      console.error('[Offline Storage] Failed to update item:', request.error)
      reject(request.error)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Generic get operation
 */
export async function getItem<T>(storeName: StoreName, key: IDBValidKey): Promise<T | null> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)

    request.onsuccess = () => {
      resolve(request.result || null)
    }

    request.onerror = () => {
      console.error('[Offline Storage] Failed to get item:', request.error)
      reject(request.error)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Generic get all operation
 */
export async function getAllItems<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      console.error('[Offline Storage] Failed to get all items:', request.error)
      reject(request.error)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Generic delete operation
 */
export async function deleteItem(storeName: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)

    request.onsuccess = () => {
      console.log('[Offline Storage] Deleted item from', storeName)
      resolve()
    }

    request.onerror = () => {
      console.error('[Offline Storage] Failed to delete item:', request.error)
      reject(request.error)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Clear all items in a store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()

    request.onsuccess = () => {
      console.log('[Offline Storage] Cleared store', storeName)
      resolve()
    }

    request.onerror = () => {
      console.error('[Offline Storage] Failed to clear store:', request.error)
      reject(request.error)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Get items by index
 */
export async function getItemsByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: any
): Promise<T[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(value)

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      console.error('[Offline Storage] Failed to get items by index:', request.error)
      reject(request.error)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

// Specific helper functions for diary entries
export interface DiaryEntry {
  id?: number
  title: string
  content: string
  mood?: string
  tags?: string[]
  timestamp: number
  syncStatus: 'pending' | 'synced'
  remoteId?: string
}

export async function saveDiaryEntryOffline(entry: Omit<DiaryEntry, 'id' | 'timestamp' | 'syncStatus'>): Promise<number> {
  const fullEntry: DiaryEntry = {
    ...entry,
    timestamp: Date.now(),
    syncStatus: 'pending'
  }

  const id = await addItem(STORES.DIARY_ENTRIES, fullEntry)
  return id as number
}

export async function getDiaryEntriesOffline(): Promise<DiaryEntry[]> {
  return getAllItems<DiaryEntry>(STORES.DIARY_ENTRIES)
}

export async function getPendingDiaryEntries(): Promise<DiaryEntry[]> {
  return getItemsByIndex<DiaryEntry>(STORES.DIARY_ENTRIES, 'syncStatus', 'pending')
}

export async function markDiaryEntrySynced(id: number, remoteId: string): Promise<void> {
  const entry = await getItem<DiaryEntry>(STORES.DIARY_ENTRIES, id)
  if (entry) {
    entry.syncStatus = 'synced'
    entry.remoteId = remoteId
    await updateItem(STORES.DIARY_ENTRIES, entry)
  }
}

// Specific helper functions for chat messages
export interface ChatMessage {
  id?: number
  conversationId: string
  senderId: string
  content: string
  timestamp: number
  syncStatus: 'pending' | 'synced'
  remoteId?: string
}

export async function saveChatMessageOffline(message: Omit<ChatMessage, 'id' | 'timestamp' | 'syncStatus'>): Promise<number> {
  const fullMessage: ChatMessage = {
    ...message,
    timestamp: Date.now(),
    syncStatus: 'pending'
  }

  const id = await addItem(STORES.CHAT_MESSAGES, fullMessage)
  return id as number
}

export async function getChatMessagesOffline(conversationId: string): Promise<ChatMessage[]> {
  return getItemsByIndex<ChatMessage>(STORES.CHAT_MESSAGES, 'conversationId', conversationId)
}

export async function getPendingChatMessages(): Promise<ChatMessage[]> {
  return getItemsByIndex<ChatMessage>(STORES.CHAT_MESSAGES, 'syncStatus', 'pending')
}

export async function markChatMessageSynced(id: number, remoteId: string): Promise<void> {
  const message = await getItem<ChatMessage>(STORES.CHAT_MESSAGES, id)
  if (message) {
    message.syncStatus = 'synced'
    message.remoteId = remoteId
    await updateItem(STORES.CHAT_MESSAGES, message)
  }
}

// Specific helper functions for mood tracking
export interface MoodTracking {
  id?: number
  mood: number
  notes?: string
  date: string
  timestamp: number
  syncStatus: 'pending' | 'synced'
  remoteId?: string
}

export async function saveMoodTrackingOffline(mood: Omit<MoodTracking, 'id' | 'timestamp' | 'syncStatus'>): Promise<number> {
  const fullMood: MoodTracking = {
    ...mood,
    timestamp: Date.now(),
    syncStatus: 'pending'
  }

  const id = await addItem(STORES.MOOD_TRACKING, fullMood)
  return id as number
}

export async function getMoodTrackingOffline(): Promise<MoodTracking[]> {
  return getAllItems<MoodTracking>(STORES.MOOD_TRACKING)
}

export async function getPendingMoodTracking(): Promise<MoodTracking[]> {
  return getItemsByIndex<MoodTracking>(STORES.MOOD_TRACKING, 'syncStatus', 'pending')
}

export async function markMoodTrackingSynced(id: number, remoteId: string): Promise<void> {
  const mood = await getItem<MoodTracking>(STORES.MOOD_TRACKING, id)
  if (mood) {
    mood.syncStatus = 'synced'
    mood.remoteId = remoteId
    await updateItem(STORES.MOOD_TRACKING, mood)
  }
}

// User data storage (for caching user preferences, etc.)
export async function setUserData(key: string, value: any): Promise<void> {
  await updateItem(STORES.USER_DATA, { key, value })
}

export async function getUserData<T>(key: string): Promise<T | null> {
  const item = await getItem<{ key: string; value: T }>(STORES.USER_DATA, key)
  return item?.value || null
}

// Clear all offline data
export async function clearAllOfflineData(): Promise<void> {
  const stores = Object.values(STORES)
  for (const store of stores) {
    await clearStore(store)
  }
  console.log('[Offline Storage] Cleared all offline data')
}

// Get database info
export async function getDatabaseInfo(): Promise<{
  name: string
  version: number
  stores: string[]
}> {
  const db = await openDB()
  const stores = Array.from(db.objectStoreNames)
  const info = {
    name: db.name,
    version: db.version,
    stores
  }
  db.close()
  return info
}
