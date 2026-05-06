import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * 🔔 NOTIFICATION MANAGER
 * 
 * Sistema de notificações nativo para iOS/Android
 * Demonstra integração com APIs do sistema para aprovação App Store
 * 
 * Features:
 * - Push notification permissions
 * - Local notifications
 * - Notification badges
 * - Deep linking ready
 * - iOS/Android style
 */

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  icon?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [showToast, setShowToast] = useState<Notification | null>(null);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
    loadNotifications();
  }, []);

  const checkPermission = async () => {
    try {
      // Check if Notification API is available (web)
      if ('Notification' in window) {
        const permission = Notification.permission;
        setHasPermission(permission === 'granted');
      }
      
      // For mobile (Expo), you would use expo-notifications here
      // This is a web-compatible fallback
      const stored = localStorage.getItem('raio-notifications-permission');
      if (stored === 'granted') {
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      // Web Notification API
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        setHasPermission(granted);
        localStorage.setItem('raio-notifications-permission', permission);
        
        if (granted) {
          // Haptic feedback on success
          if ('vibrate' in navigator) {
            navigator.vibrate([10, 50, 10]);
          }
        }
        
        return granted;
      }
      
      // For Expo mobile apps, you would use:
      // const { status } = await Notifications.requestPermissionsAsync();
      // return status === 'granted';
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const loadNotifications = () => {
    try {
      const stored = localStorage.getItem('raio-notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const saveNotifications = (notifs: Notification[]) => {
    try {
      localStorage.setItem('raio-notifications', JSON.stringify(notifs));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    const updated = [newNotif, ...notifications].slice(0, 50); // Keep last 50
    setNotifications(updated);
    saveNotifications(updated);
    
    // Show toast
    setShowToast(newNotif);
    setTimeout(() => setShowToast(null), 4000);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    // Try to show browser notification if permission granted
    if (hasPermission && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: notification.icon || '/raio-logo.png',
          badge: '/raio-badge.png',
          tag: newNotif.id,
        });
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const clearAll = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        hasPermission,
        requestPermission,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
      
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999]"
            style={{
              top: 'max(1rem, env(safe-area-inset-top))',
            }}
          >
            <NotificationToast
              notification={showToast}
              onClose={() => setShowToast(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

// Toast component
interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5" style={{ color: 'var(--rayo-terra-500)' }} />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
      case 'warning':
        return 'var(--warning, #D4A24C)';
      default:
        return 'var(--rayo-terra-500)';
    }
  };

  return (
    <motion.div
      className="rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl"
      style={{
        background: 'var(--rayo-sand-50)',
        border: `2px solid ${getBorderColor()}`,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 
              className="text-sm mb-1"
              style={{ 
                fontWeight: 600,
                color: 'var(--rayo-forest-900)'
              }}
            >
              {notification.title}
            </h4>
            <p 
              className="text-sm"
              style={{ color: 'var(--rayo-ink-700)' }}
            >
              {notification.message}
            </p>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex-shrink-0 p-1 rounded-lg transition-colors"
            style={{ color: 'var(--rayo-ink-400)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--rayo-sand-300)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      <motion.div
        className="h-1"
        style={{ background: getBorderColor() }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
      />
    </motion.div>
  );
}
