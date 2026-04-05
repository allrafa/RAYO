# RAIO - Plataforma de Fortalecimento Familiar

![RAIO Logo](https://via.placeholder.com/150x50/FFEB3B/000000?text=RAIO)

## 📖 Sobre o Projeto

RAIO é uma plataforma completa para fortalecer famílias através de conteúdo transformador, comunidade engajada e recursos práticos. A plataforma oferece experiências personalizadas para diferentes contextos de vida (solteiro, namoro, noivos, casados, pais).

### 🎯 Métrica North Star
**Weekly Active Premium Members (WAPM)** - Membros premium ativos semanalmente

## ✨ Funcionalidades Principais

### 🎓 Academia RAIO
- Cursos pagos estruturados por contexto de vida
- Sistema de progresso e certificados
- Conteúdo em vídeo, texto e exercícios práticos

### 👥 Comunidade
- Fóruns temáticos por contexto de vida
- Sistema de posts, comentários e reações
- Moderação e guidelines comunitárias

### 🎮 Gamificação
- Sistema de badges e conquistas
- Missões diárias e semanais
- Níveis e progressão de experiência
- Streaks e recompensas

### 📊 Dashboard Personalizado
- Visão geral do progresso
- Recomendações personalizadas
- Estatísticas e métricas pessoais

## 🛠️ Stack Técnica

- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS v4
- **Build Tool:** Vite
- **Backend:** Supabase (Auth, Database, Storage)
- **Analytics:** Mixpanel
- **Feature Flags:** GrowthBook
- **Routing:** React Router v7

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Node.js 18+ 
- npm ou pnpm

### Instalação

1. **Clone o repositório:**
```bash
git clone [URL_DO_SEU_REPOSITORIO]
cd raio-platform
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**

Crie um arquivo `.env` na raiz do projeto:

```env
# Supabase
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima

# Mixpanel
VITE_MIXPANEL_TOKEN=seu_token_mixpanel

# GrowthBook
VITE_GROWTHBOOK_API_KEY=sua_api_key
VITE_GROWTHBOOK_CLIENT_KEY=sua_client_key
```

4. **Rode o projeto:**
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

### Scripts Disponíveis

```bash
npm run dev          # Inicia o servidor de desenvolvimento
npm run build        # Cria build de produção
npm run preview      # Preview do build de produção
npm run lint         # Roda o linter
npm run type-check   # Verifica tipos TypeScript
```

## 📱 Design System

### Tipografia
- **Fonte Principal:** Urbanist
- **Hierarquia:** Content-first com tamanhos semânticos

### Paleta de Cores
- **Primária:** Off-white (#FAFAFA)
- **Secundária:** Preto (#0A0A0A)
- **Acentos:** Amarelo (#FFEB3B)
- **Neutros:** Escala de cinza

### Princípios de Design
- ✅ Content-first
- ✅ Motion purposeful (não decorativo)
- ✅ Acessibilidade completa (WCAG 2.1 AA)
- ✅ Mobile-first e responsivo

## 📐 Arquitetura

### Layout
- **Mobile:** Bottom bar com 5 tabs
- **Desktop:** Sidebar lateral + Top navbar

### Estrutura de Pastas
```
/
├── components/        # Componentes reutilizáveis
├── lib/              # Utilitários e configurações
├── hooks/            # Custom React hooks
├── styles/           # Estilos globais e tokens
├── types/            # TypeScript types
├── routes/           # Configuração de rotas
└── App.tsx           # Componente principal
```

## 🔒 Segurança e Compliance

- ✅ LGPD compliance implementado
- ✅ Gestão de consentimento de cookies
- ✅ Política de privacidade integrada
- ✅ Auth segura via Supabase

## 📊 Analytics e Feature Flags

### Mixpanel
Eventos rastreados:
- Navegação entre páginas
- Conclusão de cursos
- Interações na comunidade
- Conquistas de badges

### GrowthBook
Feature flags configurados para:
- Novas funcionalidades em teste
- A/B tests
- Rollout gradual de features

## 🚢 Deploy

### Replit (Recomendado para desenvolvimento)
1. Importe o repositório no Replit
2. Configure as Secrets com as variáveis de ambiente
3. Execute `npm install && npm run dev`

### Produção
```bash
npm run build
```
Os arquivos otimizados estarão em `/dist`

## 📝 Status do Desenvolvimento

### ✅ Sprint 1 - Fundação (Concluído)
- Setup inicial do projeto
- Design system base
- Autenticação e onboarding
- Layout responsivo

### ✅ Sprint 2 - Core Features (Concluído)
- Academia RAIO com cursos
- Sistema de comunidade
- Gamificação completa

### ✅ Sprint 3 - Polish (Concluído)
- Analytics integrado
- LGPD compliance
- Otimizações de performance
- Documentação completa

## 🤝 Contribuindo

Este é um projeto privado. Para contribuir, entre em contato com a equipe.

## 📄 Licença

Todos os direitos reservados © 2026 RAIO

## 📧 Contato

Para mais informações sobre o projeto RAIO, entre em contato através dos canais oficiais.

---

**Desenvolvido com ❤️ pela equipe RAIO**
