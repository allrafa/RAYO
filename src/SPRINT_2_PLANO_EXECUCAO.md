# 🚀 SPRINT 2 - PLANO DE EXECUÇÃO COMPLETO
## Onboarding, Primeira Experiência e Experimentos

> **Objetivo:** "Primeiro Valor em <5 min" e habilitar ABs essenciais  
> **Status:** 📋 Planejamento Completo  
> **Data:** Outubro 2025

---

## 📊 VISÃO GERAL

### Critérios de Aceitação
- ✅ **TTFV p95 < 5 min** (Time to First Value - 95º percentil abaixo de 5 minutos)
- ✅ **≥1 experimento em produção** (A/B test ativo)
- ✅ **Taxa de conclusão do 1º módulo acima do baseline**

### Touchpoints Estratégicos
- **Gotthilf:** Desenho do funil e backlog de experimentos de alto impacto
- **Chen:** Requisitos do módulo de convites (pré-referral) e "atomic actions" sociais

---

## 🎯 ENTREGAS POR PILAR

### 1️⃣ TECNOLOGIA & PRODUTO

#### 1.1 Onboarding Dinâmico com Segmentos Múltiplos ✨
**Status atual:** Onboarding básico implementado (3 steps)  
**O que melhorar:**

##### Arquivo: `/components/OnboardingV2.tsx` (NOVO)
```typescript
Funcionalidades:
✅ Step 1: Nome (existente)
✅ Step 2: Contexto - PERMITIR MÚLTIPLOS SEGMENTOS
   - Solteiro pode também ser "preparando para namoro"
   - Casados podem também ser "pais"
   - Validação: mínimo 1, máximo 3 segmentos
   
🆕 Step 3: Objetivos (NOVO) - "O que você quer melhorar?"
   - Lista de goals específicos por segmento
   - Ex: Para casados: "Comunicação", "Intimidade", "Finanças", "Conflitos"
   - Mínimo 2, máximo 5 objetivos
   
✅ Step 4: Interesses (existente, mas melhorar)
   
🆕 Step 5: Recomendações Imediatas (NOVO)
   - Mostrar 3-5 recomendações personalizadas
   - "Seu próximo passo" - primeira ação clara
   - CTA direto para iniciar primeiro conteúdo
   - Mostrar estimativa de tempo (ex: "5 min")
```

##### Melhorias UX:
- Progress bar mais visível
- Animações suaves entre steps
- Skip opcional no Step 4 (interesses) se já tem 2+ objetivos
- **CRÍTICO:** Timer interno para tracking de TTFV

##### Analytics:
```typescript
- trackOnboardingStarted()
- trackOnboardingStepCompleted(step, stepName, timeSpent)
- trackOnboardingCompleted(totalTime, segments, goals, interests)
- trackFirstRecommendationClicked(contentId, contentType)
```

---

#### 1.2 Motor de Recomendações v1 🎯

##### Arquivo: `/lib/recommendations/RecommendationEngine.ts` (NOVO)

**Arquitetura:**
```typescript
interface RecommendationContext {
  segments: string[];      // ["casados", "pais"]
  interests: string[];     // ["comunicacao", "financas"]
  goals: string[];         // ["melhorar_intimidade", "resolver_conflitos"]
  completedContent: string[]; // IDs de conteúdo já consumido
  enrolledCourses: number[];
  recentActivity: Activity[];
  level: number;
  streak: number;
}

interface Recommendation {
  id: string;
  type: 'course' | 'video' | 'book' | 'post' | 'ai-chat';
  title: string;
  reason: string; // "Porque você está interessado em Comunicação"
  confidence: number; // 0-100
  estimatedTime: string; // "5 min", "30 min", "2h"
  priority: number; // 1-5
  category: string;
}
```

**Regras de Recomendação (MVP):**
1. **Prioridade 1 - Baseado em Goals**
   - Se goal = "melhorar_comunicacao" → recomendar cursos de Comunicação
   - Boost de +30 pontos de confiança
   
2. **Prioridade 2 - Baseado em Segmentos**
   - Casais → conteúdo de relacionamento
   - Pais → conteúdo de parentalidade
   - Boost de +20 pontos

