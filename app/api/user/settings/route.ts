import { NextResponse } from "next/server"
import { db } from "@/db"
import { userSettings, users, psychologistProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // Buscar configurações do usuário
    let settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    })

    // Se não existir, criar configurações padrão
    if (!settings) {
      ;[settings] = await db.insert(userSettings).values({ userId }).returning()
    }

    // Buscar dados do usuário
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        psychologistProfile: true,
      },
    })

    return NextResponse.json({
      settings,
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        role: user?.role,
        profile: user?.psychologistProfile,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar configurações:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, data } = body

    if (type === "profile") {
      // Atualizar perfil do usuário
      const { name, bio, crp } = data

      // Atualizar dados básicos do usuário
      if (name) {
        await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, userId))
      }

      // Se for psicólogo, atualizar perfil profissional
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      })

      if (user?.role === "psychologist" && (bio || crp)) {
        await db
          .update(psychologistProfiles)
          .set({
            bio: bio || undefined,
            crp: crp || undefined,
          })
          .where(eq(psychologistProfiles.userId, userId))
      }

      return NextResponse.json({ message: "Perfil atualizado com sucesso" })
    }

    if (type === "notifications") {
      // Atualizar configurações de notificação
      const {
        emailNotifications,
        pushNotifications,
        smsNotifications,
        emailRemindersEnabled,
        smsRemindersEnabled,
        reminderBefore24h,
        reminderBefore1h,
        reminderBefore15min,
      } = data

      await db
        .update(userSettings)
        .set({
          emailNotifications,
          pushNotifications,
          smsNotifications,
          emailRemindersEnabled,
          smsRemindersEnabled,
          reminderBefore24h,
          reminderBefore1h,
          reminderBefore15min,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))

      return NextResponse.json({ message: "Configurações de notificação atualizadas" })
    }

    if (type === "account") {
      // Atualizar configurações da conta
      const { email, currentPassword, newPassword } = data

      if (email) {
        await db.update(users).set({ email, updatedAt: new Date() }).where(eq(users.id, userId))
      }

      // TODO: Implementar mudança de senha com verificação
      if (currentPassword && newPassword) {
        // Verificar senha atual e atualizar
        // Por enquanto, apenas retornar sucesso
      }

      return NextResponse.json({ message: "Configurações da conta atualizadas" })
    }

    return NextResponse.json({ error: "Tipo de atualização inválido" }, { status: 400 })
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
