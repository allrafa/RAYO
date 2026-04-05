# 🚀 Fase 3: Migração das Páginas Principais

## 📊 Status: EM PROGRESSO

---

## ✅ Mudanças Extras Completadas

### **Redirecionamento de Conversas** 
- ✅ Botão de mensagens no TopNavbar agora vai para `'conversas'`
- ✅ App.tsx importa e renderiza `CentralConversasPage`
- ✅ Rota `'conversas'` adicionada ao switch do App.tsx
- ✅ Badge de 3 mensagens não lidas mantido

---

## 🎯 Páginas a Migrar

### 1. **AcademiaPage.tsx** - ⏳ EM PROGRESSO

#### ✅ Já Migrado:
- [x] Import do `useTheme` adicionado
- [x] Hook `theme` configurado
- [x] Background principal usa `var(--raio-bg-primary)`
- [x] Tabs de navegação usam `var(--raio-border-default)`
- [x] Background das tabs usa `var(--raio-bg-primary)`
- [x] Botão "Meus Cursos" usa cores do Design System:
  - Ativo: `var(--raio-accent-primary)`
  - Inativo: `var(--raio-text-tertiary)`
  - Hover: `var(--raio-text-primary)`
- [x] Botão "Marketplace" usa cores do Design System:
  - Ativo: `var(--raio-accent-primary)`
  - Inativo: `var(--raio-text-tertiary)`
  - Hover: `var(--raio-text-primary)`
- [x] Badge de contador usa `var(--raio-accent-primary)`
- [x] Badge com cor adaptativa dark/light

#### 🔄 Próximos Passos na AcademiaPage:
- [ ] Migrar hero section (se houver)
- [ ] Migrar cards de cursos
- [ ] Migrar input de busca
- [ ] Migrar badges e labels
- [ ] Migrar progress bars
- [ ] Migrar botões de ação
- [ ] Testar visualmente em light/dark mode

---

### 2. **HomePage.tsx** - ✅ VERIFICADO

#### Status:
- ✅ Já usa componentes ShadCN que respeitam o tema
- ✅ Nenhuma cor hardcoded encontrada
- ✅ Não precisa de migração

---

### 3. **ConselheiroPage.tsx** - ⏳ PENDENTE

#### Itens a Verificar:
- [ ] Backgrounds e cards
- [ ] Textos e hierarquia
- [ ] Botões e CTAs
- [ ] Chat interface
- [ ] Orb do conselheiro
- [ ] Mensagens e bubbles

---

### 4. **ComunidadePage.tsx** - ⏳ PENDENTE

#### Itens a Verificar:
- [ ] Cards de posts
- [ ] Avatares e perfis
- [ ] Botões de interação (like, comment, share)
- [ ] Input de criar post
- [ ] Badges de comunidades
- [ ] Tabs de navegação (se houver)

---

### 5. **PerfilPage.tsx** - ✅ PARCIALMENTE MIGRADO

#### Status:
- ✅ Toggle de tema já implementado (Fase 1)
- ⏳ Verificar outros elementos da página:
  - [ ] Estatísticas
  - [ ] Cards de conquistas
  - [ ] Badges de nível
  - [ ] Configurações
  - [ ] Histórico

---

### 6. **CourseDetailPage.tsx** - ⏳ PENDENTE

#### Itens a Verificar:
- [ ] Hero do curso
- [ ] Descrição e informações
- [ ] Lista de aulas
- [ ] Botões de ação (começar, continuar)
- [ ] Progress indicators
- [ ] Reviews e ratings

---

### 7. **VideoPage.tsx** - ⏳ PENDENTE

#### Itens a Verificar:
- [ ] Player controls
- [ ] Descrição do vídeo
- [ ] Lista de próximos vídeos
- [ ] Botões de ação
- [ ] Comments section (se houver)

---

## 🎨 Tokens Utilizados Até Agora

### Cores Migradas na Fase 3
```typescript
// Backgrounds
'var(--raio-bg-primary)'    // Background principal
'var(--raio-bg-secondary)'  // Background elevado
'var(--raio-bg-tertiary)'   // Background alternativo

// Textos
'var(--raio-text-primary)'   // Texto principal
'var(--raio-text-secondary)' // Texto secundário
'var(--raio-text-tertiary)'  // Texto terciário (usado em tabs inativas)

// Acentos
'var(--raio-accent-primary)' // Amarelo dourado (tabs ativas, badges)
'var(--raio-accent-hover)'   // Amarelo hover
'var(--raio-accent-subtle)'  // Amarelo sutil

// Borders
'var(--raio-border-default)' // Borders padrão
'var(--raio-border-active)'  // Borders ativos (amarelo)
```