3. **Prioridade 3 - Baseado em Interesses**
   - Match direto entre interesses e categorias de conteúdo
   - Boost de +15 pontos

4. **Prioridade 4 - Popular no segmento**
   - Conteúdo com mais engajamento entre usuários similares
   - Boost de +10 pontos

5. **Filtros:**
   - Remover conteúdo já completado
   - Remover conteúdo já em andamento
   - Premium só se isPremium = true

**Funções principais:**
```typescript
export class RecommendationEngine {
  // Recomendações para onboarding (primeira experiência)
  getOnboardingRecommendations(context): Recommendation[]
  
  // Recomendações para home feed
  getHomeFeedRecommendations(context, limit): Recommendation[]
  
  // "Continue de onde parou"
  getContinueWatching(context): Recommendation[]
  
  // "Próximo passo sugerido"
  getNextStepRecommendation(context): Recommendation
  
  // Trilha personalizada
  getPersonalizedPath(context): Recommendation[]
}
```

##### Integração:
- `/components/SmartRecommendations.tsx` - componente visual
- `/components/HomePage.tsx` - adicionar seção de recomendações
- `/components/OnboardingV2.tsx` - step 5 usa getOnboardingRecommendations()

---

#### 1.3 Sistema de Experimentos A/B 🧪

##### Arquivo: `/lib/experiments/GrowthBookContext.tsx` (NOVO)

**Setup GrowthBook:**
```bash
npm install @growthbook/growthbook-react
```

**Configuração:**
```typescript
import { GrowthBook, GrowthBookProvider } from '@growthbook/growthbook-react';

const growthbook = new GrowthBook({
  apiHost: "https://cdn.growthbook.io",
  clientKey: import.meta.env.VITE_GROWTHBOOK_CLIENT_KEY,
  enableDevMode: !IS_PRODUCTION,
  trackingCallback: (experiment, result) => {
    analytics.track('EXPERIMENT_VIEWED', {
      experiment_id: experiment.key,
      variation_id: result.variationId,
      variation_name: result.value
    });
  }
});
```

**Experimentos Planejados:**

##### Experimento 1: Paywall Timing (Leve vs Pesado)
```typescript
Feature: "paywall-trigger-timing"
Variantes:
  - control: Paywall após 3 conteúdos premium
  - light: Paywall após 5 conteúdos premium
  - heavy: Paywall após 1 conteúdo premium
  
Métrica primária: Taxa de conversão Premium
Métrica secundária: Engagement total
```

##### Experimento 2: CTA no Onboarding
```typescript
Feature: "onboarding-cta-copy"
Variantes:
  - control: "Começar agora"
  - action: "Iniciar minha transformação"
  - benefit: "Ver meu plano personalizado"
  
Métrica primária: Taxa de conclusão do onboarding
```

##### Experimento 3: Sequência de Onboarding
```typescript
Feature: "onboarding-sequence"
Variantes:
  - control: 5 steps (nome → segmento → goals → interesses → recomendações)
  - short: 3 steps (nome → segmento → recomendações diretas)
  - progressive: 2 steps iniciais → resto progressivo durante uso
  
Métrica primária: TTFV (Time to First Value)
Métrica secundária: Taxa de conclusão
```

##### Arquivo: `/components/experiments/PaywallVariants.tsx`
```typescript
import { useFeatureValue } from '@growthbook/growthbook-react';

export function PaywallVariants() {
  const timing = useFeatureValue('paywall-trigger-timing', 'control');
  
  // Lógica de quando mostrar paywall
  const shouldShowPaywall = useMemo(() => {
    if (timing === 'light') return premiumContentViewed >= 5;
    if (timing === 'heavy') return premiumContentViewed >= 1;
    return premiumContentViewed >= 3; // control
  }, [timing, premiumContentViewed]);
  
  return shouldShowPaywall ? <PaywallModal /> : null;
}
```

