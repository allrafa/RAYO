# 📝 SPRINT 3 - QUICK REFERENCE
## Cheatsheet de Referência Rápida - Gamificação 2.0

> **Para:** Toda a equipe  
> **Quando:** Durante desenvolvimento, daily standups, code reviews

---

## 🎯 OBJETIVO EM 1 FRASE

**"Aumentar D7 retention +12% e sessions/week +60% via gamificação com reforço positivo (sem punição)."**

---

## 📊 MÉTRICAS PRINCIPAIS (6)

| Métrica | Baseline | Meta | Melhoria |
|---------|----------|------|----------|
| **D7 Retention** | 38% | 50% | +12% |
| **D30 Retention** | 28% | 38% | +10% |
| **Sessions/Week** | 2.5 | 4.0 | +60% |
| **DAU** | - | +30% | +30% |
| **Missões Completed** | 0% | 70% | - |
| **Streak >7 dias** | 0% | 40% | - |

---

## 🚀 SISTEMAS CORE (3)

### 1. Energia ⚡
```
5 corações/dia
Regenera 1 a cada 4h
Gasta em ações de aprendizado
NUNCA bloqueia conteúdo
```

### 2. Streaks 🔥
```
Daily/Weekly/Monthly
Proteções: Freeze, Weekend Pass, Recovery
Milestones: 7, 30, 100, 365 dias
```

### 3. Missões 🎯
```
Diárias: 3/dia (reset 00:00)
Semanais: 1-2/semana
Colaborativas: Times 2-5 pessoas
Recompensas: XP + Energia + Badges
```

---

## 📁 ARQUIVOS PRINCIPAIS

```
/lib/gamification/
  ├── EnergySystem.ts         ← Sistema de Energia
  ├── StreakSystem.ts         ← Sistema de Streaks
  ├── MissionsSystem.ts       ← Sistema de Missões
  └── types.ts                ← TypeScript types

/components/gamification/
  ├── EnergyDisplay.tsx       ← UI Energia
  ├── StreakDisplay.tsx       ← UI Streak
  ├── MissionsList.tsx        ← Lista missões
  ├── MissionCard.tsx         ← Card individual
  └── GamificationDashboard.tsx  ← Dashboard completo

/hooks/gamification/
  ├── useEnergy.ts            ← Hook Energia
  ├── useStreak.ts            ← Hook Streak
  ├── useMissions.ts          ← Hook Missões
  └── useGamification.ts      ← Hook central
```

---

## 🧪 EXPERIMENTOS PLANEJADOS

### Exp 1: Energia vs Atual
```typescript
Feature: 'gamification-energy-system'
Variants:
  - control: Sistema atual
  - energy: Energia + Streaks + Missões
Métrica: D7 retention
```

### Exp 2: Notificações
```typescript
Feature: 'notification-strategy'
Variants:
  - control: Nenhuma
  - light: 1/dia (20h)
  - heavy: 3/dia
Métrica: Open rate, D7 retention
```

### Exp 3: Missões Frequency
```typescript
Feature: 'mission-frequency'
Variants:
  - daily: 3 missões/dia
  - weekly: 1 mega-missão/semana
Métrica: Completion rate
```

---

## 📊 EVENTOS ANALYTICS

```typescript
// Energia
ENERGY_USED(action_type, energy_cost, had_energy)
ENERGY_REGENERATED(energy_added, new_total)
ENERGY_DEPLETED(user_continued_anyway)
ENERGY_BONUS_EARNED(amount, source)

// Streaks
STREAK_CONTINUED(current_streak, consecutive_days)
STREAK_MILESTONE(streak_days, milestone_type)
STREAK_FREEZE_USED(saved_streak_days)
STREAK_BROKEN(lost_streak_days, reason)

// Missões
MISSION_PROGRESS(mission_id, current, target, percentage)
MISSION_COMPLETED(mission_id, time_to_complete, xp_earned)
MISSION_EXPIRED(mission_id, final_progress)

// Colaborativo
TEAM_CREATED(team_id, team_type, member_count)
TEAM_MISSION_COMPLETED(team_id, mission_id)
```

---

## 💻 SNIPPETS ÚTEIS

### Usar Sistema de Energia
```typescript
import { useEnergy } from '../hooks/gamification/useEnergy';

const { energy, useEnergy: spendEnergy, hasEnergy } = useEnergy();

// Checar se tem energia
if (hasEnergy(1)) {
  console.log('Tem energia!');
}

// Usar energia
const result = await spendEnergy({
  type: 'course_lesson',
  energyCost: 1,
  estimatedDuration: 10
});

if (result.energyUsed) {
  toast.success(result.message);
}
```

