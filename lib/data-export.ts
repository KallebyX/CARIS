import { db } from "@/db"
import { 
  users, 
  patientProfiles, 
  psychologistProfiles, 
  sessions, 
  diaryEntries, 
  userAchievements, 
  achievements,
  meditationSessions,
  userConsents,
  userPrivacySettings,
  dataExports 
} from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES } from "./audit"
import { hasValidConsent } from "./consent"
import * as fs from 'fs'
import * as path from 'path'

export interface DataExportRequest {
  userId: number
  format: 'json' | 'csv'
  ipAddress?: string
  userAgent?: string
}

export interface UserDataExport {
  user: any
  profile: any
  sessions: any[]
  diaryEntries: any[]
  achievements: any[]
  meditationSessions: any[]
  consents: any[]
  privacySettings: any
  exportMetadata: {
    exportedAt: string
    format: string
    version: string
    dataSubject: string
  }
}

/**
 * Solicita exportação de dados do usuário
 */
export async function requestDataExport(request: DataExportRequest) {
  try {
    // Verifica se o usuário tem consentimento para exportação
    const canExport = await hasValidConsent(request.userId, 'data_processing')
    if (!canExport) {
      throw new Error('Usuário não possui consentimento válido para exportação de dados')
    }

    // Cria registro de solicitação de exportação
    const exportRecord = await db.insert(dataExports).values({
      userId: request.userId,
      format: request.format,
      status: 'pending',
      ipAddress: request.ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    }).returning()

    // Log de auditoria
    await logAuditEvent({
      userId: request.userId,
      action: AUDIT_ACTIONS.EXPORT_DATA,
      resourceType: AUDIT_RESOURCES.DATA_EXPORT,
      resourceId: exportRecord[0].id.toString(),
      complianceRelated: true,
      metadata: {
        format: request.format,
        requestType: 'user_request',
      },
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    })

    // Processa a exportação em background (simulado)
    processDataExport(exportRecord[0].id, request.userId, request.format)

    return exportRecord[0]
  } catch (error) {
    console.error('Erro ao solicitar exportação de dados:', error)
    throw error
  }
}

/**
 * Processa a exportação de dados (seria executado em background)
 */
async function processDataExport(exportId: number, userId: number, format: 'json' | 'csv') {
  try {
    // Atualiza status para processando
    await db.update(dataExports)
      .set({ status: 'processing' })
      .where(eq(dataExports.id, exportId))

    // Coleta todos os dados do usuário
    const userData = await collectUserData(userId)
    
    // Gera o arquivo
    const { filePath, fileSize } = await generateExportFile(userData, format, exportId)
    
    // Atualiza registro com informações do arquivo
    await db.update(dataExports)
      .set({ 
        status: 'completed',
        completedAt: new Date(),
        filePath,
        fileSize,
      })
      .where(eq(dataExports.id, exportId))

    // Log de conclusão
    await logAuditEvent({
      userId,
      action: AUDIT_ACTIONS.EXPORT_DATA,
      resourceType: AUDIT_RESOURCES.DATA_EXPORT,
      resourceId: exportId.toString(),
      complianceRelated: true,
      metadata: {
        status: 'completed',
        fileSize,
        format,
      },
    })

  } catch (error) {
    console.error('Erro ao processar exportação:', error)
    
    // Atualiza status para falha
    await db.update(dataExports)
      .set({ 
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      })
      .where(eq(dataExports.id, exportId))
  }
}

/**
 * Coleta todos os dados do usuário
 */
async function collectUserData(userId: number): Promise<UserDataExport> {
  try {
    // Busca dados do usuário
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user[0]) {
      throw new Error('Usuário não encontrado')
    }

    // Busca perfil (paciente ou psicólogo)
    let profile = null
    if (user[0].role === 'patient') {
      const patientData = await db
        .select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, userId))
        .limit(1)
      profile = patientData[0] || null
    } else if (user[0].role === 'psychologist') {
      const psychData = await db
        .select()
        .from(psychologistProfiles)
        .where(eq(psychologistProfiles.userId, userId))
        .limit(1)
      profile = psychData[0] || null
    }

    // Busca sessões
    const userSessions = await db
      .select()
      .from(sessions)
      .where(
        user[0].role === 'patient' 
          ? eq(sessions.patientId, userId)
          : eq(sessions.psychologistId, userId)
      )

    // Busca entradas do diário (apenas para pacientes)
    const diaryData = user[0].role === 'patient' 
      ? await db
          .select()
          .from(diaryEntries)
          .where(eq(diaryEntries.patientId, userId))
      : []

    // Busca conquistas
    const userAchievementsData = await db
      .select({
        achievement: achievements,
        unlockedAt: userAchievements.unlockedAt,
      })
      .from(userAchievements)
      .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId))

    // Busca sessões de meditação
    const meditationData = await db
      .select()
      .from(meditationSessions)
      .where(eq(meditationSessions.userId, userId))

    // Busca consentimentos
    const consentsData = await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId))

    // Busca configurações de privacidade
    const privacyData = await db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, userId))
      .limit(1)

    return {
      user: user[0],
      profile,
      sessions: userSessions,
      diaryEntries: diaryData,
      achievements: userAchievementsData,
      meditationSessions: meditationData,
      consents: consentsData,
      privacySettings: privacyData[0] || null,
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        format: 'json', // será atualizado na função de geração
        version: '1.0',
        dataSubject: user[0].email,
      }
    }
  } catch (error) {
    console.error('Erro ao coletar dados do usuário:', error)
    throw new Error('Falha ao coletar dados do usuário')
  }
}

