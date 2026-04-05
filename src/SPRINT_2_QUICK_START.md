# ⚡ SPRINT 2 - QUICK START GUIDE
## Comece a Implementar HOJE

> **Para desenvolvedores:** Guia prático de por onde começar  
> **Tempo estimado primeira entrega:** 1-2 dias

---

## 🎯 OBJETIVO

Entregar **valor incrementalmente** durante o Sprint 2, começando pelas funcionalidades de maior impacto na métrica TTFV (Time to First Value < 5 min).

---

## 📅 IMPLEMENTAÇÃO FASEADA

### 🔥 FASE 1 - DIA 1-2: FUNDAÇÃO (PRIORIDADE MÁXIMA)

**Objetivo:** Reduzir TTFV imediatamente

#### 1.1 Setup GrowthBook (30 min)

```bash
# Instalar dependência
npm install @growthbook/growthbook-react

# Criar conta em https://app.growthbook.io (free tier)
# Obter CLIENT_KEY

# Adicionar ao .env
VITE_GROWTHBOOK_CLIENT_KEY=sdk-your-key-here
```

Criar arquivo `/lib/experiments/GrowthBookProvider.tsx`:
- Copiar código da SPRINT_2_ARQUITETURA_TECNICA.md seção 2.2
- Importar no App.tsx

**Teste:**
```typescript
// Em qualquer componente
import { useFeatureValue } from '@growthbook/growthbook-react';

const testValue = useFeatureValue('test-feature', 'default');
console.log('GrowthBook working:', testValue);
```

✅ **Critério de sucesso:** Console mostra "GrowthBook working"

---

#### 1.2 Motor de Recomendações v1 (2-3 horas)

**Passo 1:** Criar estrutura base
```bash
mkdir -p lib/recommendations
touch lib/recommendations/RecommendationEngine.ts
touch hooks/useRecommendations.ts
```

**Passo 2:** Implementar versão simplificada

Começar com apenas 3 funções:
1. `getOnboardingRecommendations()` - para onboarding
2. `getContinueWatching()` - para home
3. `getNextStepRecommendation()` - sugestão única

**Código inicial mínimo:**
```typescript
// RecommendationEngine.ts - VERSÃO MVP
export class RecommendationEngine {
  constructor(private context: RecommendationContext) {}
  
  getOnboardingRecommendations(limit = 5): Recommendation[] {
    // REGRA SIMPLES: Primeiro curso + Chat IA + Popular
    return [
      this.getFirstCourse(),
      this.getAIChatRecommendation(),
      ...this.getPopularCourses(3)
    ];
  }
  
  private getFirstCourse(): Recommendation {
    const course = this.allCourses[0]; // Primeiro curso sempre
    return {
      id: `course-${course.id}`,
      type: 'course',
      title: course.title,
      reason: 'Recomendado para começar',
      estimatedTime: '30 min',
      priority: 1,
      // ... rest
    };
  }
  
  // ... implementar resto progressivamente
}
```

**Passo 3:** Testar no console
```typescript
// No HomePage.tsx
const { getOnboardingRecommendations } = useRecommendations();
console.log('Recommendations:', getOnboardingRecommendations());
```

✅ **Critério de sucesso:** Console mostra array de recomendações

---

#### 1.3 OnboardingV2 - Step 5 (Recomendações) (2 horas)

**Arquivo:** `/components/OnboardingV2.tsx`

**Estratégia:** Copiar Onboarding.tsx existente e adicionar Step 5

```typescript
// Adicionar ao final do Onboarding.tsx
case 5:
  return <OnboardingRecommendationsStep 
    userData={userData}
    onComplete={handleCompleteOnboarding}
  />;
```

