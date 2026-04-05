# 📱 Landing Page - Guia de Implementação

**Status:** ✅ COMPLETO  
**Data:** Janeiro 2025  
**Componentes Criados:** 3 arquivos

---

## 📦 Componentes Criados

### 1. `/components/LandingPage.tsx`
**Landing Page completa e responsiva**

**Features:**
- ✅ Mobile-first design
- ✅ Respeita 100% o design system
- ✅ Sem classes de font-size/weight (usa defaults do globals.css)
- ✅ Animações sutis com Motion/React
- ✅ Analytics tracking integrado
- ✅ Imagens do Unsplash
- ✅ Acessibilidade completa

**Seções:**
1. **Hero** - Headline + imagem + CTAs
2. **Social Proof** - 4 estatísticas principais
3. **Problema → Solução** - 3 pain points + solução
4. **Features** - 4 pilares (Academia, IA, Comunidade, Gamificação)
5. **Pricing** - Free vs Premium (R$ 49/mês)
6. **FAQ** - 8 perguntas frequentes (accordion)
7. **Final CTA** - Última conversão
8. **Footer** - Links importantes

**Props:**
```typescript
interface LandingPageProps {
  onStartFree?: () => void;      // Callback para começar grátis
  onStartPremium?: () => void;    // Callback para assinar Premium
  onClose?: () => void;           // Callback para fechar (se em modal)
  showCloseButton?: boolean;      // Mostrar botão X de fechar
}
```

---

### 2. `/components/LandingPageModal.tsx`
**Wrapper modal/sheet para a Landing Page**

**Features:**
- ✅ Usa Sheet do shadcn (slide from bottom)
- ✅ Altura 95vh para maximizar visualização
- ✅ Analytics tracking de abertura/fechamento
- ✅ Hook `useLandingPageModal()` para facilitar uso

**Uso:**
```tsx
import { LandingPageModal, useLandingPageModal } from './components/LandingPageModal';

function MyComponent() {
  const { isOpen, open, close } = useLandingPageModal();
  
  return (
    <>
      <Button onClick={open}>Ver Planos</Button>
      <LandingPageModal 
        isOpen={isOpen} 
        onClose={close}
        onStartFree={() => {/* lógica */}}
        onStartPremium={() => {/* lógica */}}
      />
    </>
  );
}
```

---

### 3. `/components/PremiumButton.tsx`
**Componentes para promover Premium no app**

**Componentes:**

#### `<PremiumButton />`
Botão versátil com 4 variantes:

```tsx
// 1. Default - Botão completo
<PremiumButton onClick={handleUpgrade} variant="default" />

// 2. Compact - Para headers
<PremiumButton onClick={handleUpgrade} variant="compact" />

// 3. Badge - Para cards de conteúdo
<PremiumButton onClick={handleUpgrade} variant="badge" />

// 4. Banner - Para destaque maior
<PremiumButton onClick={handleUpgrade} variant="banner" />
```

#### `<PaywallOverlay />`
Overlay de paywall suave:

```tsx
<PaywallOverlay
  onUpgrade={handleUpgrade}
  onCancel={handleCancel}
  title="Conteúdo Premium"
  description="Faça upgrade para acessar"
/>
```

---

## 🎨 Design System Compliance

### ✅ Tokens Utilizados

**Cores:**
```css
--raio-bg-primary          /* Background principal */
--raio-bg-secondary        /* Background secundário */
--raio-bg-tertiary         /* Background terciário */
--raio-text-primary        /* Texto principal */
--raio-text-secondary      /* Texto secundário */
--raio-text-tertiary       /* Texto terciário */
--raio-text-inverse        /* Texto inverso (em fundos escuros) */
--raio-accent-primary      /* Amarelo principal (#D97706) */
--raio-accent-hover        /* Amarelo hover (#B45309) */
--raio-accent-light        /* Amarelo claro para backgrounds */
--raio-accent-subtle       /* Amarelo muito sutil */
--raio-border-default      /* Bordas padrão */
--raio-border-hover        /* Bordas hover */
--raio-shadow-md           /* Sombra média */
--raio-shadow-lg           /* Sombra grande */
--raio-shadow-xl           /* Sombra extra grande */
--raio-success             /* Verde de sucesso */
--raio-success-light       /* Verde claro */
```

