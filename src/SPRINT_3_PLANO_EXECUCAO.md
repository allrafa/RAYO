# 🎮 SPRINT 3 - PLANO DE EXECUÇÃO COMPLETO
## Gamificação 2.0 - Energia, Streaks e Missões

> **Objetivo:** Aumentar engajamento semanal e retenção via reforço positivo (sem punição)  
> **Status:** 📋 Planejamento Completo  
> **Data:** Outubro 2025

---

## 📊 VISÃO GERAL

### Critérios de Aceitação
- ✅ **Experimento "Energia" rodando** em produção
- ✅ **Aumento de sessões/usuário/semana** vs controle
- ✅ **D7 retention aumentado** vs baseline
- ✅ **Zero regressões críticas**

### Touchpoints Estratégicos
- **Nir Eyal:** Revisão dos loops de hábito e gatilhos de retorno
- **Jorge Mazal:** Balanceamento de energia e economia de recompensas

---

## 🎯 FILOSOFIA: REFORÇO POSITIVO, NÃO PUNIÇÃO

### ❌ O QUE NÃO FAZER (Anti-patterns)
- Bloquear conteúdo quando energia acaba
- Perder progresso se quebrar streak
- Criar ansiedade ou FOMO negativo
- Pressão excessiva por notificações
- Comparações negativas entre usuários

### ✅ O QUE FAZER (Princípios)
- Energia regenera naturalmente (nunca bloqueia)
- Streak Freeze protege o progresso
- Celebrar todas as conquistas
- Notificações úteis e opcionais
- Recompensas frequentes e variadas

---

## 📈 MÉTRICAS DE SUCESSO

| Métrica | Baseline Atual | Meta Sprint 3 | Como Medir |
|---------|----------------|---------------|------------|
| **D7 Retention** | 38% | 50% (+12%) | Cohort analysis - Mixpanel |
| **D30 Retention** | 28% | 38% (+10%) | Cohort analysis - Mixpanel |
| **Sessions/User/Week** | 2.5 | 4.0 (+60%) | Average sessions per user |
| **Daily Active Users** | Baseline | +30% | DAU tracking |
| **Missões Completed** | 0 | 70% | Completion rate |
| **Streak >7 dias** | 0 | 40% usuários | % with active streak |
| **Streak >30 dias** | 0 | 15% usuários | % with long streak |

---

## 🚀 ENTREGAS POR PILAR

### 1️⃣ TECNOLOGIA & PRODUTO

#### 1.1 Sistema de Energia ⚡

##### Conceito

**"Energia" ao invés de "Vidas"** (inspirado em Duolingo, mas melhorado)

```
Características:
✅ 5 corações de energia por dia (máximo)
✅ Regenera 1 coração a cada 4 horas (automático)
✅ Gasta 1 coração ao completar ação de aprendizado
✅ NUNCA bloqueia conteúdo quando acaba
✅ Apenas incentiva retornar mais tarde
✅ Pode ganhar energia extra via:
   - Completar missões diárias
   - Manter streaks
   - Achievements especiais
   - Power-ups (premium ou recompensas)
```

**Diferencial vs Duolingo:**
- ❌ Duolingo: Sem energia = bloqueado
- ✅ RAIO: Sem energia = incentivo suave, nunca bloqueio

##### Arquitetura: `/lib/gamification/EnergySystem.ts`

