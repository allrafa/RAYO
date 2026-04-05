# ⚡ SPRINT 3 - QUICK START GUIDE
## Comece a Implementar HOJE - Gamificação 2.0

> **Para desenvolvedores:** Guia prático de por onde começar  
> **Tempo estimado primeira entrega:** 2-3 dias

---

## 🎯 OBJETIVO

Entregar **gamificação incrementalmente** durante o Sprint 3, começando pelas funcionalidades de maior impacto em retention e engagement.

**IMPORTANTE:** Todo código inicial funcionará com **localStorage** (sem backend). Marcadores `🔴 BACKEND REQUIRED` indicam onde conectar Supabase depois.

---

## 📅 IMPLEMENTAÇÃO FASEADA

### 🔥 FASE 1 - DIA 1-2: SISTEMA DE ENERGIA (PRIORIDADE MÁXIMA)

**Objetivo:** Implementar loop básico de Energia

#### 1.1 Criar Estrutura Base (30 min)

```bash
# Criar pastas
mkdir -p lib/gamification
mkdir -p components/gamification
mkdir -p hooks/gamification

# Criar arquivos
touch lib/gamification/EnergySystem.ts
touch lib/gamification/types.ts
touch components/gamification/EnergyDisplay.tsx
touch hooks/gamification/useEnergy.ts
```

#### 1.2 Types Base (15 min)

**Arquivo:** `/lib/gamification/types.ts`

```typescript
export interface EnergyState {
  currentEnergy: number;          // 0-5
  maxEnergy: number;              // Padrão: 5
  lastRegenTime: Date;
  energySpentToday: number;
  totalEnergySpent: number;
  bonusEnergyAvailable: number;
}

export interface EnergyAction {
  type: 'course_lesson' | 'book_chapter' | 'video_watch' | 'ai_chat' | 'quiz';
  energyCost: number;
  estimatedDuration: number;
}

export interface EnergyResult {
  success: boolean;
  energyUsed: boolean;
  newState: EnergyState;
  message: string;
}
```

#### 1.3 EnergySystem Core (1 hora)

**Arquivo:** `/lib/gamification/EnergySystem.ts`

