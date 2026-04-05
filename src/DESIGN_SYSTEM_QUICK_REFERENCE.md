# 🎨 RAIO Design System - Referência Rápida

## 📋 TL;DR

**Arquivo Central**: `/design-tokens.ts`  
**Provider de Tema**: `/components/ThemeProvider.tsx`  
**CSS Global**: `/styles/globals.css`  
**Plano Completo**: `/DESIGN_SYSTEM_MIGRATION_PLAN.md`

---

## 🚀 Como Usar

### 1️⃣ Importar Tokens (TypeScript)

```typescript
import { colors, spacing, typography, animations } from './design-tokens';

// Exemplo de uso
const MyComponent = () => (
  <div style={{
    background: colors.light.background.primary,
    padding: spacing.md,
    borderRadius: radius.lg,
  }}>
    Conteúdo
  </div>
);
```

### 2️⃣ Usar CSS Variables (Recomendado)

```tsx
<div className="bg-[var(--raio-bg-primary)] text-[var(--raio-text-primary)]">
  Conteúdo
</div>
```

### 3️⃣ Usar Hook de Tema

```typescript
import { useTheme } from './components/ThemeProvider';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Modo: {theme === 'light' ? '☀️ Claro' : '🌙 Escuro'}
    </button>
  );
}
```

---

## 🎨 Cores Principais

