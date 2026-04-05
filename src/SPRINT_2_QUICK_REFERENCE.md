# 📝 SPRINT 2 - QUICK REFERENCE
## Cheatsheet de Referência Rápida

> **Para:** Toda a equipe  
> **Quando:** Durante desenvolvimento, daily standups, code reviews

---

## 🎯 OBJETIVO EM 1 FRASE

**"Entregar primeiro valor em <5 minutos através de onboarding personalizado e sistema de experimentos para otimização contínua."**

---

## 📊 MÉTRICAS PRINCIPAIS (3)

| Métrica | Meta | Como Medir |
|---------|------|------------|
| **TTFV p95** | < 5 min | Mixpanel: `TTFV_ACHIEVED` event |
| **Onboarding Completion** | > 70% | Funil: `STARTED` → `COMPLETED` |
| **1º Módulo Completion** | +15% baseline | Taxa em 7 dias |

---

## 🚀 ENTREGAS CORE (6)

1. ✅ **Onboarding V2** - 5 steps + recomendações
2. ✅ **Recommendation Engine** - v1 MVP
3. ✅ **A/B Testing** - GrowthBook + 2 experimentos
4. ✅ **Welcome Flow** - Mensagens automatizadas
5. ✅ **First Week Checklist** - Gamificação
6. ✅ **Opt-ins** - Email + WhatsApp

---

## 📁 ARQUIVOS PRINCIPAIS

```
/lib/recommendations/
  └── RecommendationEngine.ts        ← Motor de recomendações

/lib/experiments/
  └── GrowthBookProvider.tsx         ← A/B testing setup

/hooks/
  ├── useRecommendations.ts          ← Hook de recomendações
  ├── useExperiments.ts              ← Hook de experimentos
  └── useTTFVTracking.ts             ← TTFV tracking

/components/
  ├── OnboardingV2.tsx               ← Novo onboarding
  ├── WelcomeFlow.tsx                ← Mensagens automáticas
  ├── FirstWeekChecklist.tsx         ← Checklist gamificado
  └── OptInModals.tsx                ← Email/WhatsApp opt-in
```

---

## 🧪 EXPERIMENTOS PLANEJADOS

### Exp 1: CTA Copy
```typescript
Feature: 'onboarding-cta-copy'
Variants:
  - control: "Começar agora"
  - action: "Iniciar minha transformação"
  - benefit: "Ver meu plano personalizado"
```

### Exp 2: Onboarding Sequence
```typescript
Feature: 'onboarding-sequence'
Variants:
  - control: 5 steps
  - short: 3 steps
  - progressive: 2 steps iniciais
```

### Exp 3: Paywall Timing
```typescript
Feature: 'paywall-trigger-timing'
Variants:
  - control: 3 conteúdos
  - light: 5 conteúdos
  - heavy: 1 conteúdo
```

---

## 📊 EVENTOS ANALYTICS NOVOS

```typescript
// Onboarding
ONBOARDING_V2_STARTED
ONBOARDING_V2_STEP_COMPLETED(step, stepName, timeSpent)
ONBOARDING_V2_COMPLETED(totalTime, segments, goals, interests)
FIRST_RECOMMENDATION_VIEWED(count)
FIRST_RECOMMENDATION_CLICKED(recId, recType, position)

// TTFV
TTFV_ACHIEVED(ttfvMinutes, firstValueType)

// Experimentos
EXPERIMENT_VIEWED(experimentId, variationId)
EXPERIMENT_CONVERTED(experimentId, variationId)

// Welcome Flow
WELCOME_MESSAGE_VIEWED(messageId)
WELCOME_MESSAGE_ACTION_CLICKED(messageId)
WELCOME_MESSAGE_DISMISSED(messageId)

// Checklist
FIRST_WEEK_CHECKLIST_VIEWED
FIRST_WEEK_CHECKLIST_ITEM_COMPLETED(itemId, day, xpEarned)
FIRST_WEEK_CHECKLIST_COMPLETED

// Opt-ins
EMAIL_OPTIN_MODAL_VIEWED
EMAIL_OPTIN_COMPLETED(source)
WHATSAPP_OPTIN_MODAL_VIEWED
WHATSAPP_OPTIN_COMPLETED(source)
```

---

## 💻 SNIPPETS ÚTEIS

### Setup GrowthBook
```typescript
// App.tsx
import { GrowthBookProvider } from './lib/experiments/GrowthBookProvider';

<GrowthBookProvider>
  <AppProvider>
    {/* ... */}
  </AppProvider>
</GrowthBookProvider>
```

### Usar Experimento
```typescript
import { useFeatureValue } from '@growthbook/growthbook-react';

const variant = useFeatureValue('experiment-key', 'control');
```

### Tracking TTFV
```typescript
import { useTTFVTracking } from '../hooks/useTTFVTracking';

const { trackFirstValue } = useTTFVTracking();

trackFirstValue({
  eventType: 'course_start',
  itemId: courseId.toString(),
  timestamp: Date.now()
});
```

### Recomendações
```typescript
import { useRecommendations } from '../hooks/useRecommendations';

const { getOnboardingRecommendations } = useRecommendations();
const recs = getOnboardingRecommendations(5);
```

---

## 🔍 TROUBLESHOOTING RÁPIDO

### GrowthBook não funciona
```typescript
// Verificar console
console.log('GrowthBook initialized:', growthbook.ready);

// Verificar attributes
console.log('User attributes:', growthbook.getAttributes());
```

### Recomendações vazias
```typescript
// Verificar contexto
console.log('Recommendation context:', context);

// Verificar cursos disponíveis
console.log('Courses:', courses.length);
```