```typescript
import { analytics } from '../analytics/mixpanel';

// 🔴 BACKEND REQUIRED - Este sistema precisa migrar para Supabase
// TODO: Criar tabela 'user_energy' no Supabase
// TODO: Implementar real-time sync

export class EnergySystem {
  private state: EnergyState;
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
    
    // MOCK - Carregar de localStorage
    this.state = this.loadFromStorage() || this.getDefaultState();
    
    // Auto-regenerar ao criar instância
    this.regenerateEnergy();
  }
  
  // Verifica se DEVERIA usar energia (mas nunca bloqueia!)
  shouldUseEnergy(action: EnergyAction): boolean {
    return this.state.currentEnergy >= action.energyCost;
  }
  
  // Usar energia
  async useEnergy(action: EnergyAction): Promise<EnergyResult> {
    const hasEnergy = this.shouldUseEnergy(action);
    
    if (hasEnergy) {
      this.state.currentEnergy -= action.energyCost;
      this.state.energySpentToday += action.energyCost;
      this.state.totalEnergySpent += action.energyCost;
      
      // MOCK - Salvar localmente
      this.saveToStorage();
      
      // Analytics
      analytics.track('ENERGY_USED', {
        action_type: action.type,
        energy_cost: action.energyCost,
        had_energy: true,
        new_energy: this.state.currentEnergy
      });
      
      return {
        success: true,
        energyUsed: true,
        newState: { ...this.state },
        message: `Ação completa! -${action.energyCost}❤️`
      };
    } else {
      // SEM energia mas NÃO bloqueia!
      analytics.track('ENERGY_DEPLETED', {
        action_type: action.type,
        user_continued_anyway: true
      });
      
      return {
        success: true,
        energyUsed: false,
        newState: { ...this.state },
        message: 'Ação completa! Volte em breve para ganhar energia 🔋'
      };
    }
  }
  
  // Regenerar energia automaticamente
  regenerateEnergy(): { energyAdded: number; newEnergy: number } {
    const now = new Date();
    const lastRegen = new Date(this.state.lastRegenTime);
    const hoursSince = (now.getTime() - lastRegen.getTime()) / (1000 * 60 * 60);
    
    // 1 energia a cada 4 horas
    const energyToAdd = Math.floor(hoursSince / 4);
    
    if (energyToAdd > 0) {
      const oldEnergy = this.state.currentEnergy;
      this.state.currentEnergy = Math.min(
        this.state.currentEnergy + energyToAdd,
        this.state.maxEnergy
      );
      this.state.lastRegenTime = now;
      
      this.saveToStorage();
      
      if (this.state.currentEnergy > oldEnergy) {
        analytics.track('ENERGY_REGENERATED', {
          energy_added: this.state.currentEnergy - oldEnergy,
          new_total: this.state.currentEnergy
        });
      }
      
      return {
        energyAdded: this.state.currentEnergy - oldEnergy,
        newEnergy: this.state.currentEnergy
      };
    }
    
    return { energyAdded: 0, newEnergy: this.state.currentEnergy };
  }
  
  // Tempo até próxima regeneração (em ms)
  getTimeUntilNextRegen(): number {
    const now = new Date();
    const lastRegen = new Date(this.state.lastRegenTime);
    const nextRegen = new Date(lastRegen.getTime() + 4 * 60 * 60 * 1000);
    return Math.max(0, nextRegen.getTime() - now.getTime());
  }
  
  // Estado atual
  getState(): EnergyState {
    return { ...this.state };
  }
  
  // Adicionar energia bônus (de missões, etc)
  addBonusEnergy(amount: number, source: string): void {
    this.state.bonusEnergyAvailable += amount;
    this.saveToStorage();
    
    analytics.track('ENERGY_BONUS_EARNED', {
      amount,
      source,
      new_bonus_total: this.state.bonusEnergyAvailable
    });
  }
  
  // MOCK - Persistência local
  private saveToStorage(): void {
    const key = `raio_energy_${this.userId}`;
    localStorage.setItem(key, JSON.stringify(this.state));
  }
  
  private loadFromStorage(): EnergyState | null {
    const key = `raio_energy_${this.userId}`;
    const saved = localStorage.getItem(key);
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

✅ **Critério de sucesso:** Console.log do estado funciona

#### 1.4 Hook useEnergy (30 min)

**Arquivo:** `/hooks/gamification/useEnergy.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { EnergySystem } from '../../lib/gamification/EnergySystem';
import { useApp } from '../../components/AppContext';

