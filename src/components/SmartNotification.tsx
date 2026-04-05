import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Bell, Check, Info, AlertTriangle, Heart, Gift, Zap, Award, MessageCircle } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

interface SmartNotificationProps {
  id: string;
  type: 'system' | 'social' | 'achievement' | 'reminder' | 'promotion' | 'update';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  timestamp: Date;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'outline' | 'destructive';
  }>;
  avatar?: string;
  image?: string;
  data?: any; // Dados adicionais específicos do tipo
  isRead?: boolean;
  onRead?: () => void;
  onDismiss?: () => void;
  onAction?: (actionId: string) => void;
}

const notificationConfig = {
  system: {
    icon: Bell,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20"
  },
  social: {
    icon: MessageCircle,
    color: "text-raio-coral-500",
    bg: "bg-raio-coral-500/10",
    border: "border-raio-coral-500/20"
  },
  achievement: {
    icon: Award,
    color: "text-raio-gold-500",
    bg: "bg-raio-gold-500/10",
    border: "border-raio-gold-500/20"
  },
  reminder: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20"
  },
  promotion: {
    icon: Gift,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20"
  },
  update: {
    icon: Info,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20"
  }
};

const priorityConfig = {
  low: { urgency: '', pulse: false },
  medium: { urgency: 'border-l-4 border-l-warning', pulse: false },
  high: { urgency: 'border-l-4 border-l-destructive', pulse: true },
  urgent: { urgency: 'border-l-4 border-l-destructive border-2', pulse: true }
};