##### Arquivo: `/hooks/useExperiments.ts`
```typescript
export function useExperiments() {
  const { useFeature, useFeatureValue } = useGrowthBook();
  
  return {
    getOnboardingVariant: () => useFeatureValue('onboarding-sequence', 'control'),
    getCTACopy: () => useFeatureValue('onboarding-cta-copy', 'control'),
    getPaywallTiming: () => useFeatureValue('paywall-trigger-timing', 'control'),
  };
}
```

---

### 2️⃣ GROWTH & MARKETING

#### 2.1 SEO Técnico da Landing Page 🔍

##### Arquivo: `/components/LandingPageSEO.tsx` (melhorar existente)

**Melhorias necessárias:**
```typescript
// Meta tags completos
<Helmet>
  {/* Basic SEO */}
  <title>RAIO - Fortaleça sua Família | Academia + Comunidade</title>
  <meta name="description" content="Plataforma completa para fortalecer relacionamentos através de cursos, conteúdo transformador e comunidade engajada. Comece grátis hoje." />
  
  {/* Open Graph / Facebook */}
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://raio.app/" />
  <meta property="og:title" content="RAIO - Transforme seu Relacionamento" />
  <meta property="og:description" content="Cursos, vídeos e comunidade para casais e famílias. +10.000 membros ativos." />
  <meta property="og:image" content="https://raio.app/og-image.png" />
  
  {/* Twitter */}
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://raio.app/" />
  <meta property="twitter:title" content="RAIO - Transforme seu Relacionamento" />
  <meta property="twitter:description" content="Cursos, vídeos e comunidade para casais e famílias." />
  <meta property="twitter:image" content="https://raio.app/twitter-image.png" />
  
  {/* Structured Data - Organization */}
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "RAIO",
      "url": "https://raio.app",
      "logo": "https://raio.app/logo.png",
      "sameAs": [
        "https://facebook.com/raio",
        "https://instagram.com/raio",
        "https://youtube.com/raio"
      ]
    })}
  </script>
  
  {/* Structured Data - WebSite */}
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "RAIO",
      "url": "https://raio.app",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://raio.app/busca?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    })}
  </script>
</Helmet>
```

**robots.txt:**
```
User-agent: *
Allow: /
Sitemap: https://raio.app/sitemap.xml
```

**sitemap.xml gerado automaticamente**

---

#### 2.2 Sistema de UTMs 📊

##### Arquivo: `/lib/tracking/UTMTracking.ts` (NOVO)

**Captura automática de UTMs:**
```typescript
interface UTMParams {
  utm_source?: string;    // facebook, instagram, google
  utm_medium?: string;    // cpc, organic, email
  utm_campaign?: string;  // lancamento_2024, black_friday
  utm_term?: string;      // palavra-chave
  utm_content?: string;   // variante do anúncio
}

export class UTMTracker {
  static captureUTMs(): UTMParams {
    const params = new URLSearchParams(window.location.search);
    const utms: UTMParams = {};
    
    ['source', 'medium', 'campaign', 'term', 'content'].forEach(key => {
      const value = params.get(`utm_${key}`);
      if (value) utms[`utm_${key}`] = value;
    });
    
    // Salvar em localStorage para atribuição persistente
    if (Object.keys(utms).length > 0) {
      localStorage.setItem('raio_utm_params', JSON.stringify(utms));
      localStorage.setItem('raio_utm_timestamp', Date.now().toString());
    }
    
    return utms;
  }
  
  static getAttributionUTMs(): UTMParams {
    const saved = localStorage.getItem('raio_utm_params');
    return saved ? JSON.parse(saved) : {};
  }
  
  static trackWithUTMs(eventName: string, properties: any = {}) {
    const utms = this.getAttributionUTMs();
    analytics.track(eventName, {
      ...properties,
      ...utms
    });
  }
}
```

**Integração no App.tsx:**
```typescript
useEffect(() => {
  const utms = UTMTracker.captureUTMs();
  if (Object.keys(utms).length > 0) {
    analytics.track('LANDING_PAGE_VISITED', utms);
  }
}, []);
```

---

#### 2.3 Opt-in Email/WhatsApp 📧

##### Arquivo: `/components/OptInModals.tsx` (NOVO)