**Novo componente:** `/components/OnboardingRecommendationsStep.tsx`
```typescript
export function OnboardingRecommendationsStep({ userData, onComplete }) {
  const { getOnboardingRecommendations } = useRecommendations();
  const recommendations = getOnboardingRecommendations(3);
  
  const handleSelectRecommendation = (rec: Recommendation) => {
    // Track
    analytics.track('FIRST_RECOMMENDATION_CLICKED', {
      recommendation_id: rec.id,
      recommendation_type: rec.type,
      time_to_click: Date.now() - onboardingStartTime,
    });
    
    // Complete onboarding
    onComplete(userData);
    
    // Navigate to recommendation
    navigateToRecommendation(rec);
  };
  
  return (
    <div className="space-y-4">
      <h2>Seu próximo passo 🎯</h2>
      <p>Escolha uma das opções para começar:</p>
      
      {recommendations.map(rec => (
        <RecommendationCard 
          key={rec.id}
          recommendation={rec}
          onClick={() => handleSelectRecommendation(rec)}
        />
      ))}
    </div>
  );
}
```

✅ **Critério de sucesso:** Onboarding mostra 3 recomendações e navega ao clicar

---

#### 1.4 Tracking TTFV (1 hora)

**Passo 1:** Criar hook
```bash
touch hooks/useTTFVTracking.ts
```

Copiar código da SPRINT_2_ARQUITETURA_TECNICA.md seção 3.1

**Passo 2:** Integrar no onboarding
```typescript
// OnboardingV2.tsx
const handleCompleteOnboarding = () => {
  // Salvar tempo de início
  const startTime = localStorage.getItem('raio_onboarding_start_time');
  if (!startTime) {
    localStorage.setItem('raio_onboarding_start_time', Date.now().toString());
  }
  
  localStorage.setItem('raio_just_completed_onboarding', 'true');
  
  onComplete(userData);
};
```

**Passo 3:** Integrar nas ações de valor
```typescript
// CourseDetailPage.tsx
const { trackFirstValue } = useTTFVTracking();

const handleEnroll = () => {
  enrollInCourse(courseId);
  
  // Track TTFV
  trackFirstValue({
    eventType: 'course_start',
    itemId: courseId.toString(),
    timestamp: Date.now()
  });
};
```

✅ **Critério de sucesso:** Evento TTFV_ACHIEVED aparece no Mixpanel

---

### ✨ RESULTADO FASE 1

Ao final de 1-2 dias você terá:
- ✅ GrowthBook funcionando (preparado para experimentos)
- ✅ Recomendações básicas no onboarding
- ✅ TTFV sendo medido
- ✅ Primeira entrega de valor!

**DEPLOY** esta versão antes de continuar!

---

## 🚀 FASE 2 - DIA 3-4: EXPERIMENTOS

### 2.1 Primeiro Experimento A/B (3 horas)

**Experimento:** CTA do Onboarding

**Passo 1:** Criar feature no GrowthBook
```
Feature Key: onboarding-cta-copy
Type: String
Values:
  - control: "Começar agora"
  - action: "Iniciar minha transformação"  
  - benefit: "Ver meu plano personalizado"
  
Traffic: 100%
Targeting: All users
```

**Passo 2:** Implementar no código
```typescript
// OnboardingV2.tsx
import { useFeatureValue } from '@growthbook/growthbook-react';

const ctaCopy = useFeatureValue('onboarding-cta-copy', 'control');

const ctaTextMap: Record<string, string> = {
  control: 'Começar agora',
  action: 'Iniciar minha transformação',
  benefit: 'Ver meu plano personalizado',
};

const ctaText = ctaTextMap[ctaCopy as string] || 'Começar agora';

// Usar no botão
<Button>{ctaText}</Button>
```

**Passo 3:** Validar no GrowthBook dashboard
- Verificar se experimento aparece
- Confirmar que 33% usuários veem cada variante

✅ **Critério de sucesso:** 3 variantes rodando com tráfego distribuído

---

### 2.2 Segundo Experimento (2 horas)

**Experimento:** Sequência do Onboarding

```typescript
// OnboardingV2.tsx
const sequence = useFeatureValue('onboarding-sequence', 'control');

const getSteps = () => {
  if (sequence === 'short') {
    return [
      { id: 1, component: NameStep },
      { id: 2, component: SegmentStep },
      { id: 3, component: RecommendationsStep }
    ];
  }
  
  // control: todos os steps
  return [
    { id: 1, component: NameStep },
    { id: 2, component: SegmentStep },
    { id: 3, component: GoalsStep },
    { id: 4, component: InterestsStep },
    { id: 5, component: RecommendationsStep }
  ];
};
```

