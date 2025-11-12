/**
 * API Documentation Generator for CÁRIS Platform
 * Generates OpenAPI 3.0 specification from route definitions
 */

import { z } from "zod"

export interface ApiEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  summary: string
  description: string
  tags: string[]
  auth: boolean
  roles?: string[]
  queryParams?: Record<string, ApiParameter>
  requestBody?: {
    required: boolean
    schema: any
  }
  responses: Record<string, ApiResponse>
  examples?: Record<string, any>
  rateLimit?: {
    requests: number
    window: string
  }
}

export interface ApiParameter {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
  description: string
  required?: boolean
  default?: any
  enum?: any[]
  format?: string
  example?: any
}

export interface ApiResponse {
  description: string
  schema: any
  examples?: any
}

export class ApiDocsGenerator {
  private endpoints: ApiEndpoint[] = []
  private schemas: Record<string, any> = {}

  /**
   * Register an API endpoint
   */
  registerEndpoint(endpoint: ApiEndpoint) {
    this.endpoints.push(endpoint)
  }

  /**
   * Register a reusable schema
   */
  registerSchema(name: string, schema: any) {
    this.schemas[name] = schema
  }

  /**
   * Generate OpenAPI 3.0 specification
   */
  generateOpenApiSpec(): any {
    const paths: Record<string, any> = {}

    // Group endpoints by path
    for (const endpoint of this.endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {}
      }

      const security = endpoint.auth ? [{ bearerAuth: [] }] : []

      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        security,
        ...(endpoint.queryParams && {
          parameters: Object.entries(endpoint.queryParams).map(([name, param]) => ({
            name,
            in: 'query',
            description: param.description,
            required: param.required || false,
            schema: {
              type: param.type,
              ...(param.default && { default: param.default }),
              ...(param.enum && { enum: param.enum }),
              ...(param.format && { format: param.format }),
            },
            ...(param.example && { example: param.example }),
          })),
        }),
        ...(endpoint.requestBody && {
          requestBody: {
            required: endpoint.requestBody.required,
            content: {
              'application/json': {
                schema: endpoint.requestBody.schema,
                ...(endpoint.examples && { examples: endpoint.examples }),
              },
            },
          },
        }),
        responses: Object.entries(endpoint.responses).reduce((acc, [code, response]) => {
          acc[code] = {
            description: response.description,
            content: {
              'application/json': {
                schema: response.schema,
                ...(response.examples && { examples: response.examples }),
              },
            },
          }
          return acc
        }, {} as Record<string, any>),
        ...(endpoint.rateLimit && {
          'x-rate-limit': endpoint.rateLimit,
        }),
      }
    }

    return {
      openapi: '3.0.0',
      info: {
        title: 'CÁRIS API',
        version: '1.0.0',
        description: 'Complete API documentation for the CÁRIS mental health platform',
        contact: {
          name: 'CÁRIS Support',
          email: 'support@caris.health',
        },
        license: {
          name: 'Proprietary',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000/api',
          description: 'Development server',
        },
        {
          url: 'https://app.caris.health/api',
          description: 'Production server',
        },
      ],
      tags: [
        { name: 'Authentication', description: 'User authentication and authorization' },
        { name: 'Patient', description: 'Patient-specific endpoints' },
        { name: 'Psychologist', description: 'Psychologist-specific endpoints' },
        { name: 'Admin', description: 'Administrative endpoints' },
        { name: 'Chat', description: 'Real-time messaging' },
        { name: 'Sessions', description: 'Therapy session management' },
        { name: 'Diary', description: 'Patient diary entries' },
        { name: 'Meditation', description: 'Meditation and mindfulness' },
        { name: 'Gamification', description: 'Points, achievements, and challenges' },
        { name: 'Payments', description: 'Subscription and billing' },
        { name: 'Notifications', description: 'User notifications' },
        { name: 'SOS', description: 'Emergency support system' },
        { name: 'Compliance', description: 'GDPR/LGPD compliance' },
        { name: 'Calendar', description: 'Calendar integration' },
      ],
      paths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from /api/auth/login',
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'token',
            description: 'JWT token stored in HTTP-only cookie',
          },
        },
        schemas: this.schemas,
      },
    }
  }

  /**
   * Export as JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.generateOpenApiSpec(), null, 2)
  }
}

/**
 * Helper to convert Zod schema to JSON Schema
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): any {
  if (schema instanceof z.ZodString) {
    return { type: 'string' }
  }
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' }
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' }
  }
  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema.element),
    }
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>
    const properties: Record<string, any> = {}
    const required: string[] = []

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value)
      if (!value.isOptional()) {
        required.push(key)
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 && { required }),
    }
  }
  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema.options,
    }
  }
  return { type: 'object' }
}

/**
 * Common response schemas
 */
