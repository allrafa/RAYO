# 🚀 RAIO - Guia de Setup e Instalação

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 9.0.0 (vem com Node.js)
- **Git** ([Download](https://git-scm.com/))

## 🛠️ Instalação

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/raio-ecosystem.git
cd raio-ecosystem
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure as Variáveis de Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com seus valores
nano .env  # ou use seu editor preferido
```

**Variáveis Obrigatórias:**

```bash
VITE_ENVIRONMENT=development
VITE_APP_VERSION=1.0.0
```

**Variáveis Opcionais (mas recomendadas):**

- **Mixpanel** (Analytics): Crie conta em https://mixpanel.com/register/
- **GrowthBook** (Feature Flags): Crie conta em https://www.growthbook.io/
- **Supabase** (Backend): Crie projeto em https://supabase.com/

### 4. Inicie o Servidor de Desenvolvimento

```bash
npm run dev
```

A aplicação estará rodando em: **http://localhost:5173**

---

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento

# Build
npm run build            # Gera build de produção
npm run preview          # Preview do build de produção

# Qualidade de Código
npm run lint             # Roda ESLint
npm run type-check       # Verifica tipos TypeScript
```

---

## 🏗️ Estrutura do Projeto

```
/
├── App.tsx                     # Componente raiz
├── index.html                  # HTML base
├── vite.config.ts              # Configuração Vite
├── tsconfig.json               # Configuração TypeScript
├── package.json                # Dependências
├── .env.example                # Template de variáveis
│
├── components/                 # Componentes React
│   ├── layout/                # Layout (Sidebar, Navbar, etc)
│   ├── onboarding/            # Fluxo de onboarding
│   ├── gamification/          # Sistema de gamificação
│   ├── academy/               # Academia RAIO
│   ├── community/             # Comunidade
│   └── ui/                    # Componentes UI (Radix)
│
├── lib/                       # Bibliotecas e serviços
│   ├── analytics/             # Mixpanel
│   ├── privacy/               # LGPD/Consent
│   └── lessons/               # Conteúdo de lições
│
├── hooks/                     # Custom React Hooks
├── styles/                    # Estilos globais
└── docs/                      # Documentação (70+ arquivos)
```

---

## 🔧 Configuração de Serviços

### 📊 Mixpanel (Analytics)

1. Acesse: https://mixpanel.com/register/
2. Crie um projeto: "RAIO - Development"
3. Copie o **Project Token**
4. Adicione no `.env`:

```bash
VITE_MIXPANEL_TOKEN=seu_token_aqui
VITE_ANALYTICS_ENABLED=true
```

### 🧪 GrowthBook (Feature Flags)

1. Acesse: https://www.growthbook.io/
2. Crie uma conta
3. Copie **API Host** e **Client Key**
4. Adicione no `.env`:

```bash
VITE_GROWTHBOOK_API_HOST=https://cdn.growthbook.io
VITE_GROWTHBOOK_CLIENT_KEY=seu_client_key_aqui
```

### 🗄️ Supabase (Backend)

1. Acesse: https://supabase.com/
2. Crie um novo projeto
3. Em **Settings > API**, copie:
   - **URL**
   - **anon/public key**
4. Adicione no `.env`:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

---

## 🎨 Design System

O projeto usa **Tailwind CSS v4** com design system customizado:

- **Tipografia**: Urbanist (Google Fonts)
- **Cores**: Off-white, Preto, Cinza + Acentos Amarelos
- **Espaçamento**: Sistema baseado em 4px
- **Componentes**: Radix UI + shadcn/ui

**Arquivo de estilos:** `/styles/globals.css`

---

## 🧪 Desenvolvimento

### Hot Module Replacement (HMR)

O Vite oferece HMR ultra-rápido. Suas mudanças aparecerão instantaneamente sem reload da página.

### TypeScript

O projeto usa **TypeScript estrito** para máxima segurança de tipos.

```bash
# Verificar tipos sem build
npm run type-check
```

### Linting

```bash
# Rodar ESLint
npm run lint

# Auto-fix problemas
npm run lint -- --fix
```

---

## 📱 Responsividade

A aplicação é **mobile-first** com breakpoints:

- **Mobile**: < 768px → Bottom bar com 5 tabs
- **Desktop**: ≥ 768px → Sidebar lateral + Top navbar

---

## 🚀 Build de Produção

### 1. Criar Build

```bash
npm run build
```

Isso gera uma pasta `/dist` otimizada.

### 2. Preview Local

```bash
npm run preview
```

### 3. Deploy

**Vercel** (Recomendado):

```bash
npm install -g vercel
vercel
```

**Netlify**:

```bash
npm install -g netlify-cli
netlify deploy --prod
```

---

## 🔐 Segurança

### Variáveis de Ambiente

⚠️ **IMPORTANTE**: 

- **NUNCA** commite o arquivo `.env`
- Variáveis com prefixo `VITE_` são expostas no client-side
- Não coloque secrets sensíveis em variáveis `VITE_`
- Use `.env.example` como template

### LGPD Compliance

O projeto tem sistema LGPD completo implementado:

- Cookie consent banner
- Gerenciamento de preferências
- Right to be forgotten
- Data retention policies

---

## 📊 Analytics e Tracking

### Eventos Rastreados

- **Onboarding**: Início, conclusão, steps
- **Academia**: Lições, cursos, progresso
- **Comunidade**: Posts, comentários, upvotes
- **Gamificação**: XP, badges, level-ups

Ver taxonomia completa em: `/lib/analytics/mixpanel.ts`

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"

```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Port 5173 already in use"

```bash
# Mate o processo na porta
npx kill-port 5173

# Ou use outra porta
npm run dev -- --port 3000
```

### Erro: "TypeScript errors"

```bash
# Verifique tipos
npm run type-check

# Reinstale @types
npm install -D @types/react @types/react-dom
```

### Mixpanel não está trackando

1. Verifique se `VITE_MIXPANEL_TOKEN` está no `.env`
2. Reinicie o servidor (`Ctrl+C` e `npm run dev`)
3. Abra console do browser e procure por logs `📊 Analytics Event:`

---

## 📚 Documentação Completa

Este projeto tem **70+ arquivos de documentação** em `/docs`:

- **`/RAIO_PROJECT_OVERVIEW.md`** - Documento master (7.500+ palavras)
- **`/INDEX_MASTER.md`** - Índice de toda documentação
- **Sprints 1-3** - Documentação detalhada de cada sprint

---

## 🤝 Contribuindo

1. Crie uma branch: `git checkout -b feature/nova-feature`
2. Commit suas mudanças: `git commit -m 'feat: adiciona nova feature'`
3. Push para branch: `git push origin feature/nova-feature`
4. Abra um Pull Request

**Convenções de Commit:**

- `feat:` Nova feature
- `fix:` Bug fix
- `docs:` Mudanças na documentação
- `style:` Formatação, ponto e vírgula, etc
- `refactor:` Refatoração de código
- `test:` Adicionar testes
- `chore:` Manutenção

---

## 📞 Suporte

- **Documentação**: `/RAIO_PROJECT_OVERVIEW.md`
- **Issues**: GitHub Issues
- **Email**: suporte@raio.app

---

## 📄 Licença

**UNLICENSED** - Propriedade privada da RAIO Team

---

## ✨ Próximos Passos

Após setup completo:

1. ✅ Explore o onboarding flow
2. ✅ Teste a Academia com Lição 0
3. ✅ Configure Mixpanel e veja eventos
4. ✅ Personalize o design system
5. ✅ Leia `/RAIO_PROJECT_OVERVIEW.md` para contexto completo

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0.0  
**Status**: ✅ Pronto para desenvolvimento

🌩️ **RAIO** - Fortaleça Sua Família
