import { db } from "../db"
import { achievements, weeklyChallenes, virtualRewards } from "../db/schema"

// Initial achievements data
const initialAchievements = [
  // Diary category
  {
    name: "Explorador Emocional",
    description: "Fez sua primeira entrada no diário",
    icon: "BookOpen",
    type: "special",
    category: "diary",
    requirement: 1,
    xpReward: 50,
    rarity: "common",
  },
  {
    name: "Escriba Dedicado",
    description: "Completou 10 entradas no diário",
    icon: "BookOpen",
    type: "activity",
    category: "diary",
    requirement: 10,
    xpReward: 100,
    rarity: "common",
  },
  {
    name: "Cronista Emocional",
    description: "Completou 50 entradas no diário",
    icon: "BookOpen",
    type: "activity",
    category: "diary",
    requirement: 50,
    xpReward: 250,
    rarity: "rare",
  },
  {
    name: "Mestre dos Sentimentos",
    description: "Completou 100 entradas no diário",
    icon: "Crown",
    type: "activity",
    category: "diary",
    requirement: 100,
    xpReward: 500,
    rarity: "epic",
  },

  // Meditation category
  {
    name: "Primeira Meditação",
    description: "Completou sua primeira sessão de meditação",
    icon: "Brain",
    type: "special",
    category: "meditation",
    requirement: 1,
    xpReward: 75,
    rarity: "common",
  },
  {
    name: "Mente Tranquila",
    description: "Completou 10 sessões de meditação",
    icon: "Brain",
    type: "activity",
    category: "meditation",
    requirement: 10,
    xpReward: 150,
    rarity: "common",
  },
  {
    name: "Praticante Zen",
    description: "Completou 25 sessões de meditação",
    icon: "Brain",
    type: "activity",
    category: "meditation",
    requirement: 25,
    xpReward: 300,
    rarity: "rare",
  },
  {
    name: "Mestre da Meditação",
    description: "Completou 100 sessões de meditação",
    icon: "Crown",
    type: "activity",
    category: "meditation",
    requirement: 100,
    xpReward: 750,
    rarity: "legendary",
  },

  // Tasks category
  {
    name: "Primeira Tarefa",
    description: "Concluiu sua primeira tarefa terapêutica",
    icon: "CheckCircle",
    type: "special",
    category: "tasks",
    requirement: 1,
    xpReward: 60,
    rarity: "common",
  },
  {
    name: "Colaborador Ativo",
    description: "Concluiu 5 tarefas terapêuticas",
    icon: "CheckCircle",
    type: "activity",
    category: "tasks",
    requirement: 5,
    xpReward: 125,
    rarity: "common",
  },
  {
    name: "Comprometido",
    description: "Concluiu 20 tarefas terapêuticas",
    icon: "Target",
    type: "activity",
    category: "tasks",
    requirement: 20,
    xpReward: 350,
    rarity: "rare",
  },
  {
    name: "Super Produtivo",
    description: "Concluiu 50 tarefas terapêuticas",
    icon: "Trophy",
    type: "activity",
    category: "tasks",
    requirement: 50,
    xpReward: 600,
    rarity: "epic",
  },

  // Streak category
  {
    name: "Início da Jornada",
    description: "Manteve uma sequência de 3 dias",
    icon: "Calendar",
    type: "streak",
    category: "streak",
    requirement: 3,
    xpReward: 75,
    rarity: "common",
  },
  {
    name: "Semana Consistente",
    description: "Manteve uma sequência de 7 dias",
    icon: "Calendar",
    type: "streak",
    category: "streak",
    requirement: 7,
    xpReward: 150,
    rarity: "common",
  },
  {
    name: "Quinzena Dedicada",
    description: "Manteve uma sequência de 15 dias",
    icon: "Calendar",
    type: "streak",
    category: "streak",
    requirement: 15,
    xpReward: 300,
    rarity: "rare",
  },
  {
    name: "Mês Extraordinário",
    description: "Manteve uma sequência de 30 dias",
    icon: "Crown",
    type: "streak",
    category: "streak",
    requirement: 30,
    xpReward: 750,
    rarity: "epic",
  },

  // Level milestones
  {
    name: "Recém-chegado",
    description: "Alcançou o nível 5",
    icon: "Star",
    type: "milestone",
    category: "level",
    requirement: 5,
    xpReward: 100,
    rarity: "common",
  },
  {
    name: "Crescendo",
    description: "Alcançou o nível 10",
    icon: "TrendingUp",
    type: "milestone",
    category: "level",
    requirement: 10,
    xpReward: 200,
    rarity: "common",
  },
  {
    name: "Experiente",
    description: "Alcançou o nível 25",
    icon: "Award",
    type: "milestone",
    category: "level",
    requirement: 25,
    xpReward: 500,
    rarity: "rare",
  },
  {
    name: "Veterano",
    description: "Alcançou o nível 50",
    icon: "Crown",
    type: "milestone",
    category: "level",
    requirement: 50,
    xpReward: 1000,
    rarity: "legendary",
  },

  // SOS/Social category
  {
    name: "Ato de Coragem",
    description: "Usou as ferramentas SOS quando precisou",
    icon: "Heart",
    type: "special",
    category: "social",
    requirement: 1,
    xpReward: 100,
    rarity: "common",
  },
]

