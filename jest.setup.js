// Import Jest DOM matchers
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill for Web APIs (Request, Response, Headers, fetch)
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : input.url
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers || {})
      this.body = init?.body
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.statusText = init?.statusText || 'OK'
      this.headers = new Headers(init?.headers || {})
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }

    async json() {
      const text = await this.text()
      return JSON.parse(text)
    }
  }
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this.headers = new Map()
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value))
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this.set(key, value))
        }
      }
    }

    get(name) {
      return this.headers.get(name.toLowerCase()) || null
    }

    set(name, value) {
      this.headers.set(name.toLowerCase(), String(value))
    }

    has(name) {
      return this.headers.has(name.toLowerCase())
    }

    delete(name) {
      this.headers.delete(name.toLowerCase())
    }

    forEach(callback) {
      this.headers.forEach((value, key) => callback(value, key, this))
    }
  }
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  useParams() {
    return {}
  },
  redirect: jest.fn(),
  notFound: jest.fn(),
}))

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
    has: jest.fn(),
  })),
}))

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only'
process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/test'
process.env.PUSHER_APP_ID = 'test-app-id'
process.env.PUSHER_KEY = 'test-key'
process.env.PUSHER_SECRET = 'test-secret'
process.env.PUSHER_CLUSTER = 'test-cluster'
process.env.NEXT_PUBLIC_PUSHER_KEY = 'test-public-key'
process.env.NEXT_PUBLIC_PUSHER_CLUSTER = 'test-cluster'

// Mock Pusher
jest.mock('pusher', () => {
  return jest.fn().mockImplementation(() => ({
    trigger: jest.fn().mockResolvedValue({}),
    triggerBatch: jest.fn().mockResolvedValue({}),
    channels: jest.fn().mockResolvedValue({ channels: {} }),
    channel: jest.fn().mockResolvedValue({}),
  }))
})

jest.mock('pusher-js', () => {
  const mockChannel = {
    bind: jest.fn(),
    unbind: jest.fn(),
    trigger: jest.fn(),
  }

  return jest.fn().mockImplementation(() => ({
    subscribe: jest.fn(() => mockChannel),
    unsubscribe: jest.fn(),
    disconnect: jest.fn(),
    bind: jest.fn(),
    unbind: jest.fn(),
  }))
})

// Mock database
jest.mock('@/db', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve([])),
          orderBy: jest.fn(() => Promise.resolve([])),
        })),
        leftJoin: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([])),
          })),
        })),
        limit: jest.fn(() => Promise.resolve([])),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([])),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve([])),
      })),
    })),
    delete: jest.fn(() => ({
      where: jest.fn(() => Promise.resolve([])),
    })),
  },
}))

// Mock email service
jest.mock('@/lib/email', () => ({
  EmailService: {
    getInstance: jest.fn(() => ({
      sendEmail: jest.fn().mockResolvedValue(true),
      sendSessionReminder: jest.fn().mockResolvedValue(true),
      sendSessionConfirmation: jest.fn().mockResolvedValue(true),
      sendDiaryNotification: jest.fn().mockResolvedValue(true),
    })),
  },
}))

// Mock SMS service
jest.mock('@/lib/sms', () => ({
  SMSService: {
    getInstance: jest.fn(() => ({
      sendSMS: jest.fn().mockResolvedValue(true),
      sendSessionReminderSMS: jest.fn().mockResolvedValue(true),
      sendSessionConfirmationSMS: jest.fn().mockResolvedValue(true),
      sendEmergencySMS: jest.fn().mockResolvedValue(true),
    })),
  },
}))

// Mock push notification service
jest.mock('@/lib/push-notifications', () => ({
  PushNotificationService: {
    getInstance: jest.fn(() => ({
      sendPushNotification: jest.fn().mockResolvedValue(true),
      sendSessionReminderPush: jest.fn().mockResolvedValue(true),
      sendDiaryEntryPush: jest.fn().mockResolvedValue(true),
      sendSOSAlertPush: jest.fn().mockResolvedValue(true),
      sendChatMessagePush: jest.fn().mockResolvedValue(true),
    })),
  },
}))

// Mock Pusher server (for API routes)
jest.mock('@/lib/pusher', () => ({
  pusherServer: {
    trigger: jest.fn().mockResolvedValue({}),
    triggerBatch: jest.fn().mockResolvedValue({}),
  },
  pusherClient: {
    subscribe: jest.fn(() => ({
      bind: jest.fn(),
      unbind: jest.fn(),
    })),
    unsubscribe: jest.fn(),
  },
}))

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  QueryClient: jest.fn().mockImplementation(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Suppress console errors in tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}

// Set up fake timers (optional, can be enabled per test)
// jest.useFakeTimers()
