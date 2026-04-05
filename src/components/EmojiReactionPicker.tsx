import { useState } from "react";
import { Heart } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";

interface Reaction {
  emoji: string;
  name: string;
  color: string;
}

const reactions: Reaction[] = [
  { emoji: "❤️", name: "Curtir", color: "text-red-500" },
  { emoji: "😍", name: "Amei", color: "text-red-500" },
  { emoji: "😂", name: "Hilário", color: "text-yellow-500" },
  { emoji: "🥰", name: "Fofo", color: "text-pink-500" },
  { emoji: "👏", name: "Parabéns", color: "text-blue-500" },
  { emoji: "🙏", name: "Amém", color: "text-purple-500" },
  { emoji: "💪", name: "Força", color: "text-orange-500" },
  { emoji: "🔥", name: "Top", color: "text-red-600" },
  { emoji: "✨", name: "Inspirador", color: "text-yellow-400" },
  { emoji: "💕", name: "Love", color: "text-pink-400" }
];

interface EmojiReactionPickerProps {
  postId: number;
  currentReaction?: string;
  reactionCount: number;
  onReact: (postId: number, emoji: string) => void;
  className?: string;
}

export function EmojiReactionPicker({ 
  postId, 
  currentReaction, 
  reactionCount, 
  onReact,
  className = ""
}: EmojiReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReactionSelect = (emoji: string) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
    
    // Se já reagiu com o mesmo emoji, remove a reação
    if (currentReaction === emoji) {
      onReact(postId, "");
    } else {
      onReact(postId, emoji);
    }
    
    setIsOpen(false);
  };

  const getCurrentReactionColor = () => {
    if (!currentReaction) return "text-muted-foreground";
    
    const reaction = reactions.find(r => r.emoji === currentReaction);
    return reaction ? reaction.color : "text-red-500";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className={`flex items-center gap-2 text-sm transition-all duration-200 mobile-touch-target hover:shadow-md ${getCurrentReactionColor()} hover:brightness-110 ${className}`}
          aria-label={currentReaction ? `Reação atual: ${currentReaction}` : 'Reagir ao post'}
        >
          {currentReaction ? (
            <span className="text-base hover:brightness-125 transition-all duration-200">
              {currentReaction}
            </span>
          ) : (
            <Heart className="w-4 h-4 hover:fill-current transition-colors duration-200" />
          )}
          <span className="font-medium">{reactionCount > 0 ? reactionCount : ''}</span>
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-auto p-2 bg-card/95 backdrop-blur-sm border shadow-lg" 
        align="start"
        side="top"
      >
        <div className="grid grid-cols-5 gap-1">
          {reactions.map((reaction) => (
            <Button
              key={reaction.emoji}
              variant="ghost"
              size="sm"
              className="w-12 h-12 p-0 hover:bg-accent/50 hover:shadow-md transition-all duration-200 group"
              onClick={() => handleReactionSelect(reaction.emoji)}
              title={reaction.name}
            >
              <span 
                className="text-xl group-hover:brightness-125 transition-all duration-200"
                role="img" 
                aria-label={reaction.name}
              >
                {reaction.emoji}
              </span>
            </Button>
          ))}
        </div>
        
        {/* Indicador visual quando já reagiu */}
        {currentReaction && (
          <div className="mt-2 pt-2 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Clique novamente para remover sua reação
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Hook para gerenciar reações (pode ser movido para um arquivo separado se necessário)
export function useReactions() {
  const [reactions, setReactions] = useState<{[postId: number]: {emoji: string, count: number}}>({});

  const handleReaction = (postId: number, emoji: string) => {
    setReactions(prev => ({
      ...prev,
      [postId]: {
        emoji: emoji || "",
        count: emoji ? (prev[postId]?.count || 0) + (prev[postId]?.emoji === emoji ? -1 : 1) : 0
      }
    }));
  };

  return {
    reactions,
    handleReaction
  };
}