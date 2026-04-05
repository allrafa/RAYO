# 👁️ Como Visualizar a Landing Page (ISOLADA)

**Status:** ✅ Configurado  
**Modo:** Preview isolado (não interfere no app)

---

## 🎯 ACESSO RÁPIDO

### 📍 **Landing Page está em:**
```
/components/LandingPage.tsx
```

### 🔗 **Para VISUALIZAR (sem afetar o app):**

**1. Se está rodando localmente:**
```
http://localhost:5173/?preview=landing
```

**2. Se está em produção/deploy:**
```
https://seu-dominio.com/?preview=landing
```

---

## 🚀 PASSO A PASSO

### Opção 1: URL Direta (RECOMENDADO)

**1. Abrir o navegador**

**2. Digitar a URL com o parâmetro `?preview=landing`:**
```
http://localhost:5173/?preview=landing
```

**3. Pronto!** A Landing Page aparece em tela cheia, isolada do resto do app.

**4. Para sair:** Clicar no X (botão fechar) no topo direito OU nos CTAs

---

### Opção 2: Adicionar parâmetro manualmente

**1. Abrir o app normalmente:**
```
http://localhost:5173/
```

**2. Na barra de endereço, adicionar `?preview=landing` no final:**
```
http://localhost:5173/?preview=landing
```

**3. Dar Enter**

**4. Landing Page aparece!**

---

## ✅ O QUE VOCÊ VAI VER

Ao acessar com `?preview=landing`:

### 📱 **Landing Page Completa:**
1. ⚡ **Hero Section** - Headline + imagem + 2 CTAs
2. 📊 **Social Proof** - 10k+ famílias, 100+ cursos, 4.9★
3. 💔 **Problema → Solução** - 3 pain points + solução
4. 🎨 **Features** - 4 pilares coloridos
5. 💰 **Pricing** - Free vs Premium (R$ 49/mês)
6. ❓ **FAQ** - 8 perguntas com accordion
7. 🚀 **Final CTA** - Última conversão
8. 🔗 **Footer** - Links

### 🎨 **Características:**
- ✅ Mobile-first (funciona perfeitamente em celular)
- ✅ Responsivo (adapta para tablet/desktop)
- ✅ Animações sutis (scroll para ver)
- ✅ Design system completo (cores do RAIO)
- ✅ Botão X no topo direito (para fechar)

---

## 🔄 COMO FUNCIONA

### 📝 **Código Adicionado no App.tsx:**

```tsx
// Detecta se URL tem ?preview=landing
const urlParams = new URLSearchParams(window.location.search);
const previewMode = urlParams.get('preview');

// Se preview=landing, mostra APENAS a Landing Page
if (previewMode === 'landing') {
  return (
    <LandingPage
      onStartFree={() => {/* Volta para app */}}
      onStartPremium={() => {/* Volta para app */}}
      showCloseButton={true}
      onClose={() => {/* Volta para app */}}
    />
  );
}

// Senão, app normal continua
```

### 🔒 **Garantias:**
- ✅ **NÃO afeta o fluxo normal** do app
- ✅ **NÃO aparece sem o parâmetro** `?preview=landing`
- ✅ **NÃO interfere** com Welcome, Onboarding, etc
- ✅ **ISOLADA** - só aparece quando você quer

---

## 📱 TESTAR EM DIFERENTES DISPOSITIVOS

### Mobile
```
http://localhost:5173/?preview=landing
```
→ Abra no Chrome DevTools (F12) → Device Toolbar (Ctrl+Shift+M)  
→ Selecione iPhone 14 Pro ou Samsung Galaxy

### Tablet
→ Selecione iPad Pro

### Desktop
→ Abra em tela cheia (F11)

---

## 🎨 O QUE TESTAR

### ✅ Checklist Visual:

**Hero Section:**
- [ ] Headline legível
- [ ] Imagem carrega
- [ ] 2 botões visíveis (Premium + Grátis)
- [ ] Badge "10k+ famílias" aparece

**Social Proof:**
- [ ] 4 estatísticas visíveis
- [ ] Background cinza claro

**Problema → Solução:**
- [ ] 3 cards com ícones
- [ ] Texto legível
- [ ] Box amarelo da solução destacado

**Features:**
- [ ] 4 cards coloridos (amarelo, verde, rosa, amarelo)
- [ ] Ícones aparecem
- [ ] Checklist em cada feature

**Pricing:**
- [ ] 2 cards lado a lado (desktop) ou empilhados (mobile)
- [ ] Card Premium com borda amarela
- [ ] Badge "Mais popular" visível
- [ ] Preços claros (R$ 0 e R$ 49)

**FAQ:**
- [ ] Accordion funciona (clique para expandir)
- [ ] 8 perguntas visíveis

**Footer:**
- [ ] Logo RAIO
- [ ] Links (Sobre, Privacidade, etc)
- [ ] Copyright

### ✅ Checklist Funcional:

**CTAs:**
- [ ] Clicar em "Começar Premium" → Recarrega app normal
- [ ] Clicar em "Experimentar Grátis" → Recarrega app normal
- [ ] Clicar no X (topo direito) → Volta para app

**Scroll:**
- [ ] Scroll suave
- [ ] Animações aparecem ao rolar
- [ ] Não trava em nenhuma seção

**Responsividade:**
- [ ] Mobile: Layout vertical, 1 coluna
- [ ] Tablet: Layout misto, 2 colunas
- [ ] Desktop: Layout completo, multi-colunas

---

## 🐛 RESOLUÇÃO DE PROBLEMAS

### ❌ "Não aparece nada"
**Solução:** Certifique-se que digitou `?preview=landing` corretamente

