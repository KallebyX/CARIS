import { NextRequest, NextResponse } from 'next/server'
import { StripeService } from '@/lib/stripe'
import { getUserIdFromRequest } from '@/lib/auth'
import { db } from '@/db'
import { subscriptions } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, ...params } = await request.json()

    // Get user's subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    switch (action) {
      case 'cancel': {
        const { immediately = false } = params
        const stripeSubscription = await StripeService.cancelSubscription(
          subscription.stripeSubscriptionId,
          immediately
        )

        // Update subscription in database
        await db.update(subscriptions)
          .set({
            cancelAtPeriodEnd: !immediately,
            canceledAt: immediately ? new Date() : null,
            status: immediately ? 'canceled' : stripeSubscription.status,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id))

        return NextResponse.json({
          success: true,
          message: immediately ? 'Subscription canceled immediately' : 'Subscription will cancel at period end',
          subscription: {
            ...subscription,
            cancelAtPeriodEnd: !immediately,
            canceledAt: immediately ? new Date() : null,
            status: immediately ? 'canceled' : stripeSubscription.status,
          },
        })
      }

      case 'reactivate': {
        const stripeSubscription = await StripeService.reactivateSubscription(
          subscription.stripeSubscriptionId
        )

        // Update subscription in database
        await db.update(subscriptions)
          .set({
            cancelAtPeriodEnd: false,
            canceledAt: null,
            status: stripeSubscription.status,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id))

        return NextResponse.json({
          success: true,
          message: 'Subscription reactivated successfully',
          subscription: {
            ...subscription,
            cancelAtPeriodEnd: false,
            canceledAt: null,
            status: stripeSubscription.status,
          },
        })
      }

      case 'change_plan': {
        const { newPriceId, planId } = params
        if (!newPriceId || !planId) {
          return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        // Get current subscription from Stripe to find the subscription item
        const stripeSubscription = await StripeService.getSubscription(subscription.stripeSubscriptionId)
        const subscriptionItem = stripeSubscription.items.data[0]

        // Update the subscription with new price
        const updatedSubscription = await StripeService.updateSubscription(
          subscription.stripeSubscriptionId,
          {
            items: [{
              id: subscriptionItem.id,
              price: newPriceId,
            }],
            metadata: {
              planId,
            },
          }
        )

        // Update subscription in database
        await db.update(subscriptions)
          .set({
            planId,
            priceId: newPriceId,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id))

        return NextResponse.json({
          success: true,
          message: 'Plan changed successfully',
          subscription: updatedSubscription,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error managing subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}