```typescript
// 🔴 BACKEND REQUIRED - Sistema de Energia precisa persistência

interface EnergyState {
  currentEnergy: number;          // 0-5
  maxEnergy: number;              // Padrão: 5, pode aumentar com premium
  lastRegenTime: Date;            // Para calcular regeneração
  energySpentToday: number;       // Tracking diário
  totalEnergySpent: number;       // Lifetime tracking
  bonusEnergyAvailable: number;   // Energia extra de recompensas
}

interface EnergyAction {
  type: 'course_lesson' | 'book_chapter' | 'video_watch' | 'ai_chat' | 'quiz';
  energyCost: number;             // Quanto custa (geralmente 1)
  estimatedDuration: number;      // Em minutos
}

export class EnergySystem {
  // 🔴 BACKEND REQUIRED - Salvar estado no Supabase
  private state: EnergyState;
  
  constructor(userId: string) {
    // TODO: SUPABASE - Carregar estado do banco
    // const { data } = await supabase
    //   .from('user_energy')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .single();
    
    // MOCK DATA - Replace with API call
    this.state = this.loadFromLocalStorage() || this.getDefaultState();
  }
  
  // Verifica se pode realizar ação
  canPerformAction(action: EnergyAction): boolean {
    // Sempre pode (sem bloqueio!), mas retorna se tem energia
    return true; // Nunca bloqueia
  }
  
  // Indica se DEVERIA usar energia (tem disponível)
  shouldUseEnergy(action: EnergyAction): boolean {
    return this.state.currentEnergy >= action.energyCost;
  }
  
  // Usar energia para uma ação
  async useEnergy(action: EnergyAction): Promise<{
    success: boolean;
    energyUsed: boolean;
    newState: EnergyState;
    message: string;
  }> {
    const hasEnergy = this.state.currentEnergy >= action.energyCost;
    
    if (hasEnergy) {
      this.state.currentEnergy -= action.energyCost;
      this.state.energySpentToday += action.energyCost;
      this.state.totalEnergySpent += action.energyCost;
      
      // 🔴 BACKEND REQUIRED - Salvar no Supabase
      // await this.saveToBackend();
      
      // MOCK - Salvar em localStorage
      this.saveToLocalStorage();
      
      return {
        success: true,
        energyUsed: true,
        newState: { ...this.state },
        message: `Ação completa! -${action.energyCost}❤️`
      };
    } else {
      // SEM ENERGIA, mas não bloqueia!
      return {
        success: true, // Ação ainda permitida
        energyUsed: false,
        newState: { ...this.state },
        message: 'Ação completa! (Volte em breve para ganhar energia)'
      };
    }
  }
  
  // Regenerar energia (chamado periodicamente)
  regenerateEnergy(): {
    energyAdded: number;
    newEnergy: number;
  } {
    const now = new Date();
    const hoursSinceLastRegen = 
      (now.getTime() - new Date(this.state.lastRegenTime).getTime()) / (1000 * 60 * 60);
    
    // 1 energia a cada 4 horas
    const energyToAdd = Math.floor(hoursSinceLastRegen / 4);
    
    if (energyToAdd > 0) {
      const oldEnergy = this.state.currentEnergy;
      this.state.currentEnergy = Math.min(
        this.state.currentEnergy + energyToAdd,
        this.state.maxEnergy
      );
      this.state.lastRegenTime = now;
      
      // 🔴 BACKEND REQUIRED - Salvar no Supabase
      // await this.saveToBackend();
      
      this.saveToLocalStorage();
      
      return {
        energyAdded: this.state.currentEnergy - oldEnergy,
        newEnergy: this.state.currentEnergy
      };
    }
    
    return { energyAdded: 0, newEnergy: this.state.currentEnergy };
  }
  
  // Adicionar energia bônus (de recompensas)
  async addBonusEnergy(amount: number, source: string): Promise<void> {
    this.state.bonusEnergyAvailable += amount;
    
    // 🔴 BACKEND REQUIRED - Salvar + criar evento de recompensa
    // await supabase.from('energy_rewards').insert({
    //   user_id: userId,
    //   amount,
    //   source,
    //   created_at: new Date()
    // });
    
    this.saveToLocalStorage();
  }
  
  // Tempo até próxima regeneração
  getTimeUntilNextRegen(): number {
    const now = new Date();
    const lastRegen = new Date(this.state.lastRegenTime);
    const nextRegen = new Date(lastRegen.getTime() + 4 * 60 * 60 * 1000);
    const msUntilNext = nextRegen.getTime() - now.getTime();
    return Math.max(0, msUntilNext);
  }
  
  // Estado atual
  getState(): EnergyState {
    return { ...this.state };
  }
  
  // 🔴 BACKEND REQUIRED - Implementar
  private async saveToBackend(): Promise<void> {
    // TODO: SUPABASE
    // await supabase.from('user_energy').upsert({
    //   user_id: this.userId,
    //   current_energy: this.state.currentEnergy,
    //   max_energy: this.state.maxEnergy,
    //   last_regen_time: this.state.lastRegenTime,
    //   energy_spent_today: this.state.energySpentToday,
    //   total_energy_spent: this.state.totalEnergySpent,
    //   bonus_energy: this.state.bonusEnergyAvailable,
    //   updated_at: new Date()
    // });
  }
  
  // MOCK - Remover quando tiver backend
  private saveToLocalStorage(): void {
    localStorage.setItem('raio_energy_state', JSON.stringify(this.state));
  }
  
  private loadFromLocalStorage(): EnergyState | null {
    const saved = localStorage.getItem('raio_energy_state');
    return saved ? JSON.parse(saved) : null;
  }
  
  private getDefaultState(): EnergyState {
    return {
      currentEnergy: 5,
      maxEnergy: 5,
      lastRegenTime: new Date(),
      energySpentToday: 0,
      totalEnergySpent: 0,
      bonusEnergyAvailable: 0
    };
  }
}
```

##### UI Components

**Arquivo:** `/components/gamification/EnergyDisplay.tsx`

```typescript
import { Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface EnergyDisplayProps {
  current: number;
  max: number;
  timeUntilNextRegen?: number;
  compact?: boolean;
}

export function EnergyDisplay({ 
  current, 
  max, 
  timeUntilNextRegen,
  compact = false 
}: EnergyDisplayProps) {
  const percentage = (current / max) * 100;
  
  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };
  
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Heart 
          className={`w-4 h-4 ${current > 0 ? 'fill-red-500 text-red-500' : 'text-gray-300'}`}
        />
        <span className="text-sm">{current}/{max}</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {/* Corações */}
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Heart
              className={`w-6 h-6 transition-all ${
                i < current
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-300'
              }`}
            />
          </motion.div>
        ))}
      </div>
      
      {/* Info */}
      <div className="text-sm text-gray-600">
        {current === max ? (
          <span className="text-green-600">✨ Energia completa!</span>
        ) : current === 0 ? (
          <span className="text-yellow-600">
            ⏱️ Próxima energia em {timeUntilNextRegen ? formatTime(timeUntilNextRegen) : '...'}
          </span>
        ) : (
          <span>
            {current}/{max} • Próxima em {timeUntilNextRegen ? formatTime(timeUntilNextRegen) : '...'}
          </span>
        )}
      </div>
    </div>
  );
}
```

##### Analytics Events