### ❌ "Aparece o app normal"
**Solução:** O parâmetro está faltando. Use:
```
http://localhost:5173/?preview=landing
```

### ❌ "Imagens não carregam"
**Solução:** Normal, são do Unsplash. Precisa de conexão com internet.

### ❌ "Botão X não funciona"
**Solução:** Dê um refresh (F5) ou feche a aba e abra de novo sem `?preview`

### ❌ "Erro de console"
**Solução:** Abra DevTools (F12) e me envie a mensagem de erro

---

## 📊 ANALYTICS

Ao visualizar em modo preview, os seguintes eventos são trackeados:

```typescript
// Ao abrir a Landing Page
LANDING_PAGE_VIEWED

// Ao clicar em CTAs
LANDING_CTA_CLICKED {
  location: 'hero' | 'pricing' | 'final',
  plan_type: 'free' | 'premium'
}

// Ao rolar seções
LANDING_SECTION_VIEWED {
  section: 'features' | 'pricing' | 'faq'
}
```

---

## 🔄 SAIR DO MODO PREVIEW

### Opção 1: Clicar no X (botão fechar)
→ Recarrega app normal automaticamente

### Opção 2: Clicar em qualquer CTA
→ Recarrega app normal automaticamente

### Opção 3: Remover parâmetro da URL
```
http://localhost:5173/
```
→ Dar Enter

### Opção 4: Refresh sem parâmetro
→ F5 depois de remover `?preview=landing`

---

## 🎯 COMPARTILHAR COM OUTRAS PESSOAS

### Para Designer revisar:
```
Abra este link para ver a Landing Page:
http://localhost:5173/?preview=landing

(Funciona melhor em mobile)
```

### Para Redator validar copy:
```
Review de copy da LP:
http://localhost:5173/?preview=landing

Seções para revisar:
- Headline (topo)
- Pain Points (problema)
- Features (4 pilares)
- FAQ (perguntas)
```

### Para Stakeholder aprovar:
```
Prévia da Landing Page Premium:
http://localhost:5173/?preview=landing

Teste os CTAs:
- "Começar Premium"
- "Experimentar Grátis"
```

---

## 📸 SCREENSHOTS

Para criar screenshots da Landing Page:

**1. Abrir em modo preview:**
```
http://localhost:5173/?preview=landing
```

**2. DevTools → Device Toolbar (Ctrl+Shift+M)**

**3. Selecionar dispositivo:**
- iPhone 14 Pro (Mobile)
- iPad Pro (Tablet)
- Desktop HD (Desktop)

**4. Scroll até a seção desejada**

**5. Screenshot:**
- **Mac:** Cmd+Shift+5
- **Windows:** Win+Shift+S
- **Chrome:** DevTools → 3 dots → Capture screenshot

---

## 🚀 PRÓXIMOS PASSOS

Depois de visualizar e aprovar a Landing Page:

### 1. Validar Copy (com redator)
- [ ] Headline
- [ ] Subheadline
- [ ] Pain points
- [ ] Features
- [ ] CTAs
- [ ] FAQ

### 2. Substituir Imagens (com designer)
- [ ] Hero image → Screenshot real do app
- [ ] Features → Icons customizados
- [ ] Adicionar testemunhos com fotos

### 3. Integrar no App (desenvolvimento)
- [ ] Banner na HomePage
- [ ] Card no Perfil
- [ ] Badge no TopNavbar
- [ ] Paywall em cursos premium

### 4. A/B Testing (após GrowthBook)
- [ ] Testar headlines
- [ ] Testar CTAs
- [ ] Testar pricing display

---

## 📋 ESTRUTURA DOS ARQUIVOS

```
/components/
  LandingPage.tsx           ← Componente principal
  LandingPageModal.tsx      ← Wrapper para modal
  PremiumButton.tsx         ← Botões e paywall

/App.tsx                    ← Preview mode configurado aqui

/LANDING_PAGE_*.md          ← Documentação
```

---

## ✅ RESULTADO ESPERADO

Ao acessar `?preview=landing`, você deve ver:

```
┌─────────────────────────────────────┐
│  [X] Fechar            (topo dir)   │
├─────────────────────────────────────┤
│                                     │
│  ⚡ Junte-se a 10.000+ famílias     │
│                                     │
│  Fortaleça sua família com          │
│  conteúdo transformador             │
│                                     │
│  [Imagem de família feliz]          │
│                                     │
│  [Começar Premium] [Grátis]         │
│                                     │
├─────────────────────────────────────┤
│  10k+ | 100+ | 4.9★ | 95%          │
├─────────────────────────────────────┤
│                                     │
│  Você se identifica?                │
│                                     │
│  [Card 1] [Card 2] [Card 3]        │
│  Problemas comuns                   │
│                                     │
│  ⚡ RAIO é a solução                │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Como funciona                      │
│                                     │
│  [Academia] [IA] [Comunidade] [🏆] │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Escolha seu plano                  │
│                                     │
│  [Gratuito]    [Premium ⭐]        │
│  R$ 0          R$ 49/mês           │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Perguntas frequentes               │
│                                     │
│  [Accordion com 8 perguntas]        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Pronto para transformar?           │
│                                     │
│  [Começar Premium] [Grátis]         │
│                                     │
├─────────────────────────────────────┤
│  RAIO | Sobre | Privacidade        │
│  © 2025 RAIO                        │
└─────────────────────────────────────┘
```

---

## 🎉 PRONTO!

**Acesse agora:**
```
http://localhost:5173/?preview=landing
```

**E veja sua Landing Page em ação!** ⚡

---

**Última Atualização:** Janeiro 2025  
**Status:** ✅ Funcionando perfeitamente  
**Modo:** Isolado (não afeta o app)
