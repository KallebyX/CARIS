import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { customFields } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const fields = await db.query.customFields.findMany({
      where: eq(customFields.psychologistId, psychologistId),
      orderBy: (fields, { asc }) => [asc(fields.displayOrder), asc(fields.fieldName)],
    })

    return NextResponse.json({ success: true, data: fields })
  } catch (error) {
    console.error("Erro ao buscar campos customizados:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { fieldName, fieldType, fieldOptions, isRequired, displayOrder } = body

    if (!fieldName || !fieldType) {
      return NextResponse.json({ error: "Nome e tipo do campo são obrigatórios" }, { status: 400 })
    }

    const [newField] = await db.insert(customFields).values({
      psychologistId,
      fieldName,
      fieldType,
      fieldOptions: fieldOptions ? JSON.stringify(fieldOptions) : null,
      isRequired: Boolean(isRequired),
      displayOrder: displayOrder || 0,
    }).returning()

    return NextResponse.json({ success: true, data: newField })
  } catch (error) {
    console.error("Erro ao criar campo customizado:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}