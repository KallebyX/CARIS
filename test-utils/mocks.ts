/**
 * Mock data generators for testing
 */

export const mockUser = {
  patient: {
    id: 1,
    name: 'Test Patient',
    email: 'patient@test.com',
    role: 'patient',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  psychologist: {
    id: 2,
    name: 'Test Psychologist',
    email: 'psychologist@test.com',
    role: 'psychologist',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  admin: {
    id: 3,
    name: 'Test Admin',
    email: 'admin@test.com',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
}

export const mockPatientProfile = {
  id: '1',
  userId: 1,
  phone: '+5511999999999',
  dateOfBirth: new Date('1990-01-01'),
  gender: 'other',
  emergencyContact: 'Emergency Contact',
  emergencyPhone: '+5511888888888',
  medicalHistory: 'Test medical history',
  currentMedications: 'Test medications',
  allergies: 'Test allergies',
  previousTherapy: true,
  therapyGoals: 'Test therapy goals',
  preferredTherapyType: 'CBT',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockPsychologistProfile = {
  id: '2',
  userId: 2,
  crp: '12345',
  specialization: 'Clinical Psychology',
  bio: 'Test bio',
  yearsOfExperience: 5,
  availableHours: JSON.stringify({ monday: ['09:00-17:00'] }),
  acceptsNewPatients: true,
  sessionPrice: 150,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockSession = {
  id: '1',
  patientId: 1,
  psychologistId: 2,
  scheduledAt: new Date('2024-12-01T10:00:00'),
  duration: 60,
  sessionType: 'online',
  status: 'scheduled',
  notes: 'Test notes',
  meetingLink: 'https://meet.example.com/test',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockChatRoom = {
  id: '1',
  participantIds: JSON.stringify([1, 2]),
  roomType: 'private',
  isEncrypted: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockChatMessage = {
  id: '1',
  roomId: '1',
  senderId: 1,
  content: 'Test message',
  messageType: 'text',
  encryptionVersion: 'aes-256',
  isTemporary: false,
  expiresAt: null,
  metadata: null,
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockDiaryEntry = {
  id: '1',
  patientId: 1,
  title: 'Test Entry',
  content: 'Test content',
  mood: 'neutral',
  activities: JSON.stringify(['work', 'exercise']),
  triggers: 'Test triggers',
  notes: 'Test notes',
  isPrivate: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockMoodTracking = {
  id: '1',
  patientId: 1,
  mood: 'happy',
  intensity: 7,
  triggers: 'Good day at work',
  notes: 'Feeling great',
  createdAt: new Date('2024-01-01'),
}

export const mockUserSettings = {
  id: '1',
  userId: 1,
  emailNotifications: true,
  pushNotifications: true,
  sessionReminders: true,
  diaryReminders: true,
  theme: 'light',
  language: 'pt-BR',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

/**
 * Generate a mock JWT token for testing
 */
export function generateMockToken(userId: number, expiresIn = '1h'): string {
  // This is a simplified mock token - in real tests you might want to use jose to create actual tokens
  return `mock.jwt.token.${userId}`
}

/**
 * Create a mock Next.js request with authentication
 */
export function createMockAuthRequest(userId: number, options: RequestInit = {}): Request {
  const token = generateMockToken(userId)
  const headers = new Headers(options.headers || {})
  headers.set('cookie', `token=${token}`)

  return new Request('http://localhost:3000/api/test', {
    ...options,
    headers,
  })
}

/**
 * Create a mock Next.js request without authentication
 */
export function createMockRequest(options: RequestInit = {}): Request {
  return new Request('http://localhost:3000/api/test', options)
}

/**
 * Mock notification preferences
 */
export const mockNotificationPreferences = {
  all: {
    emailNotifications: true,
    pushNotifications: true,
    sessionReminders: true,
    diaryReminders: true,
  },
  none: {
    emailNotifications: false,
    pushNotifications: false,
    sessionReminders: false,
    diaryReminders: false,
  },
  emailOnly: {
    emailNotifications: true,
    pushNotifications: false,
    sessionReminders: true,
    diaryReminders: true,
  },
}
