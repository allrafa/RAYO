# Auditoria de UI/UX — RAIO

_Última atualização: 2026-04-25 — entregue na Tarefa #18._

Documento vivo. Use-o como base de decisão antes de criar componentes novos
ou abrir um sprint de polimento visual.

---

## 1. Princípios de design (canônicos)

1. **Tokens são a fonte da verdade.** Toda cor, espaçamento, raio e tipografia
   nasce de `src/design-tokens.ts` e é exposta como variável CSS `--raio-*`
   em `src/styles/globals.css`. Componentes consomem `var(--raio-*)` (via
   `style={...}`) ou tokens semânticos do Shadcn (`bg-card`, `text-foreground`).
   **Nunca** use cores literais (`#22C55E`, `bg-green-500`) em código novo
   exceto para overlays neutros (`black/30`, `white/90`).
2. **Componentes Shadcn são a base.** Antes de criar um botão/input/card
   custom, parta de `src/components/ui/*`. Sobrescreva via `style` apenas
   quando o token semântico já existir (ex.: `var(--raio-accent-primary)`).
3. **Ações sempre fazem algo real ou estão desabilitadas.** Botões de
   placeholder devem ter `disabled`, `aria-disabled`, tooltip "Em breve" e
   visual atenuado. **Não** dispare apenas `toast.info("Em breve!")` em
   produção.
4. **Estados de carga/vazio/erro são padronizados.** Use `SkeletonLoader`
   (loading), uma `Card` com ilustração + CTA (vazio) e `enhancedToast.error`
   (erro de rede). Sempre os três — nunca só dois.
5. **Acessibilidade mínima.** Todo botão de ícone tem `aria-label`. Item de
   navegação ativo usa `aria-current="page"`. Foco precisa ter contorno
   visível (Shadcn cobre por padrão; não remover `focus-visible:ring-*`).
6. **Mobile-first, mas desktop não é cidadão de segunda classe.** O sidebar
   minimizado (`lg:w-20`) deve mostrar tooltips em todos os botões. Hero
   sections devem ter altura limitada (`h-96 md:h-[28rem]`) para não
   "engolir" a tela em telas baixas.

---

## 2. Inventário de páginas e componentes principais

### Páginas (rotas de usuário final)

| Página              | Arquivo principal              | Status visual           | Observações |
| ------------------- | ------------------------------ | ----------------------- | ----------- |
| Início (Home)       | `HomePage.tsx`                 | ⚠️ Inconsistente        | Mistura mock arrays inline com dashboard real do backend; hero usa cores Tailwind cruas. |
| Academia (cursos)   | `AcademiaPage.tsx`             | ✅ OK                   | Usa tokens. Bem estruturado. |
| Academia + Leitor   | `AcademiaWithBookReader.tsx`   | ✅ OK                   | Apenas wrapper. |
| Comunidade (feed)   | `ComunidadePage.tsx`           | ✅ OK                   | Tokenizado, bem padronizado. |
| Conversas / DMs     | `ConversasPage.tsx`            | ✅ OK                   | — |
| Perfil              | `PerfilPage.tsx`               | ✅ OK                   | — |
| Conselheiro (chat)  | `ConselheiroPage.tsx`          | ✅ OK após Tarefa #18   | 4 placeholders (voice mic, "Abrir artigo", "Iniciar exercício", "Iniciar avaliação") agora desabilitados com `aria-disabled` + tooltip "Em breve" — antes só disparavam toasts. |
| Quiz modal          | `SimpleQuizTest.tsx`           | ✅ OK (vivo)            | Renderizado dentro do `HomePage` quando o usuário inicia um quiz. **Não é dead code.** |
| Onboarding          | `WelcomeScreen.tsx`            | ✅ OK                   | Usado em `App.tsx`. |
| Painel admin/CMS    | `admin/AdminCMSPage.tsx` etc.  | ✅ OK                   | Entregue na Tarefa #17. |

### Shells / chrome

| Componente             | Status                                                                |
| ---------------------- | --------------------------------------------------------------------- |
| `DesktopSidebar.tsx`   | ✅ Tokenizado. Após Tarefa #18: botão "Configurações" desabilitado.   |
| `TopNavbar.tsx`        | ⚠️ Após Tarefa #18: Plus/Heart/Bell desabilitados ("Em breve").       |
| `Navigation.tsx`       | ✅ Bottom nav mobile, tokenizado.                                     |
| `ThemeProvider.tsx`    | ✅ Toggle light/dark via classe no `<html>`.                          |

