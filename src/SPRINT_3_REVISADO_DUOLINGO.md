# 🎮 SPRINT 3 - GAMIFICAÇÃO RAIO (REVISÃO DUOLINGO)
## Onboarding + Funboarding Inspirado no Duolingo para Famílias

> **Versão:** 2.0 (Revisada)  
> **Data:** 24 de Outubro de 2025  
> **Inspiração:** Sistema de boas-vindas e gamificação do Duolingo  
> **Adaptação:** Contexto familiar-emocional do RAIO

---

## 🎯 MUDANÇA DE PARADIGMA

### ❌ Antes (Sprint 3 v1.0)
```
Sistema de Energia genérico
→ Streaks genéricos
→ Missões genérias
→ Sem onboarding específico
→ Gamificação "fria"
```

### ✅ Agora (Sprint 3 v2.0 - Duolingo Style)
```
ONBOARDING EMOCIONAL (Lição 0)
→ Personalização por jornada familiar
→ Primeira prática imediata (valor instantâneo)
→ Gamificação progressiva e contextual
→ "Corações da Família" + "Luz Espiritual"
→ Mapa de jornada visual
→ Experiência "quente" e acolhedora
```

---

## 🧭 1. ESTRATÉGIA DE EXPERIÊNCIA (RAIO + DUOLINGO)

### Missão Central Adaptada

| Elemento | Duolingo | RAIO (Adaptado) |
|----------|----------|-----------------|
| **O que ensina** | Novo idioma | "Linguagem do amor e propósito familiar" |
| **Como ensina** | Lições de 5-10 min | Práticas de 5-10 min (exercícios de empatia, comunicação, fé) |
| **Motivação** | Falar fluente | Transformar relacionamentos |
| **Mecânica** | Streaks + XP + Vidas | Streaks + Luz (XP espiritual) + Corações da Família |
| **Progressão** | Units → Levels | Unidades → Jornadas familiares |

### Tom de Voz

**Duolingo:** "Duo the Owl"  
**RAIO:** "Oi, eu sou o Raio ⚡ — e estou aqui para guiar você a viver uma família com propósito."

---

## 🎨 2. FLUXO DE ONBOARDING (6 ETAPAS)

### ETAPA 1: Boas-vindas Emocionais

**Tela:** Fullscreen com animação suave

```
┌────────────────────────────────────────┐
│                                        │
│         [Animação: Raio ⚡]            │
│                                        │
│       Olá! Eu sou o Raio              │
│                                        │
│    Bem-vindo à sua jornada de         │
│    transformação familiar 💛           │
│                                        │
│    Em poucos minutos, você vai        │
│    começar a fortalecer seus          │
│    relacionamentos com práticas       │
│    simples e poderosas.               │
│                                        │
│         [Continuar →]                 │
│                                        │
└────────────────────────────────────────┘
```

**Implementação:**
```typescript
// /components/onboarding/WelcomeScreen.tsx
import { motion } from 'motion/react';

export function WelcomeScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-screen p-6"
    >
      {/* Raio character animation */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="text-8xl">⚡</div>
      </motion.div>
      
      <h1 className="mt-6 text-center">
        Olá! Eu sou o Raio
      </h1>
      
      <p className="mt-4 text-center text-gray-600 max-w-md">
        Bem-vindo à sua jornada de transformação familiar 💛
        
        Em poucos minutos, você vai começar a fortalecer seus
        relacionamentos com práticas simples e poderosas.
      </p>
      
      <Button 
        size="lg" 
        className="mt-8"
        onClick={onContinue}
      >
        Continuar →
      </Button>
    </motion.div>
  );
}
```

**Analytics:**
```typescript
analytics.track('ONBOARDING_WELCOME_VIEWED');
```

---

### ETAPA 2: Personalização Emocional (Quiz Lúdico)

**Pergunta-chave:**
```
"O que você mais quer transformar 
 na sua família neste momento?"
```

**Opções (cards visuais):**

```
┌─────────────────────┐  ┌─────────────────────┐
│   💑 Relacionamento  │  │   👨‍👩‍👧‍👦 Vínculo com │
│   com meu cônjuge   │  │   meus filhos       │
│                     │  │                     │
│   [Selecionar]      │  │   [Selecionar]      │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│   💍 Preparar para  │  │   🙏 Trazer mais    │
│   o casamento       │  │   fé e propósito    │
│                     │  │                     │
│   [Selecionar]      │  │   [Selecionar]      │
└─────────────────────┘  └─────────────────────┘
```

**Perguntas adicionais (1-2 toques):**

```typescript
const personalizationQuestions = [
  {
    id: 'family_stage',
    question: 'Qual é o seu momento atual?',
    options: [
      { value: 'solteiro', label: 'Solteiro(a)', icon: '🧑' },
      { value: 'namoro', label: 'Namorando', icon: '💕' },
      { value: 'noivos', label: 'Noivos', icon: '💍' },
      { value: 'casados', label: 'Casados', icon: '💑' },
      { value: 'pais', label: 'Pais/Mães', icon: '👨‍👩‍👧‍👦' }
    ]
  },
  {
    id: 'time_budget',
    question: 'Quanto tempo você pode dedicar por dia?',
    options: [
      { value: 5, label: '5 minutos', icon: '⏱️' },
      { value: 10, label: '10 minutos', icon: '⏰' },
      { value: 15, label: '15 minutos', icon: '⌚' }
    ]
  },
  {
    id: 'focus_theme',
    question: 'O que você sente que mais falta?',
    options: [
      { value: 'tempo', label: 'Tempo juntos', icon: '⏳' },
      { value: 'comunicacao', label: 'Comunicação', icon: '💬' },
      { value: 'fe', label: 'Oração e fé', icon: '🙏' },
      { value: 'paciencia', label: 'Paciência', icon: '🧘' }
    ]
  }
];
```

