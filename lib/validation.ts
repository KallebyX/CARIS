/**
 * Comprehensive Input Validation & Sanitization Library
 *
 * Provides Zod schemas and utilities for validating all API inputs
 * Following OWASP guidelines to prevent:
 * - SQL Injection
 * - XSS (Cross-Site Scripting)
 * - Path Traversal
 * - NoSQL Injection
 * - Command Injection
 *
 * @module validation
 */

import { z } from "zod"
import DOMPurify from "isomorphic-dompurify"

// ================================================================
// CUSTOM VALIDATORS
// ================================================================

/**
 * Sanitize HTML input to prevent XSS attacks
 */
export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
  })
}

/**
 * Sanitize HTML but allow safe formatting tags (for rich text)
 */
export function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "u", "em", "strong", "p", "br", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  })
}

/**
 * Prevent path traversal attacks
 */
export function sanitizePath(path: string): string {
  // Remove path traversal sequences
  return path
    .replace(/\.\./g, "")
    .replace(/\/+/g, "/")
    .replace(/^\//, "")
}

/**
 * Validate email with strict RFC 5322 compliance
 */
export const emailSchema = z
  .string()
  .email("Email inválido")
  .toLowerCase()
  .max(254, "Email muito longo")
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    "Formato de email inválido"
  )

/**
 * Validate Brazilian phone number
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?55?\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Número de telefone inválido")
  .transform((val) => val.replace(/\D/g, "")) // Remove non-digits

/**
 * Validate CPF (Brazilian tax ID)
 */
export const cpfSchema = z
  .string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, "CPF inválido")
  .refine((cpf) => {
    const digits = cpf.replace(/\D/g, "")
    if (digits.length !== 11) return false
    if (/^(\d)\1{10}$/.test(digits)) return false // All same digit

    // Validate check digits
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * (10 - i)
    }
    let checkDigit = 11 - (sum % 11)
    if (checkDigit >= 10) checkDigit = 0
    if (checkDigit !== parseInt(digits[9])) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits[i]) * (11 - i)
    }
    checkDigit = 11 - (sum % 11)
    if (checkDigit >= 10) checkDigit = 0
    if (checkDigit !== parseInt(digits[10])) return false

    return true
  }, "CPF inválido")

/**
 * Validate strong password
 */
export const passwordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .max(128, "Senha muito longa")
  .regex(/[a-z]/, "Senha deve conter letras minúsculas")
  .regex(/[A-Z]/, "Senha deve conter letras maiúsculas")
  .regex(/[0-9]/, "Senha deve conter números")
  .regex(/[^a-zA-Z0-9]/, "Senha deve conter caracteres especiais")

/**
 * Validate URL
 */
export const urlSchema = z
  .string()
  .url("URL inválida")
  .refine((url) => {
    try {
      const parsed = new URL(url)
      // Only allow HTTP/HTTPS
      return ["http:", "https:"].includes(parsed.protocol)
    } catch {
      return false
    }
  }, "URL deve usar HTTP ou HTTPS")

/**
 * Validate UUID
 */
export const uuidSchema = z
  .string()
  .uuid("UUID inválido")

/**
 * Validate date range
 */
export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.endDate > data.startDate, {
  message: "Data final deve ser maior que data inicial",
  path: ["endDate"],
})

// ================================================================
// USER VALIDATION SCHEMAS
// ================================================================

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: z.string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Nome contém caracteres inválidos")
    .transform(sanitizeHTML),
  role: z.enum(["patient", "psychologist"], {
    errorMap: () => ({ message: "Tipo de usuário inválido" }),
  }),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Você deve aceitar os termos de uso",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha é obrigatória"),
  rememberMe: z.boolean().optional(),
})

export const updateProfileSchema = z.object({
  name: z.string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome muito longo")
    .transform(sanitizeHTML)
    .optional(),
  phone: phoneSchema.optional(),
  bio: z.string()
    .max(1000, "Bio muito longa")
    .transform(sanitizeRichText)
    .optional(),
  avatar: urlSchema.optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "Nova senha deve ser diferente da atual",
  path: ["newPassword"],
})

// ================================================================
// PSYCHOLOGIST VALIDATION SCHEMAS
// ================================================================

export const psychologistProfileSchema = z.object({
  crp: z.string()
    .regex(/^\d{2}\/\d{4,6}$/, "CRP inválido (formato: UF/NÚMERO)")
    .transform((val) => val.toUpperCase()),
  specializations: z.array(z.string().max(100)).min(1).max(10),
  approach: z.string()
    .max(500, "Abordagem muito longa")
    .transform(sanitizeRichText),
  experience: z.number().int().min(0).max(70),
  education: z.array(z.object({
    degree: z.string().max(200).transform(sanitizeHTML),
    institution: z.string().max(200).transform(sanitizeHTML),
    year: z.number().int().min(1950).max(new Date().getFullYear()),
  })).max(10),
  languages: z.array(z.string().max(50)).max(10),
})

// ================================================================
// PATIENT VALIDATION SCHEMAS
// ================================================================

export const patientProfileSchema = z.object({
  birthDate: z.coerce.date()
    .refine((date) => {
      const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      return age >= 13 && age <= 120
    }, "Idade deve estar entre 13 e 120 anos"),
  emergencyContact: z.object({
    name: z.string().max(100).transform(sanitizeHTML),
    phone: phoneSchema,
    relationship: z.string().max(50).transform(sanitizeHTML),
  }),
  medicalHistory: z.string()
    .max(5000, "Histórico médico muito longo")
    .transform(sanitizeRichText)
    .optional(),
  medications: z.array(z.string().max(200)).max(50).optional(),
})