---

## 3. Inconsistências encontradas

### 3.1 Paletas legadas (sage / mint / gold / coral)

A v1 do design system tinha quatro paletas temáticas. A v2 (atual) é monocrômica
+ accent verde-floresta. Os tokens legados ainda existem em `globals.css` porque
**os tokens semânticos do Shadcn (`--primary`, `--accent`, `--warning`, …) ainda
mapeiam para sage/mint/gold/coral**. Removê-los hoje quebra todo botão Shadcn.

| Arquivo                              | Ocorrências | Tipo                                      |
| ------------------------------------ | ----------- | ----------------------------------------- |
| `globals.css`                        | 60+         | Estrutural (mapeamento Shadcn) — **manter** |
| `design-tokens.ts` (`legacy` block)  | 40+         | Compatibilidade — manter enquanto houver consumidores |
| `HomePage.tsx`                       | 6           | Cosmético (gradientes do hero mosaico)    |
| `QuizPage.tsx`                       | 7           | Cosmético (badges)                        |
| `LandingPage.tsx`                    | 3           | Cosmético                                 |

**Plano de migração futuro:** trocar o mapeamento Shadcn em `globals.css` para
consumir `--raio-accent-primary` etc., depois remover bloco legado. Fora de
escopo para a Tarefa #18 (alto risco de regressão visual).

### 3.2 Mock arrays no `HomePage`

`HomePage.tsx` ainda contém `categories.recentlyPlayed`, `categories.madeForYou`,
`categories.trending`, `categories.podcasts` como objetos hardcoded com URLs do
Unsplash. Já existe `dashboard` real vindo de `/api/dashboard`. Isso confunde:
parte da home é dinâmica, parte é estática.

**Recomendação (futuro sprint):** mover essas categorias para o CMS
(`cms_videos` + nova tabela `cms_video_categories`) ou pelo menos para um
arquivo `src/lib/mock-content.ts` com `// TODO: CMS` no topo. Não foi feito
nesta tarefa para evitar overlap com o domínio do CMS.

### 3.3 Cores literais ainda no código

- `DesktopSidebar.tsx`: várias classes `text-gray-700 dark:text-gray-300` e
  `hover:bg-gray-100 dark:hover:bg-gray-800` no rodapé (toggle minimizar, tema,
  configurações, sair).
- `ConselheiroPage.tsx` avatar do usuário: `linear-gradient(135deg, #6B7280 0%, #4B5563 100%)`.
- `TopNavbar.tsx` badge de mensagens: `bg-destructive text-destructive-foreground`
  (token Shadcn, OK; mantido).

Não foram removidas nesta passagem (custo/benefício baixo, risco visual). Ficam
listadas aqui para o próximo sprint de polimento.

> A badge mock fixa `bg-[#22C55E]` no Bell do `TopNavbar` foi **removida** nesta
> tarefa: o sino agora fica desabilitado sem badge falsa.

### 3.4 Componentes mortos removidos

Removidos nesta tarefa (sem nenhum import vivo):

- `WelcomeScreenAlt.tsx`
- `ColorPaletteDemo.tsx`, `DesignSystemDemo.tsx`
- `SearchDemo.tsx`, `SpotifyStyleSearch.tsx`, `GlobalSearch.tsx`, `EnhancedSearch.tsx`
- `DebugLandingPageButton.tsx`, `DebugResetOnboarding.tsx`
- `InitialPermissions.tsx`, `PeopleYouMayKnow.tsx`
- `SmartNotification.tsx`, `MicroFeedback.tsx`

**Mantidos apesar de aparentarem mortos:**

- `SimpleQuizTest.tsx` — vivo, usado pelo `HomePage` como modal de quiz.
- `PersonalDashboard.tsx` — o componente em si nunca é renderizado, mas
  `AppContext` mantém `isInPersonalDashboard` e `ProfileModal` chama
  `setIsInPersonalDashboard(true)`. Refatorar para remover essa fiação é
  escopo do próximo sprint de limpeza.

---

## 4. TODOs visíveis ao usuário