**Implementação:**
```typescript
// /components/onboarding/PersonalizationQuiz.tsx
export function PersonalizationQuiz() {
  const [answers, setAnswers] = useState({});
  
  const handleComplete = async () => {
    // 🔴 BACKEND REQUIRED - Salvar no Supabase
    // await supabase.from('user_profile').upsert({
    //   user_id: userId,
    //   family_stage: answers.family_stage,
    //   time_budget: answers.time_budget,
    //   focus_theme: answers.focus_theme
    // });
    
    // MOCK - Salvar localmente
    localStorage.setItem('raio_profile', JSON.stringify(answers));
    
    analytics.track('ONBOARDING_PERSONALIZATION_COMPLETED', answers);
    
    // Determinar curso inicial baseado nas respostas
    const initialCourse = determineInitialCourse(answers);
    navigateToLesson0(initialCourse);
  };
  
  return (
    <div className="space-y-6">
      {personalizationQuestions.map(q => (
        <QuestionCard 
          key={q.id}
          question={q}
          onAnswer={(value) => setAnswers({...answers, [q.id]: value})}
        />
      ))}
      
      <Button onClick={handleComplete}>
        Começar minha jornada →
      </Button>
    </div>
  );
}
```

**Lógica de recomendação:**
```typescript
function determineInitialCourse(profile) {
  // Mapear perfil para curso inicial
  const courseMap = {
    'solteiro': 'autocuidado-proposito',
    'namoro': 'comunicacao-limites',
    'noivos': 'preparacao-casamento',
    'casados': 'amor-respeito',
    'pais': 'paternidade-proposito'
  };
  
  return courseMap[profile.family_stage] || 'comunicacao-limites';
}
```

**Analytics:**
```typescript
ONBOARDING_QUESTION_ANSWERED(question_id, answer)
ONBOARDING_PERSONALIZATION_COMPLETED(profile_data)
INITIAL_COURSE_DETERMINED(course_id)
```

---

### ETAPA 3: Lição 0 - Primeira Prática (VALOR IMEDIATO)

**Objetivo:** Mostrar valor em menos de 3 minutos

**Exemplo: "A Escuta que Transforma"**

```
┌────────────────────────────────────────┐
│  Lição 0: A Escuta que Transforma     │
│  ━━━━━━━━━━━━━━━━━━━━━━ 0% (0/3)      │
└────────────────────────────────────────┘

PASSO 1/3: Ouvir
┌────────────────────────────────────────┐
│  [Ícone de áudio 🎧]                   │
│                                        │
│  Ouça esta mensagem sobre a           │
│  importância da escuta ativa.          │
│                                        │
│  ▶️ Play (30 segundos)                 │
│  ━━━━━━━━━━━━━━━ 45%                   │
│                                        │
└────────────────────────────────────────┘

PASSO 2/3: Refletir
┌────────────────────────────────────────┐
│  Como você se sentiu ao ouvir          │
│  essa mensagem?                        │
│                                        │
│  [😊 Inspirado]                        │
│  [🤔 Pensativo]                        │
│  [😌 Em paz]                           │
│                                        │
└────────────────────────────────────────┘

PASSO 3/3: Feedback
┌────────────────────────────────────────┐
│  ✨ Parabéns!                          │
│                                        │
│  Você deu o primeiro passo para        │
│  uma escuta consciente.                │
│                                        │
│  Hoje, tente ouvir alguém que você    │
│  ama por 2 minutos, sem interromper.  │
│                                        │
│  Recompensas ganhas:                   │
│  ✓ +10 Luz (XP)                        │
│  ✓ +1 Coração da Família              │
│                                        │
│  [Continuar →]                         │
└────────────────────────────────────────┘
```

**Estrutura de Lição:**
```typescript
// /lib/lessons/LessonStructure.ts

interface LessonStep {
  id: string;
  type: 'audio' | 'video' | 'quiz' | 'reflection' | 'practice' | 'feedback';
  content: any;
  duration_seconds: number;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  category: string; // 'comunicacao', 'fe', 'amor', etc
  difficulty: number; // 1-5
  estimated_minutes: number;
  xp_reward: number;
  hearts_reward: number;
  steps: LessonStep[];
}

// Lição 0 - Template
const lesson0_escuta: Lesson = {
  id: 'lesson-0-escuta',
  title: 'A Escuta que Transforma',
  description: 'Aprenda a importância da escuta ativa em relacionamentos',
  category: 'comunicacao',
  difficulty: 1,
  estimated_minutes: 3,
  xp_reward: 10,
  hearts_reward: 1,
  steps: [
    {
      id: 'step-1',
      type: 'audio',
      content: {
        audio_url: '/assets/audio/escuta-ativa.mp3',
        duration: 30,
        transcript: 'Escutar é mais do que ouvir palavras...'
      },
      duration_seconds: 30
    },
    {
      id: 'step-2',
      type: 'reflection',
      content: {
        question: 'Como você se sentiu ao ouvir essa mensagem?',
        options: [
          { emoji: '😊', label: 'Inspirado' },
          { emoji: '🤔', label: 'Pensativo' },
          { emoji: '😌', label: 'Em paz' }
        ]
      },
      duration_seconds: 15
    },
    {
      id: 'step-3',
      type: 'feedback',
      content: {
        title: '✨ Parabéns!',
        message: 'Você deu o primeiro passo para uma escuta consciente.',
        action_item: 'Hoje, tente ouvir alguém que você ama por 2 minutos, sem interromper.',
        rewards: {
          xp: 10,
          hearts: 1
        }
      },
      duration_seconds: 20
    }
  ]
};
```