```typescript
// Energia
ENERGY_USED(action_type, energy_cost, had_energy)
ENERGY_REGENERATED(energy_added, new_total)
ENERGY_DEPLETED(user_continued_anyway) // Se continuou sem energia
ENERGY_BONUS_EARNED(amount, source)

// Economia
ENERGY_ECONOMY_STATS(daily_spent, avg_per_action, completion_rate)
```

---

#### 1.2 Sistema de Streaks 🔥

##### Tipos de Streaks

```
1. DAILY STREAK (Diário)
   - Contador de dias consecutivos
   - Requer ≥1 ação de aprendizado por dia
   - Reset às 00:00 do próximo dia

2. WEEKLY STREAK (Semanal)
   - Contador de semanas consecutivas
   - Requer ≥3 dias ativos na semana
   - Mais flexível que daily

3. MONTHLY STREAK (Mensal)
   - Contador de meses consecutivos
   - Requer ≥3 semanas ativas no mês
   - Para usuários de longo prazo
```

##### Proteções (Reforço Positivo)

```
🛡️ STREAK FREEZE (Congelamento)
- 1 dia de proteção automático/mês
- Protege se esquecer 1 dia
- Restaura automaticamente

📅 WEEKEND PASS
- Sábados opcionais
- Não quebra streak se pular sábado
- Incentiva descanso

🎯 STREAK RECOVERY
- Se quebrar, pode "recuperar" em 24h
- Fazendo 2x ações no dia seguinte
- Grace period
```

##### Arquitetura: `/lib/gamification/StreakSystem.ts`

```typescript
// 🔴 BACKEND REQUIRED - Sistema de Streaks precisa persistência e timezone handling

interface StreakState {
  // Daily
  currentDailyStreak: number;
  longestDailyStreak: number;
  lastActivityDate: Date;
  
  // Weekly
  currentWeeklyStreak: number;
  activeDaysThisWeek: number;
  
  // Monthly
  currentMonthlyStreak: number;
  activeWeeksThisMonth: number;
  
  // Proteções
  streakFreezeAvailable: boolean;
  streakFreezeUsedThisMonth: boolean;
  weekendPassEnabled: boolean;
  
  // Milestones
  achievedMilestones: number[]; // [7, 30, 100, 365]
}

export class StreakSystem {
  // 🔴 BACKEND REQUIRED - Salvar estado no Supabase
  private state: StreakState;
  
  constructor(userId: string) {
    // TODO: SUPABASE - Carregar do banco
    // Considerar timezone do usuário!
    
    // MOCK DATA
    this.state = this.loadFromLocalStorage() || this.getDefaultState();
  }
  
  // Registrar atividade (chamado após completar ação)
  async recordActivity(activityType: string): Promise<{
    streakContinued: boolean;
    streakIncreased: boolean;
    newStreak: number;
    milestoneAchieved?: number;
    message: string;
  }> {
    const today = this.getToday();
    const lastActivity = new Date(this.state.lastActivityDate);
    const daysSinceLastActivity = this.getDaysBetween(lastActivity, today);
    
    // Primeira atividade do dia
    if (daysSinceLastActivity === 0) {
      return {
        streakContinued: true,
        streakIncreased: false,
        newStreak: this.state.currentDailyStreak,
        message: `Streak mantido! 🔥 ${this.state.currentDailyStreak} dias`
      };
    }
    
    // Atividade no dia seguinte (streak continua)
    if (daysSinceLastActivity === 1) {
      this.state.currentDailyStreak++;
      this.state.longestDailyStreak = Math.max(
        this.state.longestDailyStreak,
        this.state.currentDailyStreak
      );
      this.state.lastActivityDate = today;
      
      // Check milestone
      const milestone = this.checkMilestone(this.state.currentDailyStreak);
      
      // 🔴 BACKEND REQUIRED - Salvar + registrar milestone
      this.saveToLocalStorage();
      
      return {
        streakContinued: true,
        streakIncreased: true,
        newStreak: this.state.currentDailyStreak,
        milestoneAchieved: milestone,
        message: `Streak aumentado! 🔥 ${this.state.currentDailyStreak} dias`
      };
    }
    
    // Streak quebrado, mas pode usar Streak Freeze?
    if (daysSinceLastActivity === 2 && this.state.streakFreezeAvailable) {
      this.state.streakFreezeAvailable = false;
      this.state.streakFreezeUsedThisMonth = true;
      this.state.lastActivityDate = today;
      
      // 🔴 BACKEND REQUIRED
      this.saveToLocalStorage();
      
      return {
        streakContinued: true,
        streakIncreased: false,
        newStreak: this.state.currentDailyStreak,
        message: `🛡️ Streak Freeze usado! Seu streak foi salvo!`
      };
    }
    
    // Streak perdido :(
    const oldStreak = this.state.currentDailyStreak;
    this.state.currentDailyStreak = 1; // Reinicia
    this.state.lastActivityDate = today;
    
    // 🔴 BACKEND REQUIRED
    this.saveToLocalStorage();
    
    return {
      streakContinued: false,
      streakIncreased: false,
      newStreak: 1,
      message: `Streak reiniciado. Anterior: ${oldStreak} dias. Vamos começar de novo! 💪`
    };
  }
  
  // Check se atingiu milestone (7, 30, 100, 365)
  private checkMilestone(streak: number): number | undefined {
    const milestones = [7, 30, 100, 365];
    for (const milestone of milestones) {
      if (streak === milestone && !this.state.achievedMilestones.includes(milestone)) {
        this.state.achievedMilestones.push(milestone);
        
        // 🔴 BACKEND REQUIRED - Criar achievement + recompensa
        // await this.awardMilestone(milestone);
        
        return milestone;
      }
    }
    return undefined;
  }
  
  // Weekly streak update (chamado no final da semana)
  async updateWeeklyStreak(): Promise<void> {
    if (this.state.activeDaysThisWeek >= 3) {
      this.state.currentWeeklyStreak++;
    } else {
      this.state.currentWeeklyStreak = 0;
    }
    
    this.state.activeDaysThisWeek = 0; // Reset para nova semana
    
    // 🔴 BACKEND REQUIRED
    this.saveToLocalStorage();
  }
  
  // Estado atual
  getState(): StreakState {
    return { ...this.state };
  }
  
  // Helpers
  private getToday(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }
  
  private getDaysBetween(date1: Date, date2: Date): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffMs = d2.getTime() - d1.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
  
  // MOCK
  private saveToLocalStorage(): void {
    localStorage.setItem('raio_streak_state', JSON.stringify(this.state));
  }
  
  private loadFromLocalStorage(): StreakState | null {
    const saved = localStorage.getItem('raio_streak_state');
    return saved ? JSON.parse(saved) : null;
  }
  
  private getDefaultState(): StreakState {
    return {
      currentDailyStreak: 0,
      longestDailyStreak: 0,
      lastActivityDate: new Date(),
      currentWeeklyStreak: 0,
      activeDaysThisWeek: 0,
      currentMonthlyStreak: 0,
      activeWeeksThisMonth: 0,
      streakFreezeAvailable: true,
      streakFreezeUsedThisMonth: false,
      weekendPassEnabled: true,
      achievedMilestones: []
    };
  }
}
```

