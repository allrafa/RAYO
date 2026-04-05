# ⚡ RAIO - Quick Start Guide

## 🚀 Setup em 3 Minutos

### 1️⃣ Instalar

```bash
npm install
```

### 2️⃣ Configurar

```bash
# Arquivo .env já existe com valores de desenvolvimento
# Para produção, edite:
nano .env
```

### 3️⃣ Rodar

```bash
npm run dev
```

**Pronto!** 🎉 Acesse: http://localhost:5173

---

## 📋 Checklist Pós-Instalação

### Básico (Obrigatório)

- [ ] `npm install` executado sem erros
- [ ] Servidor rodando em `localhost:5173`
- [ ] Aplicação carrega sem erros no console
- [ ] Onboarding aparece na primeira visita

### Analytics (Opcional)

- [ ] Criar conta Mixpanel → https://mixpanel.com/register/
- [ ] Copiar token e adicionar em `VITE_MIXPANEL_TOKEN`
- [ ] Reiniciar servidor (`Ctrl+C` e `npm run dev`)
- [ ] Ver eventos no console: `📊 Analytics Event:`

### Backend (Opcional)

- [ ] Criar projeto Supabase → https://supabase.com/
- [ ] Copiar URL e anon key
- [ ] Adicionar em `.env`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

---

## 🎯 Comandos Essenciais

```bash
# Desenvolvimento
npm run dev              # Inicia servidor (porta 5173)

# Build
npm run build            # Gera build otimizado (/dist)
npm run preview          # Testa build local (porta 4173)

# Qualidade
npm run lint             # Verifica código
npm run type-check       # Verifica tipos TS
```

---

## 🗂️ Estrutura Principal

```
/
├── App.tsx                   # 🎯 Componente raiz - COMECE AQUI
├── index.html                # HTML base
│
├── components/               # Componentes React
│   ├── HomePage.tsx         # Feed principal
│   ├── AcademiaPage.tsx     # Cursos e lições
│   ├── ComunidadePage.tsx   # Fóruns
│   ├── PerfilPage.tsx       # Perfil do usuário
│   └── Onboarding.tsx       # Fluxo de onboarding
│
├── lib/                     # Serviços
│   ├── analytics/           # Mixpanel
│   ├── privacy/             # LGPD
│   └── lessons/             # Conteúdo
│
├── styles/
│   └── globals.css          # 🎨 Design system + Tailwind
│
└── docs/                    # 70+ arquivos de documentação
    └── RAIO_PROJECT_OVERVIEW.md  # 📚 LEIA ISTO!
```

---

## 🎨 Design System

### Cores

```css
/* Principais */
--color-white: #FAFAFA      /* Off-white */
--color-black: #0A0A0A      /* Preto profundo */
--color-yellow: #FFC700     /* Amarelo RAIO */

/* Grays */
--color-gray-100 a 900
```

### Tipografia

**Fonte:** Urbanist (Google Fonts)

```tsx
/* ❌ Evite classes de font no Tailwind */
<h1 className="text-4xl font-bold">  // ❌ Não usar

/* ✅ Use HTML semântico - estilos vêm do globals.css */
<h1>Meu Título</h1>              // ✅ Correto
```

### Espaçamento

Sistema baseado em **4px**:

```tsx
className="p-4 gap-2 m-8"
// p-4 = 16px, gap-2 = 8px, m-8 = 32px
```

---

## 📱 Layout Responsivo

### Mobile (< 768px)

```tsx
Bottom Bar com 5 tabs:
[Home] [Academia] [Comunidade] [Perfil] [Config]
```

### Desktop (≥ 768px)

```tsx
┌──────────┬─────────────────┐
│ Sidebar  │   Top Navbar    │
│  (240px) ├─────────────────┤
│          │   Main Content  │
│  [Nav]   │                 │
│  [Nav]   │                 │
│  [Nav]   │                 │
└──────────┴─────────────────┘
```

---

## 🔌 Integrações

### Mixpanel (Analytics)

```typescript
import { analytics } from './lib/analytics/mixpanel';

// Track evento
analytics.track('BUTTON_CLICKED', {
  button_name: 'CTA Principal',
  page: 'Home'
});

// Identificar usuário
analytics.identify('user_123', {
  name: 'Maria',
  email: 'maria@email.com'
});
```

### Supabase (Backend)

```typescript
import { supabase } from './lib/supabase';

// Query
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);

// Insert
const { data, error } = await supabase
  .from('lessons')
  .insert({ title: 'Nova Lição' });
```

---

## 🎮 Gamificação

### Sistema de XP

```typescript
// Ações e XP
Completar lição: 50 XP
Completar curso: 200 XP
Post na comunidade: 10 XP
Comentário: 5 XP
Login diário: 5 XP
```

### Badges

30+ badges em 5 categorias:
- 🎯 Progresso
- 🔥 Engajamento
- 📚 Aprendizado
- 👥 Comunidade
- 🌟 Especiais