**Componente de Lição:**
```typescript
// /components/lessons/LessonPlayer.tsx
import { useState } from 'react';
import { Progress } from '../ui/progress';
import { useGamification } from '../../hooks/gamification/useGamification';

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState({});
  const { completeAction } = useGamification();
  
  const currentStep = lesson.steps[currentStepIndex];
  const progressPercent = (currentStepIndex / lesson.steps.length) * 100;
  
  const handleStepComplete = async (stepId: string, result: any) => {
    // Salvar progresso do passo
    setStepProgress({ ...stepProgress, [stepId]: result });
    
    // Próximo passo
    if (currentStepIndex < lesson.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Lição completa!
      await handleLessonComplete();
    }
  };
  
  const handleLessonComplete = async () => {
    // Gamificação
    const result = await completeAction({
      type: 'lesson_completed',
      energyCost: 1,
      estimatedDuration: lesson.estimated_minutes
    });
    
    // 🔴 BACKEND REQUIRED - Salvar progresso
    // await supabase.from('user_progress').insert({
    //   user_id: userId,
    //   lesson_id: lesson.id,
    //   completed_at: new Date(),
    //   xp_earned: lesson.xp_reward,
    //   step_results: stepProgress
    // });
    
    // MOCK
    localStorage.setItem(`lesson_${lesson.id}`, JSON.stringify({
      completed: true,
      completedAt: new Date(),
      stepResults: stepProgress
    }));
    
    analytics.track('LESSON_COMPLETED', {
      lesson_id: lesson.id,
      lesson_title: lesson.title,
      category: lesson.category,
      time_spent_seconds: getTotalTimeSpent(),
      xp_earned: lesson.xp_reward
    });
    
    // Mostrar celebração
    showCelebration(lesson);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">{lesson.title}</h2>
          <span className="text-sm text-gray-500">
            {currentStepIndex + 1}/{lesson.steps.length}
          </span>
        </div>
        <Progress value={progressPercent} />
      </div>
      
      {/* Step Content */}
      <div className="flex-1 p-6">
        <StepRenderer 
          step={currentStep}
          onComplete={(result) => handleStepComplete(currentStep.id, result)}
        />
      </div>
    </div>
  );
}
```

**Step Renderers:**
```typescript
// /components/lessons/steps/AudioStep.tsx
export function AudioStep({ step, onComplete }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🎧</div>
        <p className="text-gray-700">
          Ouça esta mensagem sobre a importância da escuta ativa.
        </p>
      </div>
      
      <AudioPlayer 
        src={step.content.audio_url}
        onEnded={() => onComplete({ listened: true })}
      />
    </div>
  );
}

// /components/lessons/steps/ReflectionStep.tsx
export function ReflectionStep({ step, onComplete }) {
  const [selected, setSelected] = useState(null);
  
  return (
    <div className="space-y-6">
      <h3 className="text-center text-lg">
        {step.content.question}
      </h3>
      
      <div className="grid grid-cols-3 gap-4">
        {step.content.options.map(option => (
          <button
            key={option.emoji}
            onClick={() => {
              setSelected(option);
              onComplete({ feeling: option.label });
            }}
            className="p-6 border rounded-lg hover:border-yellow-400"
          >
            <div className="text-4xl mb-2">{option.emoji}</div>
            <div className="text-sm">{option.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// /components/lessons/steps/FeedbackStep.tsx
export function FeedbackStep({ step, onComplete }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="space-y-6 text-center"
    >
      <div className="text-6xl">✨</div>
      
      <h2 className="text-2xl font-bold">{step.content.title}</h2>
      
      <p className="text-lg text-gray-700">
        {step.content.message}
      </p>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 {step.content.action_item}
        </p>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg">
        <p className="font-semibold mb-2">Recompensas ganhas:</p>
        <div className="flex justify-center gap-4">
          <div>✓ +{step.content.rewards.xp} Luz</div>
          <div>✓ +{step.content.rewards.hearts} Coração</div>
        </div>
      </div>
      
      <Button size="lg" onClick={onComplete}>
        Continuar →
      </Button>
    </motion.div>
  );
}
```

**Analytics:**
```typescript
LESSON_STARTED(lesson_id, category)
LESSON_STEP_COMPLETED(lesson_id, step_id, step_type, time_spent)
LESSON_COMPLETED(lesson_id, total_time, xp_earned)
LESSON_ABANDONED(lesson_id, last_step_id, time_spent)
```

---

### ETAPA 4: Recompensa e Celebração

**Tela de celebração após Lição 0:**

```
┌────────────────────────────────────────┐
│                                        │
│         [Animação confetti]            │
│                                        │
│      🎉 Primeira Lição Completa! 🎉   │
│                                        │
│    Você acabou de iluminar o dia      │
│    de quem você ama ✨                 │
│                                        │
│    ┌──────────────────────────┐       │
│    │  Sua conquista:          │       │
│    │                          │       │
│    │  💡 +10 Luz              │       │
│    │  ❤️  +1 Coração da Família│       │
│    │  🔥 Streak: 1 dia         │       │
│    │                          │       │
│    │  Continue amanhã para    │       │
│    │  manter seu streak!      │       │
│    └──────────────────────────┘       │
│                                        │
│         [Ver minha jornada]           │
│                                        │
└────────────────────────────────────────┘
```

**Implementação:**
```typescript
// /components/lessons/LessonCelebration.tsx
import Confetti from 'react-confetti';

export function LessonCelebration({ lesson, rewards }) {
  const [showConfetti, setShowConfetti] = useState(true);
  
  useEffect(() => {
    // Confetti por 3 segundos
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {showConfetti && <Confetti />}
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-8 max-w-md mx-4"
      >
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold">
            🎉 Primeira Lição Completa! 🎉
          </h1>
          
          <p className="text-lg text-gray-700">
            Você acabou de iluminar o dia de quem você ama ✨
          </p>
          
          <div className="bg-yellow-50 rounded-xl p-6 space-y-3">
            <p className="font-semibold">Sua conquista:</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">💡</span>
                <span className="text-lg">+{rewards.xp} Luz</span>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">❤️</span>
                <span className="text-lg">+{rewards.hearts} Coração da Família</span>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🔥</span>
                <span className="text-lg">Streak: 1 dia</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-4">
              Continue amanhã para manter seu streak!
            </p>
          </div>
          
          <Button 
            size="lg"
            onClick={() => navigateToDashboard()}
          >
            Ver minha jornada →
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
```