### Registrar Streak
```typescript
import { useStreak } from '../hooks/gamification/useStreak';

const { streak, recordActivity } = useStreak();

// Após completar ação
const result = await recordActivity('lesson_completed');

if (result.streakIncreased) {
  toast.success(result.message);
  
  if (result.milestoneAchieved) {
    showCelebration(result.milestoneAchieved);
  }
}
```

### Hook Central (Recomendado)
```typescript
import { useGamification } from '../hooks/gamification/useGamification';

const { completeAction } = useGamification();

// Uma chamada faz tudo!
const { energyResult, streakResult, completedMissions } = await completeAction({
  type: 'course_lesson',
  energyCost: 1,
  estimatedDuration: 10
});
```

### Componente de Energia
```typescript
import { EnergyDisplay } from '../components/gamification/EnergyDisplay';

<EnergyDisplay 
  current={5}
  max={5}
  timeUntilNext={14400000} // 4 horas em ms
  compact={false}
/>
```

---

## 🔍 TROUBLESHOOTING RÁPIDO

### Energia não regenera
```typescript
// Verificar timing
console.log('Last regen:', energy.lastRegenTime);
console.log('Time until next:', timeUntilNext);

// Forçar regeneração manual (debug)
energySystem.regenerateEnergy();
```

### Streak não aumenta
```typescript
// Verificar última atividade
console.log('Last activity:', streak.lastActivityDate);
console.log('Current streak:', streak.currentDailyStreak);

// Checar timezone
const today = new Date();
today.setHours(0, 0, 0, 0);
console.log('Today (00:00):', today);
```

### Missões não auto-trackam
```typescript
// Verificar mapeamento de ações
const actionToCategory = {
  'course_lesson_completed': ['learning'],
  'post_created': ['social'],
  // ... adicionar mais
};

// Testar manualmente
missionsSystem.trackAction({ type: 'course_lesson_completed' });
```

### Analytics não enviando
```typescript
// Verificar Mixpanel
console.log('Mixpanel enabled:', analytics.isEnabled);

// Forçar flush
analytics.flush();

// Checar último evento
mixpanel.track('TEST_EVENT', { test: true });
```

---

## 🔴 BACKEND CHECKLIST RÁPIDO

### Tabelas Supabase
```sql
✓ user_energy
✓ user_streaks
✓ missions
✓ user_missions
✓ teams
✓ team_members
```

### APIs Necessárias
```typescript
// Energia
getEnergyState(userId)
useEnergy(userId, amount, action)
regenerateEnergy(userId)
addBonusEnergy(userId, amount, source)

// Streaks
getStreakState(userId)
recordActivity(userId, type)
checkMilestone(userId)

// Missões
getActiveMissions(userId, type?)
updateMissionProgress(userId, missionId)
trackAction(userId, action)
generateDailyMissions(userId)
```

### Migration Path
```
1. Criar tabelas
2. Implementar APIs
3. Testar em staging
4. Migrar localStorage data
5. Deploy gradual (feature flag)
```

---

## ⏱️ TIMELINE CONDENSADO

**Semana 1:** Energia + Streaks + UI  
**Semana 2:** Missões + Colaborativo  
**Semana 3:** Conteúdo + Experimentos + Deploy

---

## ✅ DEFINITION OF DONE MÍNIMO

- [ ] EnergySystem funcionando
- [ ] StreakSystem funcionando
- [ ] MissionsSystem com auto-tracking
- [ ] 3 componentes UI criados
- [ ] Experimento Energia configurado
- [ ] Analytics trackando 100%
- [ ] Zero regressões críticas
- [ ] Dashboard Mixpanel atualizado

---

## 💡 FILOSOFIA CORE

### ✅ FAZER (Reforço Positivo)
- Energia regenera naturalmente
- Streaks com proteções (Freeze)
- Celebrar todas conquistas
- Notificações úteis
- Missões variadas

### ❌ NÃO FAZER (Anti-patterns)
- Bloquear conteúdo sem energia
- Perder progresso se quebrar streak
- Criar ansiedade
- Spam de notificações
- Comparações negativas

---

## 📞 CONTATOS RÁPIDOS

- **Slack:** #sprint-3-gamification
- **Mixpanel:** Dashboard Gamification
- **GrowthBook:** Experimentos Sprint 3
- **Docs:** Ver SPRINT_3_INDEX.md

---

## 🎯 COMANDOS GIT ÚTEIS