export function useEnergy() {
  const { userData } = useApp();
  const [energySystem] = useState(() => new EnergySystem(userData.name));
  const [state, setState] = useState(energySystem.getState());
  const [timeUntilNext, setTimeUntilNext] = useState(energySystem.getTimeUntilNextRegen());
  
  // Auto-regenerar a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      const result = energySystem.regenerateEnergy();
      if (result.energyAdded > 0) {
        setState(energySystem.getState());
      }
      setTimeUntilNext(energySystem.getTimeUntilNextRegen());
    }, 60000); // 1 minuto
    
    return () => clearInterval(interval);
  }, [energySystem]);
  
  const useEnergy = useCallback(async (action: EnergyAction) => {
    const result = await energySystem.useEnergy(action);
    setState(energySystem.getState());
    return result;
  }, [energySystem]);
  
  const addBonusEnergy = useCallback((amount: number, source: string) => {
    energySystem.addBonusEnergy(amount, source);
    setState(energySystem.getState());
  }, [energySystem]);
  
  return {
    energy: state,
    timeUntilNext,
    useEnergy,
    addBonusEnergy,
    hasEnergy: (cost: number = 1) => state.currentEnergy >= cost
  };
}
```

#### 1.5 UI Component (1 hora)

**Arquivo:** `/components/gamification/EnergyDisplay.tsx`

```typescript
import { Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface EnergyDisplayProps {
  current: number;
  max: number;
  timeUntilNext?: number;
  compact?: boolean;
  onHeartClick?: () => void;
}

export function EnergyDisplay({ 
  current, 
  max, 
  timeUntilNext,
  compact = false,
  onHeartClick
}: EnergyDisplayProps) {
  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  if (compact) {
    return (
      <div 
        className="flex items-center gap-1 cursor-pointer"
        onClick={onHeartClick}
      >
        <Heart className={`w-4 h-4 ${current > 0 ? 'fill-red-500 text-red-500' : 'text-gray-300'}`} />
        <span className="text-sm font-medium">{current}/{max}</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Hearts */}
      <div className="flex gap-2">
        {Array.from({ length: max }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.1 }}
          >
            <Heart
              className={`w-8 h-8 transition-all ${
                i < current
                  ? 'fill-red-500 text-red-500 drop-shadow-md'
                  : 'text-gray-300'
              }`}
            />
          </motion.div>
        ))}
      </div>
      
      {/* Status message */}
      <div className="text-sm">
        {current === max ? (
          <span className="text-green-600 font-medium">✨ Energia completa!</span>
        ) : current === 0 ? (
          <div className="space-y-1">
            <span className="text-amber-600 font-medium">
              ⏱️ Próxima energia em {timeUntilNext ? formatTime(timeUntilNext) : '...'}
            </span>
            <p className="text-xs text-gray-500">
              Você pode continuar estudando, mas não ganhará energia bônus
            </p>
          </div>
        ) : (
          <span className="text-gray-700">
            {current}/{max} • Próxima em {timeUntilNext ? formatTime(timeUntilNext) : '...'}
          </span>
        )}
      </div>
    </div>
  );
}
```

#### 1.6 Integrar na Top Navbar (30 min)

**Arquivo:** `/components/TopNavbar.tsx`

```typescript
// Adicionar import
import { EnergyDisplay } from './gamification/EnergyDisplay';
import { useEnergy } from '../hooks/gamification/useEnergy';

// Dentro do componente
const { energy, timeUntilNext } = useEnergy();

// No JSX, adicionar na navbar
<div className="flex items-center gap-4">
  <EnergyDisplay 
    current={energy.currentEnergy}
    max={energy.maxEnergy}
    timeUntilNext={timeUntilNext}
    compact
  />
  {/* ... resto */}
</div>
```

#### 1.7 Testar Uso de Energia (30 min)

**Integrar em ações de aprendizado:**

```typescript
// Em CourseDetailPage.tsx
import { useEnergy } from '../hooks/gamification/useEnergy';

const { useEnergy: spendEnergy } = useEnergy();

const handleStartLesson = async () => {
  const result = await spendEnergy({
    type: 'course_lesson',
    energyCost: 1,
    estimatedDuration: 10
  });
  
  if (result.energyUsed) {
    enhancedToast.success({
      title: result.message,
      description: 'Continue aprendendo!'
    });
  } else {
    enhancedToast.info({
      title: result.message,
      description: 'Ganhe mais energia em breve 🔋'
    });
  }
  
  // Continuar com lição normalmente (não bloqueia!)
  startLesson();
};
```

✅ **Critério de sucesso:** 
- Corações aparecem na navbar
- Ao completar lição, corações diminuem
- Energia regenera após 4h (testar com tempo mock)
- Sem energia, ação continua funcionando

---

### ✨ FASE 2 - DIA 3-4: SISTEMA DE STREAKS

**Objetivo:** Implementar streaks com proteções

#### 2.1 StreakSystem Core (1.5 horas)

**Arquivo:** `/lib/gamification/StreakSystem.ts`

```typescript
// 🔴 BACKEND REQUIRED - Migrar para Supabase depois
// IMPORTANTE: Timezone do usuário precisa ser considerado!