##### UI Component

**Arquivo:** `/components/gamification/StreakDisplay.tsx`

```typescript
import { Flame, Shield, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  freezeAvailable: boolean;
  compact?: boolean;
}

export function StreakDisplay({ 
  currentStreak, 
  longestStreak,
  freezeAvailable,
  compact = false 
}: StreakDisplayProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
        <span className="text-sm font-medium">{currentStreak}</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Streak atual */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
        >
          <Flame className="w-8 h-8 text-orange-500 fill-orange-500" />
        </motion.div>
        <div>
          <div className="text-2xl font-bold">{currentStreak} dias</div>
          <div className="text-sm text-gray-600">Streak atual</div>
        </div>
      </div>
      
      {/* Record */}
      {longestStreak > currentStreak && (
        <div className="text-sm text-gray-500">
          🏆 Seu recorde: {longestStreak} dias
        </div>
      )}
      
      {/* Freeze disponível */}
      {freezeAvailable && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
          <Shield className="w-4 h-4" />
          <span>Streak Freeze disponível</span>
        </div>
      )}
      
      {/* Próximo milestone */}
      <div className="text-sm text-gray-600">
        {currentStreak < 7 && `🎯 Próximo: 7 dias (faltam ${7 - currentStreak})`}
        {currentStreak >= 7 && currentStreak < 30 && `🎯 Próximo: 30 dias (faltam ${30 - currentStreak})`}
        {currentStreak >= 30 && currentStreak < 100 && `🎯 Próximo: 100 dias (faltam ${100 - currentStreak})`}
        {currentStreak >= 100 && currentStreak < 365 && `🎯 Próximo: 1 ano (faltam ${365 - currentStreak})`}
        {currentStreak >= 365 && `🏆 Você é uma lenda!`}
      </div>
    </div>
  );
}
```

---

#### 1.3 Sistema de Missões 🎯

##### Tipos de Missões

```
DIÁRIAS (Reset às 00:00)
├── Aprendizado: "Complete 1 lição"
├── Social: "Comente em 1 post"
├── Leitura: "Leia 5 páginas"
├── IA: "Faça 1 pergunta ao Conselheiro"
└── Energia: "Use 3 corações hoje"

SEMANAIS (Reset domingo 00:00)
├── Dedicação: "Estude 5 dias esta semana"
├── Comunidade: "Crie 2 posts"
├── Progresso: "Complete 3 lições"
├── Exploração: "Assista 5 vídeos"
└── Consistência: "Mantenha seu streak"

COLABORATIVAS (2+ pessoas)
├── Casal: "Completem juntos 1 curso"
├── Família: "Todos façam 1 atividade"
└── Grupo: "Time complete 10 lições"
```

##### Recompensas

```
DIÁRIAS:
✅ 50-100 XP
✅ Energia bônus (+1 coração)
✅ Chance de badge especial

SEMANAIS:
✅ 200-500 XP
✅ Power-up especial
✅ Desbloqueio premium temporário (24h)

COLABORATIVAS:
✅ XP multiplicado (2x-3x)
✅ Badges exclusivos de time
✅ Recompensas para todos
```

##### Arquitetura: `/lib/gamification/MissionsSystem.ts`

