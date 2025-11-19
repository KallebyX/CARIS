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
    const consentCheck = await requireAIConsent(userId, 'image_analysis')
    if (consentCheck) return consentCheck

    if (!openai) {
      return NextResponse.json({ error: "OpenAI API not configured" }, { status: 503 })
    }

    const { image } = await req.json()
    
    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Analyze image with OpenAI Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analise esta imagem para identificar o estado emocional e humor representado. 
              Foque em elementos como:
              - Expressões faciais (se houver pessoas)
              - Cores predominantes e seu impacto emocional
              - Ambiente e contexto
              - Objetos ou símbolos que indiquem humor ou emoção
              - Iluminação e atmosfera geral
              
              Responda em português brasileiro de forma empática e sensível, como se fosse um terapeuta analisando o estado emocional do paciente através da imagem escolhida. Limite a resposta a 2-3 frases descritivas.`
            },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "low"
              }
            }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    })

    const analysis = response.choices[0]?.message?.content || "Não foi possível analisar a imagem."

    return NextResponse.json({
      success: true,
      analysis: analysis
    })

  } catch (error) {
    safeError('[AI_IMAGE_ANALYSIS]', 'Image analysis error:', error)
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    )
  }
}