**Cores de Features:**
```css
--raio-gold-500            /* Academia */
--raio-mint-500            /* Conselheiro IA */
--raio-coral-500           /* Comunidade */
--raio-accent-primary      /* Gamificação */
```

### ✅ Tipografia
- **Font Family:** Urbanist (via --font-family-display)
- **Sizes:** Usa defaults do globals.css (não especifica classes)
- **Weights:** Usa defaults do globals.css (não especifica classes)

### ✅ Componentes Shadcn
- Button
- Badge
- Card
- Accordion
- Sheet

### ✅ Animações
- Motion/React (importado como `motion`)
- Transições suaves (0.2s - 0.6s)
- No `prefers-reduced-motion`: animações desabilitadas

---

## 📊 Analytics Tracking

### Eventos Implementados

**1. Landing Page Views**
```typescript
// Automático ao montar o componente
analytics.track('LANDING_PAGE_VIEWED');
```

**2. CTA Clicks**
```typescript
analytics.track('LANDING_CTA_CLICKED', {
  location: 'hero' | 'final',
  plan_type: 'free' | 'premium',
  timestamp: ISO string
});
```

**3. Section Views**
```typescript
analytics.track('LANDING_SECTION_VIEWED', {
  section: 'hero' | 'features' | 'pricing' | 'faq',
  timestamp: ISO string
});
```

**4. Modal Events**
```typescript
analytics.track('LANDING_MODAL_OPENED');
analytics.track('LANDING_MODAL_CLOSED');
analytics.track('LANDING_MODAL_START_FREE');
analytics.track('LANDING_MODAL_START_PREMIUM');
```

---

## 🚀 Integrações Possíveis no App

### Opção 1: Antes do Onboarding (Novos Usuários)

```tsx
// Em App.tsx
function AppContent() {
  const [showLanding, setShowLanding] = useState(true);
  
  if (showLanding && !hasSeenWelcome) {
    return (
      <LandingPage
        onStartFree={() => {
          setShowLanding(false);
          // Ir para onboarding
        }}
        onStartPremium={() => {
          setShowLanding(false);
          // Ir para onboarding + marcar como premium
        }}
      />
    );
  }
  
  // ... resto do app
}
```

### Opção 2: Modal Acessível (Usuários Free)

```tsx
// Em HomePage.tsx ou qualquer componente
import { useLandingPageModal } from './components/LandingPageModal';

function HomePage() {
  const { isOpen, open, close } = useLandingPageModal();
  
  return (
    <>
      {/* Botão no header */}
      <PremiumButton onClick={open} variant="compact" />
      
      {/* Modal */}
      <LandingPageModal 
        isOpen={isOpen} 
        onClose={close}
        onStartPremium={() => {
          close();
          // Ir para checkout
        }}
      />
    </>
  );
}
```

### Opção 3: Paywall Suave (Após X Conteúdos)

```tsx
// Em CourseDetailPage.tsx
function CourseDetailPage({ course }) {
  const [showPaywall, setShowPaywall] = useState(false);
  const { isOpen, open } = useLandingPageModal();
  
  const handleEnroll = () => {
    if (!isPremium && course.isPremium) {
      // Opção A: Paywall overlay
      setShowPaywall(true);
      
      // Opção B: Abrir modal da LP
      open();
    }
  };
  
  return (
    <>
      <Button onClick={handleEnroll}>Começar Curso</Button>
      
      {showPaywall && (
        <PaywallOverlay
          onUpgrade={() => {
            setShowPaywall(false);
            open(); // Abre LP completa
          }}
          onCancel={() => setShowPaywall(false)}
        />
      )}
    </>
  );
}
```

### Opção 4: Tab Dedicada (Planos/Premium)

```tsx
// Adicionar tab "Premium" na Navigation
const tabs = [
  { id: 'home', icon: Home, label: 'Início' },
  { id: 'academia', icon: BookOpen, label: 'Academia' },
  { id: 'premium', icon: Crown, label: 'Premium' }, // NOVO
  { id: 'comunidade', icon: Users, label: 'Comunidade' },
  { id: 'perfil', icon: User, label: 'Perfil' }
];

// No App.tsx
{currentTab === 'premium' && (
  <LandingPage
    onStartFree={() => {/* ... */}}
    onStartPremium={() => {/* ... */}}
  />
)}
```

---

## 💡 Pontos de Integração Recomendados

### 1. **HomePage - Banner Premium** (Prioridade Alta)
```tsx
{!isPremium && (
  <PremiumButton onClick={openLanding} variant="banner" />
)}
```