### Streaks

```typescript
Sequência mantida → Badge especial
Quebrar sequência → Streak saver (1x perdão)
```

---

## 🐛 Troubleshooting Rápido

### Porta em uso?

```bash
npx kill-port 5173
npm run dev
```

### Módulo não encontrado?

```bash
rm -rf node_modules package-lock.json
npm install
```

### Mixpanel não funciona?

1. Verifique `.env` tem `VITE_MIXPANEL_TOKEN`
2. Reinicie servidor
3. Abra console do browser
4. Procure por: `📊 Analytics Event:`

### TypeScript errors?

```bash
npm run type-check
```

---

## 📚 Documentação Completa

| Documento | Descrição |
|-----------|-----------|
| `/RAIO_PROJECT_OVERVIEW.md` | 📚 Documento master (7.500+ palavras) |
| `/README_SETUP.md` | 🚀 Guia completo de setup |
| `/ANALYTICS_SETUP_GUIDE.md` | 📊 Como configurar Mixpanel |
| `/ARQUIVOS_CRIADOS.md` | ✅ Lista de arquivos criados |
| `/INDEX_MASTER.md` | 🗂️ Índice de toda documentação |

---

## 🎯 Fluxo Recomendado

### Primeira Vez

1. ✅ Instalar: `npm install`
2. ✅ Rodar: `npm run dev`
3. ✅ Explorar onboarding completo
4. ✅ Testar Academia → Lição 0
5. ✅ Ver sistema de gamificação
6. ✅ Ler `/RAIO_PROJECT_OVERVIEW.md`

### Desenvolvimento

1. ✅ Criar branch: `git checkout -b feature/minha-feature`
2. ✅ Desenvolver
3. ✅ Lint: `npm run lint`
4. ✅ Type check: `npm run type-check`
5. ✅ Commit: `git commit -m "feat: nova feature"`
6. ✅ Push e PR

### Deploy

1. ✅ Build: `npm run build`
2. ✅ Preview local: `npm run preview`
3. ✅ Deploy: `vercel` ou `netlify deploy`

---

## 🔐 Variáveis de Ambiente

### Mínimas (Funcionam com valores default)

```bash
VITE_ENVIRONMENT=development
VITE_APP_VERSION=1.0.0
```

### Recomendadas (Para produção)

```bash
VITE_MIXPANEL_TOKEN=seu_token_real
VITE_SUPABASE_URL=sua_url_real
VITE_SUPABASE_ANON_KEY=sua_key_real
```

### Ver todas

```bash
cat .env.example
```

---

## 💡 Dicas Pro

### Import Aliases

```typescript
// ❌ Imports relativos longos
import { Button } from '../../../components/ui/button';

// ✅ Use aliases
import { Button } from '@/components/ui/button';
```

### Hot Module Replacement

Vite tem HMR ultra-rápido. Suas mudanças aparecem **instantaneamente** sem reload!

### Analytics em Dev

Mesmo sem token do Mixpanel, todos os eventos são logados no console:

```
📊 Analytics Event: LESSON_COMPLETED { ... }
👤 User identified: user_123
```

### LocalStorage

Onboarding e dados são salvos em LocalStorage. Para resetar:

```javascript
// No console do browser:
localStorage.clear();
location.reload();
```

Ou use o botão debug no canto superior direito (dev mode).

---

## ✨ Features Principais

### ✅ Implementado

- [x] Onboarding inteligente (5 steps)
- [x] Layout responsivo (mobile + desktop)
- [x] Academia RAIO (cursos e lições)
- [x] Comunidade (fóruns e posts)
- [x] Gamificação 2.0 (XP, badges, missions, streaks)
- [x] Analytics (Mixpanel)
- [x] Feature flags (GrowthBook)
- [x] LGPD compliance
- [x] Lição 0 completa

### 🚧 Em Progresso

- [ ] Integração Supabase completa
- [ ] Conselheiro IA
- [ ] Sistema de pagamentos
- [ ] Push notifications

---

## 📞 Ajuda

**Dúvidas?** Verifique:

1. ✅ `/README_SETUP.md` - Setup completo
2. ✅ `/RAIO_PROJECT_OVERVIEW.md` - Visão geral
3. ✅ Console do browser - Erros aparecem aqui
4. ✅ Terminal - Erros de build aparecem aqui

---

## 🎉 Sucesso!

Se você chegou até aqui e o projeto está rodando, **parabéns!** 🎉

Você tem em mãos uma plataforma completa de educação familiar com:

- ✅ Frontend React moderno
- ✅ Design system profissional
- ✅ Gamificação completa
- ✅ Analytics configurado
- ✅ Arquitetura escalável
- ✅ 70+ documentos de referência

**Próximo passo:** Explore o código e construa algo incrível! 🚀

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0.0  
**Status**: ✅ Pronto para desenvolvimento

🌩️ **RAIO** - Fortaleça Sua Família