/**
 * Gera arquivo de exportação
 */
async function generateExportFile(
  userData: UserDataExport, 
  format: 'json' | 'csv', 
  exportId: number
): Promise<{ filePath: string; fileSize: number }> {
  
  const exportDir = '/tmp/exports'
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true })
  }

  const fileName = `user_data_export_${exportId}.${format}`
  const filePath = path.join(exportDir, fileName)

  userData.exportMetadata.format = format

  if (format === 'json') {
    const jsonData = JSON.stringify(userData, null, 2)
    fs.writeFileSync(filePath, jsonData, 'utf-8')
  } else if (format === 'csv') {
    // Para CSV, criamos um arquivo zip com múltiplos CSVs
    const csvData = generateCSVFromUserData(userData)
    fs.writeFileSync(filePath, csvData, 'utf-8')
  }

  const stats = fs.statSync(filePath)
  
  return {
    filePath,
    fileSize: stats.size,
  }
}

/**
 * Converte dados do usuário para formato CSV
 */
function generateCSVFromUserData(userData: UserDataExport): string {
  const lines: string[] = []
  
  // Cabeçalho principal
  lines.push('=== EXPORTAÇÃO DE DADOS PESSOAIS ===')
  lines.push(`Data da Exportação: ${userData.exportMetadata.exportedAt}`)
  lines.push(`Titular dos Dados: ${userData.exportMetadata.dataSubject}`)
  lines.push('')
  
  // Dados do usuário
  lines.push('=== DADOS DO USUÁRIO ===')
  lines.push('Nome,Email,Papel,Data de Criação')
  lines.push(`"${userData.user.name}","${userData.user.email}","${userData.user.role}","${userData.user.createdAt}"`)
  lines.push('')
  
  // Sessões
  if (userData.sessions.length > 0) {
    lines.push('=== SESSÕES ===')
    lines.push('Data da Sessão,Duração (min),Tipo,Status,Notas')
    userData.sessions.forEach(session => {
      const notes = session.notes ? session.notes.replace(/"/g, '""') : ''
      lines.push(`"${session.sessionDate}","${session.durationMinutes}","${session.type}","${session.status}","${notes}"`)
    })
    lines.push('')
  }
  
  // Entradas do diário
  if (userData.diaryEntries.length > 0) {
    lines.push('=== ENTRADAS DO DIÁRIO ===')
    lines.push('Data,Humor,Intensidade,Conteúdo,Emoções')
    userData.diaryEntries.forEach(entry => {
      const content = entry.content ? entry.content.replace(/"/g, '""') : ''
      lines.push(`"${entry.entryDate}","${entry.moodRating}","${entry.intensityRating}","${content}","${entry.emotions || ''}"`)
    })
    lines.push('')
  }
  
  return lines.join('\n')
}

/**
 * Obtém exportações do usuário
 */
export async function getUserExports(userId: number) {
  try {
    const exports = await db
      .select()
      .from(dataExports)
      .where(eq(dataExports.userId, userId))

    return exports
  } catch (error) {
    console.error('Erro ao buscar exportações do usuário:', error)
    throw new Error('Falha ao buscar exportações')
  }
}

/**
 * Registra download de arquivo de exportação
 */
export async function recordExportDownload(exportId: number, userId: number) {
  try {
    await db.update(dataExports)
      .set({ 
        downloadCount: sql`download_count + 1`
      })
      .where(
        and(
          eq(dataExports.id, exportId),
          eq(dataExports.userId, userId)
        )
      )

    await logAuditEvent({
      userId,
      action: 'download',
      resourceType: AUDIT_RESOURCES.DATA_EXPORT,
      resourceId: exportId.toString(),
      complianceRelated: true,
      metadata: {
        action: 'file_download',
      },
    })
  } catch (error) {
    console.error('Erro ao registrar download:', error)
  }
}