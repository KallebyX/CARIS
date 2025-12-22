import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Stripe subscription plans configuration
export const STRIPE_PLANS = {
  essential: {
    id: 'essential',
    name: 'Essencial',
    description: 'Para psicólogos autônomos que estão começando',
    priceMonthly: 7900, // R$ 79.00 in cents
    priceYearly: 79000, // R$ 790.00 in cents (2 months free)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY || '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_ESSENTIAL_YEARLY || '',
    features: [
      'Até 10 pacientes ativos',
      'Agenda e Prontuário Eletrônico',
      'Diário Emocional e Mapa Básico',
      'Videoterapia Integrada',
      'Suporte por e-mail'
    ],
    maxPatients: 10,
    isPopular: false,
  },
  professional: {
    id: 'professional',
    name: 'Profissional',
    description: 'A solução completa para escalar sua prática',
    priceMonthly: 12900, // R$ 129.00 in cents
    priceYearly: 129000, // R$ 1290.00 in cents (2 months free)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || '',
    features: [
      'Pacientes ilimitados',
      'Tudo do plano Essencial',
      'Mapa Emocional com IA Preditiva',
      'Gamificação e Prescrição de Tarefas',
      'Relatórios Avançados',
      'Suporte Prioritário via Chat'
    ],
    maxPatients: null, // unlimited
    isPopular: true,
  },
  clinic: {
    id: 'clinic',
    name: 'Clínica',
    description: 'Para clínicas e equipes com múltiplos terapeutas',
    priceMonthly: 29900, // R$ 299.00 in cents
    priceYearly: 299000, // R$ 2990.00 in cents (2 months free)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_CLINIC_MONTHLY || '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_CLINIC_YEARLY || '',
    features: [
      'Tudo do plano Profissional',
      'Gestão de múltiplos psicólogos',
      'Faturamento centralizado',
      'Dashboard administrativo',
      'Opções de White-label',
      'Gerente de conta dedicado'
    ],
    maxPatients: null, // unlimited
    isPopular: false,
  },
} as const

export type SubscriptionPlan = keyof typeof STRIPE_PLANS

// Utility functions for Stripe operations
export class StripeService {
  // Create or retrieve a customer
  static async createOrRetrieveCustomer(email: string, name?: string, userId?: number) {
    try {
      // First try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0]
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId: userId?.toString() || '',
        },
      })

      return customer
    } catch (error) {
      console.error('Error creating/retrieving customer:', error)
      throw error
    }
  }

  // Create a subscription
  static async createSubscription(
    customerId: string,
    priceId: string,
    planId: SubscriptionPlan,
    paymentMethodId?: string
  ) {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          planId,
        },
      }

      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId
      }

      const subscription = await stripe.subscriptions.create(subscriptionData)
      return subscription
    } catch (error) {
      console.error('Error creating subscription:', error)
      throw error
    }
  }

  // Create a payment intent for one-time payments
  static async createPaymentIntent(
    amount: number,
    currency: string = 'brl',
    customerId: string,
    description?: string
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        description,
        payment_method_types: ['card'],
        capture_method: 'automatic',
      })

      return paymentIntent
    } catch (error) {
      console.error('Error creating payment intent:', error)
      throw error
    }
  }

  // Update subscription
  static async updateSubscription(
    subscriptionId: string,
    updates: Partial<Stripe.SubscriptionUpdateParams>
  ) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, updates)
      return subscription
    } catch (error) {
      console.error('Error updating subscription:', error)
      throw error
    }
  }

  // Cancel subscription
  static async cancelSubscription(subscriptionId: string, immediately: boolean = false) {
    try {
      if (immediately) {
        const subscription = await stripe.subscriptions.cancel(subscriptionId)
        return subscription
      } else {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        })
        return subscription
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      throw error
    }
  }

  // Reactivate subscription
  static async reactivateSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      })
      return subscription
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      throw error
    }
  }

  // Retrieve subscription
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice', 'customer', 'default_payment_method'],
      })
      return subscription
    } catch (error) {
      console.error('Error retrieving subscription:', error)
      throw error
    }
  }

  // Get customer payment methods
  static async getCustomerPaymentMethods(customerId: string) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      })
      return paymentMethods.data
    } catch (error) {
      console.error('Error retrieving payment methods:', error)
      throw error
    }
  }

  // Create setup intent for saving payment method
  static async createSetupIntent(customerId: string) {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      })
      return setupIntent
    } catch (error) {
      console.error('Error creating setup intent:', error)
      throw error
    }
  }

  // Get invoices for customer
  static async getCustomerInvoices(customerId: string, limit: number = 10) {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
        expand: ['data.subscription'],
      })
      return invoices.data
    } catch (error) {
      console.error('Error retrieving invoices:', error)
      throw error
    }
  }

  // Retry failed payment
  static async retryFailedPayment(invoiceId: string) {
    try {
      const invoice = await stripe.invoices.pay(invoiceId, {
        paid_out_of_band: false,
      })
      return invoice
    } catch (error) {
      console.error('Error retrying payment:', error)
      throw error
    }
  }

  // Get usage-based billing records (if needed for future expansion)
  static async getUsageRecords(subscriptionItemId: string) {
    try {
      const usageRecords = await stripe.subscriptionItems.listUsageRecordSummaries(
        subscriptionItemId
      )
      return usageRecords.data
    } catch (error) {
      console.error('Error retrieving usage records:', error)
      throw error
    }
  }

  // Create a checkout session
  static async createCheckoutSession(
    customerId: string,
    priceId: string,
    planId: SubscriptionPlan,
    successUrl: string,
    cancelUrl: string
  ) {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: {
            planId,
          },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
      })
      return session
    } catch (error) {
      console.error('Error creating checkout session:', error)
      throw error
    }
  }
}

// Helper function to format prices
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// Helper function to get plan by ID
export function getPlanById(planId: SubscriptionPlan) {
  return STRIPE_PLANS[planId]
}

// Helper function to get all plans
export function getAllPlans() {
  return Object.values(STRIPE_PLANS) as Array<{
    id: string
    name: string
    description: string
    priceMonthly: number
    priceYearly: number
    stripePriceIdMonthly: string
    stripePriceIdYearly: string
    features: string[]
    maxPatients: number | null
    isPopular: boolean
  }>
}