import { analytics } from '../analytics/mixpanel';

interface StreakState {
  currentDailyStreak: number;
  longestDailyStreak: number;
  lastActivityDate: Date;
  currentWeeklyStreak: number;
  activeDaysThisWeek: number;
  streakFreezeAvailable: boolean;
  streakFreezeUsedThisMonth: boolean;
  achievedMilestones: number[]; // [7, 30, 100, 365]
}

export class StreakSystem {
  private state: StreakState;
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
    this.state = this.loadFromStorage() || this.getDefaultState();
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
    const daysSince = this.getDaysBetween(lastActivity, today);
    
    // Já fez atividade hoje
    if (daysSince === 0) {
      return {
        streakContinued: true,
        streakIncreased: false,
        newStreak: this.state.currentDailyStreak,
        message: `Streak mantido! 🔥 ${this.state.currentDailyStreak} dias`
      };
    }
    
    // Atividade no dia seguinte (streak continua)
    if (daysSince === 1) {
      this.state.currentDailyStreak++;
      this.state.longestDailyStreak = Math.max(
        this.state.longestDailyStreak,
        this.state.currentDailyStreak
      );
      this.state.lastActivityDate = today;
      this.state.activeDaysThisWeek++;
      
      // Check milestone
      const milestone = this.checkMilestone();
      
      this.saveToStorage();
      
      analytics.track('STREAK_CONTINUED', {
        current_streak: this.state.currentDailyStreak,
        consecutive_days: this.state.currentDailyStreak
      });
      
      return {
        streakContinued: true,
        streakIncreased: true,
        newStreak: this.state.currentDailyStreak,
        milestoneAchieved: milestone,
        message: `Streak aumentado! 🔥 ${this.state.currentDailyStreak} dias`
      };
    }
    
    // Streak quebrado mas pode usar Freeze?
    if (daysSince === 2 && this.state.streakFreezeAvailable) {
      this.state.streakFreezeAvailable = false;
      this.state.streakFreezeUsedThisMonth = true;
      this.state.lastActivityDate = today;
      
      this.saveToStorage();
      
      analytics.track('STREAK_FREEZE_USED', {
        saved_streak_days: this.state.currentDailyStreak
      });
      
      return {
        streakContinued: true,
        streakIncreased: false,
        newStreak: this.state.currentDailyStreak,
        message: `🛡️ Streak Freeze usado! Seu streak de ${this.state.currentDailyStreak} dias foi salvo!`
      };
    }
    
    // Streak perdido :(
    const oldStreak = this.state.currentDailyStreak;
    this.state.currentDailyStreak = 1;
    this.state.lastActivityDate = today;
    this.state.activeDaysThisWeek = 1;
    
    this.saveToStorage();
    
    analytics.track('STREAK_BROKEN', {
      lost_streak_days: oldStreak,
      reason: daysSince > 2 ? 'too_many_days' : 'no_freeze_available'
    });
    
