# 🎨 RAIO Design System - Guia de Uso

**Versão**: 2.0  
**Data**: 2025-10-23  
**Status**: ✅ Ativo

---

## 📖 INTRODUÇÃO

Este guia ensina como usar o Design System RAIO para criar novos componentes e páginas que sejam **consistentes, acessíveis e bonitos**.

---

## 🎨 CORES - COMO USAR

### ❌ NUNCA FAÇA ISSO:
```tsx
// ❌ Cores hardcoded
<div className="bg-yellow-400 text-gray-700">
<Button className="bg-green-600 hover:bg-green-700">
<p className="text-black dark:text-white">
```

### ✅ SEMPRE FAÇA ISSO:
```tsx
// ✅ CSS Variables do Design System
<div style={{ 
  background: 'var(--raio-bg-secondary)',
  color: 'var(--raio-text-primary)'
}}>

<Button
  style={{
    background: 'var(--raio-accent-primary)',
    color: '#FFFFFF',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = 'var(--raio-accent-hover)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = 'var(--raio-accent-primary)';
  }}
>
  Ação
</Button>

<p style={{ color: 'var(--raio-text-primary)' }}>
```

---

## 🎯 PADRÕES PRINCIPAIS

### 1. Botão Amarelo RAIO (Principal)

```tsx
<Button
  style={{
    background: 'var(--raio-accent-primary)',
    color: '#FFFFFF',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = 'var(--raio-accent-hover)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = 'var(--raio-accent-primary)';
  }}
>
  <Icon className="w-4 h-4 mr-2" />
  Texto do Botão
</Button>
```

### 2. Botão Secundário (Outline)

```tsx
<Button
  variant="outline"
  style={{
    borderColor: 'var(--raio-border-default)',
    color: 'var(--raio-text-primary)',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.borderColor = 'var(--raio-accent-primary)';
    e.currentTarget.style.color = 'var(--raio-accent-primary)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.borderColor = 'var(--raio-border-default)';
    e.currentTarget.style.color = 'var(--raio-text-primary)';
  }}
>
  Ação Secundária
</Button>
```

### 3. Card Padrão

```tsx
<Card
  style={{
    background: 'var(--raio-bg-secondary)',
    borderColor: 'var(--raio-border-default)',
  }}
>
  <CardHeader>
    <CardTitle style={{ color: 'var(--raio-text-primary)' }}>
      Título do Card
    </CardTitle>
    <CardDescription style={{ color: 'var(--raio-text-secondary)' }}>
      Descrição do card
    </CardDescription>
  </CardHeader>
  
  <CardContent>
    <p style={{ color: 'var(--raio-text-primary)' }}>
      Conteúdo principal
    </p>
    <p style={{ color: 'var(--raio-text-tertiary)' }}>
      Texto secundário
    </p>
  </CardContent>
</Card>
```

### 4. Badge Amarelo RAIO

```tsx
<Badge
  style={{
    background: 'var(--raio-accent-light)',
    color: 'var(--raio-accent-primary)',
  }}
>
  Premium
</Badge>
```

### 5. Badge Secundário

```tsx
<Badge
  variant="secondary"
  style={{
    background: 'var(--raio-bg-tertiary)',
    color: 'var(--raio-text-secondary)',
  }}
>
  Tag
</Badge>
```

### 6. Input com Focus State

```tsx
<Input
  placeholder="Digite algo..."
  className="transition-all"
  style={{
    background: 'var(--raio-bg-secondary)',
    borderColor: 'var(--raio-border-default)',
    color: 'var(--raio-text-primary)',
  }}
  onFocus={(e) => {
    e.currentTarget.style.borderColor = 'var(--raio-accent-primary)';
  }}
  onBlur={(e) => {
    e.currentTarget.style.borderColor = 'var(--raio-border-default)';
  }}
/>
```

### 7. Tabs Navigation

