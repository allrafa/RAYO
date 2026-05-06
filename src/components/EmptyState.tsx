import { ReactNode } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  illustration?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  illustration,
  className = ""
}: EmptyStateProps) {
  return (
    <Card className={`border-none shadow-none bg-transparent ${className}`}>
      <CardContent className="text-center py-12 px-6 space-y-6">
        {/* Illustration or Icon */}
        <div className="flex justify-center">
          {illustration ? (
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-muted to-accent p-8 flex items-center justify-center">
              <div className="text-6xl opacity-60">{illustration}</div>
            </div>
          ) : icon ? (
            <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              {icon}
            </div>
          ) : (
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/10 to-accent/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-primary/20"></div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3 max-w-md mx-auto">
          <h3 className="font-display font-semibold text-foreground">
            {title}
          </h3>
          <p className="font-body text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
            {action && (
              <Button
                onClick={action.onClick}
                variant={action.variant || "default"}
                className="w-full sm:w-auto"
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Variações pré-definidas para casos comuns
export function EmptyStateNoResults({ onReset }: { onReset?: () => void }) {
  return (
    <EmptyState
      illustration="🔍"
      title="Nenhum resultado encontrado"
      description="Tente ajustar seus filtros ou termos de busca para encontrar o que procura."
      action={onReset ? {
        label: "Limpar Filtros",
        onClick: onReset,
        variant: "outline"
      } : undefined}
    />
  );
}

export function EmptyStateNoCourses({ onExplore }: { onExplore?: () => void }) {
  return (
    <EmptyState
      illustration="📚"
      title="Seus cursos aparecerão aqui"
      description="Matricule-se em um curso para começar sua jornada de transformação."
      action={onExplore ? {
        label: "Explorar Cursos",
        onClick: onExplore
      } : undefined}
    />
  );
}

export function EmptyStateNoCommunity({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      illustration="💬"
      title="Seja o primeiro a postar"
      description="Compartilhe sua experiência e conecte-se com outros membros da comunidade RAYO."
      action={onCreate ? {
        label: "Criar Post",
        onClick: onCreate
      } : undefined}
    />
  );
}

export function EmptyStateNoConversations({ onStart }: { onStart?: () => void }) {
  return (
    <EmptyState
      illustration="🤖"
      title="Suas conversas ficarão aqui"
      description="Comece uma conversa com nossos consultores IA para receber orientação personalizada."
      action={onStart ? {
        label: "Falar com Conselheiro",
        onClick: onStart
      } : undefined}
    />
  );
}

export function EmptyStateOffline({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      illustration="📶"
      title="Você está offline"
      description="Verifique sua conexão com a internet e tente novamente."
      action={onRetry ? {
        label: "Tentar Novamente",
        onClick: onRetry
      } : undefined}
    />
  );
}

export function EmptyStateError({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      illustration="⚠️"
      title="Algo deu errado"
      description="Tivemos um problema ao carregar o conteúdo. Por favor, tente novamente."
      action={onRetry ? {
        label: "Tentar Novamente",
        onClick: onRetry
      } : undefined}
    />
  );
}