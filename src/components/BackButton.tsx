import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "default" | "lg";
  className?: string;
  disabled?: boolean;
}

export function BackButton({ 
  onClick, 
  label = "Voltar", 
  variant = "ghost", 
  size = "sm",
  className = "",
  disabled = false
}: BackButtonProps) {
  const handleClick = () => {
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onClick();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`flex items-center gap-2 ${className}`}
      aria-label={label}
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      <span>{label}</span>
    </Button>
  );
}