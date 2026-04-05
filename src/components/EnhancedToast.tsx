import { toast } from "sonner@2.0.3";
import { CheckCircle, AlertCircle, Info, X, Zap } from "lucide-react";

interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  haptic?: boolean;
}

export const enhancedToast = {
  success: (options: ToastOptions) => {
    if (options.haptic && 'vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
    
    return toast.success(options.title, {
      description: options.description,
      duration: options.duration || 4000,
      icon: <CheckCircle className="w-5 h-5" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      classNames: {
        toast: "group toast group-[.toaster]:bg-green-50 group-[.toaster]:text-green-950 group-[.toaster]:border-green-200",
        description: "group-[.toast]:text-green-800",
        actionButton: "group-[.toast]:bg-green-600 group-[.toast]:text-white",
        cancelButton: "group-[.toast]:bg-green-100 group-[.toast]:text-green-900",
      },
    });
  },

  error: (options: ToastOptions) => {
    if (options.haptic && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
    
    return toast.error(options.title, {
      description: options.description,
      duration: options.duration || 6000,
      icon: <AlertCircle className="w-5 h-5" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      classNames: {
        toast: "group toast group-[.toaster]:bg-red-50 group-[.toaster]:text-red-950 group-[.toaster]:border-red-200",
        description: "group-[.toast]:text-red-800",
        actionButton: "group-[.toast]:bg-red-600 group-[.toast]:text-white",
        cancelButton: "group-[.toast]:bg-red-100 group-[.toast]:text-red-900",
      },
    });
  },

  info: (options: ToastOptions) => {
    if (options.haptic && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
    
    return toast.info(options.title, {
      description: options.description,
      duration: options.duration || 4000,
      icon: <Info className="w-5 h-5" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      classNames: {
        toast: "group toast group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-950 group-[.toaster]:border-blue-200",
        description: "group-[.toast]:text-blue-800",
        actionButton: "group-[.toast]:bg-blue-600 group-[.toast]:text-white",
        cancelButton: "group-[.toast]:bg-blue-100 group-[.toast]:text-blue-900",
      },
    });
  },

  achievement: (options: ToastOptions) => {
    if (options.haptic && 'vibrate' in navigator) {
      navigator.vibrate([50, 30, 50, 30, 100]);
    }
    
    return toast.success(options.title, {
      description: options.description,
      duration: options.duration || 6000,
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      classNames: {
        toast: "group toast group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-yellow-50 group-[.toaster]:to-orange-50 group-[.toaster]:text-yellow-950 group-[.toaster]:border-yellow-200",
        description: "group-[.toast]:text-yellow-800",
        actionButton: "group-[.toast]:bg-yellow-600 group-[.toast]:text-white",
        cancelButton: "group-[.toast]:bg-yellow-100 group-[.toast]:text-yellow-900",
      },
    });
  },

  loading: (options: Omit<ToastOptions, 'duration'>) => {
    return toast.loading(options.title, {
      description: options.description,
      classNames: {
        toast: "group toast group-[.toaster]:bg-gray-50 group-[.toaster]:text-gray-950 group-[.toaster]:border-gray-200",
        description: "group-[.toast]:text-gray-800",
      },
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
      haptic?: boolean;
    }
  ) => {
    if (options.haptic && 'vibrate' in navigator) {
      // Initial loading vibration
      navigator.vibrate(10);
    }

    return toast.promise(promise, {
      loading: options.loading,
      success: (data) => {
        if (options.haptic && 'vibrate' in navigator) {
          navigator.vibrate([50, 50, 50]);
        }
        return typeof options.success === 'function' ? options.success(data) : options.success;
      },
      error: (error) => {
        if (options.haptic && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        return typeof options.error === 'function' ? options.error(error) : options.error;
      },
    });
  }
};