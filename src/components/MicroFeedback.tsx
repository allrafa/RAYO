import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, AlertCircle, Info, Zap, Heart, Star } from "lucide-react";

interface MicroFeedbackProps {
  type: 'success' | 'error' | 'warning' | 'info' | 'love' | 'achievement';
  message?: string;
  duration?: number;
  show: boolean;
  onHide?: () => void;
  position?: 'top' | 'center' | 'bottom';
  haptic?: boolean;
}

const feedbackConfig = {
  success: {
    icon: Check,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20"
  },
  error: {
    icon: X,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20"
  },
  warning: {
    icon: AlertCircle,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20"
  },
  info: {
    icon: Info,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20"
  },
  love: {
    icon: Heart,
    color: "text-raio-coral-500",
    bg: "bg-raio-coral-500/10",
    border: "border-raio-coral-500/20"
  },
  achievement: {
    icon: Star,
    color: "text-raio-gold-500",
    bg: "bg-raio-gold-500/10",
    border: "border-raio-gold-500/20"
  }
};

export function MicroFeedback({
  type,
  message,
  duration = 2000,
  show,
  onHide,
  position = 'center',
  haptic = true
}: MicroFeedbackProps) {
  const [isVisible, setIsVisible] = useState(show);
  const config = feedbackConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    setIsVisible(show);
    
    if (show) {
      // Haptic feedback
      if (haptic && 'vibrate' in navigator) {
        switch (type) {
          case 'success':
          case 'achievement':
            navigator.vibrate([50, 50, 100]);
            break;
          case 'error':
            navigator.vibrate([100, 50, 100, 50, 100]);
            break;
          case 'love':
            navigator.vibrate([50, 100, 50]);
            break;
          default:
            navigator.vibrate(50);
        }
      }

      // Auto hide
      const timer = setTimeout(() => {
        setIsVisible(false);
        onHide?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onHide, type, haptic]);

  const positionClasses = {
    top: "top-20",
    center: "top-1/2 -translate-y-1/2",
    bottom: "bottom-20"
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: position === 'center' ? 0 : position === 'top' ? -20 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: position === 'center' ? 0 : position === 'top' ? -20 : 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`fixed left-1/2 -translate-x-1/2 ${positionClasses[position]} z-50 pointer-events-none`}
        >
          <div className={`
            flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md
            ${config.bg} ${config.border}
            shadow-lg shadow-black/10
          `}>
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`${config.color}`}
            >
              <Icon className="w-5 h-5" />
            </motion.div>
            
            {message && (
              <span className="font-body text-sm font-medium text-foreground">
                {message}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook para usar micro feedback facilmente
export function useMicroFeedback() {
  const [feedback, setFeedback] = useState<{
    type: MicroFeedbackProps['type'];
    message?: string;
    show: boolean;
  }>({
    type: 'success',
    show: false
  });

  const showFeedback = (
    type: MicroFeedbackProps['type'], 
    message?: string, 
    duration?: number
  ) => {
    setFeedback({ type, message, show: true });
    
    setTimeout(() => {
      setFeedback(prev => ({ ...prev, show: false }));
    }, duration || 2000);
  };

  const hideFeedback = () => {
    setFeedback(prev => ({ ...prev, show: false }));
  };

  return {
    feedback,
    showFeedback,
    hideFeedback,
    // Métodos de conveniência
    showSuccess: (message?: string) => showFeedback('success', message),
    showError: (message?: string) => showFeedback('error', message),
    showWarning: (message?: string) => showFeedback('warning', message),
    showInfo: (message?: string) => showFeedback('info', message),
    showLove: (message?: string) => showFeedback('love', message),
    showAchievement: (message?: string) => showFeedback('achievement', message)
  };
}

// Componente para feedback de botão inline
interface ButtonFeedbackProps {
  children: React.ReactNode;
  onFeedback: (type: MicroFeedbackProps['type']) => void;
  feedbackType?: MicroFeedbackProps['type'];
  disabled?: boolean;
  className?: string;
}

export function ButtonWithFeedback({
  children,
  onFeedback,
  feedbackType = 'success',
  disabled = false,
  className = ""
}: ButtonFeedbackProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    if (disabled) return;
    
    setIsPressed(true);
    onFeedback(feedbackType);
    
    setTimeout(() => setIsPressed(false), 150);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onTap={handlePress}
      disabled={disabled}
      className={`
        relative overflow-hidden transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {/* Ripple effect */}
      <AnimatePresence>
        {isPressed && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-white rounded-full"
            style={{ transformOrigin: 'center' }}
          />
        )}
      </AnimatePresence>
      
      {children}
    </motion.button>
  );
}

// Componente para feedback de formulário
interface FormFieldFeedbackProps {
  type: 'success' | 'error' | 'warning';
  message: string;
  show: boolean;
}

export function FormFieldFeedback({ type, message, show }: FormFieldFeedbackProps) {
  const config = feedbackConfig[type];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg ${config.bg} ${config.border} border`}>
            <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
            <span className="font-body text-sm text-foreground">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}