    return {
      streakContinued: false,
      streakIncreased: false,
      newStreak: 1,
      message: `Streak reiniciado. Anterior: ${oldStreak} dias. Vamos recomeçar forte! 💪`
    };
  }
  
  // Check milestone
  private checkMilestone(): number | undefined {
    const milestones = [7, 30, 100, 365];
    const streak = this.state.currentDailyStreak;
    
    for (const milestone of milestones) {
      if (streak === milestone && !this.state.achievedMilestones.includes(milestone)) {
        this.state.achievedMilestones.push(milestone);
        
        analytics.track('STREAK_MILESTONE', {
          streak_days: streak,
          milestone_type: this.getMilestoneName(milestone)
        });
        
        return milestone;
      }
    }
    return undefined;
  }
  
  private getMilestoneName(days: number): string {
    if (days === 7) return 'uma_semana';
    if (days === 30) return 'um_mes';
    if (days === 100) return 'cem_dias';
    if (days === 365) return 'um_ano';
    return 'custom';
  }
  
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
  private saveToStorage(): void {
    const key = `raio_streak_${this.userId}`;
    localStorage.setItem(key, JSON.stringify(this.state));
  }
  
  private loadFromStorage(): StreakState | null {
    const key = `raio_streak_${this.userId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  }
  
  private getDefaultState(): StreakState {
    return {
      currentDailyStreak: 0,
      longestDailyStreak: 0,
      lastActivityDate: new Date(),
      currentWeeklyStreak: 0,
      activeDaysThisWeek: 0,
      streakFreezeAvailable: true,
      streakFreezeUsedThisMonth: false,
      achievedMilestones: []
    };
  }
}
```

#### 2.2 Hook useStreak (20 min)

```typescript
// /hooks/gamification/useStreak.ts
import { useState, useCallback } from 'react';
import { StreakSystem } from '../../lib/gamification/StreakSystem';
import { useApp } from '../../components/AppContext';

export function useStreak() {
  const { userData } = useApp();
  const [streakSystem] = useState(() => new StreakSystem(userData.name));
  const [state, setState] = useState(streakSystem.getState());
  
  const recordActivity = useCallback(async (activityType: string) => {
    const result = await streakSystem.recordActivity(activityType);
    setState(streakSystem.getState());
    return result;
  }, [streakSystem]);
  
  return {
    streak: state,
    recordActivity
  };
}
```

#### 2.3 UI Component (40 min)

```typescript
// /components/gamification/StreakDisplay.tsx
import { Flame, Shield, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

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
        <span className="text-sm font-bold">{currentStreak}</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Streak Number */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ 
            scale: currentStreak > 0 ? [1, 1.2, 1] : 1 
          }}
          transition={{ 
            duration: 1, 
            repeat: currentStreak > 0 ? Infinity : 0,
            repeatDelay: 2 
          }}
        >
          <Flame className="w-10 h-10 text-orange-500 fill-orange-500" />
        </motion.div>
        
        <div>
          <div className="text-3xl font-bold">{currentStreak}</div>
          <div className="text-sm text-gray-600">dia{currentStreak !== 1 ? 's' : ''} de streak</div>
        </div>
      </div>
      
      {/* Record */}
      {longestStreak > currentStreak && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Trophy className="w-4 h-4" />
          <span>Seu recorde: {longestStreak} dias</span>
        </div>
      )}
      
      {/* Freeze */}
      {freezeAvailable && (
        <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded-lg">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="text-blue-700">Streak Freeze disponível</span>
        </div>
      )}
      
      {/* Next Milestone */}
      <div className="text-sm text-gray-600">
        {currentStreak < 7 && `🎯 Próximo: 7 dias (faltam ${7 - currentStreak})`}
        {currentStreak >= 7 && currentStreak < 30 && `🎯 Próximo: 30 dias (faltam ${30 - currentStreak})`}
        {currentStreak >= 30 && currentStreak < 100 && `🎯 Próximo: 100 dias (faltam ${100 - currentStreak})`}
        {currentStreak >= 100 && currentStreak < 365 && `🎯 Próximo: 1 ano!`}
        {currentStreak >= 365 && `🏆 Você é uma lenda!`}
      </div>
    </div>
  );
}
```

#### 2.4 Integrar com Ações (30 min)

```typescript
// Em qualquer ação de aprendizado
import { useStreak } from '../hooks/gamification/useStreak';
import { useEnergy } from '../hooks/gamification/useEnergy';

const { recordActivity } = useStreak();
const { useEnergy } = useEnergy();

const handleCompleteLesson = async () => {
  // Usar energia
  await useEnergy({ type: 'course_lesson', energyCost: 1, estimatedDuration: 10 });
  
  // Registrar streak
  const result = await recordActivity('lesson_completed');
  
  if (result.streakIncreased) {
    enhancedToast.success({
      title: result.message,
      description: result.milestoneAchieved 
        ? `🎉 Você atingiu ${result.milestoneAchieved} dias!`
        : undefined
    });
  }
  
  // ... resto da lógica
};
```

✅ **Critério de sucesso:**
- Streak aumenta ao completar primeira ação do dia
- Streak não aumenta se já fez hoje
- Milestone celebration aos 7 dias
- Freeze protege o streak

---

### 🎯 FASE 3 - DIA 5-6: MISSÕES DIÁRIAS

**Objetivo:** Sistema de missões auto-tracking

#### 3.1 MissionsSystem (2 horas)

Ver código completo em SPRINT_3_PLANO_EXECUCAO.md seção 1.3

**Quick version:**

```typescript
// /lib/gamification/MissionsSystem.ts

// 🔴 BACKEND REQUIRED - Gerar missões no servidor

export class MissionsSystem {
  // Obter missões ativas
  getActiveMissions(type?: 'daily' | 'weekly'): Mission[]
  
  // Auto-detectar progresso
  async trackAction(action: { type: string }): Mission[]
  
  // Completar missão manualmente
  async completeMission(missionId: string): Result
  
  // Reset diário (cronjob)
  async resetDailyMissions(): void
}
```

#### 3.2 Hook useMissions (30 min)

```typescript
// /hooks/gamification/useMissions.ts
export function useMissions() {
  const [system] = useState(() => new MissionsSystem(userId));
  const [missions, setMissions] = useState(system.getActiveMissions());
  
  const trackAction = useCallback(async (action) => {
    const completed = await system.trackAction(action);
    setMissions(system.getActiveMissions());
    return completed;
  }, []);
  
  return { missions, trackAction };
}
```

#### 3.3 UI MissionsList (1 hora)

```typescript
// /components/gamification/MissionsList.tsx
export function MissionsList({ missions }: MissionsListProps) {
  return (
    <div className="space-y-3">
      {missions.map(mission => (
        <MissionCard 
          key={mission.id}
          mission={mission}
          onComplete={() => handleComplete(mission.id)}
        />
      ))}
    </div>
  );
}
```

#### 3.4 Integrar Auto-Tracking (30 min)

```typescript
// Criar hook central
// /hooks/gamification/useGamification.ts

export function useGamification() {
  const { useEnergy } = useEnergy();
  const { recordActivity } = useStreak();
  const { trackAction } = useMissions();
  
  const completeAction = async (action: GamificationAction) => {
    // 1. Usar energia
    const energyResult = await useEnergy(action);
    
    // 2. Registrar streak
    const streakResult = await recordActivity(action.type);
    
    // 3. Track missões
    const completedMissions = await trackAction({ type: action.type });
    
    return {
      energyResult,
      streakResult,
      completedMissions
    };
  };
  
  return { completeAction };
}
```

✅ **Critério de sucesso:**
- Missões aparecem na interface
- Progresso atualiza automaticamente
- Recompensas são dadas ao completar
- Reset diário funciona

---

### 📊 FASE 4 - DIA 7: DEPLOY & MONITORING

#### 4.1 Dashboard de Gamificação (1 hora)

```typescript
// /components/gamification/GamificationDashboard.tsx
export function GamificationDashboard() {
  const { energy, timeUntilNext } = useEnergy();
  const { streak } = useStreak();
  const { missions } = useMissions();
  
  const dailyMissions = missions.filter(m => m.type === 'daily');
  
  return (
    <div className="space-y-6">
      <EnergyDisplay {...energy} timeUntilNext={timeUntilNext} />
      <StreakDisplay {...streak} />
      <MissionsList missions={dailyMissions} />
    </div>
  );
}
```

#### 4.2 Adicionar na HomePage (20 min)

```typescript
// /components/HomePage.tsx
import { GamificationDashboard } from './gamification/GamificationDashboard';

// Adicionar card
<Card>
  <CardHeader>
    <CardTitle>Seu Progresso Hoje</CardTitle>
  </CardHeader>
  <CardContent>
    <GamificationDashboard />
  </CardContent>
</Card>
```

#### 4.3 Analytics Validation (30 min)

Verificar no Mixpanel:
- [ ] ENERGY_USED events chegando
- [ ] STREAK_CONTINUED events chegando
- [ ] MISSION_COMPLETED events chegando
- [ ] Properties corretas

#### 4.4 Testing Checklist

- [ ] Energia regenera corretamente
- [ ] Streak aumenta no dia seguinte
- [ ] Missões auto-trackam
- [ ] UI responsiva mobile
- [ ] Performance OK
- [ ] Sem erros console

✅ **Critério de sucesso:**
- Sistema completo funcionando
- Analytics trackando 100%
- Deploy em staging
- Demo funcionando

---

## 🔴 BACKEND MIGRATION CHECKLIST

**Quando for migrar para Supabase:**

### Tabelas a criar:
```sql
-- Ver SPRINT_3_PLANO_EXECUCAO.md para SQL completo

user_energy
user_streaks
missions
user_missions
teams
team_members
```

### APIs/Functions:
```typescript
// Ver PLANO_EXECUCAO para lista completa

getEnergyState(userId)
useEnergy(userId, amount, action)
regenerateEnergy(userId)

getStreakState(userId)
recordActivity(userId, type)

getActiveMissions(userId)
trackAction(userId, action)
generateDailyMissions()
```

### Migration Steps:
1. Criar tabelas no Supabase
2. Implementar APIs
3. Testar em staging
4. Migrar dados de localStorage
5. Deploy gradual (feature flag)

---

## 💡 DICAS DE PRODUTIVIDADE

1. **Trabalhe em branches separados**
```bash
git checkout -b sprint-3/energy-system
git checkout -b sprint-3/streaks
git checkout -b sprint-3/missions
```

2. **Deploy incremental**
- Energia primeiro
- Streaks depois
- Missões por último

3. **Use feature flags**
```typescript
const gamificationEnabled = useFeatureValue('gamification-enabled', false);
return gamificationEnabled ? <GamificationDashboard /> : null;
```

4. **Mock timing para testes**
```typescript
// Testar regeneração rápida
const REGEN_INTERVAL = isDev ? 60000 : 4 * 60 * 60 * 1000; // 1 min vs 4h
```

---

## 📊 MONITORAMENTO

### Dashboard Mixpanel

Criar queries:
1. **Energy Usage Rate** - % de ações com energia vs sem
2. **Streak Distribution** - Quantos usuários em cada faixa
3. **Mission Completion** - Taxa de conclusão por tipo
4. **Daily Active Gamified** - Usuários usando gamification

---

## ✅ CHECKLIST SEMANAL

### Semana 1
- [ ] EnergySystem implementado
- [ ] StreakSystem implementado
- [ ] UI components criados
- [ ] Integrado em 3+ ações
- [ ] Analytics trackando
- [ ] Deploy staging

### Semana 2
- [ ] MissionsSystem implementado
- [ ] Auto-tracking funcionando
- [ ] Continue de onde parou
- [ ] Teams (opcional)
- [ ] Deploy staging

### Semana 3
- [ ] Trilha Hábitos (content)
- [ ] Notification strategy
- [ ] A/B tests
- [ ] Polish & fixes
- [ ] Deploy produção
- [ ] Sprint Review

---

**Pronto para começar?** 🚀

Execute: `git checkout -b sprint-3/gamification && code .`

Comece pela FASE 1 - Sistema de Energia!

Boa sorte! 🎮⚡