### 2. **Perfil - Seção Premium** (Prioridade Alta)
```tsx
<Card>
  <CardHeader>
    <CardTitle>Seja Premium</CardTitle>
  </CardHeader>
  <CardContent>
    <PremiumButton onClick={openLanding} variant="default" />
  </CardContent>
</Card>
```

### 3. **Academia - Lock em Cursos Premium** (Prioridade Alta)
```tsx
{course.isPremium && !isPremium && (
  <PaywallOverlay onUpgrade={openLanding} />
)}
```

### 4. **ConselheiroPage - Mensagens Limitadas** (Prioridade Média)
```tsx
{messageCount >= 10 && !isPremium && (
  <Alert>
    <Crown className="h-4 w-4" />
    <AlertTitle>Limite Atingido</AlertTitle>
    <AlertDescription>
      <PremiumButton onClick={openLanding} variant="default" />
    </AlertDescription>
  </Alert>
)}
```

### 5. **Settings - Link "Planos"** (Prioridade Média)
```tsx
<SettingsItem
  icon={Crown}
  title="Planos e Assinaturas"
  onClick={openLanding}
/>
```

---

## 📱 Responsividade

### Mobile (< 1024px)
- ✅ Layout vertical
- ✅ Cards em grid (1 coluna em mobile, 2-3 em tablet)
- ✅ CTAs em coluna (stack)
- ✅ Imagens otimizadas (aspect-ratio 16/10)
- ✅ Safe area insets respeitadas
- ✅ Bottom sheet para modal

### Desktop (≥ 1024px)
- ✅ Max-width containers (6xl = 1152px)
- ✅ Grid multi-colunas
- ✅ CTAs em linha (row)
- ✅ Imagens maiores (aspect-ratio 16/9)
- ✅ Hover effects sutis
- ✅ Modal centralizado (se necessário)

---

## 🎯 Conversão - Otimizações

### CTAs Estratégicos
1. **Hero** - Primeiro contato, máxima visibilidade
2. **Após Problema/Solução** - Momento de identificação
3. **Após Features** - Momento de desejo
4. **Após Pricing** - Momento de decisão
5. **Final** - Última chance de conversão

### Messaging Hierarquia
1. **Headline:** "Fortaleça sua família com conteúdo transformador"
2. **Subheadline:** Explicação clara do valor
3. **Pain points:** Identificação com problemas reais
4. **Features:** Demonstração de solução completa
5. **Pricing:** Transparência total
6. **Trust signals:** Social proof + garantia

### Redução de Fricção
- ✅ "7 dias grátis" em destaque
- ✅ "Cancele quando quiser"
- ✅ "Sem cartão de crédito" (para free)
- ✅ Garantia de 7 dias
- ✅ FAQ para objeções comuns

---

## 🧪 A/B Tests Sugeridos

### Teste 1: Headline
- **Control:** "Fortaleça sua família com conteúdo transformador"
- **Variant A:** "Transforme seus relacionamentos"
- **Variant B:** "Cresça junto com sua família"

### Teste 2: Pricing Display
- **Control:** Preço mensal (R$ 49/mês)
- **Variant A:** Preço anual com desconto
- **Variant B:** Comparação Free vs Premium lado a lado

### Teste 3: CTA Copy
- **Control:** "Começar Premium"
- **Variant A:** "Iniciar 7 dias grátis"
- **Variant B:** "Experimentar Premium"

### Teste 4: Social Proof
- **Control:** Números gerais
- **Variant A:** Testemunhos em vídeo
- **Variant B:** Logos de parceiros

---

## 📈 Métricas para Acompanhar

### Topo do Funil
- Landing Page Views
- Bounce Rate
- Time on Page
- Scroll Depth

### Meio do Funil
- Section Views (Features, Pricing, FAQ)
- CTA Clicks (por localização)
- FAQ Accordion Opens

### Fundo do Funil
- Start Free Clicks
- Start Premium Clicks
- Conversion Rate (view → click)
- Checkout Iniciado

### Qualitativas
- User Feedback
- Exit Surveys
- Session Recordings (Hotjar)

---

## 🔄 Próximos Passos

### Fase 1: Implementação Básica ✅
- [x] Criar componente LandingPage.tsx
- [x] Criar LandingPageModal.tsx
- [x] Criar PremiumButton.tsx
- [x] Analytics tracking
- [x] Design system compliance

