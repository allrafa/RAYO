# ⚡ RAIO - Especificação Completa da Plataforma

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Missão e Propósito](#missão-e-propósito)
3. [North Star Metric](#north-star-metric)
4. [Público-Alvo e Segmentos](#público-alvo-e-segmentos)
5. [Arquitetura da Plataforma](#arquitetura-da-plataforma)
6. [Funcionalidades Principais](#funcionalidades-principais)
7. [Design System](#design-system)
8. [Jornada do Usuário](#jornada-do-usuário)
9. [Tecnologias e Stack](#tecnologias-e-stack)
10. [Monetização](#monetização)
11. [Roadmap e Fases](#roadmap-e-fases)
12. [Métricas de Sucesso](#métricas-de-sucesso)

---

## 🎯 Visão Geral

**RAIO** é um ecossistema digital completo para **fortalecer famílias** através de conteúdo transformador, comunidade engajada e recursos práticos. A plataforma combina educação, mentoria por IA, comunidade ativa e gamificação para criar uma experiência de transformação pessoal e familiar.

### O que é RAIO?

RAIO é uma plataforma integrada que oferece:
- 📚 **Academia de Cursos e Livros** - Conteúdo premium educacional
- 🤖 **Conselheiro IA** - Mentoria personalizada 24/7
- 👥 **Comunidade Ativa** - Fóruns temáticos e conexões
- 🎯 **Gamificação** - Sistema de missões, badges e progressão
- 📖 **Biblioteca Digital** - Livros com leitor sincronizado (áudio + texto)

### Diferenciais

1. **Personalização por Contexto de Vida** - Experiências únicas para cada segmento
2. **Abordagem Holística** - Não é apenas cursos ou apenas comunidade, é um ecossistema completo
3. **IA Contextual** - Conselheiro que entende o contexto familiar e oferece orientação personalizada
4. **Conteúdo Sincronizado** - Leitura + áudio simultâneos estilo Headway/Blinkist
5. **Gamificação Significativa** - Recompensas que motivam transformação real

---

## 🚀 Missão e Propósito

### Missão
> "Fortalecer famílias através de conteúdo transformador, comunidade engajada e recursos práticos que promovem crescimento pessoal, relacionamentos saudáveis e propósito de vida."

### Propósito
Criar um ambiente digital onde pessoas possam:
- **Aprender** habilidades para relacionamentos saudáveis
- **Conectar-se** com comunidade que compartilha valores
- **Crescer** em todas as áreas da vida (pessoal, familiar, espiritual)
- **Transformar** seus relacionamentos e família

### Valores Fundamentais

1. **Família em Primeiro Lugar** - Tudo gira em torno de fortalecer vínculos familiares
2. **Conteúdo de Qualidade** - Educação baseada em evidências e valores sólidos
3. **Comunidade Saudável** - Ambiente seguro, respeitoso e encorajador
4. **Crescimento Contínuo** - Jornada de transformação progressiva
5. **Acessibilidade** - Conteúdo disponível para todos, com opções gratuitas e premium

---

## 📊 North Star Metric

### Métrica Principal: WAPM
**Weekly Active Premium Members** (Membros Premium Ativos Semanalmente)

**Por quê WAPM?**
- ✅ Mede **engajamento real** (não apenas cadastros)
- ✅ Indica **valor percebido** (premium = disposição de pagar)
- ✅ Reflete **sustentabilidade** do negócio
- ✅ Correlaciona com **transformação** (uso regular = mudança real)

### Métricas Secundárias

**Engagement:**
- DAU/MAU Ratio (Daily/Monthly Active Users)
- Session Length (tempo médio por sessão)
- Completion Rate (taxa de conclusão de cursos/livros)
- Community Posts per User

**Retenção:**
- Week 1, Week 4, Month 3 Retention
- Churn Rate
- Premium Conversion Rate
- LTV:CAC Ratio

**Conteúdo:**
- Course Completion Rate
- Book Reading Streak
- AI Conversations per Week
- Community Engagement Rate

---

## 👥 Público-Alvo e Segmentos

### Segmentação Dinâmica

A plataforma adapta-se ao **contexto de vida** do usuário, oferecendo experiências personalizadas para cada fase:

#### 1. **Solteiro** 🧑
**Características:**
- Idade: 18-35 anos
- Foco: Crescimento pessoal, preparo para relacionamentos
- Necessidades: Autoconhecimento, propósito, valores

**Conteúdo Personalizado:**
- Cursos sobre autoconhecimento e identidade
- Livros sobre propósito e carreira
- Comunidade de desenvolvimento pessoal
- Preparação para relacionamentos saudáveis

#### 2. **Namoro** 💑
**Características:**
- Idade: 20-35 anos
- Foco: Construir relacionamento saudável
- Necessidades: Comunicação, resolução de conflitos, alinhamento de valores

**Conteúdo Personalizado:**
- Cursos sobre comunicação no relacionamento
- Recursos para casais (exercícios a dois)
- Comunidade de casais namorando
- Preparação para compromisso

#### 3. **Noivos** 💍
**Características:**
- Idade: 22-40 anos
- Foco: Preparação para casamento
- Necessidades: Planejamento financeiro, expectativas, família estendida

**Conteúdo Personalizado:**
- Curso de preparação matrimonial
- Ferramentas de planejamento conjunto
- Comunidade de noivos
- Recursos sobre finanças e família

#### 4. **Casados** 👫
**Características:**
- Idade: 25-60 anos
- Foco: Fortalecer casamento
- Necessidades: Intimidade, romance, resolução de conflitos, propósito conjunto

**Conteúdo Personalizado:**
- Cursos de fortalecimento matrimonial
- Recursos para casais (date nights, conversas profundas)
- Comunidade de casais casados
- Ferramentas de crescimento conjugal

#### 5. **Pais** 👨‍👩‍👧‍👦
**Características:**
- Idade: 25-65 anos
- Foco: Criar filhos com propósito
- Necessidades: Educação parental, equilíbrio, valores familiares

**Conteúdo Personalizado:**
- Cursos de parentalidade
- Recursos por idade dos filhos
- Comunidade de pais
- Ferramentas de educação familiar

### Multi-Segmentação

**Importante:** Usuários podem estar em **múltiplos segmentos** simultaneamente:
- Casados + Pais
- Solteiro + preparando para namoro
- Noivos + preparação para paternidade

A plataforma adapta o conteúdo dinamicamente baseado em todos os segmentos ativos.

---

## 🏗️ Arquitetura da Plataforma

### Estrutura de 5 Tabs (Mobile-First)

```
┌─────────────────────────────────────────┐
│           RAIO PLATFORM                  │
├─────────────────────────────────────────┤
│                                          │
│         MAIN CONTENT AREA                │
│                                          │
├─────────────────────────────────────────┤
│ [🏠] [📚] [🤖] [👥] [👤]                │
│ Home  Acad  Cons  Comu  Perf             │
└─────────────────────────────────────────┘
```

#### Tab 1: 🏠 **Home**
**Dashboard Personalizado**
- Feed personalizado por segmento
- Trilha de Transformação
- Conteúdo recomendado
- Progresso semanal
- Missões ativas

#### Tab 2: 📚 **Academia RAIO**
**Centro de Aprendizado**
- **Cursos Premium** com vídeo-aulas
- **Biblioteca de Livros** com leitor sincronizado
- Filtros por categoria e nível
- Progresso de cursos
- Certificados

**Sub-navegação:**
- 🎓 Meus Cursos
- 📖 Meus Livros
- 🔍 Explorar
- 📊 Progresso

#### Tab 3: 🤖 **Conselheiro RAIO**
**Mentoria por IA**
- Chat conversacional 24/7
- Contexto de segmento e histórico
- Planos de ação personalizados
- Recursos recomendados
- Histórico de conversas

**Funcionalidades:**
- Análise de situações
- Sugestões personalizadas
- Exercícios práticos
- Follow-up automático

#### Tab 4: 👥 **Comunidade**
**Conexões e Engajamento**
- Fóruns por segmento
- Posts e discussões
- Eventos virtuais
- Grupos de estudo
- Mentorias entre pares

**Sub-navegação:**
- 💬 Feed
- 🎯 Meus Tópicos
- 👥 Grupos
- 📅 Eventos

#### Tab 5: 👤 **Perfil**
**Centro de Controle Pessoal**
- Estatísticas e conquistas
- Badges e níveis
- Biblioteca pessoal
- Configurações
- Favoritos
- Playlists customizadas

---

## ⚙️ Funcionalidades Principais

### 1. 📚 Academia RAIO - Sistema de Aprendizado

#### A) Cursos em Vídeo
**Características:**
- Vídeo-aulas HD com timestamps
- Materiais complementares (PDFs, worksheets)
- Quizzes e avaliações
- Certificado de conclusão
- Progresso sincronizado

**Tipos de Cursos:**
- Cursos Principais (8-12 módulos)
- Mini-Cursos (2-4 aulas)
- Workshops Ao Vivo
- Masterclasses

#### B) Biblioteca de Livros
**Leitor Sincronizado (Estilo Headway/Blinkist):**

```
┌─────────────────────────────────────────┐
│ [←] [Read] [Listen] [Read+Listen]        │
├─────────────────────────────────────────┤
│                                          │
│         Capítulo 1: Introdução           │
│                                          │
│  Lorem ipsum dolor sit amet, consectetur │
│  adipiscing elit. Sed do eiusmod tempor  │
│  incididunt ut labore et dolore magna    │
│  aliqua. Ut enim ad minim veniam...      │
│                                          │
│  [destaque atual no áudio] 🔊            │
│                                          │
├─────────────────────────────────────────┤
│ 📕 [■■■■■■□□□□] 60% ▶ 2x               │
│ Capítulo 1 • 15min restantes             │
└─────────────────────────────────────────┘
```

**Funcionalidades:**
- **Read** - Leitura pura de PDF
- **Listen** - Áudio narrado profissionalmente
- **Read + Listen** - Sincronização em tempo real (texto destaca conforme áudio)
- Controles de velocidade (0.5x - 2x)
- Bookmarks e destaques
- Notas pessoais
- Progresso por capítulo

**Página Inicial do Livro (Estilo Netflix):**
- Capa grande e atraente
- Resumo executivo
- Avaliação e reviews
- Tempo estimado de leitura/áudio
- Capítulos disponíveis
- "Começar" ou "Continuar de onde parei"

#### C) Playlists Customizadas
**Coleções de Conteúdo:**
- Cursos + Livros + Posts da comunidade
- Curadoria pessoal ou da plataforma
- Compartilhável com a comunidade
- Seguir playlists de outros usuários

---

### 2. 🤖 Conselheiro RAIO - IA Contextual

#### Arquitetura do Conselheiro

**Contexto Dinâmico:**
```javascript
{
  userProfile: {
    name: "Maria",
    segments: ["casada", "mãe"],
    goals: ["melhorar comunicação", "educar filhos"],
    level: 5,
    completedCourses: [1, 3, 7],
    currentChallenges: ["conflitos sobre educação dos filhos"]
  },
  conversationHistory: [...],
  recentContent: ["Curso: Comunicação no Casamento", "Livro: Pais Intencionais"],
  communityActivity: ["Post sobre disciplina positiva"]
}
```

**Tipos de Interação:**

1. **Conversação Aberta**
   - Qualquer pergunta ou situação
   - Análise contextualizada
   - Sugestões personalizadas

2. **Planos de Ação**
   - Criação de roadmap personalizado
   - Missões e checkpoints
   - Acompanhamento de progresso

3. **Análise de Situações**
   - Upload de contexto (texto/voz)
   - Perguntas reflexivas
   - Sugestões de recursos

4. **Recomendações**
   - Cursos relevantes
   - Livros recomendados
   - Posts da comunidade
   - Exercícios práticos

**Header Dinâmico:**
Muda conforme segmento e contexto:
- 👫 Casados: "Como posso fortalecer meu casamento hoje?"
- 👨‍👩‍👧 Pais: "Precisa de orientação na educação dos seus filhos?"
- 💑 Namoro: "Vamos construir um relacionamento saudável?"

---

### 3. 👥 Comunidade - Conexões Significativas

#### Estrutura da Comunidade

**Fóruns por Segmento:**
- Feed geral da plataforma
- Feeds específicos por segmento
- Grupos privados (estudo, suporte)
- Tópicos temáticos

**Tipos de Posts:**
1. **Texto Simples**
2. **Texto + Imagens**
3. **Perguntas** (Q&A format)
4. **Enquetes**
5. **Eventos**
6. **Compartilhamento de Recursos**

**Interações:**
- ❤️ Curtir
- 💬 Comentar
- 🔄 Compartilhar
- 🔖 Salvar
- 🎁 Presentear com badge

**Moderação:**
- Diretrizes da comunidade
- Sistema de denúncias
- Moderadores por segmento
- IA para detecção de conteúdo inadequado

---

### 4. 🎮 Gamificação - Engajamento Significativo

#### Sistema de Progressão

**Níveis (1-100):**
- XP por ações na plataforma
- Desbloqueio de conteúdo
- Status na comunidade
- Recompensas exclusivas

**Pontos (XP):**
```
Completar aula: +50 XP
Concluir curso: +500 XP
Ler 1 capítulo: +30 XP
Concluir livro: +300 XP
Post na comunidade: +20 XP
Streak de 7 dias: +200 XP
Ajudar outro membro: +100 XP
```

#### Badges (Conquistas)

**Categorias:**

1. **Aprendizado:**
   - 📚 "Leitor Dedicado" - 5 livros concluídos
   - 🎓 "Estudante Exemplar" - 10 cursos completos
   - 🔥 "Em Chamas" - 30 dias de streak

2. **Comunidade:**
   - 💬 "Comunicador" - 100 posts
   - ❤️ "Apoiador" - 500 curtidas dadas
   - 🌟 "Influenciador" - 1000 seguidores

3. **Transformação:**
   - 💪 "Persistente" - 90 dias consecutivos
   - 🏆 "Mestre" - Nível 50 alcançado
   - 👨‍👩‍👧‍👦 "Família Forte" - Completou trilha familiar

#### Missões (Challenges)

**Diárias:**
- Assistir 1 aula
- Ler 1 capítulo
- Postar na comunidade

**Semanais:**
- Completar 1 curso
- Ler 1 livro
- Engajar em 10 posts

**Mensais:**
- Streak de 30 dias
- Concluir trilha temática
- Ajudar 5 membros

#### Streaks (Sequências)

- 🔥 **Dia atual do streak**
- 📊 **Maior streak alcançado**
- 🎁 **Recompensas por milestone:**
  - 7 dias: Badge Bronze
  - 30 dias: Badge Prata + Conteúdo exclusivo
  - 90 dias: Badge Ouro + Desconto premium
  - 365 dias: Badge Diamante + 1 mês grátis

---

### 5. 📊 Dashboard Pessoal

#### Home - Feed Personalizado

**Componentes:**

1. **Saudação Contextual**
   ```
   "Bom dia, Maria! 👋"
   "Você está em uma sequência de 5 dias 🔥"
   ```

2. **Progresso Semanal**
   - Gráfico de atividades
   - Metas vs. Realizações
   - Próximas missões

3. **Continue de Onde Parou**
   - Último curso assistido
   - Último livro lido
   - Última conversa com Conselheiro

4. **Recomendações Personalizadas**
   - IA sugere próximo conteúdo
   - Baseado em histórico e segmento
   - "Outros como você também gostaram"

5. **Comunidade em Destaque**
   - Posts populares do seu segmento
   - Tópicos em alta
   - Eventos próximos

6. **Missões Ativas**
   - Diárias, semanais, mensais
   - Progresso visual
   - Recompensas disponíveis

---

## 🎨 Design System

### Princípios de Design

1. **Content-First**
   - Conteúdo é rei
   - Mínimo de distrações
   - Tipografia hierárquica clara

2. **Motion Purposeful**
   - Animações com propósito
   - Transições suaves
   - Feedback visual imediato

3. **Acessibilidade Completa**
   - WCAG 2.1 AA compliance
   - Suporte a leitores de tela
   - Contraste adequado
   - Navegação por teclado

4. **Responsivo e Adaptativo**
   - Mobile-first approach
   - Layout fluído desktop
   - Touch-friendly targets

### Paleta de Cores

**Base:**
```css
/* Light Mode */
--raio-bg-primary: #FAFAFA;     /* Off-white */
--raio-bg-secondary: #FFFFFF;   /* Branco puro */
--raio-bg-tertiary: #F4F4F4;    /* Cinza clarinho */

--raio-text-primary: #1A1A1A;   /* Preto suave */
--raio-text-secondary: #666666; /* Cinza médio */
--raio-text-tertiary: #999999;  /* Cinza claro */

/* Dark Mode */
--raio-bg-primary: #121212;     /* Preto suave */
--raio-bg-secondary: #1E1E1E;   /* Cinza escuro */
--raio-bg-tertiary: #2A2A2A;    /* Cinza médio */

--raio-text-primary: #FAFAFA;   /* Off-white */
--raio-text-secondary: #B3B3B3; /* Cinza claro */
--raio-text-tertiary: #808080;  /* Cinza médio */
```

**Accent (Amarelo Sutil):**
```css
--raio-accent-primary: #F5C843;   /* Amarelo raio */
--raio-accent-hover: #F7D56A;     /* Amarelo hover */
--raio-accent-light: #FFF9E6;     /* Amarelo background */
--raio-accent-subtle: #FEF7E0;    /* Amarelo muito sutil */
```

**Semânticas:**
```css
--raio-success: #10B981;   /* Verde */
--raio-error: #EF4444;     /* Vermelho */
--raio-warning: #F59E0B;   /* Laranja */
--raio-info: #3B82F6;      /* Azul */
```

### Tipografia

**Fonte Principal: Urbanist**
```css
/* Headers */
h1: 32px / 700 / 1.2 line-height
h2: 24px / 700 / 1.3 line-height
h3: 20px / 600 / 1.4 line-height
h4: 18px / 600 / 1.4 line-height

/* Body */
p: 16px / 400 / 1.6 line-height
small: 14px / 400 / 1.5 line-height
caption: 12px / 400 / 1.4 line-height
```

### Layout

**Mobile (TikTok Style):**
```
┌─────────────────────────┐
│   Top Navbar            │ ← Header fixo
├─────────────────────────┤
│                         │
│   Scrollable Content    │ ← Conteúdo
│                         │
├─────────────────────────┤
│ [🏠][📚][🤖][👥][👤] │ ← Bottom tabs
└─────────────────────────┘
```

**Desktop:**
```
┌──────┬─────────────────────────────┬──────┐
│      │   Top Navbar                │      │
│      ├─────────────────────────────┤      │
│ Side │                             │      │
│ bar  │   Main Content              │      │
│      │                             │      │
│      │                             │      │
└──────┴─────────────────────────────┴──────┘
```

### Componentes

**Design System Components:**
- Buttons (Primary, Secondary, Ghost, Outline)
- Cards (Course, Book, Post, Product)
- Inputs (Text, Textarea, Select, Checkbox, Radio)
- Navigation (Tabs, Breadcrumbs, Pagination)
- Feedback (Toast, Alert, Modal, Sheet)
- Data Display (Progress, Badge, Avatar, Stats)
- Media (Image, Video, Audio Player)

---

## 🗺️ Jornada do Usuário

### Onboarding (Primeira Experiência)

**Step 1: Welcome Screen**
```
┌─────────────────────────────────┐
│                                  │
│         ⚡ RAIO                  │
│                                  │
│   Fortaleça sua família com      │
│   conteúdo transformador         │
│                                  │
│      [Começar Agora]             │
│                                  │
└─────────────────────────────────┘
```

**Step 2: Segmentação**
```
Qual melhor descreve você?

[ ] Solteiro(a)
[ ] Namorando
[ ] Noivo(a)
[ ] Casado(a)
[ ] Pai/Mãe

(Pode selecionar múltiplos)
```

**Step 3: Interesses**
```
O que você quer desenvolver?

[ ] Relacionamentos
[ ] Comunicação
[ ] Parentalidade
[ ] Propósito de vida
[ ] Finanças familiares
[ ] Intimidade no casamento
```

**Step 4: Objetivos**
```
Qual seu maior desafio agora?

[ ] Melhorar comunicação
[ ] Resolver conflitos
[ ] Criar filhos com propósito
[ ] Encontrar equilíbrio
[ ] Crescer espiritualmente
```

**Step 5: Dashboard Personalizado**
- Curso recomendado
- Livro recomendado
- Primeiro post na comunidade
- Conversa com Conselheiro

### Jornada Típica (Usuário Regular)

**Dia 1-7: Descoberta**
1. Explorar Academia
2. Começar 1 curso
3. Ler introdução de 1 livro
4. Primeira conversa com Conselheiro
5. Primeiro post na comunidade

**Dia 8-30: Engajamento**
1. Concluir primeiro curso
2. Ler primeiro livro completo
3. Engajar regularmente na comunidade
4. Usar Conselheiro para situações específicas
5. Estabelecer streak diário

**Dia 31-90: Transformação**
1. Completar trilha temática
2. Alcançar nível 10
3. Ganhar primeiros badges
4. Ser ativo na comunidade
5. Considerar upgrade para Premium

**Dia 91+: Advocacia**
1. Influenciador na comunidade
2. Criar playlists customizadas
3. Mentorar novos membros
4. Compartilhar transformações
5. Premium member ativo

---

## 💻 Tecnologias e Stack

### Frontend

**Core:**
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Tailwind CSS 4.0** - Styling
- **Vite** - Build Tool

**State Management:**
- **React Context API** - Global State
- **Custom Hooks** - Local State Logic

**Routing:**
- **Conditional Rendering** - Tab-based navigation
- **State-driven Navigation** - Context-based routing

**UI Components:**
- **shadcn/ui** - Component Library
- **Lucide React** - Icons
- **Motion/React** - Animations
- **Recharts** - Data Visualization

**Media:**
- **YouTube API** - Video Integration
- **Custom Audio Player** - Book Audio
- **PDF.js** - PDF Rendering (Books)

### Backend (Supabase)

**Database:**
- PostgreSQL with Row Level Security
- Real-time subscriptions
- Structured data models

**Authentication:**
- Email/Password
- OAuth (Google, Facebook)
- Magic Links

**Storage:**
- Course videos
- Book PDFs and audio
- User avatars
- Course materials

**Functions:**
- Serverless Edge Functions
- Background jobs
- Webhooks

**Real-time:**
- Community posts updates
- Chat messages
- Notifications

### AI Integration

**Conselheiro RAIO:**
- OpenAI GPT-4 API
- Custom system prompts per segment
- Context injection
- Conversation memory
- RAG (Retrieval Augmented Generation) for course content

### Analytics

**User Behavior:**
- Mixpanel / Amplitude
- Custom events tracking
- Funnel analysis
- Cohort retention

**Performance:**
- Vercel Analytics
- Web Vitals monitoring
- Error tracking (Sentry)

---

## 💰 Monetização

### Modelo Freemium

**Free Tier:**
✅ Acesso à comunidade completa
✅ 3 cursos gratuitos
✅ 2 livros gratuitos
✅ Conselheiro limitado (10 mensagens/semana)
✅ Badges e gamificação básica

**Premium Tier (R$ 29,90/mês ou R$ 299/ano):**
✅ Acesso ilimitado a TODOS os cursos
✅ Biblioteca completa de livros
✅ Conselheiro IA ilimitado
✅ Conteúdo exclusivo premium
✅ Badges e missões exclusivas
✅ Download de materiais
✅ Certificados verificados
✅ Suporte prioritário
✅ Eventos ao vivo exclusivos

**Compras Avulsas:**
- Cursos individuais: R$ 49-199
- Livros individuais: R$ 19-49
- Bundles temáticos: R$ 149-399

**Plano Família (R$ 49,90/mês):**
- Até 5 membros
- Perfis separados
- Conteúdo compartilhado
- Dashboard familiar

### Revenue Streams

1. **Assinaturas Premium** (70% da receita esperada)
2. **Compras de Cursos Avulsos** (15%)
3. **Livros Individuais** (10%)
4. **Partnerships e Afiliados** (5%)

---

## 🗓️ Roadmap e Fases

### ✅ Fase 1: MVP Foundation (COMPLETO)
**Q4 2024**

Entregas:
- [x] Design System completo
- [x] Sistema de navegação (5 tabs)
- [x] Onboarding e segmentação
- [x] HomePage personalizada
- [x] Estrutura de gamificação
- [x] Theme (Light/Dark)
- [x] Acessibilidade base

### ✅ Fase 2: Core Features (COMPLETO)
**Q1 2025**

Entregas:
- [x] Academia - Cursos em vídeo
- [x] Biblioteca - Leitor de livros
- [x] Book Reader sincronizado (Read/Listen/Both)
- [x] Conselheiro IA contextual
- [x] Comunidade - Posts e interações
- [x] Sistema de favoritos
- [x] Playlists customizadas

### 🚧 Fase 3: Enhancement (EM PROGRESSO)
**Q2 2025**

Prioridades:
- [ ] Supabase integration completa
- [ ] YouTube API integration
- [ ] Sistema de notificações
- [ ] Chat em tempo real
- [ ] Video player com playlist
- [ ] Certificados de conclusão
- [ ] Sistema de busca avançada

### 📋 Fase 4: Growth (PLANEJADO)
**Q3 2025**

Objetivos:
- [ ] App mobile nativo (React Native)
- [ ] Offline mode
- [ ] Download de conteúdo
- [ ] Push notifications
- [ ] Social sharing
- [ ] Referral program
- [ ] Analytics dashboard

### 🎯 Fase 5: Scale (FUTURO)
**Q4 2025**

Visão:
- [ ] Live streaming de eventos
- [ ] Mentoria 1-on-1 (matchmaking)
- [ ] Grupos privados pagos
- [ ] Marketplace de criadores
- [ ] API pública
- [ ] Integração com calendários
- [ ] Wearables integration (Apple Watch, etc)

---

## 📈 Métricas de Sucesso

### KPIs Principais

**Acquisition:**
- New Users per Month: Meta 1000 (MVP), 10k (Scale)
- Organic vs Paid Ratio: 70/30
- CAC (Customer Acquisition Cost): < R$ 50

**Activation:**
- Onboarding Completion Rate: > 80%
- Time to First Value: < 5 minutos
- Day 1 Retention: > 60%

**Engagement:**
- DAU/MAU: > 0.30
- Sessions per User per Week: > 3
- Avg Session Duration: > 12 minutos
- Course Completion Rate: > 40%
- Book Completion Rate: > 30%

**Retention:**
- Week 1 Retention: > 50%
- Month 1 Retention: > 35%
- Month 3 Retention: > 20%
- Churn Rate: < 10% monthly

**Revenue:**
- Free to Premium Conversion: > 5%
- LTV: > R$ 500
- LTV:CAC: > 5:1
- MRR Growth: +20% monthly

**Community:**
- Posts per Day: > 100
- Avg Comments per Post: > 3
- Active Community Members: > 30% of MAU

---

## 🎯 Casos de Uso Principais

### 1. Maria - Casada e Mãe de 2
**Contexto:** Quer melhorar comunicação com esposo e ser mãe mais presente

**Jornada:**
1. Onboarding: Seleciona "Casada" + "Mãe"
2. Home: Vê curso "Comunicação no Casamento" recomendado
3. Academia: Começa curso, assiste 2 aulas
4. Biblioteca: Descobre livro "Mãe Intencional"
5. Conselheiro: Pede ajuda com conflito sobre disciplina dos filhos
6. Comunidade: Posta pergunta no fórum de mães
7. Gamificação: Ganha badge "Estudante Dedicada" ao completar curso
8. Resultado: Melhora comunicação, sente-se apoiada, vira Premium

### 2. João - Solteiro, 25 anos
**Contexto:** Busca propósito e preparo para relacionamentos futuros

**Jornada:**
1. Onboarding: Seleciona "Solteiro"
2. Home: Vê conteúdo sobre autoconhecimento
3. Academia: Começa curso "Identidade e Propósito"
4. Conselheiro: Conversa sobre medo de relacionamentos
5. Comunidade: Encontra grupo de jovens solteiros
6. Biblioteca: Lê livro "Namoro com Propósito"
7. Resultado: Clareza de valores, pronto para relacionamento saudável

### 3. Ana e Carlos - Noivos
**Contexto:** Querem se preparar bem para o casamento

**Jornada:**
1. Onboarding: Ambos selecionam "Noivos"
2. Home: Veem curso "Preparação Matrimonial"
3. Academia: Fazem curso juntos, fazem exercícios a dois
4. Conselheiro: Pedem ajuda com finanças e expectativas
5. Comunidade: Conectam com outros noivos
6. Biblioteca: Leem "Antes de Dizer Sim" juntos
7. Resultado: Casamento mais preparado e alinhado

---

## 🔐 Segurança e Privacidade

### Proteção de Dados

**Compliance:**
- LGPD (Lei Geral de Proteção de Dados)
- GDPR ready
- Política de privacidade clara
- Termos de uso transparentes

**Dados Coletados:**
- Nome e email (obrigatórios)
- Segmento e interesses (onboarding)
- Progresso de cursos/livros
- Histórico de conversas com IA
- Atividade na comunidade

**Dados NÃO Coletados:**
- CPF (não necessário)
- Dados sensíveis desnecessários
- Localização precisa

**Controle do Usuário:**
- Exportar todos os dados
- Deletar conta (right to be forgotten)
- Controlar visibilidade de perfil
- Opt-out de analytics

### Moderação de Conteúdo

**Comunidade Saudável:**
- Diretrizes claras
- Sistema de denúncias
- Moderação humana + IA
- Penalidades progressivas (warning → timeout → ban)

**Conteúdo Proibido:**
- Discurso de ódio
- Assédio e bullying
- Conteúdo sexual inapropriado
- Spam e golpes
- Desinformação prejudicial

---

## 🌍 Visão de Longo Prazo

### 2026: Expansão Regional
- Lançamento em espanhol (América Latina)
- Adaptação cultural de conteúdo
- Parcerias com criadores locais

### 2027: Plataforma de Criadores
- Professores podem criar cursos
- Sistema de revenue share
- Marketplace de conteúdo
- Certificação de instrutores

### 2028: Ecossistema Completo
- Integração com terapeutas e coaches
- Matching de mentoria
- Eventos presenciais
- Retiros e experiências

### 2030: Impacto Mensurável
- 1 milhão de famílias impactadas
- 100.000 casamentos fortalecidos
- 50.000 pais equipados
- Pesquisas sobre eficácia
- Parceria com universidades

---

## 📞 Contato e Suporte

### Canais de Suporte

**Usuários Free:**
- Help Center (FAQ)
- Email: suporte@raio.com.br
- Comunidade (peer support)
- Tempo de resposta: 48h

**Usuários Premium:**
- Suporte prioritário
- Chat ao vivo
- Email dedicado
- Tempo de resposta: 4h

### Recursos de Ajuda

- Central de Ajuda completa
- Tutoriais em vídeo
- Guias passo-a-passo
- Webinars de onboarding
- Office hours com time

---

## 📝 Considerações Finais

### Diferenciais Competitivos

1. **Abordagem Holística** - Não somos apenas uma plataforma de cursos, nem apenas comunidade. Somos um ecossistema completo.

2. **Personalização Real** - Segmentação dinâmica por contexto de vida, não apenas idade/gênero.

3. **IA Contextual** - Conselheiro que realmente entende seu momento de vida e histórico.

4. **Gamificação Significativa** - Não são apenas pontos vazios. São marcos de transformação real.

5. **Conteúdo Sincronizado** - Experiência de leitura premium com áudio + texto integrados.

6. **Comunidade Saudável** - Moderação ativa e valores claros criam ambiente seguro.

### Desafios e Mitigações

**Desafio:** Produção de conteúdo para todos os segmentos
**Mitigação:** Foco inicial em 2-3 segmentos prioritários, expansão gradual

**Desafio:** Moderação de comunidade em escala
**Mitigação:** IA + moderadores + empoderamento da comunidade

**Desafio:** Conversão Free → Premium
**Mitigação:** Value ladder claro, content gating estratégico, demonstração de valor

**Desafio:** Retenção de longo prazo
**Mitigação:** Gamificação, novo conteúdo regular, comunidade engajada

### Próximos Passos Imediatos

1. ✅ Finalizar integração Supabase
2. ✅ Lançar beta privado (100 usuários)
3. ✅ Coletar feedback inicial
4. ✅ Iterar baseado em dados
5. ✅ Preparar lançamento público

---

**Documento vivo** - Última atualização: Janeiro 2025
**Versão:** 2.0
**Responsável:** Equipe RAIO

---

