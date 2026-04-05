import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { LandingPage } from './LandingPage';
import { analytics } from '../lib/analytics/mixpanel';

interface LandingPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartFree?: () => void;
  onStartPremium?: () => void;
}

/**
 * Modal/Sheet wrapper para a Landing Page
 * Permite abrir a LP dentro do app sem interromper o fluxo
 * 
 * Uso:
 * - Botão "Saiba Mais sobre Premium" em qualquer lugar
 * - Paywall suave após X cursos/livros
 * - Link no menu de configurações
 */
export function LandingPageModal({ 
  isOpen, 
  onClose, 
  onStartFree,
  onStartPremium 
}: LandingPageModalProps) {
  
  const handleStartFree = () => {
    analytics.track('LANDING_MODAL_START_FREE', {
      source: 'modal',
      timestamp: new Date().toISOString()
    });
    onStartFree?.();
    onClose();
  };

  const handleStartPremium = () => {
    analytics.track('LANDING_MODAL_START_PREMIUM', {
      source: 'modal',
      timestamp: new Date().toISOString()
    });
    onStartPremium?.();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[95vh] p-0 overflow-y-auto"
      >
        {/* Hidden titles for accessibility */}
        <SheetTitle className="sr-only">Landing Page RAIO</SheetTitle>
        <SheetDescription className="sr-only">
          Conheça os planos e recursos da plataforma RAIO para fortalecer sua família
        </SheetDescription>
        
        <LandingPage
          onStartFree={handleStartFree}
          onStartPremium={handleStartPremium}
          onClose={onClose}
          showCloseButton={true}
        />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Hook para controlar o modal da Landing Page
 * 
 * Exemplo de uso:
 * ```tsx
 * function SomeComponent() {
 *   const { isOpen, open, close } = useLandingPageModal();
 *   
 *   return (
 *     <>
 *       <Button onClick={open}>Ver Planos Premium</Button>
 *       <LandingPageModal isOpen={isOpen} onClose={close} />
 *     </>
 *   );
 * }
 * ```
 */
export function useLandingPageModal() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => {
    analytics.track('LANDING_MODAL_OPENED', {
      timestamp: new Date().toISOString()
    });
    setIsOpen(true);
  };

  const close = () => {
    analytics.track('LANDING_MODAL_CLOSED', {
      timestamp: new Date().toISOString()
    });
    setIsOpen(false);
  };

  return { isOpen, open, close };
}
