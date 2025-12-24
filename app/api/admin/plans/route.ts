import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { users, subscriptionPlans, subscriptions } from "@/db/schema"
import { eq, sql, desc } from "drizzle-orm"

// GET: List all subscription plans with stats
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true, isGlobalAdmin: true }
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Get all plans
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.sortOrder)

    // Get subscriber count for each plan
    const plansWithStats = await Promise.all(
      plans.map(async (plan) => {
        const subscriberCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(subscriptions)
          .where(eq(subscriptions.planId, plan.id))

        const activeSubscribers = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(subscriptions)
          .where(
            sql`${subscriptions.planId} = ${plan.id} AND ${subscriptions.status} = 'active'`
          )

        return {
          ...plan,
          priceMonthly: plan.priceMonthly / 100, // Convert from cents
          priceYearly: plan.priceYearly ? plan.priceYearly / 100 : null,
          features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
          totalSubscribers: Number(subscriberCount[0]?.count || 0),
          activeSubscribers: Number(activeSubscribers[0]?.count || 0),
        }
      })
    )

    return NextResponse.json({ success: true, data: plansWithStats })
  } catch (error) {
    console.error("Error fetching plans:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// POST: Create new plan
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true, isGlobalAdmin: true }
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const body = await request.json()
    const {
      id,
      name,
      description,
      priceMonthly,
      priceYearly,
      stripePriceIdMonthly,
      stripePriceIdYearly,
      features,
      maxPatients,
      isPopular,
      isActive,
      sortOrder,
    } = body

    if (!id || !name || !description || !priceMonthly || !stripePriceIdMonthly) {
      return NextResponse.json({
        error: "Campos obrigatorios: id, name, description, priceMonthly, stripePriceIdMonthly"
      }, { status: 400 })
    }

    // Check if plan ID already exists
    const existingPlan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, id)
    })

    if (existingPlan) {
      return NextResponse.json({ error: "Ja existe um plano com esse ID" }, { status: 400 })
    }

    const newPlan = await db
      .insert(subscriptionPlans)
      .values({
        id,
        name,
        description,
        priceMonthly: Math.round(priceMonthly * 100), // Convert to cents
        priceYearly: priceYearly ? Math.round(priceYearly * 100) : null,
        stripePriceIdMonthly,
        stripePriceIdYearly: stripePriceIdYearly || null,
        features: JSON.stringify(features || []),
        maxPatients: maxPatients || null,
        isPopular: isPopular || false,
        isActive: isActive ?? true,
        sortOrder: sortOrder || 0,
      })
      .returning()

    return NextResponse.json({ success: true, data: newPlan[0] })
  } catch (error) {
    console.error("Error creating plan:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// PUT: Update existing plan
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true, isGlobalAdmin: true }
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "ID do plano e obrigatorio" }, { status: 400 })
    }

    // Prepare update values
    const updateValues: Record<string, unknown> = {}

    if (updates.name) updateValues.name = updates.name
    if (updates.description) updateValues.description = updates.description
    if (updates.priceMonthly !== undefined) updateValues.priceMonthly = Math.round(updates.priceMonthly * 100)
    if (updates.priceYearly !== undefined) updateValues.priceYearly = updates.priceYearly ? Math.round(updates.priceYearly * 100) : null
    if (updates.stripePriceIdMonthly) updateValues.stripePriceIdMonthly = updates.stripePriceIdMonthly
    if (updates.stripePriceIdYearly) updateValues.stripePriceIdYearly = updates.stripePriceIdYearly
    if (updates.features) updateValues.features = JSON.stringify(updates.features)
    if (updates.maxPatients !== undefined) updateValues.maxPatients = updates.maxPatients
    if (updates.isPopular !== undefined) updateValues.isPopular = updates.isPopular
    if (updates.isActive !== undefined) updateValues.isActive = updates.isActive
    if (updates.sortOrder !== undefined) updateValues.sortOrder = updates.sortOrder
    updateValues.updatedAt = new Date()

    const updatedPlan = await db
      .update(subscriptionPlans)
      .set(updateValues)
      .where(eq(subscriptionPlans.id, id))
      .returning()

    if (updatedPlan.length === 0) {
      return NextResponse.json({ error: "Plano nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updatedPlan[0] })
  } catch (error) {
    console.error("Error updating plan:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// DELETE: Delete plan (only if no active subscriptions)
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true, isGlobalAdmin: true }
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const planId = searchParams.get("id")

    if (!planId) {
      return NextResponse.json({ error: "ID do plano e obrigatorio" }, { status: 400 })
    }

    // Check if there are active subscriptions
    const activeSubscriptions = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .where(
        sql`${subscriptions.planId} = ${planId} AND ${subscriptions.status} = 'active'`
      )

    if (Number(activeSubscriptions[0]?.count || 0) > 0) {
      return NextResponse.json({
        error: "Nao e possivel excluir um plano com assinaturas ativas"
      }, { status: 400 })
    }

    await db
      .delete(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))

    return NextResponse.json({ success: true, message: "Plano excluido com sucesso" })
  } catch (error) {
    console.error("Error deleting plan:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