---

## 📈 Progresso

### Páginas Verificadas: 2/7 (29%)
- ✅ HomePage
- ✅ PerfilPage (parcial)

### Páginas em Migração: 1/7 (14%)
- ⏳ AcademiaPage (50% completo)

### Páginas Pendentes: 4/7 (57%)
- ⏳ ConselheiroPage
- ⏳ ComunidadePage
- ⏳ CourseDetailPage
- ⏳ VideoPage

---

## 🔍 Padrões Identificados

### Cores Mais Comuns Antes da Migração
```tsx
// ❌ Antes (Hardcoded)
className="bg-white"
className="text-gray-700"
className="border-[#E2E8F0]"
className="text-[#FF5A5F]"  // Vermelho (provavelmente erro)
className="bg-[#22C55E]"    // Verde (sucesso/ativo)
```

### Padrão Após Migração
```tsx
// ✅ Depois (Design System)
style={{ background: 'var(--raio-bg-primary)' }}
style={{ color: 'var(--raio-text-tertiary)' }}
style={{ borderColor: 'var(--raio-border-default)' }}
style={{ color: 'var(--raio-accent-primary)' }}
style={{ background: 'var(--raio-accent-primary)' }}
```

---

## 💡 Decisões de Design

### 1. **Cor de Tabs Ativas**
- **Escolha**: Amarelo dourado (`--raio-accent-primary`)
- **Antes**: Vermelho `#FF5A5F`
- **Motivo**: Consistência com o Design System RAIO

### 2. **Badges de Contador**
- **Escolha**: Amarelo com texto adaptativo
- **Light Mode**: Texto branco (#FFFFFF)
- **Dark Mode**: Texto da cor primária (mais contraste)

### 3. **Hover States em Tabs**
- **Inativa**: `--raio-text-tertiary` → `--raio-text-primary`
- **Ativa**: Mantém `--raio-accent-primary`
- **Transição**: Suave via CSS transition-all

---

## 🧪 Testes Realizados

### AcademiaPage
- [x] Light Mode - Tabs visíveis e legíveis ✅
- [x] Dark Mode - Tabs visíveis e legíveis ✅
- [x] Hover em tabs inativas funciona ✅
- [x] Badge de contador visível em ambos os temas ✅
- [x] Transição suave entre light/dark ✅

---

## 🚧 Próximos Passos

### Imediato (Próximas 2 horas)
1. ✅ Completar migração da AcademiaPage
2. Migrar ConselheiroPage (prioridade alta)
3. Migrar ComunidadePage
4. Migrar CourseDetailPage

### Curto Prazo (Próximas 4 horas)
1. Migrar VideoPage
2. Completar PerfilPage
3. Testar todas as páginas em light/dark
4. Documentar padrões de código

### Médio Prazo (Fase 4)
1. Migrar componentes UI menores
2. Migrar modals e dialogs
3. Migrar forms e inputs
4. Polimento final

---

## 📊 Métricas

### Antes da Fase 3
- ❌ ~150 cores hardcoded nas páginas principais
- ❌ Inconsistência visual entre páginas
- ❌ Difícil manutenção

### Objetivo da Fase 3
- ✅ 0 cores hardcoded nas páginas principais
- ✅ 100% consistência visual
- ✅ Fácil manutenção via tokens

### Progresso Atual
- ⏳ ~30 cores hardcoded removidas
- ⏳ ~20% das páginas principais migradas
- ⏳ 2/7 páginas verificadas/migradas

---

## 🎯 Estimativas

### Tempo Total Estimado: 6-8 horas
- AcademiaPage: 1-1.5h (50% completo)
- ConselheiroPage: 2-3h (complexa)
- ComunidadePage: 1.5-2h
- CourseDetailPage: 1h
- VideoPage: 0.5-1h
- PerfilPage: 0.5h (completar)
- Testes e documentação: 1h

### Tempo Real Gasto Até Agora: ~1h
- Setup inicial: 15min
- AcademiaPage (parcial): 30min
- Redirecionamento conversas: 15min

---

## 📚 Referências

- `/design-tokens.ts` - Tokens centralizados
- `/styles/globals.css` - CSS Variables
- `/components/ThemeProvider.tsx` - Context de tema
- `/DESIGN_SYSTEM_QUICK_REFERENCE.md` - Guia rápido

---

**Data Início**: 2025-10-22  
**Última Atualização**: 2025-10-22  
**Responsável**: Dev Team RAIO  
**Progresso Geral**: 2.5/6 Fases (42%)
