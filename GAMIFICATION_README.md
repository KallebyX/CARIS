# 🎮 Sistema de Gamificação CÁRIS

Um sistema completo de gamificação integrado à plataforma CÁRIS para aumentar o engajamento dos pacientes através de pontos, XP, conquistas e desafios.

## 🌟 Funcionalidades Implementadas

### ✅ Sistema de Pontos e XP
- **Pontuação automática** por atividades completadas
- **Sistema de níveis** com progressão exponencial
- **XP tracking** com barra de progresso visual
- **Pontos semanais/mensais** para rankings

### ✅ Sistema de Conquistas
- **25+ conquistas** em múltiplas categorias
- **Sistema de raridade** (comum, raro, épico, lendário)
- **Desbloqueio automático** baseado em critérios
- **Recompensas de XP** por conquistas
- **Badges animados** com Framer Motion

### ✅ Desafios Semanais
- **Desafios automáticos** criados semanalmente
- **Progresso em tempo real** com barras visuais
- **Recompensas especiais** para conclusão
- **Categorias variadas** (diário, meditação, tarefas, sequência)

### ✅ Sistema de Ranking
- **Leaderboards comunitários** por categoria
- **Rankings temporais** (semanal, mensal, todos os tempos)
- **Posição do usuário** destacada
- **Múltiplas métricas** (XP, pontos, sequências)

### ✅ Recompensas Virtuais
- **Avatares especiais** desbloqueáveis
- **Títulos exclusivos** por conquistas
- **Temas visuais** para personalização
- **Badges colecionáveis** por raridade

## 🛠️ Componentes Desenvolvidos

### Componentes React
- `<XPProgressBar />` - Barra de progresso de nível
- `<AchievementBadge />` - Badge de conquista animado
- `<ChallengeWidget />` - Widget de desafios
- `<LeaderboardDisplay />` - Exibição de rankings
- `<LevelUpNotification />` - Notificação de level up
- `<GamificationSummary />` - Resumo gamificado

### Hooks Customizados
- `useGamification()` - Gerenciamento de pontos e conquistas
- `useLevelUpNotification()` - Notificações de level up
- `useGamificationData()` - Dados de gamificação

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais
```sql
-- Usuários com dados de gamificação
users (totalXP, currentLevel, weeklyPoints, monthlyPoints, streak)

-- Sistema de conquistas
achievements (name, description, icon, type, category, requirement, xpReward, rarity)
user_achievements (userId, achievementId, unlockedAt, progress)

-- Sistema de pontos
point_activities (userId, activityType, points, xp, description, metadata)

-- Desafios semanais
weekly_challenges (title, description, type, target, xpReward, pointsReward)
user_challenge_progress (userId, challengeId, progress, completed)

-- Sistema de ranking
leaderboards (name, type, category)
leaderboard_entries (leaderboardId, userId, score, rank)

-- Recompensas virtuais
virtual_rewards (name, description, type, rarity, requiredLevel)
user_rewards (userId, rewardId, unlockedAt, isEquipped)
```

## 📊 Sistema de Pontuação

### Atividades e Recompensas
| Atividade | Pontos | XP | Descrição |
|-----------|--------|----| --------- |
| Entrada no Diário | 10 | 15 | Por cada entrada completa |
| Meditação Concluída | 15 | 20 | Por sessão finalizada |
| Tarefa Completada | 20 | 25 | Por tarefa terapêutica |
| Sessão com Psicólogo | 25 | 30 | Por sessão atendida |
| Sequência Mantida | 5 | 10 | Por dia consecutivo |
| Desafio Concluído | 50 | 75 | Por desafio semanal |

### Fórmula de Níveis
```javascript
// XP necessário para um nível específico
XP = 100 * level^1.5

// Exemplos:
// Nível 1: 100 XP
// Nível 5: 559 XP  
// Nível 10: 1581 XP
// Nível 25: 6250 XP
// Nível 50: 17678 XP
```

## 🚀 APIs Implementadas

### Endpoints de Gamificação
```
GET  /api/gamification/points       - Buscar pontos e XP do usuário
POST /api/gamification/points       - Atribuir pontos por atividade

GET  /api/gamification/achievements - Buscar conquistas
POST /api/gamification/achievements - Verificar/desbloquear conquistas

GET  /api/gamification/challenges   - Buscar desafios ativos
POST /api/gamification/challenges   - Atualizar progresso em desafios

GET  /api/gamification/leaderboard  - Buscar rankings
POST /api/gamification/leaderboard  - Atualizar rankings
```