```tsx
<Button
  variant="ghost"
  className="relative px-6 py-3 rounded-none border-b-2 transition-all"
  onClick={() => setView("tab")}
  style={{ 
    fontWeight: currentView === "tab" ? 700 : 500,
    borderColor: currentView === "tab" ? 'var(--raio-accent-primary)' : 'transparent',
    color: currentView === "tab" ? 'var(--raio-accent-primary)' : 'var(--raio-text-tertiary)',
  }}
  onMouseEnter={(e) => {
    if (currentView !== "tab") {
      e.currentTarget.style.color = 'var(--raio-text-primary)';
    }
  }}
  onMouseLeave={(e) => {
    if (currentView !== "tab") {
      e.currentTarget.style.color = 'var(--raio-text-tertiary)';
    }
  }}
>
  Nome da Tab
</Button>
```

### 8. Avatar com Gradient Amarelo

```tsx
<Avatar 
  className="w-16 h-16"
  style={{
    background: 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)',
  }}
>
  <AvatarFallback className="bg-transparent text-white">
    R
  </AvatarFallback>
</Avatar>
```

### 9. Container de Página

```tsx
<div 
  className="min-h-screen"
  style={{ background: 'var(--raio-bg-primary)' }}
>
  {/* Conteúdo da página */}
</div>
```

### 10. Section Header

```tsx
<div 
  style={{ 
    background: 'var(--raio-bg-secondary)',
    borderBottom: '1px solid var(--raio-border-default)'
  }}
>
  <div className="max-w-7xl mx-auto px-6 py-6">
    <h1 
      className="text-3xl mb-2" 
      style={{ 
        fontWeight: 800,
        color: 'var(--raio-text-primary)' 
      }}
    >
      Título da Seção
    </h1>
    <p style={{ color: 'var(--raio-text-secondary)' }}>
      Descrição da seção
    </p>
  </div>
</div>
```

---

## 🎨 TABELA DE CORES

### Quando usar cada cor:

| Token | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| `--raio-bg-primary` | #FAFAFA | #0A0A0A | Fundo principal da página |
| `--raio-bg-secondary` | #FFFFFF | #1A1A1A | Cards, modals, containers |
| `--raio-bg-tertiary` | #F5F5F5 | #2A2A2A | Hover states, inputs |
| `--raio-text-primary` | #1A1A1A | #FAFAFA | Títulos, textos principais |
| `--raio-text-secondary` | #6B7280 | #9CA3AF | Descrições, subtítulos |
| `--raio-text-tertiary` | #9CA3AF | #6B7280 | Metadata, timestamps |
| `--raio-accent-primary` | #D97706 | #FBBF24 | Botões, links, ícones ativos |
| `--raio-accent-hover` | #B45309 | #FCD34D | Hover de botões amarelos |
| `--raio-accent-light` | #FEF3C7 | #422006 | Backgrounds de badges |
| `--raio-border-default` | #E5E5E5 | #2A2A2A | Borders de cards, inputs |
| `--raio-border-hover` | #D1D5DB | #3A3A3A | Hover de borders |
| `--raio-success` | #10B981 | #10B981 | Indicadores online, success |
| `--raio-warning` | #F59E0B | #F59E0B | Alertas, warnings |
| `--raio-error` | #EF4444 | #EF4444 | Erros, delete buttons |

---

## ✅ CHECKLIST PARA NOVOS COMPONENTES

Antes de criar um novo componente, certifique-se de:

- [ ] **Usar CSS variables** ao invés de cores hardcoded
- [ ] **Adicionar hover states** em elementos interativos
- [ ] **Testar em light mode** e dark mode
- [ ] **Verificar contraste** (WCAG AA mínimo)
- [ ] **Usar tipografia** consistente (sem text-2xl, font-bold, etc)
- [ ] **Adicionar transitions** suaves (200-300ms)
- [ ] **Manter spacing** consistente (4px, 8px, 12px, 16px, 24px)
- [ ] **Usar shadows** do sistema (sm, md, lg)
- [ ] **Border radius** consistente (8px, 12px, 16px)
- [ ] **Touch targets** ≥ 44px para mobile

