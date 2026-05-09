import React, { useState } from "react";
import { Heart, Bookmark } from "lucide-react";
import { Button } from "./ui/button";
import { useApp } from "./AppContext";
import { cn } from "./ui/utils";

interface FavoriteButtonProps {
  id: number;
  type: 'course' | 'video' | 'post' | 'product';
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ghost" | "outline";
  showLabel?: boolean;
  className?: string;
  notes?: string;
  onToggle?: (isFavorite: boolean) => void;
}

export function FavoriteButton({ 
  id, 
  type, 
  size = "md", 
  variant = "ghost",
  showLabel = false,
  className,
  notes,
  onToggle
}: FavoriteButtonProps) {
  const { addToFavorites, removeFromFavorites, isFavorite: checkIsFavorite } = useApp();
  const [isAnimating, setIsAnimating] = useState(false);
  
  const isFavorite = checkIsFavorite(id, type);

  const handleToggle = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(isFavorite ? 50 : [50, 50, 100]);
    }

    if (isFavorite) {
      removeFromFavorites(id, type);
    } else {
      addToFavorites(id, type, notes);
    }

    onToggle?.(!isFavorite);

    // Reset animation after delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10", 
    lg: "h-12 w-12"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <Button
      variant={variant}
      size="sm"
      className={cn(
        sizeClasses[size],
        "relative overflow-hidden transition-all duration-300 hover:scale-110",
        isFavorite && "text-red-500 hover:text-red-600",
        !isFavorite && "text-muted-foreground hover:text-red-500",
        isAnimating && "animate-pulse",
        className
      )}
      onClick={handleToggle}
      aria-label={`${isFavorite ? 'Remover dos' : 'Adicionar aos'} favoritos`}
      aria-pressed={isFavorite}
    >
      {/* Heart icon with fill animation */}
      <Heart 
        className={cn(
          iconSizes[size],
          "transition-all duration-300",
          isFavorite && "fill-current scale-110",
          isAnimating && "animate-bounce"
        )}
      />
      
      {/* Floating hearts animation */}
      {isAnimating && !isFavorite && (
        <>
          <div className="absolute inset-0 pointer-events-none">
            <Heart className="absolute w-3 h-3 text-red-500 fill-current animate-[float-up-1_0.6s_ease-out]" 
                  style={{ left: '20%', top: '10%' }} />
            <Heart className="absolute w-2 h-2 text-red-400 fill-current animate-[float-up-2_0.8s_ease-out]" 
                  style={{ right: '20%', top: '20%' }} />
            <Heart className="absolute w-2.5 h-2.5 text-red-300 fill-current animate-[float-up-3_0.7s_ease-out]" 
                  style={{ left: '60%', top: '15%' }} />
          </div>
        </>
      )}

      {/* Ripple effect */}
      {isAnimating && (
        <div className="absolute inset-0 rounded-full bg-red-200 animate-ping opacity-30" />
      )}

      {/* Label */}
      {showLabel && (
        <span className="ml-2 text-xs font-medium">
          {isFavorite ? 'Favoritado' : 'Favoritar'}
        </span>
      )}

      {/* Tooltip indicator */}
      <span className="sr-only">
        {isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      </span>
    </Button>
  );
}

// Componente compacto para usar em listas
export function FavoriteIcon({ 
  id, 
  type, 
  className 
}: { 
  id: number; 
  type: 'course' | 'video' | 'post' | 'product'; 
  className?: string;
}) {
  const { addToFavorites, removeFromFavorites, isFavorite: checkIsFavorite } = useApp();
  const isFavorite = checkIsFavorite(id, type);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }

    if (isFavorite) {
      removeFromFavorites(id, type);
    } else {
      addToFavorites(id, type);
    }
  };

  // Task #122 — usamos Bookmark aqui (não Heart) pra eliminar a confusão
  // dos "dois corações" no card de post: o ❤️ vira UMA das reações
  // multi-emoji (gerenciado pelo EmojiReactionPicker), enquanto Salvar
  // é uma ação completamente separada de "guardar pra ler depois".
  return (
    <button
      onClick={handleToggle}
      className={cn(
        "p-1.5 rounded-full transition-all duration-200 hover:bg-black/10 dark:hover:bg-white/10",
        className
      )}
      aria-label={`${isFavorite ? 'Remover dos' : 'Adicionar aos'} salvos`}
      aria-pressed={isFavorite}
      title={isFavorite ? 'Remover dos salvos' : 'Salvar'}
    >
      <Bookmark
        className={cn(
          "w-4 h-4 transition-all duration-200",
          isFavorite
            ? "fill-current text-[var(--rayo-terra-500)] scale-110"
            : "text-muted-foreground hover:text-[var(--rayo-terra-500)]"
        )}
      />
    </button>
  );
}

// Hook para estatísticas de favoritos
export function useFavoriteStats() {
  const { getFavoritesByType } = useApp();
  
  return {
    totalFavorites: getFavoritesByType().length,
    coursesFavorites: getFavoritesByType('course').length,
    videosFavorites: getFavoritesByType('video').length,
    postsFavorites: getFavoritesByType('post').length,
    productsFavorites: getFavoritesByType('product').length,
  };
}