// ================================================================
// SESSION VALIDATION SCHEMAS
// ================================================================

export const createSessionSchema = z.object({
  patientId: z.number().int().positive(),
  psychologistId: z.number().int().positive(),
  scheduledAt: z.coerce.date()
    .refine((date) => date > new Date(), "Agendamento deve ser no futuro"),
  duration: z.number().int().min(15).max(240).default(60), // 15min to 4h
  type: z.enum(["individual", "group", "family"], {
    errorMap: () => ({ message: "Tipo de sessão inválido" }),
  }).default("individual"),
  notes: z.string()
    .max(2000)
    .transform(sanitizeRichText)
    .optional(),
})

export const updateSessionSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  duration: z.number().int().min(15).max(240).optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  notes: z.string()
    .max(2000)
    .transform(sanitizeRichText)
    .optional(),
})

// ================================================================
// DIARY VALIDATION SCHEMAS
// ================================================================

export const createDiaryEntrySchema = z.object({
  title: z.string()
    .min(1, "Título é obrigatório")
    .max(200, "Título muito longo")
    .transform(sanitizeHTML),
  content: z.string()
    .min(1, "Conteúdo é obrigatório")
    .max(10000, "Conteúdo muito longo")
    .transform(sanitizeRichText),
  mood: z.number().int().min(1).max(10),
  isPrivate: z.boolean().default(true),
  tags: z.array(z.string().max(50).transform(sanitizeHTML)).max(10).optional(),
})

export const updateDiaryEntrySchema = createDiaryEntrySchema.partial()

// ================================================================
// CHAT VALIDATION SCHEMAS
// ================================================================

export const sendMessageSchema = z.object({
  recipientId: z.number().int().positive(),
  content: z.string()
    .min(1, "Mensagem não pode estar vazia")
    .max(5000, "Mensagem muito longa")
    .transform(sanitizeHTML),
  type: z.enum(["text", "file", "system"]).default("text"),
  isEncrypted: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
})

// ================================================================
// FILE UPLOAD VALIDATION
// ================================================================

export const fileUploadSchema = z.object({
  fileName: z.string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, "Nome de arquivo inválido")
    .transform(sanitizePath),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024), // 50MB max
  mimeType: z.enum([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "video/mp4",
    "video/webm",
  ], {
    errorMap: () => ({ message: "Tipo de arquivo não permitido" }),
  }),
})

// ================================================================
// PAGINATION & FILTERING VALIDATION
// ================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

export const searchSchema = z.object({
  query: z.string()
    .min(1)
    .max(200)
    .transform(sanitizeHTML),
  filters: z.record(z.any()).optional(),
}).merge(paginationSchema)

// ================================================================
// API PARAMETER VALIDATION
// ================================================================

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const uuidParamSchema = z.object({
  id: uuidSchema,
})

// ================================================================
// SANITIZATION UTILITIES
// ================================================================

/**
 * Sanitize object recursively
 * Removes null bytes, controls characters, and trims strings
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      // Remove null bytes and control characters
      result[key] = value
        .replace(/\0/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .trim()
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? sanitizeObject(item)
          : item
      )
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeObject(value)
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * Validate SQL identifier (table/column name)
 * Prevents SQL injection in dynamic queries
 */
export function validateSQLIdentifier(identifier: string): boolean {
  // Only allow alphanumeric, underscore, max 64 chars
  return /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(identifier)
}

/**
 * Escape SQL LIKE pattern
 */
export function escapeSQLLike(pattern: string): string {
  return pattern.replace(/[%_\\]/g, "\\$&")
}

/**
 * Validate and sanitize JSON input
 */
export function sanitizeJSON(input: string, maxDepth: number = 10): any {
  try {
    const parsed = JSON.parse(input)

    // Check depth to prevent DoS
    function checkDepth(obj: any, depth: number = 0): boolean {
      if (depth > maxDepth) return false
      if (typeof obj !== "object" || obj === null) return true

      for (const value of Object.values(obj)) {
        if (!checkDepth(value, depth + 1)) return false
      }
      return true
    }

    if (!checkDepth(parsed)) {
      throw new Error("JSON depth exceeds maximum allowed")
    }

    return parsed
  } catch (error) {
    throw new Error("Invalid JSON: " + (error instanceof Error ? error.message : "Unknown error"))
  }
}

// ================================================================
// REQUEST VALIDATION HELPER
// ================================================================

/**
 * Validate and parse request body with Zod schema
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string; errors?: any }> {
  try {
    const body = await request.json()
    const sanitized = sanitizeObject(body)
    const validated = schema.parse(sanitized)

    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validação falhou",
        errors: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      }
    }

    return {
      success: false,
      error: "Dados inválidos",
    }
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string; errors?: any } {
  try {
    const params = Object.fromEntries(searchParams.entries())
    const sanitized = sanitizeObject(params)
    const validated = schema.parse(sanitized)

    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validação de parâmetros falhou",
        errors: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      }
    }

    return {
      success: false,
      error: "Parâmetros inválidos",
    }
  }
}

// ================================================================
// TYPE EXPORTS
// ================================================================

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type PsychologistProfileInput = z.infer<typeof psychologistProfileSchema>
export type PatientProfileInput = z.infer<typeof patientProfileSchema>
export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
export type CreateDiaryEntryInput = z.infer<typeof createDiaryEntrySchema>
export type UpdateDiaryEntryInput = z.infer<typeof updateDiaryEntrySchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type FileUploadInput = z.infer<typeof fileUploadSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type SearchInput = z.infer<typeof searchSchema>
