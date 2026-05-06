# 🔗 Landing Page - Exemplos de Integração

Guia prático de como integrar a Landing Page nos principais pontos do app RAIO.

---

## 📍 Exemplo 1: HomePage - Banner Premium

### Contexto
Usuários free veem um banner atrativo no topo da HomePage promovendo Premium.

### Implementação

```tsx
// /components/HomePage.tsx

import { useLandingPageModal } from './LandingPageModal';
import { PremiumButton } from './PremiumButton';

export function HomePage() {
  const { isOpen, open, close } = useLandingPageModal();
  const isPremium = false; // Pegar do contexto do usuário
  
  return (
    <div className="p-4">
      {/* Banner Premium - Mostrar apenas para free users */}
      {!isPremium && (
        <div className="mb-6">
          <PremiumButton onClick={open} variant="banner" />
        </div>
      )}
      
      {/* Resto do conteúdo da HomePage */}
      {/* ... */}
      
      {/* Modal da Landing Page */}
      <LandingPageModal 
        isOpen={isOpen} 
        onClose={close}
        onStartFree={() => {
          close();
          // Usuário já é free, só fecha
        }}
        onStartPremium={() => {
          close();
          // Redireciona para checkout
          window.location.href = '/checkout?plan=premium';
        }}
      />
    </div>
  );
}
```

### Resultado
- Banner visível no topo
- Ao clicar, abre modal fullscreen com LP
- CTA direciona para checkout

---

## 📍 Exemplo 2: Perfil - Card Premium

### Contexto
No perfil do usuário, mostrar um card convidativo para fazer upgrade.

### Implementação

```tsx
// /components/PerfilPage.tsx

import { Crown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useLandingPageModal } from './LandingPageModal';
import { PremiumButton } from './PremiumButton';

export function PerfilPage() {
  const { isOpen, open, close } = useLandingPageModal();
  const isPremium = false; // Do contexto
  
  return (
    <div className="p-4 space-y-6">
      {/* Informações do usuário */}
      {/* ... */}
      
      {/* Card Premium - Apenas para free users */}
      {!isPremium && (
        <Card className="border-2 border-[var(--rayo-terra-500)] bg-gradient-to-br from-[var(--raio-accent-light)] to-[var(--raio-accent-subtle)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[var(--rayo-terra-500)]" />
              Desbloqueie Todo o Potencial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--rayo-ink-700)] text-sm">
              Acesse 100+ cursos, conselheiro IA ilimitado, e muito mais.
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--rayo-terra-500)]" />
                <span className="text-[var(--rayo-ink-700)]">
                  Certificados profissionais
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--rayo-terra-500)]" />
                <span className="text-[var(--rayo-ink-700)]">
                  Suporte prioritário
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--rayo-terra-500)]" />
                <span className="text-[var(--rayo-ink-700)]">
                  Sem anúncios
                </span>
              </div>
            </div>
            
            <PremiumButton onClick={open} variant="default" />
            
            <p className="text-[var(--rayo-ink-400)] text-xs text-center">
              7 dias grátis • R$ 49/mês
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Resto do perfil */}
      {/* ... */}
      
      {/* Modal */}
      <LandingPageModal isOpen={isOpen} onClose={close} />
    </div>
  );
}
```

---

## 📍 Exemplo 3: Academia - Paywall em Curso Premium

### Contexto
Quando usuário free tenta acessar um curso premium, mostra paywall.

### Implementação

```tsx
// /components/CourseDetailPage.tsx

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PaywallOverlay } from './PremiumButton';
import { useLandingPageModal } from './LandingPageModal';

export function CourseDetailPage({ course }) {
  const [showPaywall, setShowPaywall] = useState(false);
  const { isOpen, open, close } = useLandingPageModal();
  const isPremium = false; // Do contexto
  
  const handleEnroll = () => {
    // Se curso é premium e usuário é free
    if (course.isPremium && !isPremium) {
      setShowPaywall(true);
      return;
    }
    
    // Senão, matricula normalmente
    enrollInCourse(course.id);
  };
  
  return (
    <div className="p-4">
      {/* Header do curso */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-[var(--rayo-forest-900)]">
            {course.title}
          </h1>
          {course.isPremium && (
            <Badge className="bg-[var(--rayo-terra-500)] text-[var(--raio-text-inverse)]">
              <Lock className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          )}
        </div>
        <p className="text-[var(--rayo-ink-700)]">
          {course.description}
        </p>
      </div>
      
      {/* CTA */}
      <Button 
        onClick={handleEnroll}
        className="w-full"
      >
        {course.isPremium && !isPremium ? (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Desbloquear Curso
          </>
        ) : (
          'Começar Curso'
        )}
      </Button>
      
      {/* Paywall Overlay */}
      {showPaywall && (
        <PaywallOverlay
          title="Curso Premium"
          description="Este curso faz parte do plano Premium. Faça upgrade para acessar este e 100+ outros cursos."
          onUpgrade={() => {
            setShowPaywall(false);
            open(); // Abre Landing Page completa
          }}
          onCancel={() => setShowPaywall(false)}
        />
      )}
      
      {/* Modal da LP */}
      <LandingPageModal 
        isOpen={isOpen} 
        onClose={close}
        onStartPremium={() => {
          close();
          window.location.href = '/checkout?plan=premium&source=course';
        }}
      />
    </div>
  );
}
```