```bash
# Branches
git checkout -b sprint-3/energy-system
git checkout -b sprint-3/streaks
git checkout -b sprint-3/missions

# Commits
git commit -m "feat(gamification): add energy system"
git commit -m "feat(gamification): implement streaks with freeze"
git commit -m "feat(missions): add daily missions auto-tracking"
git commit -m "fix(energy): correct regeneration timing"

# Deploy
git push origin sprint-3/feature-name
```

---

## 📋 CHECKLIST DIÁRIO

### Segunda
- [ ] Review PRs pendentes
- [ ] Daily standup (9:30)
- [ ] Trabalhar em sistema core
- [ ] Commit EOD

### Terça
- [ ] Continuar implementação
- [ ] Code review peer
- [ ] Update board
- [ ] Testing

### Quarta
- [ ] Mid-week sync
- [ ] Integration testing
- [ ] Documentation
- [ ] Demo prep

### Quinta
- [ ] Bug fixes
- [ ] Analytics validation
- [ ] Performance check
- [ ] Polish UI

### Sexta
- [ ] Weekly review (16h)
- [ ] Deploy staging
- [ ] Update docs
- [ ] Plan next week

---

## 🏆 IMPACTO ESPERADO

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| D7 Retention | 38% | 50% | +12% |
| Sessions/Week | 2.5 | 4.0 | +60% |
| DAU | Baseline | +30% | +30% |
| Missões | 0% | 70% | +70% |
| Streak >7d | 0% | 40% | +40% |
| WAPM (6m) | Base | +15% | +15% |

---

## 📚 DOCS PARA LER

**Hoje:**
- [SPRINT_3_QUICK_START.md](./SPRINT_3_QUICK_START.md)

**Esta semana:**
- [SPRINT_3_PLANO_EXECUCAO.md](./SPRINT_3_PLANO_EXECUCAO.md)
- [SPRINT_3_ARQUITETURA_TECNICA.md](./SPRINT_3_ARQUITETURA_TECNICA.md)

**Quando precisar:**
- [SPRINT_3_VISUAL_FLOW.md](./SPRINT_3_VISUAL_FLOW.md)
- [SPRINT_3_RESUMO_EXECUTIVO.md](./SPRINT_3_RESUMO_EXECUTIVO.md)

---

## 🎯 PRÓXIMA AÇÃO

**Agora:**
1. Ler QUICK_START.md Fase 1
2. Criar estrutura de pastas
3. Implementar EnergySystem.ts
4. Testar no console

**Depois:**
5. Componente EnergyDisplay
6. Integrar em navbar
7. Testar em ação real
8. Deploy!

---

## 🚨 RED FLAGS

⚠️ **Energia bloqueia conteúdo** - NUNCA fazer isso!  
⚠️ **Streak causa ansiedade** - Adicionar mais proteções  
⚠️ **Missões muito difíceis** - Completion <50% é ruim  
⚠️ **Performance degradada** - Otimizar tracking  
⚠️ **Analytics faltando** - Checar eventos diariamente  

---

## 🎁 RECOMPENSAS

### Diárias
```
Complete 1 lição: +50 XP, +1 Energia
Comente em 1 post: +30 XP
Use 3 corações: +75 XP, +2 Energia
```

### Semanais
```
Estude 5 dias: +200 XP
Complete 3 lições: +300 XP, Power-up
```

### Milestones Streak
```
7 dias: +100 XP, Badge "Semana Completa"
30 dias: +500 XP, Badge "Mês de Fogo"
100 dias: +1000 XP, Badge "Centurião"
365 dias: +5000 XP, Badge "Lenda"
```

---

## 🔢 NÚMEROS IMPORTANTES

- **5** - Corações de energia/dia
- **4** - Horas para regenerar 1 coração
- **3** - Missões diárias
- **7, 30, 100, 365** - Milestones de streak
- **70%** - Meta de completion de missões
- **+12%** - Meta D7 retention
- **+60%** - Meta sessions/week

---

## 💰 ROI QUICK MATH

```
Se DAU = 10.000
  +30% DAU = +3.000 usuários ativos
  
Se conversion = 5%
  +150 premium/mês
  
Se ARPU = R$30
  +R$4.500 MRR
  
Projeção 12 meses:
  +R$54.000 em revenue
```

---

## 🎮 TIPOS DE MISSÕES

### Aprendizado
- Complete 1 lição
- Assista 1 vídeo
- Leia 5 páginas

### Social
- Comente em 1 post
- Crie 1 post
- Dê 3 likes

### IA
- Faça 1 pergunta
- Complete conversa

### Energia
- Use 3 corações
- Alcance 5 corações

### Streak
- Mantenha seu streak
- Alcance 7 dias

---

**Última atualização:** Outubro 2025  
**Versão:** 1.0  

**Keep this doc open during development!** 📌