---

### ETAPA 5: Convite para Criar Perfil

**Timing:** Após completar Lição 0

```
┌────────────────────────────────────────┐
│  Quer continuar sua jornada e salvar  │
│  seu progresso?                        │
│                                        │
│  Com uma conta RAIO, você pode:       │
│  ✓ Salvar seu progresso                │
│  ✓ Competir com amigos                │
│  ✓ Receber lembretes diários          │
│  ✓ Desbloquear conteúdo exclusivo     │
│                                        │
│  [Criar conta RAIO]                   │
│                                        │
│  [Experimentar mais um dia]           │
│                                        │
└────────────────────────────────────────┘
```

**Implementação:**
```typescript
// /components/onboarding/SignupPrompt.tsx
export function SignupPrompt() {
  const handleSignup = async (method: 'email' | 'google') => {
    // Salvar progresso anônimo antes
    const anonymousProgress = getAnonymousProgress();
    
    // Auth
    if (method === 'email') {
      // Email signup
    } else {
      // Google OAuth
    }
    
    // 🔴 BACKEND REQUIRED - Migrar progresso anônimo
    // await supabase.from('user_progress').insert({
    //   user_id: newUserId,
    //   ...anonymousProgress
    // });
    
    analytics.track('SIGNUP_COMPLETED', {
      method,
      had_anonymous_progress: !!anonymousProgress
    });
  };
  
  const handleSkip = () => {
    // Continuar como anônimo
    analytics.track('SIGNUP_SKIPPED');
    navigateToDashboard();
  };
  
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-center">
        Quer continuar sua jornada e salvar seu progresso?
      </h2>
      
      <div className="bg-blue-50 rounded-lg p-4 space-y-2">
        <p className="font-semibold">Com uma conta RAIO, você pode:</p>
        <ul className="space-y-1 text-sm">
          <li>✓ Salvar seu progresso</li>
          <li>✓ Competir com amigos</li>
          <li>✓ Receber lembretes diários</li>
          <li>✓ Desbloquear conteúdo exclusivo</li>
        </ul>
      </div>
      
      <div className="space-y-3">
        <Button 
          size="lg" 
          className="w-full"
          onClick={() => handleSignup('google')}
        >
          <GoogleIcon className="mr-2" />
          Continuar com Google
        </Button>
        
        <Button 
          size="lg" 
          variant="outline"
          className="w-full"
          onClick={() => handleSignup('email')}
        >
          Criar conta com email
        </Button>
        
        <Button 
          variant="ghost"
          className="w-full"
          onClick={handleSkip}
        >
          Experimentar mais um dia
        </Button>
      </div>
    </div>
  );
}
```

**Sincronização de progresso anônimo:**
```typescript
// /lib/auth/anonymousProgress.ts

function getAnonymousProgress() {
  // Pegar todo progresso armazenado localmente
  const energy = localStorage.getItem('raio_energy_state');
  const streak = localStorage.getItem('raio_streak_state');
  const missions = localStorage.getItem('raio_missions');
  const lessons = Object.keys(localStorage)
    .filter(key => key.startsWith('lesson_'))
    .map(key => JSON.parse(localStorage.getItem(key)));
  
  return {
    energy: energy ? JSON.parse(energy) : null,
    streak: streak ? JSON.parse(streak) : null,
    missions: missions ? JSON.parse(missions) : [],
    completed_lessons: lessons
  };
}

async function migrateAnonymousProgress(userId: string, progress: any) {
  // 🔴 BACKEND REQUIRED - Migrar para tabelas do usuário
  
  // Energia
  if (progress.energy) {
    await supabase.from('user_energy').upsert({
      user_id: userId,
      ...progress.energy
    });
  }
  
  // Streaks
  if (progress.streak) {
    await supabase.from('user_streaks').upsert({
      user_id: userId,
      ...progress.streak
    });
  }
  
  // Lições completadas
  for (const lesson of progress.completed_lessons) {
    await supabase.from('user_progress').insert({
      user_id: userId,
      lesson_id: lesson.id,
      completed_at: lesson.completedAt,
      step_results: lesson.stepResults
    });
  }
  
  // Limpar localStorage
  clearAnonymousProgress();
}
```

---

### ETAPA 6: Dashboard - Mapa de Jornada (Duolingo Style)

**Painel principal após onboarding:**

```
┌────────────────────────────────────────────────────────────┐
│  🎮 Minha Jornada de Transformação                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Status Hoje:                                              │
│  ❤️❤️❤️❤️❤️ (5/5 Corações)   🔥 1 dia de streak          │
│  💡 10 Luz (XP)                                            │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📍 TRILHA: Comunicação & Escuta                           │
│                                                            │
│      ┌────┐                                                │
│      │ 🎯 │  Lição 1: Perguntas Poderosas                 │
│      └─┬──┘  ⚪⚪⚪⚪⚪ (Bloqueada - Complete Lição 0)      │
│        │                                                   │
│      ┌─┴──┐                                                │
│      │ ✅ │  Lição 0: A Escuta que Transforma             │
│      └─┬──┘  ●●●●● (Completada!)                          │
│        │     +10 Luz, +1 Coração                          │
│        │                                                   │
│      [START]                                               │
│                                                            │
│  Próximas trilhas:                                         │
│  🔒 Amor & Respeito (Desbloqueie 3 lições)                │
│  🔒 Fé & Propósito (Desbloqueie 6 lições)                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Estrutura de Unidades:**
```typescript
// /lib/curriculum/units.ts