✅ **Critério de sucesso:** Usuários veem 3 ou 5 steps dependendo da variante

---

## 💬 FASE 3 - DIA 5-6: WELCOME FLOW & CHECKLIST

### 3.1 Welcome Flow (2 horas)

Arquivo: `/components/WelcomeFlow.tsx`

```typescript
const MESSAGES = [
  {
    id: 'welcome-1',
    title: 'Bem-vindo! 🌟',
    message: 'Complete seu primeiro curso para ganhar 100 XP',
    cta: { label: 'Ver curso', action: () => navigate('/academia') },
    condition: (user) => user.completedCourses.length === 0,
  },
  // ... more messages
];

export function WelcomeFlow() {
  const { userData } = useApp();
  const [currentMessage, setCurrentMessage] = useState(null);
  
  useEffect(() => {
    const nextMessage = MESSAGES.find(m => 
      m.condition(userData) && 
      !localStorage.getItem(`seen_${m.id}`)
    );
    
    if (nextMessage) {
      setTimeout(() => setCurrentMessage(nextMessage), 2000);
    }
  }, [userData]);
  
  if (!currentMessage) return null;
  
  return (
    <Card className="fixed bottom-20 right-4 w-96 z-50">
      <CardHeader>
        <CardTitle>{currentMessage.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{currentMessage.message}</p>
        <Button onClick={() => {
          currentMessage.cta.action();
          localStorage.setItem(`seen_${currentMessage.id}`, 'true');
          setCurrentMessage(null);
        }}>
          {currentMessage.cta.label}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Integrar no App.tsx:**
```typescript
<WelcomeFlow />
```

✅ **Critério de sucesso:** Card aparece após 2s para novos usuários

---

### 3.2 First Week Checklist (3 horas)

Arquivo: `/components/FirstWeekChecklist.tsx`

```typescript
const CHECKLIST_ITEMS = [
  {
    id: 'first-course',
    title: 'Inicie um curso',
    xp: 100,
    completed: (user) => user.enrolledCourses.length > 0,
  },
  {
    id: 'first-video',
    title: 'Assista um vídeo',
    xp: 50,
    completed: (user) => user.videosWatched > 0,
  },
  // ... more items
];

