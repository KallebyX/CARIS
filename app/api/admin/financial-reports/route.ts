import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { db } from '@/db'
import { subscriptions, payments, invoices, users } from '@/db/schema'
import { eq, and, gte, lte, count, sum, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const period = searchParams.get('period') || '30d'

    // Calculate date range
    let dateRange = calculateDateRange(period, startDate, endDate)

    // Get subscription metrics
    const subscriptionMetrics = await getSubscriptionMetrics(dateRange)
    
    // Get revenue metrics
    const revenueMetrics = await getRevenueMetrics(dateRange)
    
    // Get churn metrics
    const churnMetrics = await getChurnMetrics(dateRange)
    
    // Get plan distribution
    const planDistribution = await getPlanDistribution()
    
    // Get recent transactions
    const recentTransactions = await getRecentTransactions()

    return NextResponse.json({
      period,
      dateRange,
      metrics: {
        subscriptions: subscriptionMetrics,
        revenue: revenueMetrics,
        churn: churnMetrics,
        planDistribution,
      },
      recentTransactions,
    })

  } catch (error) {
    console.error('Error generating financial report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateDateRange(period: string, startDate?: string | null, endDate?: string | null) {
  const now = new Date()
  let start: Date
  let end: Date = now

  if (startDate && endDate) {
    start = new Date(startDate)
    end = new Date(endDate)
  } else {
    switch (period) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
  }

  return { start, end }
}

async function getSubscriptionMetrics(dateRange: { start: Date; end: Date }) {
  // Active subscriptions
  const activeSubscriptions = await db.select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))

  // New subscriptions in period
  const newSubscriptions = await db.select({ count: count() })
    .from(subscriptions)
    .where(
      and(
        gte(subscriptions.createdAt, dateRange.start),
        lte(subscriptions.createdAt, dateRange.end)
      )
    )

  // Canceled subscriptions in period
  const canceledSubscriptions = await db.select({ count: count() })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, 'canceled'),
        gte(subscriptions.updatedAt, dateRange.start),
        lte(subscriptions.updatedAt, dateRange.end)
      )
    )

  return {
    active: activeSubscriptions[0]?.count || 0,
    new: newSubscriptions[0]?.count || 0,
    canceled: canceledSubscriptions[0]?.count || 0,
  }
}

async function getRevenueMetrics(dateRange: { start: Date; end: Date }) {
  // Total revenue in period
  const totalRevenue = await db.select({ total: sum(payments.amount) })
    .from(payments)
    .where(
      and(
        eq(payments.status, 'succeeded'),
        gte(payments.createdAt, dateRange.start),
        lte(payments.createdAt, dateRange.end)
      )
    )

  // Monthly recurring revenue (active subscriptions)
  const mrrQuery = await db.select({
    planId: subscriptions.planId,
    count: count(),
  })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))
    .groupBy(subscriptions.planId)

  // Calculate MRR based on plan prices
  const planPrices = {
    essential: 7900, // R$ 79.00 in cents
    professional: 12900, // R$ 129.00 in cents
    clinic: 29900, // R$ 299.00 in cents
  }

  const mrr = mrrQuery.reduce((total, item) => {
    const price = planPrices[item.planId as keyof typeof planPrices] || 0
    return total + (price * item.count)
  }, 0)

  return {
    total: totalRevenue[0]?.total || 0,
    mrr,
    averageRevenuePerUser: mrr > 0 && mrrQuery.length > 0 
      ? mrr / mrrQuery.reduce((sum, item) => sum + item.count, 0) 
      : 0,
  }
}

async function getChurnMetrics(dateRange: { start: Date; end: Date }) {
  // Get active subscriptions at start of period
  const activeAtStart = await db.select({ count: count() })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, 'active'),
        lte(subscriptions.createdAt, dateRange.start)
      )
    )

  // Get churned subscriptions in period
  const churned = await db.select({ count: count() })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, 'canceled'),
        gte(subscriptions.canceledAt, dateRange.start),
        lte(subscriptions.canceledAt, dateRange.end)
      )
    )

  const churnRate = activeAtStart[0]?.count > 0 
    ? (churned[0]?.count || 0) / activeAtStart[0].count 
    : 0

  return {
    churnedSubscriptions: churned[0]?.count || 0,
    churnRate: Math.round(churnRate * 100 * 100) / 100, // Percentage with 2 decimal places
  }
}

async function getPlanDistribution() {
  const distribution = await db.select({
    planId: subscriptions.planId,
    planName: subscriptions.planName,
    count: count(),
  })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))
    .groupBy(subscriptions.planId, subscriptions.planName)

  return distribution
}

async function getRecentTransactions(limit: number = 10) {
  const transactions = await db.select({
    id: payments.id,
    amount: payments.amount,
    currency: payments.currency,
    status: payments.status,
    description: payments.description,
    createdAt: payments.createdAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .orderBy(desc(payments.createdAt))
    .limit(limit)

  return transactions
}