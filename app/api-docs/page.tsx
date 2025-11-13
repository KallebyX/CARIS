'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Swagger UI to avoid SSR issues
const SwaggerUI = dynamic(
  () => import('swagger-ui-react').then(mod => mod.default),
  { ssr: false }
)

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'swagger' | 'quickstart' | 'examples'>('swagger')

  useEffect(() => {
    // Load OpenAPI spec
    fetch('/openapi.json')
      .then(res => res.json())
      .then(data => {
        setSpec(data)
        setLoading(false)
      })
      .catch(err => {
        setError('Failed to load API specification')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API Documentation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CÁRIS API Documentation</h1>
              <p className="mt-1 text-sm text-gray-500">
                Complete API reference for the CÁRIS mental health platform
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/openapi.json"
                download
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download OpenAPI Spec
              </a>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                v1.0.0
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('swagger')}
                className={`${
                  activeTab === 'swagger'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                API Reference
              </button>
              <button
                onClick={() => setActiveTab('quickstart')}
                className={`${
                  activeTab === 'quickstart'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Quick Start
              </button>
              <button
                onClick={() => setActiveTab('examples')}
                className={`${
                  activeTab === 'examples'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Code Examples
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'swagger' && spec && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <SwaggerUI
              spec={spec}
              docExpansion="list"
              defaultModelsExpandDepth={1}
              tryItOutEnabled={true}
            />
          </div>
        )}

        {activeTab === 'quickstart' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <QuickStartGuide />
          </div>
        )}

        {activeTab === 'examples' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <CodeExamples />
          </div>
        )}
      </main>
    </div>
  )
}

function QuickStartGuide() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start Guide</h2>

      <div className="space-y-6">
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">1. Authentication</h3>
          <p className="text-gray-600 mb-4">
            All authenticated endpoints require a JWT token. Obtain one by logging in:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{`POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}

// Response includes JWT token in HTTP-only cookie
{
  "message": "Logged in successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "patient"
  }
}`}</code>
          </pre>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">2. Using the API Client</h3>
          <p className="text-gray-600 mb-4">
            Import and use the type-safe API client:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{`import { apiClient } from '@/lib/api-client'

// Login
const { user } = await apiClient.auth.login(
  'user@example.com',
  'password123'
)

// Create diary entry
const { entry } = await apiClient.diary.createEntry({
  moodRating: 3,
  intensityRating: 7,
  content: 'Today was a good day...',
  cycle: 'crescer',
  emotions: ['happy', 'peaceful']
})

// Get chat messages
const { data } = await apiClient.chat.getMessages({
  otherUserId: 2
})`}</code>
          </pre>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">3. Error Handling</h3>
          <p className="text-gray-600 mb-4">
            All API errors follow a consistent format:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{`try {
  const result = await apiClient.diary.createEntry(data)
} catch (error) {
  if (error instanceof ApiError) {
    console.log('Status:', error.statusCode)
    console.log('Message:', error.message)
    console.log('Data:', error.data)
  }
}`}</code>
          </pre>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">4. Rate Limits</h3>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Rate Limits:</strong> 100 requests per minute per IP address for most endpoints.
                  Authentication endpoints: 10 requests per minute.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">5. Real-time Features</h3>
          <p className="text-gray-600 mb-4">
            Subscribe to real-time events using Pusher:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{`import Pusher from 'pusher-js'

const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
})

// Subscribe to chat room
const channel = pusher.subscribe('chat-room-123')
channel.bind('new-message', (data) => {
  console.log('New message:', data)
})

// Subscribe to user notifications
const userChannel = pusher.subscribe('user-1')
userChannel.bind('new-notification', (data) => {
  console.log('New notification:', data)
})`}</code>
          </pre>
        </section>
      </div>
    </div>
  )
}

function CodeExamples() {
  const [language, setLanguage] = useState<'javascript' | 'typescript' | 'python' | 'curl'>('typescript')

  const examples = {
    javascript: {
      login: `fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
})
  .then(res => res.json())
  .then(data => console.log(data))`,
      diary: `fetch('/api/patient/diary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    moodRating: 3,
    intensityRating: 7,
    content: 'Today I felt more confident...',
    cycle: 'crescer',
    emotions: ['confidence', 'hope']
  })
})
  .then(res => res.json())
  .then(data => console.log(data))`,
      chat: `fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    receiverId: 2,
    content: 'Hello, how are you?',
    messageType: 'text'
  })
})
  .then(res => res.json())
  .then(data => console.log(data))`
    },
    typescript: {
      login: `import { apiClient } from '@/lib/api-client'

const loginUser = async () => {
  try {
    const response = await apiClient.auth.login(
      'user@example.com',
      'password123'
    )
    console.log('User:', response.user)
  } catch (error) {
    console.error('Login failed:', error)
  }
}`,
      diary: `import { apiClient } from '@/lib/api-client'

const createDiaryEntry = async () => {
  try {
    const response = await apiClient.diary.createEntry({
      moodRating: 3,
      intensityRating: 7,
      content: 'Today I felt more confident...',
      cycle: 'crescer',
      emotions: ['confidence', 'hope']
    })
    console.log('Entry created:', response.entry)
  } catch (error) {
    console.error('Failed to create entry:', error)
  }
}`,
      chat: `import { apiClient } from '@/lib/api-client'

const sendChatMessage = async () => {
  try {
    const response = await apiClient.chat.sendMessage({
      receiverId: 2,
      content: 'Hello, how are you?',
      messageType: 'text'
    })
    console.log('Message sent:', response.data.message)
  } catch (error) {
    console.error('Failed to send message:', error)
  }
}`
    },
    python: {
      login: `import requests

response = requests.post('http://localhost:3000/api/auth/login', json={
    'email': 'user@example.com',
    'password': 'password123'
})

data = response.json()
print(data)`,
      diary: `import requests

response = requests.post(
    'http://localhost:3000/api/patient/diary',
    json={
        'moodRating': 3,
        'intensityRating': 7,
        'content': 'Today I felt more confident...',
        'cycle': 'crescer',
        'emotions': ['confidence', 'hope']
    },
    cookies={'token': 'your_jwt_token'}
)

data = response.json()
print(data)`,
      chat: `import requests

response = requests.post(
    'http://localhost:3000/api/chat',
    json={
        'receiverId': 2,
        'content': 'Hello, how are you?',
        'messageType': 'text'
    },
    cookies={'token': 'your_jwt_token'}
)

data = response.json()
print(data)`
    },
    curl: {
      login: `curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'`,
      diary: `curl -X POST http://localhost:3000/api/patient/diary \\
  -H "Content-Type: application/json" \\
  -H "Cookie: token=YOUR_JWT_TOKEN" \\
  -d '{
    "moodRating": 3,
    "intensityRating": 7,
    "content": "Today I felt more confident...",
    "cycle": "crescer",
    "emotions": ["confidence", "hope"]
  }'`,
      chat: `curl -X POST http://localhost:3000/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Cookie: token=YOUR_JWT_TOKEN" \\
  -d '{
    "receiverId": 2,
    "content": "Hello, how are you?",
    "messageType": "text"
  }'`
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Code Examples</h2>
        <div className="flex space-x-2">
          {(['typescript', 'javascript', 'python', 'curl'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                language === lang
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {lang === 'curl' ? 'cURL' : lang.charAt(0).toUpperCase() + lang.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">User Authentication</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{examples[language].login}</code>
          </pre>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Create Diary Entry</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{examples[language].diary}</code>
          </pre>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Send Chat Message</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{examples[language].chat}</code>
          </pre>
        </section>
      </div>
    </div>
  )
}
