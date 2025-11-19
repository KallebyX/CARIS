import { NextRequest, NextResponse } from "next/server"
import OpenAI from 'openai'
import { getUserIdFromRequest } from "@/lib/auth"
import { requireAIConsent } from "@/lib/consent"
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit"
import { safeError } from "@/lib/safe-logger"

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export async function POST(req: NextRequest) {
  // SECURITY: Rate limiting for AI endpoints
  const rateLimitResult = await rateLimit(req, RateLimitPresets.WRITE)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const userId = await getUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // COMPLIANCE: Check AI consent (LGPD/GDPR requirement)
    const consentCheck = await requireAIConsent(userId, 'audio_transcription')
    if (consentCheck) return consentCheck

    if (!openai) {
      return NextResponse.json({ error: "OpenAI API not configured" }, { status: 503 })
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Convert File to Buffer for OpenAI
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create a File-like object for OpenAI
    const file = new File([buffer], 'audio.wav', { type: 'audio/wav' })

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'pt', // Portuguese
      response_format: 'text',
    })

    return NextResponse.json({
      success: true,
      transcription: transcription
    })

  } catch (error) {
    safeError('[AI_TRANSCRIPTION]', 'Transcription error:', error)
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    )
  }
}