**Estratégia de captura:**
1. **Timing:** Após mostrar valor (depois do 1º conteúdo consumido)
2. **Incentivo:** "Receba 1 dica diária por WhatsApp"
3. **Privacidade:** LGPD compliant, opt-out fácil

**Modal de Email:**
```typescript
export function EmailOptInModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  
  const handleSubmit = async () => {
    // Validar email
    if (!isValidEmail(email)) {
      toast.error('Email inválido');
      return;
    }
    
    // Salvar no backend/Supabase
    await saveEmailOptIn(email, {
      source: 'app_modal',
      consented_at: new Date(),
      segments: userData.segments
    });
    
    // Analytics
    analytics.track('EMAIL_OPTIN_COMPLETED', {
      source: 'first_value_modal'
    });
    
    toast.success('Email cadastrado! Você receberá dicas exclusivas.');
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Receba dicas personalizadas 💡</DialogTitle>
        <DialogDescription>
          Enviaremos 1 email por semana com conteúdo exclusivo baseado nos seus interesses.
        </DialogDescription>
        
        <Input 
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <div className="text-xs text-gray-500">
          Seus dados estão protegidos. Cancele quando quiser.
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Agora não</Button>
          <Button onClick={handleSubmit}>Cadastrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Modal de WhatsApp:**
```typescript
export function WhatsAppOptInModal({ isOpen, onClose }) {
  const [phone, setPhone] = useState('');
  
  const handleSubmit = async () => {
    // Validar telefone BR
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      toast.error('Telefone inválido');
      return;
    }
    
    // Salvar
    await saveWhatsAppOptIn(cleanPhone, {
      source: 'app_modal',
      consented_at: new Date()
    });
    
    analytics.track('WHATSAPP_OPTIN_COMPLETED', {
      source: 'welcome_flow'
    });
    
    toast.success('WhatsApp cadastrado! Você receberá uma mensagem de confirmação.');
    onClose();
  };
  
  return (
    // Similar ao EmailOptInModal
  );
}
```

**Trigger lógico:**
```typescript
// No HomePage ou após primeiro conteúdo
useEffect(() => {
  const hasSeenOptIn = localStorage.getItem('raio_email_optin_shown');
  const hasEmailOptedIn = localStorage.getItem('raio_email_optin');
  
  if (!hasSeenOptIn && !hasEmailOptedIn && userData.completedFirstContent) {
    setTimeout(() => {
      setShowEmailOptIn(true);
      localStorage.setItem('raio_email_optin_shown', 'true');
    }, 5000); // 5 segundos após completar primeiro conteúdo
  }
}, [userData.completedFirstContent]);
```

---

### 3️⃣ COMUNIDADE

#### 3.1 Boas-vindas Automatizadas 👋

##### Arquivo: `/components/WelcomeFlow.tsx` (NOVO)

**Sistema de mensagens progressivas:**
```typescript
interface WelcomeMessage {
  id: string;
  title: string;
  message: string;
  cta?: {
    label: string;
    action: () => void;
  };
  triggerCondition: (userData: UserData) => boolean;
  priority: number;
  canDismiss: boolean;
}

const WELCOME_MESSAGES: WelcomeMessage[] = [
  {
    id: 'welcome-1',
    title: 'Bem-vindo ao RAIO! 🌟',
    message: 'Sua jornada de transformação começa agora. Recomendamos começar pelo curso "Fundamentos do Relacionamento".',
    cta: {
      label: 'Ver curso',
      action: () => navigate('/academia/curso/1')
    },
    triggerCondition: (user) => user.level === 1 && user.enrolledCourses.length === 0,
    priority: 1,
    canDismiss: false
  },
  {
    id: 'welcome-2',
    title: 'Explore a Comunidade 💬',
    message: 'Conheça pessoas que estão na mesma jornada que você. Compartilhe experiências e tire dúvidas!',
    cta: {
      label: 'Ver comunidade',
      action: () => navigate('/comunidade')
    },
    triggerCondition: (user) => user.level === 1 && !user.hasVisitedCommunity,
    priority: 2,
    canDismiss: true
  },
  {
    id: 'welcome-3',
    title: 'Seu Conselheiro IA 🤖',
    message: 'Tem dúvidas? Nosso Conselheiro IA está disponível 24/7 para te ajudar com conselhos personalizados.',
    cta: {
      label: 'Conversar agora',
      action: () => navigate('/conselheiro')
    },
    triggerCondition: (user) => !user.hasUsedAI,
    priority: 3,
    canDismiss: true
  }
];