---

## 📍 Exemplo 4: Conselheiro - Limite de Mensagens

### Contexto
Usuários free têm limite de 10 mensagens/dia. Ao atingir, mostrar upgrade.

### Implementação

```tsx
// /components/ConselheiroPage.tsx

import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Crown, MessageCircle } from 'lucide-react';
import { useLandingPageModal } from './LandingPageModal';
import { PremiumButton } from './PremiumButton';

export function ConselheiroPage() {
  const { isOpen, open, close } = useLandingPageModal();
  const isPremium = false;
  const messageCount = 8; // Contador de mensagens hoje
  const MESSAGE_LIMIT = 10;
  
  const messagesRemaining = MESSAGE_LIMIT - messageCount;
  const hasReachedLimit = messageCount >= MESSAGE_LIMIT;
  
  return (
    <div className="p-4">
      {/* Warning - Perto do limite */}
      {!isPremium && messagesRemaining <= 3 && messagesRemaining > 0 && (
        <Alert className="mb-4 border-[var(--rayo-ochre-500)]">
          <MessageCircle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Você tem {messagesRemaining} mensagem{messagesRemaining !== 1 ? 's' : ''} restante{messagesRemaining !== 1 ? 's' : ''} hoje.
            <button
              onClick={open}
              className="text-[var(--rayo-terra-500)] hover:underline ml-1"
            >
              Faça upgrade para mensagens ilimitadas
            </button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Limite atingido */}
      {!isPremium && hasReachedLimit && (
        <Alert className="mb-4 border-[var(--rayo-terra-500)] bg-[var(--raio-accent-subtle)]">
          <Crown className="h-4 w-4 text-[var(--rayo-terra-500)]" />
          <AlertTitle>Limite Diário Atingido</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Você usou suas 10 mensagens gratuitas de hoje. 
              Faça upgrade para conversas ilimitadas!
            </p>
            <PremiumButton onClick={open} variant="default" />
          </AlertDescription>
        </Alert>
      )}
      
      {/* Chat */}
      <div className="space-y-4">
        {/* Mensagens */}
        {/* ... */}
      </div>
      
      {/* Input - Desabilitado se atingiu limite */}
      <div className="mt-4">
        <textarea
          disabled={!isPremium && hasReachedLimit}
          placeholder={
            !isPremium && hasReachedLimit
              ? 'Faça upgrade para continuar conversando'
              : 'Digite sua mensagem...'
          }
          className="w-full p-3 rounded-lg border"
        />
      </div>
      
      {/* Modal */}
      <LandingPageModal isOpen={isOpen} onClose={close} />
    </div>
  );
}
```

---

## 📍 Exemplo 5: Settings - Item "Planos e Assinaturas"

### Contexto
No menu de configurações, adicionar item para ver planos.

### Implementação