```typescript
// 🔴 BACKEND REQUIRED - Missões precisam sincronização e tracking

interface Mission {
  id: string;
  type: 'daily' | 'weekly' | 'collaborative';
  title: string;
  description: string;
  category: 'learning' | 'social' | 'reading' | 'ai' | 'energy' | 'streak';
  
  // Progresso
  targetValue: number;          // Ex: 3 para "Complete 3 lições"
  currentValue: number;         // Progresso atual
  completed: boolean;
  
  // Recompensas
  xpReward: number;
  energyReward?: number;
  badgeId?: string;
  powerUpId?: string;
  
  // Timing
  startDate: Date;
  endDate: Date;
  expiresIn?: number;           // Milissegundos até expirar
  
  // Colaborativa
  isCollaborative: boolean;
  teamId?: string;
  teamProgress?: number;
  teamSize?: number;
}

export class MissionsSystem {
  // 🔴 BACKEND REQUIRED - Buscar missões ativas do servidor
  private missions: Mission[] = [];
  
  constructor(private userId: string) {
    // TODO: SUPABASE - Carregar missões ativas
    // const { data } = await supabase
    //   .from('user_missions')
    //   .select('*, missions(*)')
    //   .eq('user_id', userId)
    //   .eq('completed', false);
    
    // MOCK DATA
    this.missions = this.loadMockMissions();
  }
  
  // Obter missões ativas
  getActiveMissions(type?: 'daily' | 'weekly' | 'collaborative'): Mission[] {
    let filtered = this.missions.filter(m => !m.completed);
    
    if (type) {
      filtered = filtered.filter(m => m.type === type);
    }
    
    return filtered;
  }
  
  // Atualizar progresso de uma missão
  async updateMissionProgress(
    missionId: string,
    incrementBy: number = 1
  ): Promise<{
    mission: Mission;
    completed: boolean;
    reward?: {
      xp: number;
      energy?: number;
      badge?: string;
    };
  }> {
    const mission = this.missions.find(m => m.id === missionId);
    if (!mission || mission.completed) {
      return { mission: mission!, completed: false };
    }
    
    // Atualizar progresso
    mission.currentValue = Math.min(
      mission.currentValue + incrementBy,
      mission.targetValue
    );
    
    // Checar se completou
    if (mission.currentValue >= mission.targetValue) {
      mission.completed = true;
      
      // 🔴 BACKEND REQUIRED - Registrar completion + dar recompensas
      // await this.completeMission(mission);
      
      const reward = {
        xp: mission.xpReward,
        energy: mission.energyReward,
        badge: mission.badgeId
      };
      
      // MOCK
      this.saveToLocalStorage();
      
      return {
        mission,
        completed: true,
        reward
      };
    }
    
    // 🔴 BACKEND REQUIRED - Salvar progresso
    this.saveToLocalStorage();
    
    return {
      mission,
      completed: false
    };
  }
  
  // Auto-detectar progresso baseado em ação
  async trackAction(action: {
    type: string;
    value?: number;
    metadata?: Record<string, any>;
  }): Promise<Mission[]> {
    const completedMissions: Mission[] = [];
    
    // Mapear ação para missões relevantes
    const relevantMissions = this.missions.filter(m => {
      if (m.completed) return false;
      
      // Mapping de ações para categorias de missões
      const actionToCategory: Record<string, string[]> = {
        'course_lesson_completed': ['learning'],
        'book_chapter_completed': ['reading'],
        'post_created': ['social'],
        'post_commented': ['social'],
        'ai_chat_started': ['ai'],
        'energy_used': ['energy'],
        'streak_continued': ['streak']
      };
      
      const categories = actionToCategory[action.type] || [];
      return categories.includes(m.category);
    });
    
    // Atualizar cada missão relevante
    for (const mission of relevantMissions) {
      const result = await this.updateMissionProgress(mission.id, action.value || 1);
      if (result.completed) {
        completedMissions.push(result.mission);
      }
    }
    
    return completedMissions;
  }
  
  // Resetar missões diárias (chamado às 00:00)
  async resetDailyMissions(): Promise<void> {
    // 🔴 BACKEND REQUIRED - Criar novas missões diárias
    // await this.generateDailyMissions();
    
    // Remover missões diárias antigas
    this.missions = this.missions.filter(m => m.type !== 'daily' || m.completed);
    
    // MOCK - Adicionar novas
    this.missions.push(...this.generateMockDailyMissions());
    this.saveToLocalStorage();
  }
  
  // Resetar missões semanais (chamado domingo 00:00)
  async resetWeeklyMissions(): Promise<void> {
    // 🔴 BACKEND REQUIRED
    this.missions = this.missions.filter(m => m.type !== 'weekly' || m.completed);
    this.missions.push(...this.generateMockWeeklyMissions());
    this.saveToLocalStorage();
  }
  
  // MOCK DATA
  private loadMockMissions(): Mission[] {
    const saved = localStorage.getItem('raio_missions');
    if (saved) {
      return JSON.parse(saved);
    }
    
    return [
      ...this.generateMockDailyMissions(),
      ...this.generateMockWeeklyMissions()
    ];
  }
  
  private generateMockDailyMissions(): Mission[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return [
      {
        id: `daily-1-${today.getTime()}`,
        type: 'daily',
        title: 'Dedique-se ao aprendizado',
        description: 'Complete 1 lição de qualquer curso',
        category: 'learning',
        targetValue: 1,
        currentValue: 0,
        completed: false,
        xpReward: 50,
        energyReward: 1,
        startDate: today,
        endDate: tomorrow,
        expiresIn: tomorrow.getTime() - Date.now(),
        isCollaborative: false
      },
      {
        id: `daily-2-${today.getTime()}`,
        type: 'daily',
        title: 'Seja ativo na comunidade',
        description: 'Comente em 1 post',
        category: 'social',
        targetValue: 1,
        currentValue: 0,
        completed: false,
        xpReward: 30,
        startDate: today,
        endDate: tomorrow,
        expiresIn: tomorrow.getTime() - Date.now(),
        isCollaborative: false
      },
      {
        id: `daily-3-${today.getTime()}`,
        type: 'daily',
        title: 'Use sua energia',
        description: 'Gaste 3 corações de energia',
        category: 'energy',
        targetValue: 3,
        currentValue: 0,
        completed: false,
        xpReward: 75,
        energyReward: 2,
        startDate: today,
        endDate: tomorrow,
        expiresIn: tomorrow.getTime() - Date.now(),
        isCollaborative: false
      }
    ];
  }
  
  private generateMockWeeklyMissions(): Mission[] {
    // Implement similar to daily
    return [];
  }
  
  private saveToLocalStorage(): void {
    localStorage.setItem('raio_missions', JSON.stringify(this.missions));
  }
}
```

