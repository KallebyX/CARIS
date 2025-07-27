import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { diaryEntries } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(req.url)
    const format = url.searchParams.get('format') || 'json' // json, csv, pdf

    // Fetch all diary entries
    const entries = await db
      .select()
      .from(diaryEntries)
      .where(eq(diaryEntries.patientId, userId))

    // Process entries for export
    const processedEntries = entries.map(entry => ({
      id: entry.id,
      date: entry.entryDate?.toISOString(),
      mood: entry.moodRating,
      intensity: entry.intensityRating,
      content: entry.content,
      cycle: entry.cycle,
      emotions: entry.emotions ? JSON.parse(entry.emotions) : [],
      hasAudio: !!entry.audioUrl,
      audioTranscription: entry.audioTranscription,
      hasImage: !!entry.imageUrl,
      imageDescription: entry.imageDescription,
      dominantEmotion: entry.dominantEmotion,
      riskLevel: entry.riskLevel,
      aiInsights: entry.aiInsights ? JSON.parse(entry.aiInsights) : [],
      suggestedActions: entry.suggestedActions ? JSON.parse(entry.suggestedActions) : [],
    }))

    switch (format) {
      case 'csv':
        return exportAsCSV(processedEntries)
      case 'json':
        return exportAsJSON(processedEntries)
      case 'pdf':
        return exportAsPDF(processedEntries)
      default:
        return exportAsJSON(processedEntries)
    }
    
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: "Failed to export diary entries" }, 
      { status: 500 }
    )
  }
}

function exportAsJSON(entries: any[]) {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalEntries: entries.length,
    entries: entries
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="diary-export-${new Date().toISOString().split('T')[0]}.json"`,
    }
  })
}

function exportAsCSV(entries: any[]) {
  const headers = [
    'Data',
    'Humor (0-4)',
    'Intensidade (1-10)',
    'Conteúdo',
    'Ciclo',
    'Emoções',
    'Tem Áudio',
    'Transcrição',
    'Tem Imagem',
    'Descrição da Imagem',
    'Emoção Dominante',
    'Nível de Risco'
  ]

  const csvContent = [
    headers.join(','),
    ...entries.map(entry => [
      entry.date,
      entry.mood,
      entry.intensity,
      `"${entry.content?.replace(/"/g, '""') || ''}"`,
      entry.cycle,
      `"${Array.isArray(entry.emotions) ? entry.emotions.join('; ') : ''}"`,
      entry.hasAudio ? 'Sim' : 'Não',
      `"${entry.audioTranscription?.replace(/"/g, '""') || ''}"`,
      entry.hasImage ? 'Sim' : 'Não',
      `"${entry.imageDescription?.replace(/"/g, '""') || ''}"`,
      entry.dominantEmotion || '',
      entry.riskLevel || ''
    ].join(','))
  ].join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="diary-export-${new Date().toISOString().split('T')[0]}.csv"`,
    }
  })
}

function exportAsPDF(entries: any[]) {
  // For now, return a simple text format that could be converted to PDF
  // In a real implementation, you'd use a PDF library like jsPDF or Puppeteer
  
  const content = `
RELATÓRIO DO DIÁRIO EMOCIONAL
Data de Exportação: ${new Date().toLocaleDateString('pt-BR')}
Total de Entradas: ${entries.length}

${entries.map((entry, index) => `
ENTRADA ${index + 1}
Data: ${new Date(entry.date).toLocaleDateString('pt-BR')}
Humor: ${entry.mood}/4 | Intensidade: ${entry.intensity}/10
Ciclo: ${entry.cycle}
${entry.emotions.length > 0 ? `Emoções: ${entry.emotions.join(', ')}` : ''}

Conteúdo:
${entry.content || 'Sem conteúdo de texto'}

${entry.audioTranscription ? `Transcrição do Áudio:\n${entry.audioTranscription}` : ''}

${entry.imageDescription ? `Descrição da Imagem:\n${entry.imageDescription}` : ''}

${entry.dominantEmotion ? `Emoção Dominante: ${entry.dominantEmotion}` : ''}
${entry.riskLevel ? `Nível de Risco: ${entry.riskLevel}` : ''}

${entry.aiInsights.length > 0 ? `Insights da IA:\n${entry.aiInsights.map((insight: string) => `• ${insight}`).join('\n')}` : ''}

-------------------
`).join('')}
  `.trim()

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="diary-export-${new Date().toISOString().split('T')[0]}.txt"`,
    }
  })
}