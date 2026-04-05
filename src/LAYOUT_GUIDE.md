# RAIO - Guia de Layout Responsivo

## 📱 Mobile (< 1024px)

### Bottom Navigation
- **Posição**: Fixa na parte inferior
- **Ícones**: 5 tabs (Home, Academia, Conselheiro, Comunidade, Perfil)
- **Destaque**: Botão central "Conselheiro" elevado com gradiente verde
- **Efeitos**: Vidroglass com blur 32px, badges de notificação
- **Safe Area**: Suporte completo para iPhone com notch

### Características Mobile
- Layout fullscreen
- Navegação por bottom tabs
- Conteúdo em tela cheia
- Gradiente fade suave antes da navbar

---

## 💻 Desktop (≥ 1024px)

### Sidebar Lateral Esquerda (256px)
**Componente**: `DesktopSidebar.tsx`

#### Seções:
1. **Header (Logo + Brand)**
   - Logo RAIO com ícone de raio
   - Nome "RAIO Ecossistema"

2. **Perfil do Usuário**
   - Avatar com ring verde
   - Nome do usuário
   - Nível atual
   - Clicável para ir ao perfil

3. **Menu de Navegação**
   - Início (Home)
   - Academia (GraduationCap)
   - Conselheiro (Zap) - Com efeito glow especial
   - Comunidade (Users) - Com badge de mensagens
   - Perfil (User)

4. **Ações Inferiores**
   - Configurações
   - Sair

#### Características:
- Background branco/dark
- Bordas suaves
- Hover states
- Active states com background colorido
- Transições suaves
- Ícone do Conselheiro com animação de pulse

---

### Top Navbar (64px altura)
**Componente**: `TopNavbar.tsx`

#### Elementos:
1. **Barra de Busca** (esquerda)
   - Input com ícone de lupa
   - Placeholder: "Buscar cursos, conteúdos, comunidades..."
   - Max-width: 600px

2. **Quick Actions** (direita)
   - Criar Conteúdo (+)
   - Favoritos (♥)
   - Mensagens (💬) - Badge com 3 notificações
   - Notificações (🔔) - Badge com 2 notificações
   - Botão Premium (gradiente verde)

#### Características:
- Background semi-transparente com blur
- Borda inferior sutil
- Ícones com hover effects
- Badges de notificação
- Z-index 30 (acima do conteúdo, abaixo da sidebar)

---

### Layout do Conteúdo Principal
- **Margin-left**: 256px (largura da sidebar)
- **Margin-top**: 64px (altura da top navbar)
- **Padding**: 2rem em todas as direções
- **Max-width**: 1400px centralizado
- **Min-height**: calc(100vh - 64px)

---

## 🎨 Sistema de Cores

### Conselheiro (Especial)
- Verde vibrante: `#22C55E` (from)
- Verde escuro: `#16A34A` (to)
- Shadow: `shadow-[#22C55E]/30`

### Estados
- **Active**: Background colorido + texto bold
- **Hover**: Background cinza claro
- **Focus**: Ring verde

### Badges
- **Mensagens**: Vermelho (#EF4444)
- **Notificações**: Verde (#22C55E)

---

## 📐 Breakpoints

```css
/* Mobile First */
< 1024px: Bottom Navigation
≥ 1024px: Sidebar + Top Navbar

/* Transições */
- Sidebar aparece: lg:flex
- Bottom nav esconde: lg:hidden
- Layout muda: .desktop-layout
```

---

## ✨ Animações e Efeitos

### Mobile
- **Conselheiro**: Círculo elevado com ping animation
- **Touch feedback**: Scale 0.95 no click
- **Haptic**: Vibração de 10ms

### Desktop
- **Sidebar pulse**: Ícone do Conselheiro com glow pulsante
- **Hover cards**: translateY(-2px) + shadow
- **Transitions**: 0.3s ease em mudanças de layout

---

## 🔧 Componentes

### Estrutura de Arquivos
```
/components
  ├── Navigation.tsx          # Mobile bottom nav
  ├── DesktopSidebar.tsx      # Desktop sidebar
  ├── TopNavbar.tsx           # Desktop top navbar
  └── [Pages].tsx             # Páginas de conteúdo
```

### App.tsx - Layout Responsivo
```tsx
<DesktopSidebar />       {/* Hidden < 1024px */}
<TopNavbar />            {/* Hidden < 1024px */}
<main className="navbar-bottom-spacing lg:desktop-layout">
  {content}
</main>
<Navigation />           {/* Hidden ≥ 1024px */}
```

---

## 🎯 Funcionalidades

### Ações Rápidas (Top Navbar)
1. **Busca Global**: Pesquisar em todo o ecossistema
2. **Criar**: Novo post, curso, etc
3. **Favoritos**: Acesso rápido aos favoritos
4. **Mensagens**: Direct para conversas (badge: 3)
5. **Notificações**: Updates importantes (badge: 2)
6. **Premium**: CTA sempre visível

### Navegação (Sidebar)
- **Clique no avatar**: Vai para o perfil
- **Itens do menu**: Mudam de página
- **Configurações**: Modal de settings
- **Sair**: Logout com confirmação

---

## 📱 Acessibilidade

### ARIA Labels
- Todos os botões têm `aria-label`
- Itens ativos têm `aria-current="page"`
- Roles adequados: `navigation`, `main`

### Keyboard Navigation
- Tab order lógico
- Focus visible
- Skip links

### Touch Targets
- Mínimo 44x44px (mobile)
- Mínimo 48x48px (desktop hover)

---

## 🚀 Performance

### Otimizações
- CSS transitions em vez de JS animations
- Transform: GPU accelerated
- Backdrop-filter com fallback
- Z-index hierárquico
- Will-change em elementos animados

---

## 🎨 Theming

### Light Mode
- Sidebar: bg-white
- Top navbar: bg-white/80
- Borders: gray-200

### Dark Mode
- Sidebar: bg-slate-900
- Top navbar: bg-slate-900/80
- Borders: gray-800

---

## 📊 Métricas de UX

### Mobile
- Bottom nav: 76px altura total (com safe area)
- Touch targets: 44x44px mínimo
- Fade gradient: 60px antes da navbar

### Desktop
- Sidebar: 256px largura fixa
- Top navbar: 64px altura fixa
- Content area: Responsivo até 1400px
- Gutter: 2rem padding

---

Made with ⚡ by RAIO Team