##### UI Component

**Arquivo:** `/components/gamification/MissionsList.tsx`

```typescript
import { Target, Users, Calendar, Clock } from 'lucide-react';
import { Progress } from '../ui/progress';

interface MissionsListProps {
  missions: Mission[];
  onMissionClick?: (mission: Mission) => void;
}

export function MissionsList({ missions, onMissionClick }: MissionsListProps) {
  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };
  
  return (
    <div className="space-y-3">
      {missions.map(mission => {
        const progress = (mission.currentValue / mission.targetValue) * 100;
        
        return (
          <div
            key={mission.id}
            className="p-4 bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onMissionClick?.(mission)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {mission.type === 'daily' && <Calendar className="w-4 h-4 text-blue-500" />}
                {mission.type === 'weekly' && <Target className="w-4 h-4 text-purple-500" />}
                {mission.isCollaborative && <Users className="w-4 h-4 text-green-500" />}
                <h4 className="font-medium">{mission.title}</h4>
              </div>
              
              {mission.expiresIn && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatTimeRemaining(mission.expiresIn)}
                </div>
              )}
            </div>
            
            {/* Description */}
            <p className="text-sm text-gray-600 mb-3">{mission.description}</p>
            
            {/* Progress */}
            <div className="space-y-2">
              <Progress value={progress} />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{mission.currentValue}/{mission.targetValue}</span>
                <span>+{mission.xpReward} XP</span>
              </div>
            </div>
            
            {/* Completed */}
            {mission.completed && (
              <div className="mt-2 text-sm text-green-600 font-medium">
                ✅ Completada!
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

#### 1.4 Continue de Onde Parou 📍

**Arquivo:** `/components/gamification/ContinueWatching.tsx`

```typescript
// 🔴 BACKEND REQUIRED - Tracking de progresso precisa estar no banco

import { useApp } from '../AppContext';
import { Book, PlayCircle, MessageSquare, GraduationCap } from 'lucide-react';

export function ContinueWatching() {
  const { courses, books, userData } = useApp();
  
  // TODO: SUPABASE - Buscar último conteúdo acessado de cada tipo
  // const { data: lastAccessed } = await supabase
  //   .from('user_activity')
  //   .select('*')
  //   .eq('user_id', userId)
  //   .order('accessed_at', { ascending: false })
  //   .limit(1);
  
  // Encontrar conteúdo em progresso
  const inProgressCourses = courses.filter(c => 
    c.isEnrolled && c.progress > 0 && c.progress < 100
  );
  
  const inProgressBooks = books.filter(b =>
    userData.enrolledBooks.includes(b.id) && 
    b.currentPage > 0 &&
    !b.isCompleted
  );
  
  // Priorizar baseado em:
  // 1. Recência (quando acessou)
  // 2. Progresso (quanto falta)
  // 3. Alinhamento com goals
  
  const recommendations = [
    ...inProgressCourses.slice(0, 2),
    ...inProgressBooks.slice(0, 1)
  ];
  
  if (recommendations.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Continue de onde parou</h3>
      
      {/* Render recommendations */}
    </div>
  );
}
```

---

### 2️⃣ GROWTH & MARKETING

#### 2.1 Experimentos A/B

##### Exp 1: Energia vs Modelo Atual

```typescript
Feature: 'gamification-energy-system'
Variants:
  - control: Sistema atual (só XP e níveis)
  - energy: Sistema de Energia + Streaks + Missões

Métricas:
  - Primary: D7 retention
  - Secondary: Sessions/user/week, DAU
  
Traffic: 50/50
Duration: 2 semanas mínimo
```

##### Exp 2: Pacotes de Notificações

```typescript
Feature: 'notification-strategy'
Variants:
  - control: Sem notificações
  - light: 1 notif/dia (streak reminder)
  - heavy: 3 notif/dia (streak + missão + energia)

Métricas:
  - Primary: Open rate, D7 retention
  - Secondary: Engagement rate, app opens
  
Traffic: 33/33/34
```

#### 2.2 Notificações Orientadas a Streak

```typescript
// 🔴 BACKEND REQUIRED - Push notifications precisam backend

TIPOS DE NOTIFICAÇÕES:

1. STREAK REMINDER (Daily)
   Timing: 20:00 se não usou hoje
   Message: "🔥 Não perca seu streak de X dias! Faltam 4h"
   
2. ENERGIA DISPONÍVEL
   Timing: Quando energia regenera para 5/5
   Message: "⚡ Sua energia está completa! Hora de aprender"
   
