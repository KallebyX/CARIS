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
      subscriptionData = {
        id: session.subscription.id,
        status: session.subscription.status,
        planId: session.subscription.metadata?.planId,
        currentPeriodEnd: new Date(session.subscription.current_period_end * 1000),
      }
    }

    return NextResponse.json({
      sessionId: session.id,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email,
      planName: session.subscription?.metadata?.planName || 'Professional',
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