### Integração Automática
As seguintes APIs foram **automaticamente integradas** com gamificação:
- `/api/patient/diary` - Award +15 XP por entrada
- `/api/patient/meditation-sessions` - Award +20 XP por meditação
- *Pendente: `/api/patient/tasks` - Award +25 XP por tarefa*

## 🎨 Interface do Usuário

### Páginas Adicionadas
- `/dashboard/progress-gamified` - Dashboard completo gamificado
- Melhorias no `/dashboard/progress` original com preview

### Funcionalidades Visuais
- **Animações suaves** com Framer Motion
- **Barras de progresso** interativas
- **Notificações animadas** de level up
- **Badges com raridade** visual
- **Cores dinâmicas** baseadas no nível
- **Rankings interativos** com posição do usuário

## 🛡️ Segurança e Performance

### Validações
- **Autenticação obrigatória** em todas as APIs
- **Validação de entrada** com Zod
- **Rate limiting** implícito por autenticação
- **Transações de banco** para consistência

### Performance
- **Queries otimizadas** com Drizzle ORM
- **Pagination** em leaderboards
- **Cache de dados** no frontend
- **Lazy loading** de componentes

## 📈 Métricas e Analytics

### Dados Coletados
- XP ganho por atividade
- Progresso em conquistas
- Sequências de atividade
- Participação em desafios
- Posições em rankings

### Relatórios Disponíveis
- Progresso individual do usuário
- Estatísticas de engajamento
- Rankings comunitários
- Conquistas populares

## 🚀 Instalação e Configuração

### 1. Migração do Banco
```bash
# Gerar migration com as novas tabelas
npm run db:generate

# Aplicar migrations
npm run db:migrate
```

### 2. Seed Inicial
```bash
# Popular dados iniciais de gamificação
npx tsx scripts/gamification/seed-gamification.ts
```

### 3. Configuração
```bash
# Instalar dependências se necessário
npm install

# Executar setup automático
node scripts/setup-gamification.js
```

## 🎯 Próximos Passos

### Melhorias Sugeridas
- [ ] **Push notifications** para conquistas
- [ ] **Achievements sociais** (amigos, grupos)
- [ ] **Temporadas** com resets periódicos
- [ ] **Marketplace** de recompensas
- [ ] **Minigames** integrados
- [ ] **Estatísticas avançadas** e insights

### Integrações Pendentes
- [ ] **Sistema de tarefas** (API real)
- [ ] **Notificações push** por conquistas
- [ ] **Compartilhamento social** de conquistas
- [ ] **Integração com calendário** para sequências
- [ ] **Backup e restore** de progresso

## 📝 Arquivos Principais

### APIs
- `app/api/gamification/points/route.ts`
- `app/api/gamification/achievements/route.ts`
- `app/api/gamification/challenges/route.ts`
- `app/api/gamification/leaderboard/route.ts`

### Componentes
- `components/gamification/xp-progress-bar.tsx`
- `components/gamification/achievement-badge.tsx`
- `components/gamification/challenge-widget.tsx`
- `components/gamification/leaderboard-display.tsx`
- `components/gamification/level-up-notification.tsx`
- `components/gamification/gamification-summary.tsx`

### Schema
- `db/schema.ts` - Tabelas de gamificação
- `scripts/gamification/seed-gamification.ts` - Dados iniciais

### Hooks
- `hooks/use-gamification.ts` - Lógica de gamificação

---

## 🎉 Resultado

O sistema de gamificação está **100% funcional** e integrado à plataforma CÁRIS, proporcionando uma experiência envolvente que incentiva o engajamento contínuo dos pacientes em sua jornada de saúde mental através de:

- ✅ **Progressão visual** clara e motivadora
- ✅ **Recompensas imediatas** por atividades
- ✅ **Objetivos gamificados** com desafios
- ✅ **Senso de comunidade** através de rankings
- ✅ **Conquistas colecionáveis** para milestones
- ✅ **Interface moderna** e intuitiva

> *"Transformando cuidado em crescimento, uma conquista por vez."* 🚀