3. MISSÃO PRÓXIMA DE EXPIRAR
   Timing: 2h antes de expirar
   Message: "🎯 Missão expira em breve! Faltam {progress} para completar"
   
4. MILESTONE PRÓXIMO
   Timing: Quando falta 1 dia para milestone
   Message: "🏆 Amanhã você atinge {X} dias de streak!"
   
5. STREAK EM RISCO
   Timing: 22:00 se não usou
   Message: "⚠️ Seu streak de X dias está em risco! Use Streak Freeze?"
```

---

### 3️⃣ COMUNIDADE

#### 3.1 Missões Colaborativas

```typescript
// 🔴 BACKEND REQUIRED - Sistema de times/grupos

interface CollaborativeTeam {
  id: string;
  type: 'couple' | 'family' | 'friends';
  members: string[]; // user IDs
  createdAt: Date;
  activeMissionId?: string;
}

interface CollaborativeMission extends Mission {
  teamId: string;
  teamProgress: number;       // Soma do progresso de todos
  teamTargetValue: number;    // Target multiplicado por membros
  membersCompleted: string[]; // Quem já completou sua parte
  rewardMultiplier: number;   // 2x, 3x
}

// Exemplos:
CASAL: "Completem juntos 3 lições cada (6 total)"
FAMÍLIA: "Todos façam 1 atividade hoje"
GRUPO: "Time complete 20 ações esta semana"
```

---

### 4️⃣ CONTEÚDO

#### 4.1 Trilha "Hábitos Familiares"

**15 hábitos essenciais em micro-lições**

```
1. Gratidão diária (3 min)
2. Comunicação assertiva (5 min)
3. Tempo de qualidade (4 min)
4. Escuta ativa (5 min)
5. Resolução de conflitos (5 min)
6. Rotina matinal (3 min)
7. Jantar em família (4 min)
8. Planejamento semanal (5 min)
9. Feedback construtivo (5 min)
10. Celebração de vitórias (3 min)
11. Autocuidado (4 min)
12. Limites saudáveis (5 min)
13. Empatia e compreensão (5 min)
14. Perdão e reconciliação (5 min)
15. Crescimento conjunto (5 min)

Total: ~65 min (1h de conteúdo)
Gamificação: Badge por cada hábito + certificado final
```

---

## 📊 ESTRUTURA DE ARQUIVOS

```
/lib
  /gamification
    - EnergySystem.ts          ← Sistema de Energia
    - StreakSystem.ts          ← Sistema de Streaks
    - MissionsSystem.ts        ← Sistema de Missões
    - GamificationContext.tsx  ← Context React
    - types.ts                 ← TypeScript types

/components
  /gamification
    - EnergyDisplay.tsx        ← UI de Energia
    - StreakDisplay.tsx        ← UI de Streak
    - MissionsList.tsx         ← Lista de missões
    - MissionCard.tsx          ← Card individual
    - ContinueWatching.tsx     ← Continue de onde parou
    - DailyMissionsModal.tsx   ← Modal de missões
    - StreakCelebration.tsx    ← Celebração de milestone
    - TeamMissions.tsx         ← Missões colaborativas

/hooks
  - useEnergy.ts              ← Hook de Energia
  - useStreak.ts              ← Hook de Streak
  - useMissions.ts            ← Hook de Missões
  - useGamification.ts        ← Hook geral

Trilha Hábitos:
/components/trilhas/HabitosFamiliares.tsx
```

---

## ⏱️ CRONOGRAMA DE IMPLEMENTAÇÃO

### Semana 1: Energia & Streaks
**Dias 1-2:**
- [ ] EnergySystem.ts (core logic)
- [ ] StreakSystem.ts (core logic)
- [ ] TypeScript types

**Dias 3-4:**
- [ ] EnergyDisplay.tsx
- [ ] StreakDisplay.tsx
- [ ] Integration em componentes

**Dia 5:**
- [ ] Analytics tracking
- [ ] Testing
- [ ] Deploy

### Semana 2: Missões & Colaborativo
**Dias 1-2:**
- [ ] MissionsSystem.ts
- [ ] Auto-tracking de ações

**Dias 3-4:**
- [ ] MissionsList.tsx
- [ ] Team missions logic
- [ ] ContinueWatching.tsx

**Dia 5:**
- [ ] Testing
- [ ] Deploy

### Semana 3: Trilha & Experimentos
**Dias 1-2:**
- [ ] HabitosFamiliares.tsx
- [ ] Content creation

**Dias 3-4:**
- [ ] Notification strategy
- [ ] A/B tests setup

**Dia 5:**
- [ ] Final testing
- [ ] Deploy
- [ ] Sprint Review

---

## 🔴 BACKEND CHECKLIST

### Tabelas Supabase Necessárias

```sql
-- Energia
CREATE TABLE user_energy (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  current_energy INTEGER DEFAULT 5,
  max_energy INTEGER DEFAULT 5,
  last_regen_time TIMESTAMP DEFAULT NOW(),
  energy_spent_today INTEGER DEFAULT 0,
  total_energy_spent INTEGER DEFAULT 0,
  bonus_energy INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Streaks
CREATE TABLE user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  current_daily_streak INTEGER DEFAULT 0,
  longest_daily_streak INTEGER DEFAULT 0,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  current_weekly_streak INTEGER DEFAULT 0,
  active_days_this_week INTEGER DEFAULT 0,
  streak_freeze_available BOOLEAN DEFAULT true,
  streak_freeze_used_this_month BOOLEAN DEFAULT false,
  achieved_milestones INTEGER[],
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Missões
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'daily', 'weekly', 'collaborative'
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  energy_reward INTEGER,
  badge_id TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_collaborative BOOLEAN DEFAULT false
);

