import { Zap, Crown, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';

interface PremiumButtonProps {
  onClick: () => void;
  variant?: 'default' | 'compact' | 'badge' | 'banner';
  className?: string;
}

/**
 * Botão Premium que pode ser usado em diferentes contextos
 * para abrir a Landing Page ou fluxo de upgrade
 * 
 * Variantes:
 * - default: Botão completo com ícone e texto
 * - compact: Versão menor para headers/toolbars
 * - badge: Badge discreto para cards de conteúdo
 * - banner: Banner horizontal para destaque
 */
export function PremiumButton({ 
  onClick, 
  variant = 'default',
  className 
}: PremiumButtonProps) {
  
  // Variant: Default Button
  if (variant === 'default') {
    return (
      <Button
        onClick={onClick}
        className={cn(
          "bg-[var(--raio-accent-primary)] hover:bg-[var(--raio-accent-hover)] text-[var(--raio-text-inverse)] shadow-md",
          className
        )}
      >
        <Zap className="w-4 h-4 mr-2" />
        Seja Premium
      </Button>
    );
  }

  // Variant: Compact (para headers)
  if (variant === 'compact') {
    return (
      <Button
        size="sm"
        onClick={onClick}
        className={cn(
          "bg-[var(--raio-accent-primary)] hover:bg-[var(--raio-accent-hover)] text-[var(--raio-text-inverse)] h-8 px-3",
          className
        )}
      >
        <Crown className="w-3.5 h-3.5 mr-1.5" />
        Premium
      </Button>
    );
  }

  // Variant: Badge (para cards de conteúdo)
  if (variant === 'badge') {
    return (
      <Badge
        onClick={onClick}
        className={cn(
          "bg-[var(--raio-accent-primary)] hover:bg-[var(--raio-accent-hover)] text-[var(--raio-text-inverse)] cursor-pointer",
          className
        )}
      >
        <Crown className="w-3 h-3 mr-1" />
        Premium
      </Badge>
    );
  }

  // Variant: Banner (para destaque maior)
  if (variant === 'banner') {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full p-4 rounded-xl bg-gradient-to-r from-[var(--raio-accent-light)] to-[var(--raio-accent-subtle)] border border-[var(--raio-accent-primary)] hover:shadow-[var(--raio-shadow-lg)] transition-all",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--raio-accent-primary)] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[var(--raio-text-inverse)]" />
            </div>
            <div className="text-left">
              <div className="text-[var(--raio-text-primary)] mb-0.5">
                Desbloqueie Premium
              </div>
              <div className="text-[var(--raio-text-secondary)] text-sm">
                Acesso ilimitado por R$ 49/mês
              </div>
            </div>
          </div>
          <Zap className="w-5 h-5 text-[var(--raio-accent-primary)] flex-shrink-0" />
        </div>
      </button>
    );
  }

  // Fallback
  return null;
}

/**
 * Componente de Paywall suave
 * Mostra quando usuário free tenta acessar conteúdo premium
 */
interface PaywallOverlayProps {
  onUpgrade: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export function PaywallOverlay({ 
  onUpgrade, 
  onCancel,
  title = "Conteúdo Premium",
  description = "Faça upgrade para acessar este e todo o conteúdo exclusivo"
}: PaywallOverlayProps) {
  return (
    <div className="fixed inset-0 bg-[var(--raio-bg-overlay)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--raio-bg-secondary)] rounded-2xl shadow-[var(--raio-shadow-xl)] p-6 max-w-md w-full border border-[var(--raio-border-default)]">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-[var(--raio-accent-light)] flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-[var(--raio-accent-primary)]" />
        </div>

        {/* Content */}
        <h3 className="text-[var(--raio-text-primary)] text-center mb-2">
          {title}
        </h3>
        <p className="text-[var(--raio-text-secondary)] text-center mb-6 text-sm">
          {description}
        </p>

        {/* Benefits */}
        <div className="bg-[var(--raio-bg-tertiary)] rounded-lg p-4 mb-6">
          <div className="space-y-2">
            {[
              'Acesso a todos os cursos',
              'Conselheiro IA ilimitado',
              'Conteúdo sincronizado',
              'Certificados profissionais'
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--raio-accent-primary)] flex-shrink-0" />
                <span className="text-[var(--raio-text-secondary)] text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            onClick={onUpgrade}
            className="w-full bg-[var(--raio-accent-primary)] hover:bg-[var(--raio-accent-hover)] text-[var(--raio-text-inverse)]"
          >
            <Crown className="w-4 h-4 mr-2" />
            Fazer Upgrade - R$ 49/mês
          </Button>
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="ghost"
              className="w-full"
            >
              Voltar
            </Button>
          )}
        </div>

        <p className="text-[var(--raio-text-tertiary)] text-center mt-4 text-xs">
          7 dias grátis • Cancele quando quiser
        </p>
      </div>
    </div>
  );
}