interface Unit {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlock_after_lessons: number; // Quantas lições precisa completar antes
  lessons: Lesson[];
}

const curriculum: Unit[] = [
  {
    id: 'unit-1-comunicacao',
    title: 'Comunicação & Escuta',
    description: 'Aprenda a se comunicar com clareza e amor',
    icon: '💬',
    unlock_after_lessons: 0, // Sempre desbloqueada
    lessons: [
      lesson0_escuta,
      {
        id: 'lesson-1-perguntas',
        title: 'Perguntas Poderosas',
        description: 'Como fazer perguntas que constroem conexão',
        // ...
      },
      {
        id: 'lesson-2-linguagem-nao-verbal',
        title: 'Linguagem Não-Verbal',
        // ...
      },
      {
        id: 'lesson-3-conflitos',
        title: 'Navegando Conflitos',
        // ...
      }
    ]
  },
  {
    id: 'unit-2-amor-respeito',
    title: 'Amor & Respeito',
    description: 'Fortaleça o vínculo através de ações diárias',
    icon: '❤️',
    unlock_after_lessons: 3, // Precisa completar 3 lições
    lessons: [
      // ...
    ]
  },
  {
    id: 'unit-3-fe-proposito',
    title: 'Fé & Propósito',
    description: 'Construa uma base espiritual sólida',
    icon: '🙏',
    unlock_after_lessons: 6,
    lessons: [
      // ...
    ]
  },
  {
    id: 'unit-4-rotina-presenca',
    title: 'Rotina & Presença',
    description: 'Crie momentos especiais no dia a dia',
    icon: '⏰',
    unlock_after_lessons: 9,
    lessons: [
      // ...
    ]
  }
];
```

**Componente do Mapa:**
```typescript
// /components/curriculum/JourneyMap.tsx
export function JourneyMap() {
  const { completedLessons } = useUserProgress();
  const unlockedUnits = getUnlockedUnits(completedLessons.length);
  
  return (
    <div className="space-y-8 p-6">
      {curriculum.map(unit => {
        const isUnlocked = unlockedUnits.includes(unit.id);
        
        return (
          <UnitCard 
            key={unit.id}
            unit={unit}
            isUnlocked={isUnlocked}
            completedLessons={completedLessons}
          />
        );
      })}
    </div>
  );
}