Estado **antes** da Tarefa #18:

| Local                          | Botão                  | Ação                              | Resolução |
| ------------------------------ | ---------------------- | --------------------------------- | --------- |
| `TopNavbar` (linha 79)         | Criar conteúdo (➕)     | `toast.info("Em breve!")`         | ✅ desabilitado + tooltip |
| `TopNavbar` (linha 89)         | Favoritos (♥)          | `toast.info("Em breve!")`         | ✅ desabilitado + tooltip |
| `TopNavbar` (linha 117)        | Notificações (🔔)      | `toast.info("Em breve!")` + badge "2" mocada | ✅ desabilitado + tooltip; badge mock removida |
| `DesktopSidebar` (linha 282)   | Configurações          | `toast.info("Em breve!")`         | ✅ desabilitado + tooltip |
| `ConselheiroPage` (l. 305)     | "Iniciar avaliação"    | toast.success enganoso            | ✅ marcado como "em breve" |
| `ConselheiroPage` (l. 313)     | "Abrir curso"          | toast + troca de aba              | ✅ mantido (troca aba é real) |
| `ConselheiroPage` (l. 163,217) | Artigo / Exercício     | toast informativo apenas          | ✅ desabilitados na própria action button |
| `ConselheiroPage` (l. 325)     | Microfone (voice)      | toast falso "Ouvindo..."          | ✅ desabilitado + aria-label "Em breve" |

Itens **deixados funcionais** (apenas toast, sem promessa enganosa) por terem
efeito colateral real:

- `TopNavbar` busca → mostra toast com query (UX OK, busca real é tarefa futura).
- `TopNavbar` Premium → toast de celebração (todo usuário está em "Premium" no momento).

---

## 5. Acessibilidade (estado atual)

✅ **Implementado nesta tarefa:**
- `aria-label` em todos os botões de ícone do `TopNavbar` (Plus, Heart, Mensagens, Bell, Premium).
- `aria-label` em todos os itens do `DesktopSidebar` (nav + minimize, tema, configurações, sair).
- `aria-current="page"` no item ativo do `DesktopSidebar`.
- `aria-disabled` + `title` em todos os botões "Em breve" (TopNavbar Plus/Heart/Bell, Sidebar Configurações, Conselheiro voice/test/article/exercise).

⚠️ **Tradeoff conhecido:** botões de ícone desabilitados são menos descobríveis no
toque/teclado do que toasts, porque o navegador não foca elementos `disabled`.
Mitigação atual: `title` em todos eles. Mitigação futura: substituir por badge
"Em breve" sempre visível ao lado do ícone, ou agrupar em menu "Recursos
chegando em breve".

⚠️ **Pendente para próximos sprints:**
- Verificar contraste WCAG AA em badges com texto branco sobre `--raio-accent-primary` (verde-floresta) — pode estar abaixo de 4.5:1 dependendo do tom final.
- Adicionar `role="status"` em `SkeletonLoader` para leitores de tela.
- Trap de foco nos modais full-screen (Quiz, Music, Central de Conversas).
- Testar navegação por teclado completa no `ConselheiroPage` (sheets, voice button).

---

## 6. Responsividade — observações

| Breakpoint        | Estado                                                              |
| ----------------- | ------------------------------------------------------------------- |
| Mobile (<lg)      | ✅ `Navigation` (bottom nav) ativo; sidebar oculta.                  |
| Sidebar minimizada (`lg:w-20`) | ⚠️ Botões inferiores não tinham tooltip — corrigido.    |
| Desktop expandido (`lg:w-64`) | ✅ Layout principal.                                       |
| Tablet (`md`)     | ✅ Hero do `HomePage` cresce (`h-96 md:h-[28rem]`).                  |

---

## 7. Próximos passos sugeridos (fora desta tarefa)

Estes ficam como recomendações de futuro sprint, **não** entram em #18:

1. Tokenizar literais de cor restantes (item 3.3).
2. Mover mocks da `HomePage` para o CMS (item 3.2).
3. Limpar fiação morta de `PersonalDashboard` em `AppContext` + `ProfileModal`.
4. Refatorar mapeamento Shadcn em `globals.css` para consumir tokens `--raio-*` diretamente, depois remover paletas legadas (item 3.1).
5. Auditoria completa de contraste WCAG.
