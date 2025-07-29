import { db } from '../db/index.js'
import { subscriptionPlans } from '../db/schema.js'

const plans = [
  {
    id: 'essential',
    name: 'Essencial',
    description: 'Para psicólogos autônomos que estão começando',
    priceMonthly: 7900, // R$ 79.00 in cents
    priceYearly: 79000, // R$ 790.00 in cents (2 months free)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY || 'price_essential_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_ESSENTIAL_YEARLY || 'price_essential_yearly',
    features: JSON.stringify([
      'Até 10 pacientes ativos',
      'Agenda e Prontuário Eletrônico',
      'Diário Emocional e Mapa Básico',
      'Videoterapia Integrada',
      'Suporte por e-mail'
    ]),
    maxPatients: 10,
    isPopular: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'professional',
    name: 'Profissional',
    description: 'A solução completa para escalar sua prática',
    priceMonthly: 12900, // R$ 129.00 in cents
    priceYearly: 129000, // R$ 1290.00 in cents (2 months free)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_professional_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || 'price_professional_yearly',
    features: JSON.stringify([
      'Pacientes ilimitados',
      'Tudo do plano Essencial',
      'Mapa Emocional com IA Preditiva',
      'Gamificação e Prescrição de Tarefas',
      'Relatórios Avançados',
      'Suporte Prioritário via Chat'
    ]),
    maxPatients: null, // unlimited
    isPopular: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'clinic',
    name: 'Clínica',
    description: 'Para clínicas e equipes com múltiplos terapeutas',
    priceMonthly: 29900, // R$ 299.00 in cents
    priceYearly: 299000, // R$ 2990.00 in cents (2 months free)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_CLINIC_MONTHLY || 'price_clinic_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_CLINIC_YEARLY || 'price_clinic_yearly',
    features: JSON.stringify([
      'Tudo do plano Profissional',
      'Gestão de múltiplos psicólogos',
      'Faturamento centralizado',
      'Dashboard administrativo',
      'Opções de White-label',
      'Gerente de conta dedicado'
    ]),
    maxPatients: null, // unlimited
    isPopular: false,
    isActive: true,
    sortOrder: 3,
  },
]

export async function seedSubscriptionPlans() {
  try {
    console.log('🌱 Seeding subscription plans...')
    
    for (const plan of plans) {
      await db.insert(subscriptionPlans).values(plan).onConflictDoUpdate({
        target: subscriptionPlans.id,
        set: {
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          stripePriceIdMonthly: plan.stripePriceIdMonthly,
          stripePriceIdYearly: plan.stripePriceIdYearly,
          features: plan.features,
          maxPatients: plan.maxPatients,
          isPopular: plan.isPopular,
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
          updatedAt: new Date(),
        },
      })
    }
    
    console.log('✅ Subscription plans seeded successfully')
  } catch (error) {
    console.error('❌ Error seeding subscription plans:', error)
    throw error
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSubscriptionPlans()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}