### Fase 2: Integração no App (Esta Semana)
- [ ] Adicionar em HomePage (banner)
- [ ] Adicionar em Perfil (card)
- [ ] Adicionar paywall em cursos premium
- [ ] Testar modal em diferentes contextos

### Fase 3: Otimização de Conteúdo (Próxima Semana)
- [ ] Validar copy com redator
- [ ] Adicionar testemunhos reais
- [ ] Screenshots do app (real, não mockups)
- [ ] Vídeo de demonstração (opcional)

### Fase 4: A/B Testing (Sprint 2)
- [ ] Setup GrowthBook
- [ ] Configurar experimentos
- [ ] Coletar dados (mín 1000 views)
- [ ] Analisar e iterar

### Fase 5: SEO e Site Público (Sprint 2-3)
- [ ] Setup Astro
- [ ] Migrar para site público (raio.com.br)
- [ ] SEO optimization
- [ ] Deploy produção

---

## 💬 Copy Atual

### Headline
"Fortaleça sua família com conteúdo transformador"

### Subheadline
"Aprenda, conecte-se e cresça com uma plataforma feita para sua jornada familiar. Cursos especializados, comunidade engajada e suporte contínuo."

### Pain Points
1. "Quer fortalecer relacionamentos, mas não sabe por onde começar"
2. "Busca crescimento pessoal, mas está sobrecarregado"
3. "Precisa de comunidade, mas se sente sozinho"

### Features
1. **Academia:** "100+ cursos e livros especializados"
2. **Conselheiro IA:** "Orientação personalizada 24/7"
3. **Comunidade:** "Conecte-se com milhares de pessoas"
4. **Gamificação:** "Sistema de recompensas que motiva"

### Pricing
- **Free:** R$ 0 - "Para explorar a plataforma"
- **Premium:** R$ 49/mês - "Acesso completo e ilimitado"

### Trust Signals
- "7 dias grátis"
- "Cancele quando quiser"
- "Sem compromisso"
- "Garantia de 7 dias"
- "10k+ famílias ativas"
- "4.9★ avaliação média"

---

## 🎨 Screenshots Necessários

Para tornar a LP ainda melhor, capture screenshots reais:

1. **Academia** - Grid de cursos
2. **Book Reader** - Leitura sincronizada
3. **Conselheiro** - Conversa com IA
4. **Comunidade** - Feed de posts
5. **Gamificação** - Badges e níveis
6. **Perfil** - Dashboard pessoal

Ferramenta recomendada: Device Frame Generator

---

## ✅ Checklist de Qualidade

### Design
- [x] Mobile-first
- [x] Responsivo (mobile, tablet, desktop)
- [x] Design system 100% compliance
- [x] Animações sutis
- [x] Acessibilidade (ARIA, keyboard navigation)
- [x] Dark mode support

### Conteúdo
- [x] Headline clara e convincente
- [x] Pain points relevantes
- [x] Features detalhadas
- [x] Pricing transparente
- [x] FAQ completo
- [x] CTAs claros

### Técnico
- [x] Analytics tracking
- [x] Performance optimizada
- [x] SEO-ready (meta tags quando for site)
- [x] Error handling
- [x] TypeScript types

### Conversão
- [x] Múltiplos CTAs
- [x] Trust signals
- [x] Redução de fricção
- [x] Social proof
- [x] Garantia explícita

---

## 🎯 Resultado Esperado

**Meta de Conversão:**
- Landing Page → CTA Click: **> 20%**
- CTA Click → Start Premium: **> 10%**
- Overall Conversion: **> 2%**

**Benchmark da Indústria:**
- SaaS average: 2-5%
- Top performers: 5-10%
- Duolingo (free→paid): ~7%

**Nossa Meta (Conservadora):**
- View → Click: 15% (Q1) → 20% (Q2)
- Click → Conversion: 8% (Q1) → 10% (Q2)
- **Overall: 1.2% (Q1) → 2% (Q2)**

---

## 📞 Contato

Para feedback ou sugestões sobre a Landing Page:
- Product: Revisar copy e estratégia
- Design: Validar UI/UX
- Engineering: Implementar integrações
- Marketing: Otimizar conversão

---

**Última Atualização:** Janeiro 2025  
**Status:** ✅ Pronto para integração  
**Próximo Milestone:** Integrar em HomePage + Perfil
