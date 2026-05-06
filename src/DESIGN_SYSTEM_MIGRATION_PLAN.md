# 🎨 RAIO Design System - Plano de Migração

## 📋 Visão Geral

Unificação do Design System do RAIO para criar uma experiência visual consistente entre WelcomeScreen, Onboarding e todo o ecossistema, com suporte completo para Light Mode (Off-White) e Dark Mode (Preto).

---

## 🎯 Objetivos

1. **Consistência Visual**: Mesmo DNA visual em toda a plataforma
2. **Sistema de Cores Centralizado**: Um único arquivo de tokens (`design-tokens.ts`)
3. **Light/Dark Mode Harmônico**: Transições suaves e paleta unificada
4. **Minimalismo Premium**: Off-white, preto, cinzas e amarelo (#FCD34D) como acento

---

## 🎨 Paleta de Cores Unificada

### Light Mode (Padrão)
```
Background Principal: #FAFAFA (off-white suave)
Background Secundário: #FFFFFF (branco puro para cards)
Texto Principal: #1A1A1A (preto quente)
Texto Secundário: #6B7280 (cinza médio)
Bordas: #E5E5E5 (cinza claro)
Acento Primário: #FCD34D (amarelo dourado)
Acento Hover: #FBBF24 (amarelo mais intenso)
```

### Dark Mode
```
Background Principal: #0A0A0A (preto profundo)
Background Secundário: #1A1A1A (preto elevado)
Texto Principal: #FAFAFA (off-white)
Texto Secundário: #9CA3AF (cinza claro)
Bordas: #2A2A2A (cinza escuro)
Acento Primário: #FCD34D (amarelo dourado - mesmo)
Acento Hover: #FDE68A (amarelo mais claro no dark)
```

### Cores Semânticas (Ambos os Modos)
```
Sucesso: #10B981 (verde)
Erro: #EF4444 (vermelho)
Aviso: #F59E0B (laranja)
Info: #3B82F6 (azul)
```

---

## 📁 Estrutura de Arquivos

### Novo Arquivo Central
```
/design-tokens.ts
```
**Função**: Definir TODOS os tokens de cores, espaçamentos, tipografia e animações do sistema.

### Arquivo Atualizado
```
/styles/globals.css
```
**Função**: Importar tokens do design-tokens.ts e aplicar via CSS variables.

### Componentes Afetados (Fase 1 - Críticos)
```
✅ WelcomeScreen.tsx - JÁ segue o novo design
✅ Onboarding.tsx - JÁ segue o novo design
🔄 App.tsx - Atualizar loading states
🔄 Navigation.tsx - Adaptar para nova paleta
🔄 DesktopSidebar.tsx - Adaptar para nova paleta
🔄 TopNavbar.tsx - Adaptar para nova paleta
🔄 HomePage.tsx - Adaptar cards e layout
```

### Componentes Afetados (Fase 2 - Páginas)
```
🔄 AcademiaPage.tsx
🔄 ConselheiroPage.tsx
🔄 ComunidadePage.tsx
🔄 PerfilPage.tsx
🔄 CourseDetailPage.tsx
🔄 VideoPage.tsx
```

### Componentes Afetados (Fase 3 - UI Shadcn)
```
🔄 /components/ui/button.tsx
🔄 /components/ui/card.tsx
🔄 /components/ui/input.tsx
🔄 /components/ui/dialog.tsx
... (todos os componentes UI)
```

---

## 🚀 Implementação em Fases

### ✅ **Fase 0: Preparação** (ATUAL)
- [x] Analisar estado atual
- [x] Definir nova paleta
- [ ] Criar design-tokens.ts
- [ ] Atualizar globals.css
- [ ] Documentar mudanças

### **Fase 1: Core System** (1-2 horas)
**Prioridade**: ALTA
**Componentes**: 
- design-tokens.ts (criar)
- globals.css (atualizar)
- App.tsx (loading states)
- ThemeProvider (criar/atualizar)

**Resultado Esperado**: 
Sistema de cores centralizado funcionando, com toggle Light/Dark Mode operacional.

---

### **Fase 2: Navegação e Layout** (2-3 horas)
**Prioridade**: ALTA
**Componentes**:
- Navigation.tsx (mobile)
- DesktopSidebar.tsx
- TopNavbar.tsx

**Resultado Esperado**: 
Navegação completa com nova paleta, glassmorphism atualizado, transições suaves.

---

### **Fase 3: Páginas Principais** (3-4 horas)
**Prioridade**: MÉDIA
**Componentes**:
- HomePage.tsx
- AcademiaPage.tsx
- ConselheiroPage.tsx
- ComunidadePage.tsx
- PerfilPage.tsx

**Resultado Esperado**: 
Todas as páginas principais seguindo o novo design system.

---

### **Fase 4: Componentes UI Shadcn** (4-6 horas)
**Prioridade**: MÉDIA
**Componentes**:
- Todos em /components/ui/

**Resultado Esperado**: 
Biblioteca UI completa alinhada ao design system.

---

### **Fase 5: Componentes Secundários** (2-3 horas)
**Prioridade**: BAIXA
**Componentes**:
- Modals diversos
- Páginas específicas (Quiz, Music, etc.)
- YouTube components

**Resultado Esperado**: 
100% do app unificado no novo design system.

---

### **Fase 6: Polimento e QA** (2-3 horas)
**Prioridade**: MÉDIA
**Tarefas**:
- Testar todos os fluxos
- Verificar acessibilidade
- Ajustar animações
- Corrigir edge cases
- Validar responsividade

**Resultado Esperado**: 
App totalmente polido e sem inconsistências visuais.

---

## 📊 Tempo Total Estimado
**16-20 horas de desenvolvimento**

---

## 🎨 Princípios de Design

### 1. Content-First
- Espaço em branco generoso
- Hierarquia tipográfica clara
- Sem distrações visuais

### 2. Motion Purposeful
- Animações sutis (0.2-0.3s)
- Easing natural (cubic-bezier)
- Resposta háptica em ações importantes

### 3. Acessibilidade Total
- Contraste WCAG AAA
- Focus states visíveis
- Suporte a leitores de tela
- Modo de alto contraste

### 4. Glassmorphism Sutil
```css
background: rgba(255, 255, 255, 0.7); /* Light */
background: rgba(10, 10, 10, 0.7);    /* Dark */
backdrop-filter: blur(20px) saturate(180%);
```

### 5. Elevação Consistente
```
Nível 0: flat (0px shadow)
Nível 1: 0 1px 2px rgba(0,0,0,0.05)
Nível 2: 0 2px 8px rgba(0,0,0,0.08)
Nível 3: 0 4px 16px rgba(0,0,0,0.12)
Nível 4: 0 8px 32px rgba(0,0,0,0.16)
```

---

## 🔄 Como Usar o Novo Sistema

### 1. Importar Tokens (TypeScript/TSX)
```typescript
import { colors, spacing, typography, animations } from './design-tokens';

// Usar em styled components ou inline styles
const buttonStyle = {
  background: colors.light.accent.primary,
  padding: spacing.md,
  fontSize: typography.size.base,
  transition: animations.duration.normal
};
```

### 2. Usar CSS Variables (globals.css)
```css
.my-component {
  background: var(--rayo-sand-100);
  color: var(--rayo-forest-900);
  border: 1px solid var(--raio-border);
  border-radius: var(--raio-radius-md);
}
```

### 3. Usar Classes Tailwind (com novas configurações)
```tsx
<div className="bg-background text-foreground border-border rounded-lg">
  <h1 className="text-raio-text-primary">Título</h1>
  <p className="text-raio-text-secondary">Descrição</p>
</div>
```

---

## 🧪 Checklist de Validação

### Visual
- [ ] Todas as cores seguem a paleta unificada
- [ ] Não há cores hardcoded (exceto em design-tokens.ts)
- [ ] Dark mode funciona perfeitamente em todas as páginas
- [ ] Transição light/dark é suave (< 300ms)
- [ ] Glassmorphism consistente em navbars e modals

### Funcional
- [ ] Toggle de tema funciona globalmente
- [ ] Estado do tema persiste no localStorage
- [ ] SSR/Hydration não causa flicker
- [ ] Performance não foi impactada

### Acessibilidade
- [ ] Contraste mínimo 4.5:1 (texto normal)
- [ ] Contraste mínimo 3:1 (texto grande)
- [ ] Focus states visíveis
- [ ] Modo de alto contraste funcional

### Responsividade
- [ ] Mobile (< 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (> 1024px)
- [ ] Large Desktop (> 1536px)

---

## 📝 Notas Importantes

1. **Não Remover Cores Antigas Imediatamente**: Manter compatibilidade durante migração.

2. **Testar em Dispositivos Reais**: Especialmente iPhone (notch/safe areas) e Android.

3. **Cuidado com Motion**: Respeitar `prefers-reduced-motion`.

4. **Performance**: Usar CSS variables (não recalcular JS).

5. **Documentação**: Atualizar README com novo sistema de cores.

---

## 🎯 Métricas de Sucesso

- ✅ 0 cores hardcoded fora de design-tokens.ts
- ✅ 100% das páginas com dark mode funcional
- ✅ Contraste AAA em 95%+ do conteúdo
- ✅ Tempo de transição light/dark < 300ms
- ✅ 0 inconsistências visuais reportadas
- ✅ Score de acessibilidade > 95 (Lighthouse)

---

## 📚 Referências

- [Tailwind CSS v4 Design Tokens](https://tailwindcss.com/docs)
- [Radix Colors](https://www.radix-ui.com/colors)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design 3 Color System](https://m3.material.io/styles/color/system/overview)

---

**Status Atual**: 📋 Planejamento Completo
**Próximo Passo**: Criar `design-tokens.ts`
**Responsável**: Dev Team
**Prazo**: 2-3 semanas para implementação completa