---

## 🚫 ERROS COMUNS

### ❌ Erro 1: Usar Tailwind para cores
```tsx
// ❌ NÃO
<div className="bg-yellow-400 text-gray-700">
```

### ❌ Erro 2: Usar cores hardcoded
```tsx
// ❌ NÃO
<Button style={{ background: '#22C55E' }}>
```

### ❌ Erro 3: Esquecer dark mode
```tsx
// ❌ NÃO
<p className="text-black">
```

### ❌ Erro 4: Não adicionar hover states
```tsx
// ❌ NÃO
<Button style={{ background: 'var(--raio-accent-primary)' }}>
  // Sem onMouseEnter/Leave
</Button>
```

### ❌ Erro 5: Classes de tipografia Tailwind
```tsx
// ❌ NÃO usar text-2xl, font-bold, leading-tight
<h1 className="text-2xl font-bold">

// ✅ SIM - deixar o globals.css fazer isso
<h1>Título</h1>
```

---

## 💡 DICAS PRO

### 1. Use o ThemeProvider
```tsx
import { useTheme } from "./ThemeProvider";

function MyComponent() {
  const { theme } = useTheme();
  
  // Agora você pode usar theme === 'dark' ou 'light'
  // para lógica condicional
}
```

### 2. Inline Events para Hover
```tsx
// Melhor performance e controle preciso
onMouseEnter={(e) => {
  e.currentTarget.style.background = 'var(--raio-bg-tertiary)';
}}
onMouseLeave={(e) => {
  e.currentTarget.style.background = 'transparent';
}}
```

### 3. Transitions Suaves
```tsx
// Adicione sempre
className="transition-all duration-200"
// ou
style={{ transition: 'all 0.2s ease' }}
```

### 4. Acessibilidade
```tsx
// Sempre adicione aria-labels
<Button aria-label="Fechar modal">
  <X className="w-4 h-4" />
</Button>
```

### 5. Loading States
```tsx
// Use SkeletonLoader para carregamento
import { SkeletonLoader } from "./SkeletonLoader";

{isLoading ? (
  <SkeletonLoader type="card" count={3} />
) : (
  // Seu conteúdo
)}
```

---

## 🎯 QUANDO QUEBRAR AS REGRAS

Exceções permitidas:

1. **Coração vermelho** (like) → Padrão universal
2. **Indicador verde** (online) → Convenção da indústria  
3. **Botão vermelho** (delete/logout) → Ação destrutiva
4. **Gradientes coloridos** (categorias) → Identidade visual forte

Para tudo mais: **use amarelo RAIO! ⚡**

---

## 📚 RECURSOS

- **Tokens completos**: `/styles/globals.css`
- **TypeScript tokens**: `/design-tokens.ts`
- **Exemplos completos**: Ver páginas migradas
- **Documentação**: `/DESIGN_SYSTEM_SUMMARY.md`
- **Quick reference**: `/DESIGN_SYSTEM_QUICK_REFERENCE.md`

---

## ✅ APROVAÇÃO

Antes de fazer merge/deploy:

1. ✅ Testa em light mode
2. ✅ Testa em dark mode
3. ✅ Testa responsividade (mobile/tablet/desktop)
4. ✅ Verifica contraste (use DevTools)
5. ✅ Testa hover states
6. ✅ Verifica transitions
7. ✅ Code review com foco em Design System

---

## 🚀 MANTENHA A CONSISTÊNCIA

> *"Um Design System é tão forte quanto sua menor inconsistência."*

**Sempre que criar algo novo:**
1. Verifique se já existe um padrão similar
2. Use CSS variables
3. Teste em dark mode
4. Documente se for algo novo

---

**Versão**: 2.0  
**Última Atualização**: 2025-10-23  
**Mantido por**: Dev Team RAIO

**Dúvidas?** Ver `/MIGRATION_COMPLETE.md` ou `/FINAL_SUMMARY.md`

---

**Vamos manter o RAIO consistente e bonito! ⚡**