export function WelcomeFlow() {
  const { userData } = useApp();
  const [currentMessage, setCurrentMessage] = useState<WelcomeMessage | null>(null);
  
  useEffect(() => {
    // Encontrar próxima mensagem não vista
    const nextMessage = WELCOME_MESSAGES
      .filter(msg => msg.triggerCondition(userData))
      .sort((a, b) => a.priority - b.priority)
      [0];
    
    if (nextMessage) {
      const hasSeenIt = localStorage.getItem(`welcome_msg_${nextMessage.id}`);
      if (!hasSeenIt) {
        setCurrentMessage(nextMessage);
      }
    }
  }, [userData]);
  
  const handleDismiss = () => {
    if (currentMessage) {
      localStorage.setItem(`welcome_msg_${currentMessage.id}`, 'true');
      analytics.track('WELCOME_MESSAGE_DISMISSED', {
        message_id: currentMessage.id
      });
    }
    setCurrentMessage(null);
  };
  
  const handleAction = () => {
    if (currentMessage?.cta) {
      analytics.track('WELCOME_MESSAGE_ACTION_CLICKED', {
        message_id: currentMessage.id
      });
      currentMessage.cta.action();
      handleDismiss();
    }
  };
  
  if (!currentMessage) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
    >
      <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">{currentMessage.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">{currentMessage.message}</p>
          <div className="flex gap-2">
            {currentMessage.canDismiss && (
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                Depois
              </Button>
            )}
            {currentMessage.cta && (
              <Button size="sm" onClick={handleAction}>
                {currentMessage.cta.label}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

---

#### 3.2 Checklist "Primeiros 7 Dias" ✅

##### Arquivo: `/components/FirstWeekChecklist.tsx` (NOVO)

**Gamificação do onboarding:**
```typescript
interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: string;
  completed: boolean;
  action: () => void;
  day: number; // Dia sugerido (1-7)
}

const FIRST_WEEK_CHECKLIST: ChecklistItem[] = [
  // Dia 1
  {
    id: 'complete-profile',
    title: 'Complete seu perfil',
    description: 'Adicione uma foto e biografia',
    xpReward: 50,
    icon: '👤',
    day: 1,
    action: () => navigate('/perfil')
  },
  {
    id: 'first-course',
    title: 'Inicie seu primeiro curso',
    description: 'Comece a aprender hoje mesmo',
    xpReward: 100,
    icon: '📚',
    day: 1,
    action: () => navigate('/academia')
  },
  
  // Dia 2
  {
    id: 'first-video',
    title: 'Assista a um vídeo',
    description: 'Explore nosso conteúdo em vídeo',
    xpReward: 50,
    icon: '🎥',
    day: 2,
    action: () => navigate('/home')
  },
  
  // Dia 3
  {
    id: 'community-post',
    title: 'Faça seu primeiro post',
    description: 'Compartilhe sua história com a comunidade',
    xpReward: 100,
    icon: '✍️',
    day: 3,
    action: () => navigate('/comunidade')
  },
  
  // Dia 4
  {
    id: 'ai-chat',
    title: 'Converse com o Conselheiro IA',
    description: 'Tire suas dúvidas com nosso assistente',
    xpReward: 75,
    icon: '🤖',
    day: 4,
    action: () => navigate('/conselheiro')
  },
  
  // Dia 5
  {
    id: 'first-comment',
    title: 'Comente em um post',
    description: 'Interaja com outros membros',
    xpReward: 50,
    icon: '💬',
    day: 5,
    action: () => navigate('/comunidade')
  },
  
  // Dia 6
  {
    id: 'complete-lesson',
    title: 'Complete uma aula',
    description: 'Finalize sua primeira lição',
    xpReward: 150,
    icon: '🏆',
    day: 6,
    action: () => navigate('/academia')
  },
  
  // Dia 7
  {
    id: 'invite-friend',
    title: 'Convide um amigo',
    description: 'Compartilhe RAIO com alguém especial',
    xpReward: 200,
    icon: '🎁',
    day: 7,
    action: () => setShowInviteModal(true)
  }
];

export function FirstWeekChecklist() {
  const { userData, updateUserData } = useApp();
  const [checklist, setChecklist] = useState(FIRST_WEEK_CHECKLIST);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Calcular progresso
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = (completedCount / totalCount) * 100;
  
  // Items sugeridos para hoje
  const daysSinceSignup = Math.floor(
    (Date.now() - new Date(userData.signupDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const suggestedToday = checklist.filter(
    item => !item.completed && item.day <= daysSinceSignup + 1
  );
  
  if (daysSinceSignup > 7 || completedCount === totalCount) {
    return null; // Não mostrar após 7 dias ou se completou tudo
  }
  
  return (
    <Card className="mb-4">
      <CardHeader 
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Primeiros 7 Dias 🎯</CardTitle>
            <CardDescription>
              {completedCount}/{totalCount} tarefas completadas
            </CardDescription>
          </div>
          <Badge variant={completedCount === totalCount ? "success" : "secondary"}>
            {Math.round(progressPercent)}%
          </Badge>
        </div>
        <Progress value={progressPercent} className="mt-2" />
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-2">
            {suggestedToday.slice(0, 3).map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={item.action}
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
                <Badge variant="outline">+{item.xpReward} XP</Badge>
              </motion.div>
            ))}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-3"
            onClick={() => navigate('/perfil/checklist')}
          >
            Ver todas as tarefas
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
```

---

### 4️⃣ CONTEÚDO & PARCERIAS

#### 4.1 Trilhas por Segmento 🛤️

##### Arquivo: `/lib/content/TrilhasPorSegmento.ts` (NOVO)

**Definição de Trilhas:**
```typescript
interface TrilhaItem {
  id: string;
  type: 'course' | 'video' | 'book' | 'post' | 'ai-prompt';
  order: number;
  required: boolean;
  estimatedTime: string;
}

interface Trilha {
  id: string;
  name: string;
  description: string;
  segment: string;
  totalTime: string;
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  items: TrilhaItem[];
}

export const TRILHAS_POR_SEGMENTO: Trilha[] = [
  // SOLTEIRO
  {
    id: 'trilha-solteiro-1',
    name: 'Preparação para o Relacionamento',
    description: 'Desenvolva as bases para um relacionamento saudável',
    segment: 'solteiro',
    totalTime: '3h 30min',
    difficulty: 'iniciante',
    items: [
      {
        id: 'course-1',
        type: 'course',
        order: 1,
        required: true,
        estimatedTime: '45min'
      },
      {
        id: 'video-101',
        type: 'video',
        order: 2,
        required: false,
        estimatedTime: '15min'
      },
      {
        id: 'ai-prompt-autoconhecimento',
        type: 'ai-prompt',
        order: 3,
        required: true,
        estimatedTime: '20min'
      },
      {
        id: 'book-1',
        type: 'book',
        order: 4,
        required: false,
        estimatedTime: '2h'
      }
    ]
  },
  
  // NAMORO
  {
    id: 'trilha-namoro-1',
    name: 'Fortalecendo o Relacionamento',
    description: 'Construa uma base sólida para o futuro',
    segment: 'namoro',
    totalTime: '4h',
    difficulty: 'iniciante',
    items: [
      {
        id: 'course-1',
        type: 'course',
        order: 1,
        required: true,
        estimatedTime: '1h'
      },
      {
        id: 'course-2',
        type: 'course',
        order: 2,
        required: true,
        estimatedTime: '1h 30min'
      },
      // ... mais items
    ]
  },
  
  // NOIVOS
  {
    id: 'trilha-noivos-1',
    name: 'Preparação para o Casamento',
    description: 'Tudo que você precisa antes do grande dia',
    segment: 'noivos',
    totalTime: '5h',
    difficulty: 'intermediario',
    items: [
      // ... items específicos
    ]
  },
  
  // CASADOS
  {
    id: 'trilha-casados-1',
    name: 'Fortalecendo a União',
    description: 'Ferramentas para um casamento próspero',
    segment: 'casados',
    totalTime: '6h',
    difficulty: 'intermediario',
    items: [
      // ... items específicos
    ]
  },
  
  // PAIS
  {
    id: 'trilha-pais-1',
    name: 'Parentalidade Intencional',
    description: 'Eduque seus filhos com propósito',
    segment: 'pais',
    totalTime: '5h 30min',
    difficulty: 'avancado',
    items: [
      // ... items específicos
    ]
  }
];

export function getTrilhasPorSegmento(segment: string): Trilha[] {
  return TRILHAS_POR_SEGMENTO.filter(trilha => trilha.segment === segment);
}

export function getTrilhaRecomendada(segments: string[]): Trilha | null {
  // Retorna primeira trilha do primeiro segmento
  for (const segment of segments) {
    const trilhas = getTrilhasPorSegmento(segment);
    if (trilhas.length > 0) return trilhas[0];
  }
  return null;
}
```

##### Componente Visual:
```typescript
// /components/TrilhaCard.tsx
export function TrilhaCard({ trilha }: { trilha: Trilha }) {
  const progressPercent = calculateTrilhaProgress(trilha);
  
  return (
    <Card>
      <CardHeader>
        <Badge>{trilha.difficulty}</Badge>
        <CardTitle>{trilha.name}</CardTitle>
        <CardDescription>{trilha.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>⏱️ {trilha.totalTime}</span>
          <span>{trilha.items.length} módulos</span>
        </div>
        <Progress value={progressPercent} />
      </CardContent>
      <CardFooter>
        <Button className="w-full">
          {progressPercent > 0 ? 'Continuar' : 'Iniciar trilha'}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 📈 MÉTRICAS E TRACKING

### Dashboard de Métricas Sprint 2

##### Arquivo: `/components/Sprint2MetricsDashboard.tsx` (NOVO)
```typescript
// Dashboard interno para monitorar KPIs do Sprint 2

interface Sprint2Metrics {
  // TTFV
  ttfv_p50: number;
  ttfv_p95: number;
  ttfv_avg: number;
  
  // Onboarding
  onboarding_start_rate: number;
  onboarding_completion_rate: number;
  onboarding_avg_time: number;
  
  // First Module
  first_module_start_rate: number;
  first_module_completion_rate: number;
  
  // Experimentos
  active_experiments: number;
  experiment_results: ExperimentResult[];
  
  // Opt-ins
  email_optin_rate: number;
  whatsapp_optin_rate: number;
  
  // Engagement
  day_1_return_rate: number;
  day_7_retention_rate: number;
  checklist_completion_rate: number;
}
```

### Eventos Analytics Novos

```typescript
// Onboarding
- ONBOARDING_V2_STARTED
- ONBOARDING_V2_STEP_COMPLETED (step_number, step_name, time_spent)
- ONBOARDING_V2_COMPLETED (total_time, segments, goals, interests)
- FIRST_RECOMMENDATION_VIEWED
- FIRST_RECOMMENDATION_CLICKED

// Experimentos
- EXPERIMENT_VIEWED (experiment_id, variation_id)
- EXPERIMENT_CONVERTED (experiment_id, variation_id)

// Opt-ins
- EMAIL_OPTIN_MODAL_VIEWED
- EMAIL_OPTIN_COMPLETED
- WHATSAPP_OPTIN_MODAL_VIEWED
- WHATSAPP_OPTIN_COMPLETED

// Welcome Flow
- WELCOME_MESSAGE_VIEWED (message_id)
- WELCOME_MESSAGE_ACTION_CLICKED (message_id)
- WELCOME_MESSAGE_DISMISSED (message_id)

// Checklist
- FIRST_WEEK_CHECKLIST_VIEWED
- FIRST_WEEK_CHECKLIST_ITEM_COMPLETED (item_id, day, xp_earned)
- FIRST_WEEK_CHECKLIST_COMPLETED

// Trilhas
- TRILHA_VIEWED (trilha_id, segment)
- TRILHA_STARTED (trilha_id)
- TRILHA_ITEM_COMPLETED (trilha_id, item_id, item_type)
- TRILHA_COMPLETED (trilha_id, total_time)
```

---

## 🗂️ ESTRUTURA DE ARQUIVOS

```
/components
  /experiments
    - GrowthBookProvider.tsx
    - PaywallVariants.tsx
    - OnboardingVariants.tsx
  - OnboardingV2.tsx
  - WelcomeFlow.tsx
  - FirstWeekChecklist.tsx
  - OptInModals.tsx
  - TrilhaCard.tsx
  - Sprint2MetricsDashboard.tsx

/lib
  /recommendations
    - RecommendationEngine.ts
  /experiments
    - GrowthBookContext.tsx
  /tracking
    - UTMTracking.ts
  /content
    - TrilhasPorSegmento.ts

/hooks
  - useRecommendations.ts
  - useExperiments.ts
  - useFirstWeekChecklist.ts
```

---

## ⏱️ CRONOGRAMA DE IMPLEMENTAÇÃO

### Semana 1 (5 dias)
**Foco: Base técnica + Onboarding V2**

- [ ] Dia 1-2: Setup GrowthBook + Primeiro experimento
- [ ] Dia 3-4: OnboardingV2 completo
- [ ] Dia 5: Motor de Recomendações v1

### Semana 2 (5 dias)
**Foco: Growth + Comunidade**

- [ ] Dia 1: SEO técnico LP
- [ ] Dia 2: Sistema de UTMs
- [ ] Dia 3: Opt-in modals (email + WhatsApp)
- [ ] Dia 4: Welcome Flow
- [ ] Dia 5: First Week Checklist

### Semana 3 (3 dias)
**Foco: Conteúdo + Testes**

- [ ] Dia 1: Trilhas por segmento
- [ ] Dia 2: Testes E2E + Ajustes
- [ ] Dia 3: Deploy + Monitoramento

---

## ✅ CHECKLIST DE CONCLUSÃO

### Tecnologia & Produto
- [ ] Onboarding V2 com segmentos múltiplos implementado
- [ ] Motor de recomendações funcionando
- [ ] GrowthBook integrado
- [ ] Mínimo 1 experimento ativo em produção
- [ ] TTFV tracking funcionando

### Growth & Marketing
- [ ] Meta tags SEO completos
- [ ] Structured data implementado
- [ ] Sistema de UTMs capturando
- [ ] Modal de email opt-in funcionando
- [ ] Modal de WhatsApp opt-in funcionando

### Comunidade
- [ ] Sistema de boas-vindas automatizado
- [ ] Checklist primeiros 7 dias gamificado
- [ ] Mensagens progressivas implementadas

### Conteúdo
- [ ] 1 trilha criada para cada segmento (5 trilhas)
- [ ] Trilhas integradas com recomendações

### Métricas & Analytics
- [ ] Todos os eventos novos implementados
- [ ] Dashboard de métricas Sprint 2 criado
- [ ] Baseline de métricas capturado

---

## 🎯 CRITÉRIOS DE SUCESSO

1. **TTFV p95 < 5 min**
   - Medir tempo entre signup e primeira ação de valor
   - Valor = assistir vídeo OU iniciar curso OU chat IA
   
2. **≥1 experimento em produção**
   - Experimento de onboarding OU paywall ativo
   - Mínimo 100 usuários por variação
   
3. **Taxa de conclusão 1º módulo > baseline**
   - Baseline a ser estabelecido na primeira semana
   - Meta: +15% sobre baseline

---

## 📞 PRÓXIMOS PASSOS

1. **Validar este plano** com o time
2. **Criar issues/tickets** no sistema de gestão
3. **Definir responsáveis** por cada entrega
4. **Agendar touchpoints** com Gotthilf e Chen
5. **Setup ambiente de desenvolvimento** (GrowthBook account, etc)
6. **Kick-off Sprint 2** 🚀

---

**Documento criado em:** Outubro 2025  
**Versão:** 1.0  
**Status:** Pronto para execução