### Light Mode
| Uso | Variável | Valor | Visual |
|-----|----------|-------|--------|
| Background | `colors.light.background.primary` | `#FAFAFA` | ![#FAFAFA](https://via.placeholder.com/20/FAFAFA/000000?text=+) |
| Card | `colors.light.background.secondary` | `#FFFFFF` | ![#FFFFFF](https://via.placeholder.com/20/FFFFFF/000000?text=+) |
| Texto | `colors.light.text.primary` | `#1A1A1A` | ![#1A1A1A](https://via.placeholder.com/20/1A1A1A/FFFFFF?text=+) |
| Texto Sec | `colors.light.text.secondary` | `#6B7280` | ![#6B7280](https://via.placeholder.com/20/6B7280/FFFFFF?text=+) |
| Borda | `colors.light.border.default` | `#E5E5E5` | ![#E5E5E5](https://via.placeholder.com/20/E5E5E5/000000?text=+) |
| Acento | `colors.light.accent.primary` | `#FCD34D` | ![#FCD34D](https://via.placeholder.com/20/FCD34D/000000?text=+) |

### Dark Mode
| Uso | Variável | Valor | Visual |
|-----|----------|-------|--------|
| Background | `colors.dark.background.primary` | `#0A0A0A` | ![#0A0A0A](https://via.placeholder.com/20/0A0A0A/FFFFFF?text=+) |
| Card | `colors.dark.background.secondary` | `#1A1A1A` | ![#1A1A1A](https://via.placeholder.com/20/1A1A1A/FFFFFF?text=+) |
| Texto | `colors.dark.text.primary` | `#FAFAFA` | ![#FAFAFA](https://via.placeholder.com/20/FAFAFA/000000?text=+) |
| Texto Sec | `colors.dark.text.secondary` | `#9CA3AF` | ![#9CA3AF](https://via.placeholder.com/20/9CA3AF/000000?text=+) |
| Borda | `colors.dark.border.default` | `#2A2A2A` | ![#2A2A2A](https://via.placeholder.com/20/2A2A2A/FFFFFF?text=+) |
| Acento | `colors.dark.accent.primary` | `#FCD34D` | ![#FCD34D](https://via.placeholder.com/20/FCD34D/000000?text=+) |

---

## 📏 Espaçamentos Comuns

```typescript
spacing.xs   = 8px   (0.5rem)
spacing.sm   = 12px  (0.75rem)
spacing.md   = 16px  (1rem)      ← Padrão mais usado
spacing.lg   = 24px  (1.5rem)
spacing.xl   = 32px  (2rem)
spacing['2xl'] = 48px  (3rem)
```

---

## 🎬 Animações

```typescript
// Duração
animations.duration.fast   = 150ms
animations.duration.normal = 200ms  ← Padrão
animations.duration.slow   = 300ms

// Easing
animations.easing.easeInOut = 'cubic-bezier(0.4, 0, 0.2, 1)'  ← Padrão
animations.easing.spring    = 'cubic-bezier(0.43, 0.13, 0.23, 0.96)'
```

**Exemplo de uso:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: parseFloat(animations.duration.normal) / 1000,
    ease: [0.4, 0, 0.2, 1], // easeInOut
  }}
>
  Conteúdo
</motion.div>
```

---

## 🔘 Border Radius

```typescript
radius.sm  = 6px
radius.md  = 8px   ← Padrão para inputs
radius.lg  = 12px  ← Padrão para cards
radius.xl  = 16px
radius.full = 9999px (círculo)
```

---

## 🎭 Elevações (Shadows)

### Light Mode
```typescript
shadows.light.none = 'none'
shadows.light.sm   = '0 1px 2px rgba(0,0,0,0.05)'    ← Sutil
shadows.light.md   = '0 2px 8px rgba(0,0,0,0.08)'    ← Cards
shadows.light.lg   = '0 4px 16px rgba(0,0,0,0.12)'   ← Modals
shadows.light.xl   = '0 8px 32px rgba(0,0,0,0.16)'   ← Floating
```

### Dark Mode
```typescript
shadows.dark.sm = '0 1px 2px rgba(0,0,0,0.3)'
shadows.dark.md = '0 2px 8px rgba(0,0,0,0.5)'
shadows.dark.lg = '0 4px 16px rgba(0,0,0,0.7)'
shadows.dark.xl = '0 8px 32px rgba(0,0,0,0.9)'
```

---

## 🪟 Glassmorphism

### Light Mode
```typescript
const glassStyle = {
  ...glassmorphism.light.default,
  // background: 'rgba(255, 255, 255, 0.7)',
  // backdropFilter: 'blur(20px) saturate(180%)',
  // border: '1px solid rgba(255, 255, 255, 0.2)',
};
```

### Dark Mode
```typescript
const glassStyle = {
  ...glassmorphism.dark.default,
  // background: 'rgba(10, 10, 10, 0.7)',
  // backdropFilter: 'blur(20px) saturate(180%)',
  // border: '1px solid rgba(255, 255, 255, 0.1)',
};
```

**Uso em componente:**
```tsx
<div
  style={{
    background: glassmorphism.light.default.background,
    backdropFilter: glassmorphism.light.default.backdropFilter,
  }}
  className="border border-white/20"
>
  Glassmorphism
</div>
```

---

## 📱 Breakpoints

```typescript
breakpoints.xs  = 320px
breakpoints.sm  = 640px
breakpoints.md  = 768px
breakpoints.lg  = 1024px   ← Desktop sidebar aparece
breakpoints.xl  = 1280px
breakpoints['2xl'] = 1536px
```

**Uso em Tailwind:**
```tsx
<div className="px-4 md:px-8 lg:px-12">
  Responsivo
</div>
```

**Uso em Media Query:**
```typescript
import { mediaQuery } from './design-tokens';

const styles = `
  .my-component {
    padding: 1rem;
    
    ${mediaQuery('lg')} {
      padding: 2rem;
    }
  }
`;
```

---

## 🎯 Z-Index

```typescript
zIndex.base = 0
zIndex.dropdown = 10
zIndex.sticky = 20
zIndex.fixed = 30       ← Navbar
zIndex.modalBackdrop = 40
zIndex.modal = 50
zIndex.popover = 60
zIndex.tooltip = 70
zIndex.notification = 80
zIndex.max = 9999
```

---

## 📝 Exemplos Práticos

### Botão Primário

```tsx
import { colors, spacing, radius, shadows, animations } from './design-tokens';

const PrimaryButton = () => (
  <button
    style={{
      background: colors.light.interactive.default,
      color: colors.light.text.inverse,
      padding: `${spacing['3']} ${spacing['6']}`,
      borderRadius: radius.lg,
      boxShadow: shadows.light.sm,
      transition: `all ${animations.duration.normal} ${animations.easing.easeInOut}`,
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.background = colors.light.interactive.hover;
      e.currentTarget.style.boxShadow = shadows.light.md;
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.background = colors.light.interactive.default;
      e.currentTarget.style.boxShadow = shadows.light.sm;
    }}
  >
    Clique Aqui
  </button>
);
```

### Card Elevado

```tsx
const Card = ({ children }) => (
  <div
    style={{
      background: colors.light.background.secondary,
      border: `1px solid ${colors.light.border.default}`,
      borderRadius: radius.xl,
      boxShadow: shadows.light.md,
      padding: spacing.lg,
    }}
  >
    {children}
  </div>
);
```

### Input com Foco

```tsx
const Input = () => (
  <input
    style={{
      background: colors.light.background.secondary,
      color: colors.light.text.primary,
      border: `1px solid ${colors.light.border.default}`,
      borderRadius: radius.md,
      padding: `${spacing['3']} ${spacing['4']}`,
      transition: `all ${animations.duration.normal} ${animations.easing.easeInOut}`,
    }}
    onFocus={(e) => {
      e.currentTarget.style.borderColor = colors.light.accent.primary;
      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.light.accent.subtle}`;
    }}
    onBlur={(e) => {
      e.currentTarget.style.borderColor = colors.light.border.default;
      e.currentTarget.style.boxShadow = 'none';
    }}
  />
);
```

---

## ✅ Checklist de Implementação

Ao migrar um componente:

- [ ] Importar tokens necessários de `design-tokens.ts`
- [ ] Substituir cores hardcoded por `colors.light.*` ou `colors.dark.*`
- [ ] Usar `spacing.*` para paddings/margins
- [ ] Aplicar `radius.*` para border-radius
- [ ] Usar `shadows.*` para elevações
- [ ] Aplicar `animations.*` para transições
- [ ] Testar em Light Mode
- [ ] Testar em Dark Mode
- [ ] Validar responsividade
- [ ] Verificar acessibilidade (contraste)

---

## 🔗 Links Úteis

- **Plano de Migração Completo**: `/DESIGN_SYSTEM_MIGRATION_PLAN.md`
- **Tokens Completos**: `/design-tokens.ts`
- **Theme Provider**: `/components/ThemeProvider.tsx`
- **CSS Global**: `/styles/globals.css`

---

## 💡 Dicas

1. **Sempre use os tokens**, nunca cores hardcoded
2. **Teste em ambos os modos** (light/dark) durante desenvolvimento
3. **Use CSS variables** quando possível para melhor performance
4. **Respeite as elevações** (shadows) para criar hierarquia visual
5. **Animações sutis** (150-300ms) são melhores que animações longas

---

**Última Atualização**: 2025-10-22  
**Status**: 🟢 Ativo e Pronto para Uso