```tsx
// /components/SettingsModal.tsx

import { Crown, Settings, Bell, Shield, HelpCircle } from 'lucide-react';
import { useLandingPageModal } from './LandingPageModal';

export function SettingsModal() {
  const { isOpen, open, close } = useLandingPageModal();
  const isPremium = false;
  
  const settingsItems = [
    {
      icon: Crown,
      title: 'Planos e Assinaturas',
      subtitle: isPremium ? 'Gerenciar assinatura' : 'Ver planos Premium',
      onClick: open,
      highlight: !isPremium, // Destaque para free users
    },
    {
      icon: Bell,
      title: 'Notificações',
      subtitle: 'Configurar alertas',
      onClick: () => {},
    },
    {
      icon: Shield,
      title: 'Privacidade e Segurança',
      subtitle: 'Dados e permissões',
      onClick: () => {},
    },
    {
      icon: HelpCircle,
      title: 'Ajuda e Suporte',
      subtitle: 'FAQ e contato',
      onClick: () => {},
    },
  ];
  
  return (
    <>
      <div className="p-4 space-y-2">
        {settingsItems.map((item) => (
          <button
            key={item.title}
            onClick={item.onClick}
            className={`
              w-full p-4 rounded-lg border text-left
              hover:bg-[var(--rayo-sand-300)] transition-colors
              ${item.highlight ? 'border-[var(--rayo-terra-500)] bg-[var(--raio-accent-subtle)]' : 'border-[var(--rayo-sand-300)]'}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${item.highlight ? 'bg-[var(--rayo-terra-500)]' : 'bg-[var(--rayo-sand-300)]'}
              `}>
                <item.icon 
                  className={`w-5 h-5 ${item.highlight ? 'text-[var(--raio-text-inverse)]' : 'text-[var(--rayo-ink-700)]'}`}
                />
              </div>
              <div className="flex-1">
                <div className={`${item.highlight ? 'text-[var(--rayo-terra-500)]' : 'text-[var(--rayo-forest-900)]'}`}>
                  {item.title}
                </div>
                <div className="text-[var(--rayo-ink-400)] text-sm">
                  {item.subtitle}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Modal */}
      <LandingPageModal isOpen={isOpen} onClose={close} />
    </>
  );
}
```

---

## 📍 Exemplo 6: App.tsx - Primeira Experiência

### Contexto
Mostrar Landing Page completa para novos usuários ANTES do onboarding.

### Implementação

```tsx
// /App.tsx

function AppContent() {
  const [showLanding, setShowLanding] = useState(false);
  const [hasSeenLanding, setHasSeenLanding] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  
  useEffect(() => {
    const seenLanding = localStorage.getItem('raio-landing-seen');
    const user = localStorage.getItem('raio-user');
    
    if (!seenLanding && !user) {
      // Novo usuário: mostrar landing primeiro
      setShowLanding(true);
    } else {
      setHasSeenLanding(true);
      if (user) {
        setIsOnboarded(true);
      }
    }
  }, []);
  
  // Renderizar Landing Page fullscreen
  if (showLanding && !hasSeenLanding) {
    return (
      <LandingPage
        onStartFree={() => {
          localStorage.setItem('raio-landing-seen', 'true');
          setShowLanding(false);
          setHasSeenLanding(true);
          // Vai para onboarding como free user
        }}
        onStartPremium={() => {
          localStorage.setItem('raio-landing-seen', 'true');
          setShowLanding(false);
          setHasSeenLanding(true);
          // Vai para onboarding + marca como premium intent
          localStorage.setItem('raio-premium-intent', 'true');
        }}
      />
    );
  }
  
  // Resto do app normal
  if (!isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }
  
  return (
    <div>
      {/* App principal */}
    </div>
  );
}
```

---

## 📍 Exemplo 7: TopNavbar - Badge Premium (Desktop)

### Contexto
No header desktop, mostrar badge "Premium" que abre a LP.

### Implementação

```tsx
// /components/TopNavbar.tsx

import { Crown } from 'lucide-react';
import { Badge } from './ui/badge';
import { useLandingPageModal } from './LandingPageModal';

export function TopNavbar() {
  const { isOpen, open, close } = useLandingPageModal();
  const isPremium = false;
  
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[var(--rayo-sand-50)] border-b border-[var(--rayo-sand-300)] z-40">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-xl">RAIO</span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-4">
          {!isPremium && (
            <Badge
              onClick={open}
              className="
                bg-[var(--rayo-terra-500)] 
                hover:bg-[var(--rayo-terra-700)] 
                text-[var(--raio-text-inverse)] 
                cursor-pointer
                px-3 py-1
              "
            >
              <Crown className="w-3.5 h-3.5 mr-1.5" />
              Seja Premium
            </Badge>
          )}
          
          {/* Outros ícones (notificações, perfil, etc) */}
        </div>
      </div>
      
      {/* Modal */}
      <LandingPageModal isOpen={isOpen} onClose={close} />
    </header>
  );
}
```

---

## 📍 Exemplo 8: Biblioteca - Lock em Livros Premium

### Contexto
Livros premium mostram badge e ao clicar, abre paywall.

### Implementação