export function FirstWeekChecklist() {
  const { userData } = useApp();
  
  const items = CHECKLIST_ITEMS.map(item => ({
    ...item,
    completed: item.completed(userData),
  }));
  
  const completedCount = items.filter(i => i.completed).length;
  const progress = (completedCount / items.length) * 100;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Primeiros 7 Dias</CardTitle>
        <Progress value={progress} />
      </CardHeader>
      <CardContent>
        {items.map(item => (
          <ChecklistItem key={item.id} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}
```

**Adicionar no HomePage:**
```typescript
<FirstWeekChecklist />
```

✅ **Critério de sucesso:** Checklist aparece na home com progresso visual

---

## 📧 FASE 4 - DIA 7: OPT-INS & SEO

### 4.1 Email Opt-in (2 horas)

Arquivo: `/components/OptInEmailModal.tsx`

```typescript
export function OptInEmailModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  
  const handleSubmit = async () => {
    // Validar
    if (!email.includes('@')) {
      toast.error('Email inválido');
      return;
    }
    
    // Salvar (localStorage por enquanto, Supabase depois)
    localStorage.setItem('raio_email_optin', email);
    
    // Analytics
    analytics.track('EMAIL_OPTIN_COMPLETED', { email });
    
    toast.success('Email cadastrado!');
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receba dicas semanais 💌</DialogTitle>
          <DialogDescription>
            Conteúdo exclusivo direto no seu email
          </DialogDescription>
        </DialogHeader>
        
        <Input 
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Depois</Button>
          <Button onClick={handleSubmit}>Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Trigger lógico:**
```typescript
// HomePage.tsx
const [showEmailModal, setShowEmailModal] = useState(false);

useEffect(() => {
  const hasOptedIn = localStorage.getItem('raio_email_optin');
  const hasSeenModal = localStorage.getItem('raio_email_modal_seen');
  
  if (!hasOptedIn && !hasSeenModal && userData.level >= 2) {
    setTimeout(() => {
      setShowEmailModal(true);
      localStorage.setItem('raio_email_modal_seen', 'true');
    }, 10000); // 10 segundos na home
  }
}, [userData.level]);
```

✅ **Critério de sucesso:** Modal aparece após 10s para usuários level 2+

---

### 4.2 SEO Landing Page (1 hora)

Arquivo: `/components/LandingPage.tsx`

Adicionar no `<head>`:
```typescript
import { Helmet } from 'react-helmet-async';

<Helmet>
  <title>RAIO - Fortaleça sua Família | Cursos + Comunidade</title>
  <meta name="description" content="Plataforma completa para fortalecer relacionamentos. Cursos, vídeos, comunidade e IA. +10.000 membros ativos." />
  
  {/* Open Graph */}
  <meta property="og:title" content="RAIO - Transforme seu Relacionamento" />
  <meta property="og:description" content="Cursos, vídeos e comunidade para casais e famílias" />
  <meta property="og:image" content="https://raio.app/og-image.png" />
  <meta property="og:url" content="https://raio.app" />
  
  {/* Twitter */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="RAIO - Transforme seu Relacionamento" />
  <meta name="twitter:description" content="Cursos, vídeos e comunidade para casais e famílias" />
  
  {/* Structured Data */}
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "RAIO",
      "url": "https://raio.app",
      "logo": "https://raio.app/logo.png",
    })}
  </script>
</Helmet>
```

✅ **Critério de sucesso:** Validar em https://search.google.com/test/rich-results

---

## 🎉 RESULTADO FINAL

Ao final dos 7 dias você terá implementado:

✅ **TTFV tracking** - medindo tempo até primeiro valor  
✅ **Recomendações personalizadas** - motor v1 funcionando  
✅ **2+ experimentos A/B** - rodando em produção  
✅ **Welcome flow** - mensagens automatizadas  
✅ **First week checklist** - gamificação do onboarding  
✅ **Email opt-in** - capturando leads qualificados  
✅ **SEO otimizado** - meta tags e structured data  

---

## 🔍 MONITORAMENTO

### Dashboard Mínimo (Mixpanel)

Criar estas queries no Mixpanel:

1. **TTFV Distribution**
   - Event: `TTFV_ACHIEVED`
   - Metric: `ttfv_minutes` (p50, p95, avg)
   - Goal: p95 < 5 min

2. **Onboarding Completion Rate**
   - Funnel: 
     - `ONBOARDING_STARTED`
     - `ONBOARDING_STEP_COMPLETED` (step 2)
     - `ONBOARDING_STEP_COMPLETED` (step 5)
     - `ONBOARDING_COMPLETED`
   - Goal: >70% completion

3. **First Module Completion**
   - Event: `ACADEMIA_COURSE_STARTED` OR `AI_CONVERSATION_STARTED`
   - Within 24h of signup
   - Goal: >50%

4. **Experiment Results**
   - Event: `EXPERIMENT_VIEWED`
   - Group by: `experiment_id`, `variation_id`
   - Conversion: `TTFV_ACHIEVED` OR `PREMIUM_CHECKOUT_COMPLETED`

---

## 📝 CHECKLIST DIÁRIO

### Dia 1
- [ ] Setup GrowthBook
- [ ] RecommendationEngine.ts básico
- [ ] Hook useRecommendations
- [ ] Testar no console
- [ ] COMMIT & PUSH

### Dia 2
- [ ] OnboardingV2 Step 5
- [ ] RecommendationCard component
- [ ] Integrar recomendações
- [ ] useTTFVTracking hook
- [ ] Integrar TTFV tracking
- [ ] DEPLOY

### Dia 3
- [ ] Criar primeiro experimento no GrowthBook
- [ ] Implementar CTA variants
- [ ] Validar tracking
- [ ] COMMIT & PUSH

### Dia 4
- [ ] Criar segundo experimento
- [ ] Implementar sequence variants
- [ ] Testar ambas variantes
- [ ] DEPLOY

### Dia 5
- [ ] WelcomeFlow.tsx
- [ ] 3 welcome messages
- [ ] Integrar no App
- [ ] COMMIT & PUSH

### Dia 6
- [ ] FirstWeekChecklist.tsx
- [ ] 5 checklist items
- [ ] Integrar na HomePage
- [ ] DEPLOY

### Dia 7
- [ ] OptInEmailModal
- [ ] Trigger logic
- [ ] SEO meta tags
- [ ] Structured data
- [ ] DEPLOY FINAL
- [ ] 🎉 SPRINT 2 COMPLETO!

---

## 🚨 TROUBLESHOOTING

### GrowthBook não está trackando

**Problema:** Eventos `EXPERIMENT_VIEWED` não aparecem no Mixpanel

**Solução:**
```typescript
// Verificar se callback está sendo chamado
trackingCallback: (experiment, result) => {
  console.log('🧪 Tracking:', experiment.key, result);
  analytics.track('EXPERIMENT_VIEWED', {
    // ...
  });
}
```

### Recomendações vazias

**Problema:** `getOnboardingRecommendations()` retorna `[]`

**Solução:**
```typescript
// Verificar se cursos estão disponíveis
console.log('Courses available:', courses.length);
console.log('Context:', context);

// Adicionar fallback
if (recommendations.length === 0) {
  recommendations.push(this.getFallbackRecommendation());
}
```

### TTFV não está sendo capturado

**Problema:** Evento `TTFV_ACHIEVED` não dispara

**Solução:**
```typescript
// Verificar localStorage
console.log('Onboarding start:', localStorage.getItem('raio_onboarding_start_time'));
console.log('Just completed:', localStorage.getItem('raio_just_completed_onboarding'));

// Adicionar logs no trackFirstValue
trackFirstValue: (event) => {
  console.log('🎯 Tracking TTFV:', event);
  // ...
}
```

---

## 💡 DICAS DE PRODUTIVIDADE

1. **Trabalhe em branches**
   ```bash
   git checkout -b sprint-2/onboarding-v2
   git checkout -b sprint-2/recommendations
   git checkout -b sprint-2/experiments
   ```

2. **Faça commits frequentes**
   ```bash
   git commit -m "feat: add onboarding step 5"
   git commit -m "feat: add recommendation engine"
   ```

3. **Deploy incremental**
   - Não espere tudo pronto
   - Deploy features individuais conforme ficam prontas
   - Teste em produção com tráfego real

4. **Use feature flags**
   ```typescript
   const showNewOnboarding = useFeatureValue('show-onboarding-v2', false);
   
   return showNewOnboarding ? <OnboardingV2 /> : <Onboarding />;
   ```

5. **Monitor constantemente**
   - Abra Mixpanel diariamente
   - Verifique se eventos estão chegando
   - Ajuste experimentos baseado em dados

---

## 📚 RECURSOS

- **GrowthBook Docs:** https://docs.growthbook.io
- **Mixpanel Query Language:** https://docs.mixpanel.com/docs/analysis/advanced/jql
- **React Helmet Docs:** https://github.com/staylor/react-helmet-async

---

## 🎯 PRÓXIMOS PASSOS PÓS-SPRINT 2

Após completar o Sprint 2:

1. **Analisar resultados** dos experimentos (mínimo 1 semana de dados)
2. **Iterar** nas recomendações baseado em feedback
3. **Expandir** checklist com mais items
4. **Implementar** Supabase para opt-ins (substituir localStorage)
5. **Criar** dashboard de métricas Sprint 2

---

**Pronto para começar?** 🚀

Execute: `git checkout -b sprint-2/foundation && code .`

Boa sorte! 💪
