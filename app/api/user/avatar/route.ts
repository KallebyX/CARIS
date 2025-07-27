import { NextResponse } from "next/server"
import { db } from "@/db"
import { users, psychologistProfiles, patientProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"
import { writeFile } from "fs/promises"
import { join } from "path"

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("avatar") as File

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Apenas imagens são permitidas" }, { status: 400 })
    }

    // Validar tamanho (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo 5MB" }, { status: 400 })
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const fileName = `avatar_${userId}_${timestamp}.${extension}`

    // Salvar arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const path = join(process.cwd(), "public", "uploads", "avatars", fileName)
    await writeFile(path, buffer)

    const avatarUrl = `/uploads/avatars/${fileName}`

    // Buscar dados do usuário
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Atualizar avatar no perfil apropriado
    if (user.role === "psychologist") {
      await db
        .update(psychologistProfiles)
        .set({ avatar: avatarUrl, updatedAt: new Date() })
        .where(eq(psychologistProfiles.userId, userId))
    } else if (user.role === "patient") {
      await db
        .update(patientProfiles)
        .set({ avatar: avatarUrl, updatedAt: new Date() })
        .where(eq(patientProfiles.userId, userId))
    }

    return NextResponse.json({ avatarUrl })
  } catch (error) {
    console.error("Erro ao fazer upload do avatar:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
