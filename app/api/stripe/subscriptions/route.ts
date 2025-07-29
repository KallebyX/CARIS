import { NextRequest, NextResponse } from 'next/server'
import { StripeService, getPlanById } from '@/lib/stripe'
import { getUserIdFromRequest } from '@/lib/auth'
import { db } from '@/db'
import { subscriptions, customers } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planId, interval = 'monthly', email, name } = await request.json()

    // Validate plan
    const plan = getPlanById(planId)
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get price ID based on interval
    const priceId = interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly
    if (!priceId) {
      return NextResponse.json({ 
        error: `${interval} billing not available for this plan` 
      }, { status: 400 })
    }

    // Create or retrieve Stripe customer
    const stripeCustomer = await StripeService.createOrRetrieveCustomer(email, name, userId)

    // Check if customer already exists in our database
    let customer = await db.query.customers.findFirst({
      where: eq(customers.userId, userId),
    })

    if (!customer) {
      // Create customer record in our database
      const [newCustomer] = await db.insert(customers).values({
        userId,
        stripeCustomerId: stripeCustomer.id,
        email,
        name,
      }).returning()
      customer = newCustomer
    }

    // Create Stripe checkout session
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkout?cancelled=true`

    const session = await StripeService.createCheckoutSession(
      stripeCustomer.id,
      priceId,
      planId,
      successUrl,
      cancelUrl
    )

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
    })

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
      with: {
        customer: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({ subscription: null })
    }

    // Get latest subscription data from Stripe
    const stripeSubscription = await StripeService.getSubscription(subscription.stripeSubscriptionId)

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: stripeSubscription.status,
        planId: subscription.planId,
        planName: subscription.planName,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: subscription.canceledAt,
      },
    })

  } catch (error) {
    console.error('Error retrieving subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}