```tsx
// /components/BibliotecaPage.tsx

import { Lock } from 'lucide-react';
import { Badge } from './ui/badge';
import { BookCard } from './BookCard';
import { PaywallOverlay } from './PremiumButton';
import { useLandingPageModal } from './LandingPageModal';

export function BibliotecaPage() {
  const [selectedBook, setSelectedBook] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isOpen, open, close } = useLandingPageModal();
  const isPremium = false;
  
  const handleBookClick = (book) => {
    if (book.isPremium && !isPremium) {
      setSelectedBook(book);
      setShowPaywall(true);
    } else {
      // Abrir livro normalmente
      openBook(book);
    }
  };
  
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-4">
        {books.map((book) => (
          <div key={book.id} className="relative">
            <BookCard
              book={book}
              onClick={() => handleBookClick(book)}
            />
            {book.isPremium && !isPremium && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-[var(--rayo-terra-500)] text-[var(--raio-text-inverse)]">
                  <Lock className="w-3 h-3" />
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Paywall */}
      {showPaywall && selectedBook && (
        <PaywallOverlay
          title={selectedBook.title}
          description="Este livro faz parte do acervo Premium. Faça upgrade para ler e ouvir todos os livros."
          onUpgrade={() => {
            setShowPaywall(false);
            open();
          }}
          onCancel={() => setShowPaywall(false)}
        />
      )}
      
      {/* Modal */}
      <LandingPageModal isOpen={isOpen} onClose={close} />
    </div>
  );
}
```

---

## 🎯 Resumo de Pontos de Integração

### Alta Prioridade (Implementar Primeiro)
1. ✅ **HomePage** - Banner premium visível
2. ✅ **Perfil** - Card upgrade
3. ✅ **Academia** - Paywall em cursos premium
4. ✅ **Biblioteca** - Lock em livros premium

### Média Prioridade (Segunda Fase)
5. ✅ **Conselheiro** - Limite de mensagens
6. ✅ **Settings** - Item "Planos"
7. ✅ **TopNavbar** - Badge premium (desktop)

### Baixa Prioridade (Opcional)
8. ⚪ **App.tsx** - Primeira experiência (pode ser muito agressivo)
9. ⚪ **Comunidade** - Features premium exclusivas
10. ⚪ **Notificações** - Push promovendo premium

---

## 📊 Analytics - Eventos a Trackear

### Para cada integração, track:

```typescript
// Quando modal abre
analytics.track('LANDING_MODAL_OPENED', {
  source: 'homepage_banner' | 'perfil_card' | 'course_paywall' | 'settings',
  user_type: 'free' | 'trial',
  timestamp: ISO string
});

// Quando usuário clica CTA
analytics.track('LANDING_CTA_CLICKED', {
  source: string,
  cta_type: 'start_free' | 'start_premium',
  location: 'hero' | 'pricing' | 'final',
  timestamp: ISO string
});

// Quando modal fecha
analytics.track('LANDING_MODAL_CLOSED', {
  source: string,
  time_spent: number, // segundos
  converted: boolean,
  timestamp: ISO string
});
```

---

## 💡 Dicas de Implementação

### 1. Contexto de Usuário
Crie um hook global para dados do usuário:

```tsx
// hooks/useUser.ts
export function useUser() {
  const [user, setUser] = useState(null);
  
  const isPremium = user?.isPremium || false;
  const isFreeTrial = user?.isFreeTrial || false;
  const isFree = !isPremium && !isFreeTrial;
  
  return { user, isPremium, isFreeTrial, isFree };
}
```

### 2. Modal Global
Considere um provider global para o modal:

```tsx
// contexts/LandingPageContext.tsx
const LandingPageContext = createContext();

export function LandingPageProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState('');
  
  const open = (src) => {
    setSource(src);
    setIsOpen(true);
  };
  
  return (
    <LandingPageContext.Provider value={{ isOpen, open, close }}>
      {children}
      <LandingPageModal isOpen={isOpen} onClose={close} />
    </LandingPageContext.Provider>
  );
}
```

### 3. Redução de Código
Use um componente wrapper:

```tsx
// components/PremiumGate.tsx
export function PremiumGate({ children, fallback }) {
  const { isPremium } = useUser();
  
  if (isPremium) {
    return <>{children}</>;
  }
  
  return fallback || null;
}

// Uso:
<PremiumGate fallback={<PaywallOverlay />}>
  <PremiumContent />
</PremiumGate>
```

---

## ✅ Checklist de Implementação

Para cada ponto de integração:

- [ ] Importar componentes necessários
- [ ] Adicionar hook useLandingPageModal
- [ ] Renderizar botão/banner/badge
- [ ] Configurar callbacks (onStartPremium, etc)
- [ ] Adicionar analytics tracking
- [ ] Testar em mobile e desktop
- [ ] Testar com user free e premium
- [ ] Validar acessibilidade
- [ ] Code review

---

**Próximo Passo:** Escolha 2-3 pontos de integração e implemente esta semana!