export const CommonSchemas = {
  Error: {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
      issues: {
        type: 'array',
        items: { type: 'object' },
      },
    },
    required: ['error'],
  },
  Success: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
    },
    required: ['success'],
  },
  Pagination: {
    type: 'object',
    properties: {
      limit: { type: 'integer', example: 10 },
      offset: { type: 'integer', example: 0 },
      hasMore: { type: 'boolean' },
      total: { type: 'integer' },
    },
  },
  User: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: {
        type: 'string',
        enum: ['patient', 'psychologist', 'admin', 'clinic_owner', 'clinic_admin'],
      },
      avatarUrl: { type: 'string', format: 'uri', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'name', 'email', 'role'],
  },
  DiaryEntry: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      patientId: { type: 'integer' },
      entryDate: { type: 'string', format: 'date-time' },
      moodRating: { type: 'integer', minimum: 0, maximum: 4 },
      intensityRating: { type: 'integer', minimum: 1, maximum: 10 },
      content: { type: 'string' },
      cycle: {
        type: 'string',
        enum: ['criar', 'cuidar', 'crescer', 'curar'],
      },
      emotions: {
        type: 'array',
        items: { type: 'string' },
      },
      audioUrl: { type: 'string', format: 'uri', nullable: true },
      audioTranscription: { type: 'string', nullable: true },
      imageUrl: { type: 'string', format: 'uri', nullable: true },
      imageDescription: { type: 'string', nullable: true },
      aiAnalyzed: { type: 'boolean' },
      dominantEmotion: { type: 'string', nullable: true },
      emotionIntensity: { type: 'integer', nullable: true },
      sentimentScore: { type: 'integer', minimum: -100, maximum: 100, nullable: true },
      riskLevel: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        nullable: true,
      },
    },
    required: ['id', 'patientId', 'entryDate', 'moodRating', 'intensityRating', 'content', 'cycle'],
  },
  Session: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      psychologistId: { type: 'integer' },
      patientId: { type: 'integer' },
      scheduledAt: { type: 'string', format: 'date-time' },
      duration: { type: 'integer', description: 'Duration in minutes' },
      type: {
        type: 'string',
        enum: ['therapy', 'consultation', 'group'],
      },
      status: {
        type: 'string',
        enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
      },
      notes: { type: 'string', nullable: true },
    },
    required: ['id', 'psychologistId', 'patientId', 'scheduledAt', 'duration', 'type', 'status'],
  },
  ChatMessage: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      roomId: { type: 'string' },
      senderId: { type: 'integer' },
      content: { type: 'string' },
      messageType: {
        type: 'string',
        enum: ['text', 'file', 'system'],
      },
      isTemporary: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      readReceipts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            userId: { type: 'integer' },
            readAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    required: ['id', 'roomId', 'senderId', 'content', 'messageType', 'createdAt'],
  },
  MeditationAudio: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      categoryId: { type: 'string' },
      duration: { type: 'integer', description: 'Duration in seconds' },
      difficulty: {
        type: 'string',
        enum: ['iniciante', 'intermediario', 'avancado'],
      },
      instructor: { type: 'string' },
      audioUrl: { type: 'string', format: 'uri' },
      thumbnailUrl: { type: 'string', format: 'uri', nullable: true },
      playCount: { type: 'integer' },
      averageRating: { type: 'number', minimum: 0, maximum: 5 },
    },
    required: ['id', 'title', 'categoryId', 'duration', 'difficulty', 'instructor', 'audioUrl'],
  },
  Achievement: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      description: { type: 'string' },
      icon: { type: 'string' },
      type: {
        type: 'string',
        enum: ['activity', 'milestone', 'streak', 'special'],
      },
      category: {
        type: 'string',
        enum: ['diary', 'meditation', 'tasks', 'sessions', 'social'],
      },
      requirement: { type: 'integer' },
      xpReward: { type: 'integer' },
      rarity: {
        type: 'string',
        enum: ['common', 'rare', 'epic', 'legendary'],
      },
    },
    required: ['id', 'name', 'description', 'icon', 'type', 'category', 'requirement', 'xpReward', 'rarity'],
  },
}
