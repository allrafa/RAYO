# 🌩️ RAIO - Documentação Master do Projeto

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura Técnica](#arquitetura-técnica)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [Design System](#design-system)
5. [Funcionalidades Implementadas](#funcionalidades-implementadas)
6. [Componentes Principais](#componentes-principais)
7. [Fluxos de Usuário](#fluxos-de-usuário)
8. [Integrações e Serviços](#integrações-e-serviços)
9. [Estado Atual](#estado-atual)
10. [Convenções de Código](#convenções-de-código)

---

## 🎯 Visão Geral

### Propósito
RAIO é uma plataforma digital para fortalecer famílias através de conteúdo transformador, comunidade engajada e recursos práticos.

### North Star Metric
**WAPM - Weekly Active Premium Members**

### Público-Alvo
Diferentes contextos de vida com experiências personalizadas:
- 👤 Solteiros
- 💑 Namorando
- 💍 Noivos
- 💏 Casados
- 👨‍👩‍👧‍👦 Pais

### Pilares da Plataforma
1. **Academia RAIO** - Cursos pagos estruturados
2. **Comunidade** - Fóruns temáticos e engajamento
3. **Gamificação** - Badges, missões e progresso
4. **Conteúdo** - Lições, artigos e recursos práticos

---

## 🏗️ Arquitetura Técnica

### Stack Principal
- **Framework**: React 18+ com TypeScript
- **Styling**: Tailwind CSS v4.0
- **Roteamento**: React Router v6
- **State Management**: React Context API + Hooks
- **Ícones**: Lucide React
- **Animações**: Motion (anteriormente Framer Motion)
- **Forms**: React Hook Form v7.55.0
- **Storage**: LocalStorage para persistência local

### Backend & Integrações
- **Supabase**: Autenticação, Database, Storage
- **Analytics**: Mixpanel (tracking de eventos)
- **Feature Flags**: GrowthBook (A/B tests e feature toggles)
- **Compliance**: Sistema LGPD completo implementado

### Padrões de Desenvolvimento
- **Design Responsivo**: Mobile-first approach
- **Acessibilidade**: WCAG 2.1 Level AA
- **Performance**: Code splitting, lazy loading
- **SEO**: Meta tags, structured data
- **i18n**: Preparado para internacionalização (pt-BR inicial)

---

## 📁 Estrutura de Pastas

```
/
├── App.tsx                          # Componente raiz com providers
├── index.html                       # HTML base
├── styles/
│   └── globals.css                  # Estilos globais + tokens CSS
│
├── components/                      # Componentes React
│   ├── layout/
│   │   ├── MobileBottomBar.tsx     # Bottom bar 5 tabs (mobile)
│   │   ├── DesktopSidebar.tsx      # Sidebar lateral (desktop)
│   │   └── TopNavbar.tsx           # Top navbar (desktop)
│   │
│   ├── onboarding/
│   │   ├── OnboardingFlow.tsx      # Fluxo completo de onboarding
│   │   ├── WelcomeScreen.tsx       # Tela inicial
│   │   ├── RelationshipStatus.tsx  # Seleção de contexto
│   │   ├── GoalsSelection.tsx      # Escolha de objetivos
│   │   ├── TimeAvailability.tsx    # Disponibilidade de tempo
│   │   └── CreateAccount.tsx       # Criação de conta
│   │
│   ├── gamification/
│   │   ├── ProgressTracker.tsx     # Barra de progresso global
│   │   ├── BadgeDisplay.tsx        # Exibição de badges
│   │   ├── MissionCard.tsx         # Card de missão
│   │   ├── StreakCounter.tsx       # Contador de sequência
│   │   └── LevelIndicator.tsx      # Indicador de nível
│   │
│   ├── academy/
│   │   ├── CourseCard.tsx          # Card de curso
│   │   ├── LessonPlayer.tsx        # Player de lição
│   │   ├── LessonNavigation.tsx    # Navegação entre lições
│   │   └── CourseProgress.tsx      # Progresso do curso
│   │
│   ├── community/
│   │   ├── ForumCard.tsx           # Card de fórum
│   │   ├── TopicList.tsx           # Lista de tópicos
│   │   └── PostCard.tsx            # Card de post
│   │
│   └── common/
│       ├── Button.tsx              # Botão reutilizável
│       ├── Card.tsx                # Card genérico
│       ├── Input.tsx               # Input field
│       ├── Modal.tsx               # Modal dialog
│       └── Toast.tsx               # Notificação toast
│
├── pages/                           # Páginas principais
│   ├── Home.tsx                    # Feed principal
│   ├── Academy.tsx                 # Academia RAIO
│   ├── Community.tsx               # Comunidade
│   ├── Profile.tsx                 # Perfil do usuário
│   └── Settings.tsx                # Configurações
│
├── contexts/                        # React Contexts
│   ├── AuthContext.tsx             # Autenticação
│   ├── UserContext.tsx             # Dados do usuário
│   ├── GamificationContext.tsx     # Sistema de gamificação
│   └── OnboardingContext.tsx       # Estado do onboarding
│
├── hooks/                           # Custom Hooks
│   ├── useAnalytics.ts             # Tracking de eventos
│   ├── useGamification.ts          # Lógica de gamificação
│   ├── useLocalStorage.ts          # Persistência local
│   └── useMediaQuery.ts            # Responsive breakpoints
│
├── utils/                           # Utilitários
│   ├── analytics.ts                # Mixpanel wrapper
│   ├── featureFlags.ts             # GrowthBook wrapper
│   └── constants.ts                # Constantes globais
│
└── docs/                            # Documentação (70+ arquivos .md)
    ├── README.md                   # Índice central de documentação
    ├── sprints/
    │   ├── sprint-1/               # MVP e Fundação
    │   ├── sprint-2/               # Academia e Comunidade
    │   └── sprint-3/               # Gamificação 2.0
    └── content/
        └── licao-0/                # Lição 0 completa
```

---

## 🎨 Design System

### Tipografia
**Fonte Principal**: Urbanist (Google Fonts)
- Peso: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold)
- Escala tipográfica definida em globals.css

### Paleta de Cores

#### Cores Principais
```css
/* Neutrals */
--color-white: #FAFAFA;           /* Off-white */
--color-black: #0A0A0A;           /* Preto profundo */
--color-gray-50: #F5F5F5;
--color-gray-100: #E5E5E5;
--color-gray-200: #D4D4D4;
--color-gray-300: #A3A3A3;
--color-gray-400: #737373;
--color-gray-500: #525252;
--color-gray-600: #404040;
--color-gray-700: #262626;
--color-gray-800: #171717;
--color-gray-900: #0F0F0F;

/* Accent */
--color-yellow: #FFC700;          /* Amarelo RAIO */
--color-yellow-light: #FFD740;
--color-yellow-dark: #FFB300;
```

#### Cores Semânticas
```css
--color-success: #10B981;
--color-error: #EF4444;
--color-warning: #F59E0B;
--color-info: #3B82F6;
```

### Espaçamento
Sistema baseado em múltiplos de 4px:
- `--spacing-1`: 4px
- `--spacing-2`: 8px
- `--spacing-3`: 12px
- `--spacing-4`: 16px
- `--spacing-6`: 24px
- `--spacing-8`: 32px
- `--spacing-12`: 48px

### Princípios de Design
1. **Content-First**: Conteúdo é rei, design serve o conteúdo
2. **Motion Purposeful**: Animações sutis e intencionais
3. **Minimalista**: Clean, focado, sem distrações
4. **Acessível**: WCAG 2.1 AA compliance
5. **Responsivo**: Mobile-first com experiência desktop otimizada

### Layout

#### Mobile (< 768px)
- Bottom Bar com 5 tabs fixos
- Stack vertical de conteúdo
- Gestos touch-friendly
- Espaçamento adequado para thumbs

#### Desktop (≥ 768px)
- Sidebar lateral fixa (240px)
- Top Navbar com ações rápidas
- Grid system para conteúdo
- Hover states e interactions

---

## ✅ Funcionalidades Implementadas

### Sprint 1 - MVP e Fundação ✓

#### 1.1 Onboarding Inteligente
- ✅ 5 telas de onboarding personalizadas
- ✅ Coleta de contexto de relacionamento
- ✅ Seleção de objetivos personalizados
- ✅ Definição de disponibilidade de tempo
- ✅ Criação de conta integrada
- ✅ Persistência de estado (LocalStorage)
- ✅ Sistema de reset com botão debug

#### 1.2 Layout Responsivo
- ✅ Mobile Bottom Bar (5 tabs)
  - Home, Academia, Comunidade, Perfil, Configurações
- ✅ Desktop Sidebar + Top Navbar
- ✅ Transições suaves entre layouts
- ✅ Estados ativos e hover

#### 1.3 Autenticação Base
- ✅ Integração com Supabase Auth
- ✅ Login com email/senha
- ��� Recuperação de senha
- ✅ Gestão de sessão
- ✅ Protected routes

#### 1.4 Analytics e Feature Flags
- ✅ Mixpanel integration
- ✅ Event tracking system
- ✅ GrowthBook feature flags
- ✅ A/B test infrastructure

### Sprint 2 - Academia e Comunidade ✓

#### 2.1 Academia RAIO
- ✅ Estrutura de cursos e módulos
- ✅ Player de lição com UI/UX otimizada
- ✅ Sistema de navegação entre lições
- ✅ Tracking de progresso
- ✅ Marcação de conclusão
- ✅ Notas e bookmarks

#### 2.2 Sistema de Comunidade
- ✅ Fóruns temáticos por contexto
- ✅ Criação e listagem de tópicos
- ✅ Sistema de posts e respostas
- ✅ Upvotes e engajamento
- ✅ Moderação básica
- ✅ Notificações de interações

#### 2.3 Perfil de Usuário
- ✅ Dashboard pessoal
- ✅ Histórico de atividades
- ✅ Cursos em progresso
- ✅ Conquistas e badges
- ✅ Configurações de conta
- ✅ Gestão de privacidade

### Sprint 3 - Gamificação 2.0 ✓

#### 3.1 Sistema de Badges
- ✅ 30+ badges categorizados
  - 🎯 Progresso (Iniciante, Dedicado, Mestre, Lendário)
  - 🔥 Engajamento (Sequências de 7, 30, 100 dias)
  - 📚 Aprendizado (Conclusão de cursos)
  - 👥 Comunidade (Participação ativa)
  - 🌟 Especiais (Eventos e marcos)
- ✅ Sistema de raridade (Comum, Incomum, Raro, Épico, Lendário)
- ✅ Animações de conquista
- ✅ Badge showcase no perfil

#### 3.2 Sistema de Missões
- ✅ Missões diárias (renovam 00:00)
- ✅ Missões semanais (renovam segunda)
- ✅ Missões mensais (renovam dia 1)
- ✅ Missões de marco (one-time)
- ✅ Recompensas de XP variáveis
- ✅ Tracking automático de progresso
- ✅ UI de missões ativas

#### 3.3 Sistema de Níveis e XP
- ✅ Progressão de nível (1-100+)
- ✅ Curva de XP balanceada
- ✅ Ganho de XP por ações:
  - Completar lição: 50 XP
  - Completar curso: 200 XP
  - Post na comunidade: 10 XP
  - Comentário: 5 XP
  - Upvote recebido: 2 XP
  - Completar missão: Variável
  - Login diário: 5 XP
  - Sequência mantida: Bônus
- ✅ Visualização de progresso
- ✅ Celebração de level-up

#### 3.4 Sistema de Sequências (Streaks)
- ✅ Contador de dias consecutivos
- ✅ Streak saver (1 dia de perdão)
- ✅ Notificações de lembrete
- ✅ Badges de milestone de streak
- ✅ Visualização no perfil
- ✅ Freeze cards (power-ups)

#### 3.5 Leaderboards
- ✅ Ranking global
- ✅ Ranking por contexto
- ✅ Ranking de amigos
- ✅ Diferentes períodos (semanal, mensal, all-time)
- ✅ Filtros e categorias
- ✅ Anonimato opcional

### Conteúdo Criado ✓

#### Lição 0 - Quebrando o Senso Comum
- ✅ **Componente React Funcional**
  - Player interativo completo
  - Quiz de reflexão integrado
  - Notas e highlights
  - Progresso trackeable
  - UI/UX otimizada
  
- ✅ **Script de Áudio Profissional**
  - 15 minutos de conteúdo
  - Tom conversacional e acessível
  - Exemplos práticos do dia-a-dia
  - Quebra de 5 mitos de comunicação
  - Call-to-action claro
  
- ✅ **Sistema de Integração**
  - Estrutura de dados completa
  - Metadados e taxonomia
  - Sistema de pré-requisitos
  - Integração com gamificação
  - Analytics tracking

### Compliance e Segurança ✓
- ✅ Sistema LGPD completo
- ✅ Cookie consent
- ✅ Política de privacidade
- ✅ Termos de uso
- ✅ Data retention policies
- ✅ Right to be forgotten

---

## 🧩 Componentes Principais

### OnboardingFlow.tsx
Gerencia o fluxo completo de onboarding com 5 etapas:
```typescript
interface OnboardingState {
  currentStep: number;
  relationshipStatus: RelationshipStatus;
  goals: Goal[];
  timeAvailability: TimeAvailability;
  accountData: AccountData;
  completed: boolean;
}
```

### ProgressTracker.tsx
Barra de progresso global com XP, nível e próxima recompensa:
```typescript
interface ProgressData {
  currentXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  totalXP: number;
  nextReward: Reward;
}
```

### LessonPlayer.tsx
Player completo de lição com áudio, transcrição e interações:
```typescript
interface LessonData {
  id: string;
  title: string;
  duration: number;
  audioUrl: string;
  transcript: string;
  quizzes: Quiz[];
  resources: Resource[];
}
```

### BadgeDisplay.tsx
Exibição de badges com animações e estados:
```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  earnedAt?: Date;
  progress?: number;
  maxProgress?: number;
}
```

### MissionCard.tsx
Card de missão com progresso e recompensa:
```typescript
interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'milestone';
  progress: number;
  goal: number;
  xpReward: number;
  expiresAt?: Date;
  completed: boolean;
}
```

---

## 🔄 Fluxos de Usuário

### 1. First-Time User Experience (FTUX)

```
Landing → Onboarding (5 steps) → Dashboard personalizado
```

**Onboarding Steps:**
1. **Welcome**: Apresentação da plataforma
2. **Relationship Status**: Solteiro/Namoro/Noivos/Casados/Pais
3. **Goals**: Seleção de objetivos personalizados
4. **Time**: Disponibilidade diária/semanal
5. **Account**: Criação de conta e finalização

**Personalização baseada em contexto:**
- Conteúdo recomendado específico
- Missões iniciais adaptadas
- UI/UX customizada
- Fóruns relevantes destacados

### 2. Daily Active User Flow

```
Login → Home Feed → Engajamento (Academia/Comunidade) → Logout
```

**Touchpoints principais:**
- Daily mission checklist
- Streak reminder
- New content notifications
- Community highlights
- Progress milestones

### 3. Learning Journey

```
Academia → Course Selection → Lesson → Quiz → Next Lesson → Course Completion
```

**Gamification integration:**
- XP por lição completada
- Badge ao finalizar curso
- Streak mantida por aprendizado diário
- Mission progress atualizado
- Leaderboard atualizado

### 4. Community Engagement

```
Community → Forum Selection → Browse Topics → Engage → Earn XP
```

**Ações rastreadas:**
- Criar post: 10 XP
- Comentar: 5 XP
- Receber upvote: 2 XP
- Post em destaque: Badge especial
- Participação consistente: Badges de comunidade

---

## 🔌 Integrações e Serviços

### Supabase Setup

**Autenticação:**
```typescript
// Configuração base
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth methods
supabase.auth.signUp({ email, password });
supabase.auth.signInWithPassword({ email, password });
supabase.auth.signOut();
```

**Database Schema:**
```sql
-- Tabelas principais
- users (perfis de usuário)
- courses (cursos da academia)
- lessons (lições individuais)
- user_progress (progresso do usuário)
- badges (definições de badges)
- user_badges (badges conquistadas)
- missions (definições de missões)
- user_missions (progresso de missões)
- forum_posts (posts da comunidade)
- forum_comments (comentários)
- leaderboard (ranking global)
```

### Mixpanel Events

**Eventos rastreados:**
```typescript
// Onboarding
trackEvent('onboarding_started');
trackEvent('onboarding_step_completed', { step: number });
trackEvent('onboarding_completed', { context: string });

// Gamification
trackEvent('xp_earned', { amount: number, source: string });
trackEvent('level_up', { newLevel: number });
trackEvent('badge_earned', { badgeId: string });
trackEvent('mission_completed', { missionId: string });
trackEvent('streak_milestone', { days: number });

// Learning
trackEvent('lesson_started', { lessonId: string });
trackEvent('lesson_completed', { lessonId: string, duration: number });
trackEvent('course_completed', { courseId: string });

// Community
trackEvent('post_created', { forumId: string });
trackEvent('comment_added', { postId: string });
trackEvent('upvote_given', { postId: string });
```

### GrowthBook Features

**Feature flags implementadas:**
```typescript
// Gamification toggles
'gamification-v2-enabled': boolean;
'daily-missions-enabled': boolean;
'leaderboard-enabled': boolean;

// Content experiments
'lesson-0-variant': 'control' | 'variant-a' | 'variant-b';
'onboarding-flow-version': 'v1' | 'v2';

// Premium features
'premium-content-access': boolean;
'advanced-analytics': boolean;
```

---

## 📊 Estado Atual

### ✅ Completo
- [x] Sprints 1, 2 e 3 totalmente implementados
- [x] Documentação completa (70+ arquivos .md)
- [x] README.md central como índice de navegação
- [x] Lição 0 com componente React funcional
- [x] Script de áudio profissional para Lição 0
- [x] Sistema de integração de conteúdo
- [x] Sistema de reset de onboarding (debug button)
- [x] Mixpanel e GrowthBook configurados
- [x] LGPD compliance implementado

### 🚧 Em Progresso
- [ ] Migração completa do código para produção
- [ ] Gravação do áudio da Lição 0
- [ ] Upload de assets para Supabase Storage
- [ ] Configuração de domínio e SSL

### 📋 Próximos Passos
1. **Deploy Infrastructure**
   - Configurar CI/CD pipeline
   - Setup de staging environment
   - Monitoramento e alertas
   
2. **Conteúdo**
   - Gravar áudio da Lição 0
   - Criar Lições 1-5 do primeiro curso
   - Desenvolver plano de conteúdo mensal
   
3. **Polimento**
   - Testes de usabilidade
   - Otimização de performance
   - Ajustes de acessibilidade
   
4. **Launch**
   - Beta fechado com early adopters
   - Coleta de feedback
   - Iteração baseada em dados
   - Launch público

---

## 📝 Convenções de Código

### Nomenclatura

**Componentes React:**
```typescript
// PascalCase para componentes
export function OnboardingFlow() { }
export function BadgeDisplay() { }
```

**Hooks customizados:**
```typescript
// camelCase com prefixo 'use'
export function useAnalytics() { }
export function useGamification() { }
```

**Utilitários:**
```typescript
// camelCase para funções
export function trackEvent() { }
export function formatDate() { }
```

**Constantes:**
```typescript
// UPPER_SNAKE_CASE
export const MAX_LEVEL = 100;
export const XP_PER_LESSON = 50;
```

### Estrutura de Componentes

```typescript
// Imports
import React, { useState, useEffect } from 'react';
import { LayoutIcon } from 'lucide-react';

// Types
interface ComponentProps {
  title: string;
  onAction: () => void;
}

// Component
export function Component({ title, onAction }: ComponentProps) {
  // State
  const [isActive, setIsActive] = useState(false);
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // Handlers
  const handleClick = () => {
    setIsActive(!isActive);
    onAction();
  };
  
  // Render
  return (
    <div className="container">
      <h2>{title}</h2>
      <button onClick={handleClick}>
        <LayoutIcon className="size-5" />
      </button>
    </div>
  );
}
```

### Tailwind Classes

**Ordem preferencial:**
```tsx
className="
  // Layout
  flex items-center justify-between
  // Spacing
  p-4 gap-2
  // Sizing
  w-full h-auto
  // Typography (somente quando necessário)
  // Colors
  bg-white text-black
  // Effects
  rounded-lg shadow-sm
  // States
  hover:bg-gray-50 active:scale-95
  // Responsive
  md:flex-row md:p-6
"
```

### TypeScript Types

```typescript
// Prefer interfaces para objects
interface User {
  id: string;
  name: string;
  email: string;
}

// Use type para unions e primitives
type Status = 'active' | 'inactive' | 'pending';
type ID = string | number;

// Avoid any, use unknown quando necessário
function processData(data: unknown) {
  // Type guard
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
}
```

### Event Tracking

```typescript
// Sempre track eventos importantes
import { trackEvent } from '@/utils/analytics';

function handleAction() {
  trackEvent('action_performed', {
    context: 'component_name',
    timestamp: new Date().toISOString(),
  });
}
```

---

## 🎓 Dados de Exemplo - Lição 0

### Metadata
```json
{
  "id": "licao-0",
  "courseId": "comunicacao-fundamentals",
  "title": "Quebrando o Senso Comum sobre Comunicação",
  "subtitle": "5 mitos que atrapalham seus relacionamentos",
  "duration": 900,
  "xpReward": 50,
  "order": 0,
  "isPreview": true,
  "tags": ["comunicação", "relacionamentos", "mitos", "fundamentos"]
}
```

### Estrutura do Conteúdo
1. **Introdução** (2 min)
   - Hook: "E se tudo que você aprendeu sobre comunicação estivesse errado?"
   - Overview dos 5 mitos
   
2. **Mito 1**: "Comunicação clara resolve tudo" (3 min)
   - Realidade: Contexto emocional importa mais
   
3. **Mito 2**: "Brigar é sinal de relacionamento ruim" (2 min)
   - Realidade: Conflito saudável fortalece
   
4. **Mito 3**: "Seu parceiro deveria saber o que você precisa" (3 min)
   - Realidade: Expectativas não faladas causam frustração
   
5. **Mito 4**: "Mais comunicação é sempre melhor" (2 min)
   - Realidade: Qualidade > Quantidade
   
6. **Mito 5**: "Você precisa concordar para ter harmonia" (2 min)
   - Realidade: Discordar com respeito é essencial
   
7. **Conclusão e Próximos Passos** (1 min)
   - Aplicação prática
   - Teaser da Lição 1

---

## 🚀 Como Usar Esta Documentação

### Para Desenvolvimento
1. Leia a **Arquitetura Técnica** para entender o stack
2. Consulte a **Estrutura de Pastas** para localizar código
3. Use o **Design System** para manter consistência
4. Siga as **Convenções de Código** em todo novo código

### Para Product/Design
1. Revise **Funcionalidades Implementadas** para estado atual
2. Consulte **Fluxos de Usuário** para entender jornadas
3. Use o **Design System** para especificar novos features
4. Verifique **Integrações** para capabilities disponíveis

### Para Data/Analytics
1. Consulte **Mixpanel Events** para eventos disponíveis
2. Revise **GrowthBook Features** para experimentos ativos
3. Use **North Star Metric** para alinhar análises
4. Verifique **Gamification** para métricas de engajamento

---

## 📞 Contexto de Migração

### Objetivo da Migração
Migrar todo o código da plataforma RAIO de um ambiente de desenvolvimento para integração completa, garantindo que toda a estrutura, funcionalidades e integrações sejam preservadas e funcionais.

### Estado de Origem
- **70+ arquivos .md** de documentação completa
- **Sprints 1-3** totalmente implementados e documentados
- **Lição 0** com componente React e script de áudio prontos
- **Sistema de onboarding** com reset funcional
- **Gamificação 2.0** completamente especificada
- **Design system** definido e consistente

### Necessidades da Migração
1. **Preservar toda arquitetura** definida nos sprints
2. **Manter design system** com precisão
3. **Garantir integrações** (Supabase, Mixpanel, GrowthBook)
4. **Implementar todos componentes** conforme especificações
5. **Seguir convenções** estabelecidas
6. **Manter acessibilidade** e responsividade

### Atenção Especial Para
- ✅ Mobile-first approach com bottom bar de 5 tabs
- ✅ Desktop com sidebar lateral + top navbar
- ✅ Tipografia Urbanist (não usar classes de font-size/weight sem necessidade)
- ✅ Paleta off-white/preto/cinza com acentos amarelos
- ✅ Gamificação integrada em todos os fluxos
- ✅ Analytics tracking em eventos críticos
- ✅ LGPD compliance em todo o sistema

---

## 🏁 Checklist Final para Integração

### Setup Inicial
- [ ] Criar projeto React com TypeScript
- [ ] Configurar Tailwind CSS v4.0
- [ ] Setup de globals.css com design tokens
- [ ] Instalar todas as dependências necessárias

### Implementação de Componentes
- [ ] Layout (MobileBottomBar, DesktopSidebar, TopNavbar)
- [ ] Onboarding (5 telas completas)
- [ ] Gamification (badges, missions, progress, streaks)
- [ ] Academia (player de lição, navegação, progresso)
- [ ] Comunidade (fóruns, posts, comentários)
- [ ] Perfil (dashboard, configurações)

### Integrações
- [ ] Supabase Auth setup
- [ ] Supabase Database schema
- [ ] Mixpanel tracking implementation
- [ ] GrowthBook feature flags
- [ ] LGPD compliance components

### Conteúdo
- [ ] Implementar Lição 0 completa
- [ ] Integrar sistema de cursos
- [ ] Setup de fóruns temáticos

### Testes e Validação
- [ ] Testar onboarding flow completo
- [ ] Validar gamificação (XP, badges, missions)
- [ ] Testar responsividade (mobile + desktop)
- [ ] Validar analytics tracking
- [ ] Testar acessibilidade (WCAG 2.1 AA)

### Deploy
- [ ] Configurar ambiente de staging
- [ ] Deploy inicial
- [ ] Testes de integração
- [ ] Setup de CI/CD
- [ ] Monitoramento e alertas

---

**Última atualização**: Sprint 3 completo - Gamificação 2.0 implementada
**Versão**: 1.0.0
**Status**: Pronto para migração e integração completa

---

*Este documento serve como referência master para toda a plataforma RAIO e deve ser mantido atualizado conforme o projeto evolui.*