export function SmartNotification({
  id,
  type,
  priority,
  title,
  message,
  timestamp,
  actions,
  avatar,
  image,
  data,
  isRead = false,
  onRead,
  onDismiss,
  onAction
}: SmartNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [hasBeenRead, setHasBeenRead] = useState(isRead);
  
  const config = notificationConfig[type];
  const priorityStyle = priorityConfig[priority];
  const Icon = config.icon;

  useEffect(() => {
    // Marcar como lida após 3 segundos se for nova
    if (!hasBeenRead && isVisible) {
      const timer = setTimeout(() => {
        setHasBeenRead(true);
        onRead?.();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [hasBeenRead, isVisible, onRead]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  const handleAction = (actionIndex: number) => {
    if (actions?.[actionIndex]) {
      actions[actionIndex].action();
      onAction?.(actionIndex.toString());
    }
  };

  const getTimeAgo = () => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'agora';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            x: 0, 
            scale: 1,
            ...(priorityStyle.pulse && {
              boxShadow: [
                "0 0 0 0 rgba(239, 68, 68, 0.4)",
                "0 0 0 10px rgba(239, 68, 68, 0)",
                "0 0 0 0 rgba(239, 68, 68, 0)"
              ]
            })
          }}
          exit={{ opacity: 0, x: 300, scale: 0.9 }}
          transition={{ 
            duration: 0.3,
            ...(priorityStyle.pulse && {
              boxShadow: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }
            })
          }}
          className="relative"
        >
          <Card 
            className={`
              ${config.bg} ${config.border} ${priorityStyle.urgency}
              ${hasBeenRead ? 'opacity-75' : ''}
              transition-all duration-200 cursor-pointer hover:shadow-md
              border backdrop-blur-sm
            `}
            onClick={() => {
              if (!hasBeenRead) {
                setHasBeenRead(true);
                onRead?.();
              }
            }}
          >
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar ou Icon */}
                  {avatar ? (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={avatar} alt="" />
                      <AvatarFallback>
                        <Icon className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                  )}
                  
                  {/* Title & Time */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-foreground">
                        {title}
                      </h4>
                      {!hasBeenRead && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {getTimeAgo()}
                    </span>
                  </div>
                </div>

                {/* Priority Badge & Close */}
                <div className="flex items-center gap-2">
                  {priority === 'high' || priority === 'urgent' ? (
                    <Badge variant="destructive" className="text-xs">
                      {priority === 'urgent' ? 'Urgente' : 'Importante'}
                    </Badge>
                  ) : null}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss();
                    }}
                    className="p-1 h-auto w-auto text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <p className="text-sm text-foreground leading-relaxed">
                  {message}
                </p>

                {/* Image (se houver) */}
                {image && (
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src={image} 
                      alt="" 
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}

                {/* Data específica do tipo */}
                {type === 'achievement' && data?.achievement && (
                  <div className="flex items-center gap-3 p-3 bg-raio-gold-500/10 rounded-lg border border-raio-gold-500/20">
                    <Award className="w-6 h-6 text-raio-gold-500" />
                    <div>
                      <div className="font-medium text-sm">{data.achievement.name}</div>
                      <div className="text-xs text-muted-foreground">+{data.achievement.points} pontos</div>
                    </div>
                  </div>
                )}

                {type === 'social' && data?.interaction && (
                  <div className="flex items-center gap-3 p-3 bg-raio-coral-500/10 rounded-lg border border-raio-coral-500/20">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={data.interaction.userAvatar} alt="" />
                      <AvatarFallback>{data.interaction.userName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <strong>{data.interaction.userName}</strong> {data.interaction.action}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {actions && actions.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    {actions.map((action, index) => (
                      <Button
                        key={index}
                        variant={action.variant || 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(index);
                        }}
                        className="text-xs"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Container para múltiplas notificações
export function NotificationContainer({
  notifications,
  onNotificationRead,
  onNotificationDismiss,
  onNotificationAction,
  maxVisible = 5,
  className = ""
}: {
  notifications: SmartNotificationProps[];
  onNotificationRead?: (id: string) => void;
  onNotificationDismiss?: (id: string) => void;
  onNotificationAction?: (id: string, actionId: string) => void;
  maxVisible?: number;
  className?: string;
}) {
  const visibleNotifications = notifications
    .sort((a, b) => {
      // Ordenar por prioridade e timestamp
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.timestamp.getTime() - a.timestamp.getTime();
    })
    .slice(0, maxVisible);

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full ${className}`}>
      {visibleNotifications.map((notification) => (
        <SmartNotification
          key={notification.id}
          {...notification}
          onRead={() => onNotificationRead?.(notification.id)}
          onDismiss={() => onNotificationDismiss?.(notification.id)}
          onAction={(actionId) => onNotificationAction?.(notification.id, actionId)}
        />
      ))}
    </div>
  );
}

// Hook para gerenciar notificações
export function useSmartNotifications() {
  const [notifications, setNotifications] = useState<SmartNotificationProps[]>([]);

  const addNotification = (notification: Omit<SmartNotificationProps, 'id' | 'timestamp'>) => {
    const newNotification: SmartNotificationProps = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Auto-remove após um tempo baseado na prioridade
    const autoRemoveDelay = {
      low: 10000,     // 10s
      medium: 15000,  // 15s
      high: 20000,    // 20s
      urgent: 30000   // 30s
    };
    
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, autoRemoveDelay[notification.priority]);
    
    return newNotification.id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Métodos de conveniência
  const showSuccess = (title: string, message: string, actions?: SmartNotificationProps['actions']) =>
    addNotification({ type: 'system', priority: 'medium', title, message, actions });
    
  const showError = (title: string, message: string, actions?: SmartNotificationProps['actions']) =>
    addNotification({ type: 'system', priority: 'high', title, message, actions });
    
  const showAchievement = (title: string, message: string, data?: any) =>
    addNotification({ type: 'achievement', priority: 'medium', title, message, data });
    
  const showSocial = (title: string, message: string, avatar?: string, data?: any) =>
    addNotification({ type: 'social', priority: 'low', title, message, avatar, data });

  return {
    notifications,
    addNotification,
    removeNotification,
    markAsRead,
    clearAll,
    showSuccess,
    showError,
    showAchievement,
    showSocial
  };
}