### TTFV não tracked
```typescript
// Verificar localStorage
console.log(localStorage.getItem('raio_onboarding_start_time'));
console.log(localStorage.getItem('raio_just_completed_onboarding'));
```

### Analytics não enviando
```typescript
// Verificar Mixpanel token
console.log('Mixpanel enabled:', analytics.isEnabled);

// Forçar flush
analytics.flush();
```

---

## ⏱️ TIMELINE CONDENSADO

**Semana 1:** Foundation (GrowthBook + Recommendations + OnboardingV2 + TTFV)  
**Semana 2:** Experiments (2 A/B tests) + Community (Welcome + Checklist)  
**Semana 3:** Growth (Opt-ins + SEO) + Testing + Deploy

---

## ✅ DEFINITION OF DONE MÍNIMO

- [ ] OnboardingV2 em produção
- [ ] Recomendações funcionando
- [ ] ≥1 experimento ativo
- [ ] TTFV sendo medido (baseline estabelecido)
- [ ] Welcome flow ativo
- [ ] Checklist implementado
- [ ] Email opt-in funcionando
- [ ] Sem bugs críticos
- [ ] Dashboard Mixpanel criado

---

## 📞 CONTATOS RÁPIDOS

- **Slack:** #sprint-2-onboarding
- **GrowthBook:** https://app.growthbook.io
- **Mixpanel:** https://mixpanel.com/project/[project-id]
- **Docs:** Ver SPRINT_2_INDEX.md

---

## 🎯 COMANDOS GIT ÚTEIS

```bash
# Criar branch
git checkout -b sprint-2/feature-name

# Commit pattern
git commit -m "feat(onboarding): add step 5 recommendations"
git commit -m "feat(experiments): add CTA variant"
git commit -m "fix(ttfv): correct timestamp tracking"

# Deploy
git push origin sprint-2/feature-name
# Criar PR → Review → Merge → Deploy
```

---

## 📋 CHECKLIST DIÁRIO

### Segunda
- [ ] Review PRs pendentes
- [ ] Daily standup (9:30)
- [ ] Trabalhar em feature principal
- [ ] Commit EOD

### Terça
- [ ] Office hours (14h)
- [ ] Continuar feature
- [ ] Code review peer
- [ ] Update board

### Quarta
- [ ] Mid-week sync
- [ ] Testing
- [ ] Documentation
- [ ] Prepare demo

### Quinta
- [ ] Office hours (14h)
- [ ] Bug fixes
- [ ] Integration testing
- [ ] Mixpanel validation

### Sexta
- [ ] Weekly review (16h)
- [ ] Deploy to staging
- [ ] Update documentation
- [ ] Plan next week

---

## 🎨 COMPONENTES UI NECESSÁRIOS

```typescript
// Novos componentes
<OnboardingV2 />
<OnboardingRecommendationsStep />
<RecommendationCard />
<WelcomeFlow />
<WelcomeMessage />
<FirstWeekChecklist />
<ChecklistItem />
<OptInEmailModal />
<OptInWhatsAppModal />

// Componentes existentes a modificar
<HomePage />           // Adicionar checklist + recommendations
<App.tsx />            // Wrap com GrowthBookProvider
<CourseDetailPage />   // Adicionar TTFV tracking
<VideoPage />          // Adicionar TTFV tracking
```

---

## 🔢 NÚMEROS IMPORTANTES

- **5 min** - TTFV target (p95)
- **70%** - Onboarding completion target
- **+15%** - First module completion improvement
- **3** - Experimentos mínimos
- **25%** - Email opt-in rate target
- **3 semanas** - Sprint duration
- **1 dev** - Team size

---

## 🏆 IMPACTO ESPERADO

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| TTFV | ~12 min | <5 min | -58% |
| Onboarding Completion | 45% | 70% | +25% |
| Day 7 Retention | 28% | 38% | +36% |
| WAPM (6 meses) | Baseline | +40% | +40% |

---

## 💡 DICAS PRO

1. **Deploy frequente** - Não espere tudo pronto
2. **Use feature flags** - Teste em produção com segurança
3. **Monitor Mixpanel** - Valide eventos diariamente
4. **Documente learnings** - Update docs conforme aprende
5. **Pair programming** - Partes complexas em dupla
6. **Ask for help** - Não trave mais de 30 min

---

## 🚨 RED FLAGS

⚠️ **TTFV > 7 minutos** - Algo está errado no fluxo  
⚠️ **Completion < 60%** - Onboarding muito longo/complexo  
⚠️ **Experimentos sem dados** - Tracking quebrado  
⚠️ **Performance issues** - Muito tracking pode degradar UX  
⚠️ **Analytics não chegando** - Checar Mixpanel config

---

## 📚 DOCS PARA LER

**Hoje:**
- [SPRINT_2_QUICK_START.md](./SPRINT_2_QUICK_START.md)

**Esta semana:**
- [SPRINT_2_ARQUITETURA_TECNICA.md](./SPRINT_2_ARQUITETURA_TECNICA.md)

**Quando precisar:**
- [SPRINT_2_PLANO_EXECUCAO.md](./SPRINT_2_PLANO_EXECUCAO.md)
- [SPRINT_2_VISUAL_FLOW.md](./SPRINT_2_VISUAL_FLOW.md)

---

## 🎯 PRÓXIMA AÇÃO

**Agora:**
1. Ler QUICK_START.md Fase 1
2. Setup GrowthBook
3. Começar RecommendationEngine.ts

**Depois:**
4. OnboardingV2 Step 5
5. TTFV tracking
6. Deploy!

---

**Última atualização:** Outubro 2025  
**Versão:** 1.0  

**Keep this doc open during development!** 📌