function UnitCard({ unit, isUnlocked, completedLessons }) {
  if (!isUnlocked) {
    return (
      <div className="bg-gray-100 rounded-lg p-6 opacity-50">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🔒</span>
          <div>
            <h3 className="font-semibold text-gray-600">{unit.title}</h3>
            <p className="text-sm text-gray-500">
              Desbloqueie completando {unit.unlock_after_lessons} lições
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg border-2 border-yellow-400 p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">{unit.icon}</span>
        <div>
          <h3 className="text-xl font-bold">{unit.title}</h3>
          <p className="text-sm text-gray-600">{unit.description}</p>
        </div>
      </div>
      
      {/* Lesson Path */}
      <div className="space-y-4">
        {unit.lessons.map((lesson, index) => {
          const isCompleted = completedLessons.some(l => l.id === lesson.id);
          const isNext = index === 0 || completedLessons.some(l => l.id === unit.lessons[index - 1].id);
          const isLocked = !isNext;
          
          return (
            <LessonNode 
              key={lesson.id}
              lesson={lesson}
              isCompleted={isCompleted}
              isNext={isNext}
              isLocked={isLocked}
            />
          );
        })}
      </div>
    </div>
  );
}

function LessonNode({ lesson, isCompleted, isNext, isLocked }) {
  return (
    <div className={`
      flex items-center gap-4 p-4 rounded-lg border-2
      ${isCompleted ? 'border-green-500 bg-green-50' : ''}
      ${isNext ? 'border-yellow-400 bg-yellow-50' : ''}
      ${isLocked ? 'border-gray-300 bg-gray-50 opacity-50' : ''}
    `}>
      {/* Icon */}
      <div className="text-3xl">
        {isCompleted && '✅'}
        {isNext && '🎯'}
        {isLocked && '🔒'}
      </div>
      
      {/* Info */}
      <div className="flex-1">
        <h4 className="font-semibold">{lesson.title}</h4>
        <p className="text-sm text-gray-600">{lesson.description}</p>
        
        {isCompleted && (
          <div className="text-xs text-green-600 mt-1">
            +{lesson.xp_reward} Luz, +{lesson.hearts_reward} Coração
          </div>
        )}
        
        {isLocked && (
          <div className="text-xs text-gray-500 mt-1">
            Complete a lição anterior para desbloquear
          </div>
        )}
      </div>
      
      {/* Action */}
      {isNext && !isCompleted && (
        <Button onClick={() => startLesson(lesson.id)}>
          Começar
        </Button>
      )}
      
      {isCompleted && (
        <Button variant="outline" onClick={() => reviewLesson(lesson.id)}>
          Revisar
        </Button>
      )}
    </div>
  );
}
```

---

## 🎮 3. SISTEMA DE GAMIFICAÇÃO REVISADO

### Terminologia Adaptada

| Duolingo | RAIO (Família) | Significado |
|----------|----------------|-------------|
| **XP** | **Luz** 💡 | Experiência espiritual/emocional |
| **Hearts** | **Corações da Família** ❤️ | Energia para práticas |
| **Streak** | **Streak de Transformação** 🔥 | Dias consecutivos |
| **Gems** | **Estrelas** ⭐ | Moeda premium (opcional) |
| **Leagues** | **Famílias Transformadoras** 👥 | Ranking social |

### Sistema de Recompensas

```typescript
// /lib/gamification/RewardsSystem.ts

interface Rewards {
  luz: number;          // XP espiritual
  coracoes: number;     // Energia
  estrelas?: number;    // Premium currency
  badge?: string;       // Achievement badge
}

const lessonRewards = {
  easy: { luz: 10, coracoes: 1 },
  medium: { luz: 20, coracoes: 2 },
  hard: { luz: 30, coracoes: 3 }
};

const streakBonuses = {
  7: { luz: 100, badge: 'uma_semana' },
  30: { luz: 500, badge: 'um_mes', estrelas: 10 },
  100: { luz: 1000, badge: 'centuriao', estrelas: 50 },
  365: { luz: 5000, badge: 'lenda', estrelas: 100 }
};

const missionRewards = {
  daily: { luz: 50, coracoes: 1 },
  weekly: { luz: 200, coracoes: 3, estrelas: 5 }
};
```

---

## 🔧 4. ARQUITETURA TÉCNICA INTEGRADA

### Stack Completo

| Camada | Tecnologia | Uso |
|--------|-----------|-----|
| **Frontend** | Next.js + React + Tailwind | UI/UX |
| **Animações** | Framer Motion | Micro-interações tipo Duolingo |
| **Backend** | Supabase (PostgreSQL) | Dados, auth, storage |
| **Analytics** | Mixpanel | Tracking já implementado ✅ |
| **Experimentos** | GrowthBook | A/B tests já configurado ✅ |
| **Gamificação** | Edge Functions (Supabase) | XP, streaks, achievements |
| **Conteúdo** | JSON + Supabase Storage | Lições dinâmicas |
| **Notificações** | OneSignal (web) / Expo (mobile) | Lembretes de streak |

### Tabelas do Banco (NOVAS + EXISTENTES)

```sql
-- 🔴 BACKEND REQUIRED - Criar tabelas adicionais

-- Lições e currículo
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  unlock_after_lessons INTEGER DEFAULT 0,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty INTEGER, -- 1-5
  estimated_minutes INTEGER,
  xp_reward INTEGER,
  hearts_reward INTEGER,
  order_index INTEGER,
  steps JSONB, -- Array de steps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Progresso do usuário
CREATE TABLE user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users,
  lesson_id UUID REFERENCES lessons,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  time_spent_seconds INTEGER,
  step_results JSONB,
  xp_earned INTEGER,
  hearts_earned INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Perfil personalizado (além do user_profile existente)
CREATE TABLE user_personalization (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  family_stage TEXT, -- solteiro, namoro, noivos, casados, pais
  time_budget INTEGER, -- minutos/dia
  focus_theme TEXT, -- tempo, comunicacao, fe, paciencia
  initial_course TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conquistas/Badges
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  requirement_type TEXT, -- streak, lessons_completed, etc
  requirement_value INTEGER,
  reward_luz INTEGER,
  reward_estrelas INTEGER
);

CREATE TABLE user_achievements (
  user_id UUID REFERENCES auth.users,
  achievement_id TEXT REFERENCES achievements,
  earned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Índices para performance
CREATE INDEX idx_lesson_progress_user ON user_lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON user_lesson_progress(lesson_id);
CREATE INDEX idx_lessons_unit ON lessons(unit_id);
```

### APIs/Functions Necessárias

```typescript
// 🔴 BACKEND REQUIRED - Supabase Edge Functions

// Onboarding
- savePersonalization(userId, profile): void
- getInitialCourse(profile): Course
- completeOnboarding(userId): void

// Lições
- getUnlockedUnits(userId): Unit[]
- startLesson(userId, lessonId): LessonSession
- completeLessonStep(sessionId, stepId, result): void
- completeLesson(sessionId): Rewards
- getLessonProgress(userId, lessonId): Progress

// Progresso
- getUserProgress(userId): FullProgress
- getCompletedLessons(userId): Lesson[]
- getNextLesson(userId): Lesson
- getTotalXP(userId): number

// Achievements
- checkAchievements(userId): Achievement[]
- awardAchievement(userId, achievementId): void
- getUserAchievements(userId): Achievement[]

// Integração com sistemas existentes
- updateEnergyAfterLesson(userId, energyCost): void
- updateStreakAfterLesson(userId): StreakResult
- updateMissionsAfterLesson(userId, lessonId): Mission[]
```

---

## 📊 5. ANALYTICS & EXPERIMENTOS

### Novos Eventos (além dos existentes)

```typescript
// Onboarding
ONBOARDING_WELCOME_VIEWED()
ONBOARDING_QUESTION_ANSWERED(question_id, answer)
ONBOARDING_PERSONALIZATION_COMPLETED(profile)
ONBOARDING_LESSON_0_STARTED()
ONBOARDING_LESSON_0_COMPLETED(time_spent)
ONBOARDING_SIGNUP_PROMPTED()
ONBOARDING_SIGNUP_COMPLETED(method)
ONBOARDING_SIGNUP_SKIPPED()
ONBOARDING_COMPLETED()

// Lições
LESSON_STARTED(lesson_id, unit_id, category)
LESSON_STEP_VIEWED(lesson_id, step_id, step_type)
LESSON_STEP_COMPLETED(lesson_id, step_id, time_spent)
LESSON_COMPLETED(lesson_id, total_time, xp_earned, hearts_earned)
LESSON_ABANDONED(lesson_id, last_step, progress_percent)
LESSON_REVIEWED(lesson_id)

// Jornada
UNIT_UNLOCKED(unit_id)
JOURNEY_MAP_VIEWED()
NEXT_LESSON_STARTED(from_map: boolean)

// Achievements
ACHIEVEMENT_EARNED(achievement_id, reward)
ACHIEVEMENT_VIEWED()

// Retenção
DAILY_RETURN(streak_days)
LESSON_0_TO_LESSON_1_CONVERSION()
```

### Experimentos A/B no GrowthBook

```typescript
// 🔴 BACKEND REQUIRED - Configurar no GrowthBook

// Exp 1: Lição 0 - Tipo de conteúdo
Feature: 'lesson-0-content-type'
Variants:
  - audio: Áudio + reflexão (atual)
  - video: Vídeo curto + quiz
  - reading: Texto + exercício prático
Métrica: Completion rate, time to Lesson 1

// Exp 2: Onboarding - Quantidade de perguntas
Feature: 'onboarding-questions-count'
Variants:
  - short: 3 perguntas
  - medium: 5 perguntas (atual)
  - long: 7 perguntas
Métrica: Completion rate, personalization quality

// Exp 3: Recompensas - Nomenclatura
Feature: 'rewards-naming'
Variants:
  - spiritual: "Luz" + "Corações da Família"
  - generic: "XP" + "Energia"
  - emotional: "Brilho" + "Amor"
Métrica: Engagement, emotional connection score

// Exp 4: Jornada - Estilo visual
Feature: 'journey-map-style'
Variants:
  - path: Caminho linear (Duolingo)
  - tree: Árvore de habilidades
  - map: Mapa 2D exploratório
Métrica: Lesson starts, engagement

// Exp 5: Signup Timing
Feature: 'signup-prompt-timing'
Variants:
  - immediate: Após Lição 0
  - delayed: Após 3 lições
  - never: Somente quando usuário quiser
Métrica: Signup rate, D7 retention
```

---

## 🚀 6. IMPLEMENTAÇÃO FASEADA (REVISADA)

### Semana 1: Onboarding + Lição 0

**Dias 1-2:**
- [ ] Tela de boas-vindas (WelcomeScreen)
- [ ] Quiz de personalização (PersonalizationQuiz)
- [ ] Lógica de recomendação de curso inicial

**Dias 3-4:**
- [ ] Sistema de Lições (LessonStructure, LessonPlayer)
- [ ] Step renderers (Audio, Reflection, Feedback)
- [ ] Lição 0 completa com conteúdo

**Dia 5:**
- [ ] Celebração após lição (LessonCelebration)
- [ ] Prompt de signup (SignupPrompt)
- [ ] Migração de progresso anônimo
- [ ] Analytics tracking
- [ ] Deploy staging

### Semana 2: Dashboard + Currículo

**Dias 1-2:**
- [ ] Estrutura de Units e Lessons (JSON/DB)
- [ ] Mapa de jornada (JourneyMap)
- [ ] Lógica de unlock progressivo

**Dias 3-4:**
- [ ] Criar 4 unidades completas com 3-4 lições cada
- [ ] Integração com sistema de Energia existente
- [ ] Integração com sistema de Streaks existente
- [ ] Integração com sistema de Missões existente

**Dia 5:**
- [ ] Sistema de achievements/badges
- [ ] Testing E2E
- [ ] Deploy staging

### Semana 3: Polish + Experimentos

**Dias 1-2:**
- [ ] Animações e micro-interações
- [ ] Notificações de streak reminder
- [ ] Social features (opcional)

**Dias 3-4:**
- [ ] Configurar experimentos no GrowthBook
- [ ] Backend: APIs e Edge Functions
- [ ] Migrar de localStorage para Supabase

**Dia 5:**
- [ ] Final testing
- [ ] Deploy produção
- [ ] Monitoramento
- [ ] Sprint Review

---

## 🔄 7. INTEGRAÇÃO COM SISTEMAS EXISTENTES

### Como se integra com Sprint 3 v1.0

```typescript
// Energia: Já existe, adaptar
- Lições gastam 1 coração
- Completar lição dá +1 coração bônus
- NUNCA bloqueia (filosofia mantida)

// Streaks: Já existe, adaptar
- Completar qualquer lição conta para streak
- Proteções mantidas (Freeze, Weekend Pass)
- Celebrações de milestones

// Missões: Já existe, adaptar
- Missões diárias podem ser "Complete 1 lição de X unidade"
- Auto-tracking funciona com sistema de lições
- Missões colaborativas podem ser "Casal complete 2 lições juntos"

// Continue de onde parou: Integrar
- Mostrar última lição em progresso
- "Continue Lição 3 de Comunicação"

// Novo: Onboarding
- Primeira experiência gamificada
- Lição 0 como porta de entrada
- Personalização por jornada

// Novo: Currículo/Jornada
- Mapa visual de progresso
- Unlock progressivo
- Senso de conquista
```

### Fluxo Completo Integrado

```
NOVO USUÁRIO
    ↓
Onboarding (Etapas 1-6)
├── Boas-vindas
├── Personalização
├── Lição 0 (VALOR IMEDIATO)
├── Celebração + Recompensas
├── Signup opcional
└── Dashboard
    ↓
DASHBOARD (Mapa de Jornada)
├── Energia: ❤️❤️❤️❤️❤️ (5/5)
├── Streak: 🔥 1 dia
├── Luz (XP): 💡 10
├── Missões diárias: 🎯 0/3
└── Trilha atual: Comunicação
    ↓
USUÁRIO ESCOLHE PRÓXIMA LIÇÃO
    ↓
LessonPlayer
├── Gasta 1 coração (Energia)
├── Completa 3-5 steps
├── Ganha Luz + Corações
├── Atualiza Streak
└── Progride em Missões
    ↓
CELEBRAÇÃO
    ↓
Loop de retorno diário
```

---

## 📱 8. MOBILE vs DESKTOP

### Adaptações por Plataforma

**Mobile (prioridade):**
- Lições otimizadas para uma mão
- Swipe gestures para navegar steps
- Bottom sheet para celebrações
- Push notifications para streaks

**Desktop:**
- Sidebar com mapa de jornada sempre visível
- Área maior para conteúdo de lição
- Keyboard shortcuts
- Modal para celebrações

---

## 🎯 9. MÉTRICAS DE SUCESSO (REVISADAS)

### Onboarding

| Métrica | Baseline | Meta | Como medir |
|---------|----------|------|------------|
| **Onboarding completion** | 0% | 80% | % que completa Lição 0 |
| **Signup rate** | - | 40% | % que cria conta após Lição 0 |
| **Time to First Value** | - | <3 min | Tempo até completar Lição 0 |
| **Lição 0 → Lição 1** | - | 60% | Conversion rate |

### Engagement (mantém metas Sprint 3 v1.0)

| Métrica | Baseline | Meta | Melhoria |
|---------|----------|------|----------|
| **D7 Retention** | 38% | 50% | +12% |
| **D30 Retention** | 28% | 38% | +10% |
| **Sessions/Week** | 2.5 | 4.0 | +60% |
| **Lesson completion rate** | - | 70% | - |
| **Streak >7 dias** | 0% | 40% | - |

### Emotional Connection (NOVO)

| Métrica | Baseline | Meta | Como medir |
|---------|----------|------|------------|
| **NPS** | - | 50+ | Survey após 7 dias |
| **"Senti impacto na família"** | - | 70% | Survey semanal |
| **Compartilhamento social** | - | 20% | Shares de conquistas |

---

## 🎨 10. DESIGN VISUAL (Duolingo-inspired)

### Paleta Adaptada

```css
/* Cores principais (mantém RAIO) */
--raio-yellow: #FFD93D;     /* Amarelo principal */
--raio-black: #1A1A1A;       /* Preto */
--off-white: #FAF9F6;        /* Off-white */

/* Cores de gamificação (inspirado Duolingo) */
--luz-gold: #FFA500;         /* Luz/XP - dourado */
--coracao-red: #FF4D4D;      /* Corações - vermelho vibrante */
--streak-orange: #FF6B35;    /* Streak - laranja fogo */
--success-green: #58CC02;    /* Success - verde Duolingo */
--unlock-purple: #CE82FF;    /* Desbloqueio - roxo */

/* Estados */
--completed: #58CC02;
--next: #FFD93D;
--locked: #AFAFAF;
```

### Componentes Visuais

```typescript
// Botão de ação primário (estilo Duolingo)
<Button className="
  bg-gradient-to-b from-[#58CC02] to-[#46A302]
  shadow-[0_4px_0_#46A302]
  active:shadow-[0_2px_0_#46A302]
  active:translate-y-[2px]
  text-white font-bold
  rounded-2xl
  px-8 py-4
">
  Continuar
</Button>

// Progress bar
<div className="h-3 bg-gray-200 rounded-full overflow-hidden">
  <motion.div 
    className="h-full bg-gradient-to-r from-green-400 to-green-500"
    initial={{ width: 0 }}
    animate={{ width: `${progress}%` }}
  />
</div>

// Lesson node (no mapa)
<motion.div 
  whileHover={{ scale: 1.05 }}
  className={`
    relative w-16 h-16 rounded-full
    flex items-center justify-center
    text-2xl
    ${isCompleted ? 'bg-green-500' : ''}
    ${isNext ? 'bg-yellow-400 animate-pulse' : ''}
    ${isLocked ? 'bg-gray-300' : ''}
  `}
>
  {icon}
</motion.div>
```

---

## ✅ CHECKLIST DE ENTREGA

### Funcional
- [ ] Onboarding completo (6 etapas)
- [ ] Lição 0 funcional com valor imediato
- [ ] Personalização por jornada familiar
- [ ] Mapa de jornada com unlock progressivo
- [ ] 4 unidades com 12-16 lições total
- [ ] Sistema de Luz (XP) + Corações
- [ ] Integração com Energia, Streaks, Missões
- [ ] Signup com migração de progresso anônimo
- [ ] Celebrações visuais
- [ ] Analytics completo

### Técnico
- [ ] Tabelas Supabase criadas
- [ ] Edge Functions implementadas
- [ ] Migração localStorage → Supabase
- [ ] Mixpanel tracking
- [ ] GrowthBook experimentos
- [ ] Mobile responsivo
- [ ] Performance OK

### Conteúdo
- [ ] Lição 0 produzida (áudio + texto)
- [ ] 12-16 lições escritas
- [ ] Badges desenhados
- [ ] Animações criadas

---

## 🎯 DIFERENCIAL vs SPRINT 3 v1.0

| Aspecto | Sprint 3 v1.0 | Sprint 3 v2.0 (Duolingo) |
|---------|---------------|---------------------------|
| **Onboarding** | Genérico | Personalizado + Lição 0 |
| **Primeira experiência** | Exploração livre | Valor imediato (<3 min) |
| **Progressão** | Missões diárias | Mapa de jornada visual |
| **Conteúdo** | Trilha única | 4 unidades progressivas |
| **Gamificação** | XP genérico | Luz + Corações contextuais |
| **Tom** | Funcional | Emocional e acolhedor |
| **Inspiração** | Original | Duolingo + contexto familiar |

---

## 🚀 PRÓXIMA AÇÃO

**Agora:**
1. Revisar este documento com time
2. Validar estrutura de lições
3. Aprovar experimentos GrowthBook
4. Começar Semana 1 (Onboarding)

**Esta semana:**
- Produzir conteúdo da Lição 0
- Implementar onboarding flow
- Setup tabelas Supabase

**Próximas 3 semanas:**
- Implementação completa faseada
- Deploy incremental
- Monitoramento de métricas

---

**Versão:** 2.0 (Revisão Duolingo)  
**Status:** 📋 Pronto para validação  
**Próximo:** Aprovação → Implementação

**Vamos transformar famílias com gamificação emocional! 💛⚡**