CREATE TABLE user_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users,
  mission_id UUID REFERENCES missions,
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  team_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Times Colaborativos
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'couple', 'family', 'friends'
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id UUID REFERENCES teams,
  user_id UUID REFERENCES auth.users,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);
```

### APIs/Functions Necessárias

```typescript
// 🔴 TODO: Implementar no Supabase

// Energia
- getEnergyState(userId): EnergyState
- useEnergy(userId, amount, action): Result
- regenerateEnergy(userId): Result
- addBonusEnergy(userId, amount, source): void

// Streaks
- getStreakState(userId): StreakState
- recordActivity(userId, activityType): Result
- checkMilestone(userId, streak): Milestone?
- useStreakFreeze(userId): Result

// Missões
- getActiveMissions(userId, type?): Mission[]
- updateMissionProgress(userId, missionId, increment): Result
- trackAction(userId, action): Mission[] // Auto-detect
- generateDailyMissions(userId): Mission[]
- generateWeeklyMissions(userId): Mission[]

// Colaborativo
- createTeam(userId, type, memberIds): Team
- getTeamMissions(teamId): Mission[]
- updateTeamMissionProgress(teamId, missionId, userId, increment): Result
```

---

## 📊 ANALYTICS EVENTS

```typescript
// Energia
ENERGY_SYSTEM_ENABLED(user_id, experiment_variant)
ENERGY_USED(action_type, energy_cost, had_energy, continued_anyway)
ENERGY_REGENERATED(energy_added, new_total, time_since_last)
ENERGY_DEPLETED(user_action, continued)
ENERGY_BONUS_EARNED(amount, source)

// Streaks
STREAK_STARTED(user_id)
STREAK_CONTINUED(current_streak, consecutive_days)
STREAK_MILESTONE(streak_days, milestone_type)
STREAK_FREEZE_USED(saved_streak_days)
STREAK_BROKEN(lost_streak_days, reason)
STREAK_RECOVERED(old_streak, new_streak)

// Missões
MISSION_VIEWED(mission_id, mission_type)
MISSION_PROGRESS(mission_id, current_value, target_value, percentage)
MISSION_COMPLETED(mission_id, time_to_complete, xp_earned)
MISSION_EXPIRED(mission_id, final_progress)
MISSION_COLLABORATIVE_JOINED(mission_id, team_id, team_size)

// Colaborativo
TEAM_CREATED(team_id, team_type, member_count)
TEAM_MISSION_STARTED(team_id, mission_id)
TEAM_MISSION_COMPLETED(team_id, mission_id, completion_time)
TEAM_MEMBER_CONTRIBUTED(team_id, user_id, contribution)

// Hábitos
HABIT_LESSON_STARTED(habit_id, habit_name)
HABIT_LESSON_COMPLETED(habit_id, completion_time)
HABIT_TRAIL_COMPLETED(total_time, habits_completed)
```

---

## ✅ CHECKLIST DE CONCLUSÃO

### Funcionalidades Core
- [ ] EnergySystem implementado e funcionando
- [ ] StreakSystem implementado e funcionando
- [ ] MissionsSystem implementado e funcionando
- [ ] Continue de onde parou contextual
- [ ] Analytics tracking completo

### UI/UX
- [ ] EnergyDisplay com animações
- [ ] StreakDisplay com celebrações
- [ ] MissionsList responsiva
- [ ] Notificações implementadas
- [ ] Feedback visual em todas ações

### Experimentos
- [ ] Experimento Energia configurado
- [ ] Experimento Notificações configurado
- [ ] GrowthBook trackando corretamente

### Backend (quando implementar)
- [ ] Tabelas Supabase criadas
- [ ] APIs/Functions implementadas
- [ ] Sincronização em tempo real
- [ ] Timezone handling correto
- [ ] Backup e recovery

### Conteúdo
- [ ] Trilha Hábitos Familiares criada
- [ ] 15 micro-lições prontas
- [ ] Badges desenhados

### Qualidade
- [ ] Testes E2E passing
- [ ] Performance OK
- [ ] Sem regressões
- [ ] Mobile responsivo
- [ ] Acessibilidade validada

---

## 🎯 CRITÉRIOS DE SUCESSO FINAIS

**Sprint 3 está completo quando:**

1. ✅ **Experimento rodando**
   - Energia vs Atual em produção
   - Mínimo 500 usuários em cada variante
   
2. ✅ **Métricas melhorando**
   - D7 retention +8% ou mais
   - Sessions/week +40% ou mais
   
3. ✅ **Zero regressões críticas**
   - App estável
   - Performance mantida
   
4. ✅ **Documentação completa**
   - Backend checklist
   - APIs documentadas
   - Handoff para próximo sprint

---

**Versão:** 1.0  
**Status:** Pronto para implementação  
**Próximo:** Criar componentes UI e integrar com backend quando disponível

**Continue para:** [ARQUITETURA_TECNICA](./SPRINT_3_ARQUITETURA_TECNICA.md) para código completo
