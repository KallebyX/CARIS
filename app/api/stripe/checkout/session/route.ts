import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get subscription details if it exists
    let subscriptionData = null
    if (session.subscription && typeof session.subscription !== 'string') {
      // In Stripe API v2024, current_period fields are no longer available directly
      // We estimate the period end as 30 days from start_date or billing_cycle_anchor
      const periodEnd = session.subscription.billing_cycle_anchor
        ? new Date((session.subscription.billing_cycle_anchor + 30 * 24 * 60 * 60) * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      subscriptionData = {
        id: session.subscription.id,
        status: session.subscription.status,
        planId: session.subscription.metadata?.planId,
        currentPeriodEnd: periodEnd,
      }
    }

    // Get plan name from subscription if it's an object
    const planName = (session.subscription && typeof session.subscription !== 'string')
      ? session.subscription.metadata?.planName || 'Professional'
      : 'Professional'

    return NextResponse.json({
      sessionId: session.id,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email,
      planName,
      subscription: subscriptionData,
    })

  } catch (error) {
    console.error('Error retrieving checkout session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}