// Initial weekly challenges
const initialChallenges = [
  {
    title: "Escriba Diário",
    description: "Faça 5 entradas no diário esta semana",
    icon: "BookOpen",
    type: "diary",
    target: 5,
    xpReward: 100,
    pointsReward: 75,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  },
  {
    title: "Mindfulness",
    description: "Complete 3 sessões de meditação",
    icon: "Brain", 
    type: "meditation",
    target: 3,
    xpReward: 75,
    pointsReward: 50,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  },
  {
    title: "Produtividade",
    description: "Complete 5 tarefas terapêuticas",
    icon: "CheckCircle",
    type: "tasks",
    target: 5,
    xpReward: 150,
    pointsReward: 100,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  },
  {
    title: "Constância",
    description: "Mantenha uma sequência de 7 dias",
    icon: "Calendar",
    type: "streak",
    target: 7,
    xpReward: 200,
    pointsReward: 150,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  },
]

// Initial virtual rewards
const initialRewards = [
  {
    name: "Avatar Sereno",
    description: "Avatar especial para praticantes de meditação",
    icon: "User",
    type: "avatar",
    rarity: "common",
    requiredLevel: 5,
    requiredXP: 500,
  },
  {
    name: "Título: Explorador",
    description: "Título especial para aventureiros do autoconhecimento",
    icon: "Award",
    type: "title",
    rarity: "rare",
    requiredLevel: 10,
    requiredXP: 1000,
  },
  {
    name: "Tema Zen",
    description: "Tema visual relaxante para o dashboard",
    icon: "Palette",
    type: "theme",
    rarity: "epic",
    requiredLevel: 20,
    requiredXP: 2500,
  },
  {
    name: "Badge Lendário",
    description: "Badge exclusivo para masters da plataforma",
    icon: "Crown",
    type: "badge",
    rarity: "legendary",
    requiredLevel: 50,
    requiredXP: 10000,
  },
]

export async function seedGamificationData() {
  try {
    console.log("🎮 Iniciando seed dos dados de gamificação...")

    // Seed achievements
    console.log("📈 Inserindo conquistas...")
    for (const achievement of initialAchievements) {
      await db.insert(achievements).values(achievement).onConflictDoNothing()
    }

    // Seed challenges
    console.log("🎯 Inserindo desafios semanais...")
    for (const challenge of initialChallenges) {
      await db.insert(weeklyChallenes).values(challenge).onConflictDoNothing()
    }

    // Seed rewards
    console.log("🏆 Inserindo recompensas virtuais...")
    for (const reward of initialRewards) {
      await db.insert(virtualRewards).values(reward).onConflictDoNothing()
    }

    console.log("✅ Seed de gamificação completado com sucesso!")
    console.log(`   - ${initialAchievements.length} conquistas inseridas`)
    console.log(`   - ${initialChallenges.length} desafios inseridos`)
    console.log(`   - ${initialRewards.length} recompensas inseridas`)

  } catch (error) {
    console.error("❌ Erro durante o seed de gamificação:", error)
    throw error
  }
}

// Run seed if called directly
if (require.main === module) {
  seedGamificationData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}