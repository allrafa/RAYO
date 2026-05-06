import { Share2, Copy, Check, MessageCircle, Mail, Facebook, Twitter, Instagram } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';

/**
 * 📤 NATIVE SHARE COMPONENT
 * 
 * Componente de compartilhamento nativo para iOS/Android
 * Demonstra integração com Web Share API para aprovação App Store
 * 
 * Features:
 * - Web Share API (nativo em mobile)
 * - Fallback para desktop
 * - Copy to clipboard
 * - Share sheet iOS/Android style
 */

export interface ShareData {
  title: string;
  text: string;
  url: string;
  image?: string;
}

interface NativeShareProps {
  data: ShareData;
  children?: React.ReactNode;
  variant?: 'icon' | 'button' | 'custom';
  onShare?: () => void;
}

export function NativeShare({ 
  data, 
  children, 
  variant = 'icon',
  onShare 
}: NativeShareProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    try {
      // Check if Web Share API is available (native on mobile)
      if (navigator.share) {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url,
        });
        
        // Track share
        onShare?.();
        
        toast.success('Compartilhado com sucesso!');
      } else {
        // Fallback for desktop
        setShowFallback(true);
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        setShowFallback(true);
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
      
      toast.success('Link copiado!');
      
      setTimeout(() => {
        setCopied(false);
        setShowFallback(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Erro ao copiar link');
    }
  };

  const renderTrigger = () => {
    if (children) {
      return (
        <div onClick={handleShare} className="cursor-pointer">
          {children}
        </div>
      );
    }

    if (variant === 'button') {
      return (
        <Button
          onClick={handleShare}
          variant="outline"
          className="gap-2"
          style={{
            borderColor: 'var(--rayo-sand-300)',
          }}
        >
          <Share2 className="w-4 h-4" />
          Compartilhar
        </Button>
      );
    }

    // Default icon variant
    return (
      <button
        onClick={handleShare}
        className="p-2 rounded-lg transition-colors"
        style={{
          color: 'var(--rayo-ink-700)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--rayo-sand-300)';
          e.currentTarget.style.color = 'var(--rayo-forest-900)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--rayo-ink-700)';
        }}
        aria-label="Compartilhar"
      >
        <Share2 className="w-5 h-5" />
      </button>
    );
  };

  return (
    <>
      {renderTrigger()}

      {/* Fallback Share Sheet (Desktop) */}
      <AnimatePresence>
        {showFallback && (
          <ShareFallbackSheet
            data={data}
            copied={copied}
            onCopy={handleCopyLink}
            onClose={() => setShowFallback(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Fallback Share Sheet for Desktop
interface ShareFallbackSheetProps {
  data: ShareData;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}

function ShareFallbackSheet({ data, copied, onCopy, onClose }: ShareFallbackSheetProps) {
  const shareOptions = [
    {
      name: 'Copiar Link',
      icon: copied ? Check : Copy,
      color: 'var(--rayo-terra-500)',
      onClick: onCopy,
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      onClick: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${data.text}\n${data.url}`)}`, '_blank');
        onClose();
      },
    },
    {
      name: 'Email',
      icon: Mail,
      color: '#EA4335',
      onClick: () => {
        window.open(`mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent(`${data.text}\n${data.url}`)}`, '_blank');
        onClose();
      },
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: '#1877F2',
      onClick: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}`, '_blank');
        onClose();
      },
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: '#1DA1F2',
      onClick: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(data.text)}&url=${encodeURIComponent(data.url)}`, '_blank');
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 md:items-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative w-full max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden"
        style={{
          background: 'var(--rayo-sand-100)',
          maxHeight: '80vh',
        }}
      >
        {/* Handle (iOS-style) */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="w-10 h-1 rounded-full"
            style={{
              background: 'var(--rayo-sand-300)',
            }}
          />
        </div>

        <div className="p-6">
          {/* Title */}
          <h3
            className="text-center text-[20px] mb-2"
            style={{
              fontWeight: 700,
              color: 'var(--rayo-forest-900)',
            }}
          >
            Compartilhar
          </h3>

          {/* Preview */}
          <div
            className="mb-6 p-4 rounded-xl"
            style={{
              background: 'var(--rayo-sand-50)',
              border: '1px solid var(--rayo-sand-300)',
            }}
          >
            <h4
              className="text-[15px] mb-1"
              style={{
                fontWeight: 600,
                color: 'var(--rayo-forest-900)',
              }}
            >
              {data.title}
            </h4>
            <p
              className="text-[13px] mb-2"
              style={{
                color: 'var(--rayo-ink-700)',
              }}
            >
              {data.text}
            </p>
            <p
              className="text-[12px] truncate"
              style={{
                color: 'var(--rayo-terra-500)',
              }}
            >
              {data.url}
            </p>
          </div>

          {/* Share options */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.name}
                  onClick={option.onClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                  style={{
                    background: 'var(--rayo-sand-50)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--rayo-sand-300)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--rayo-sand-50)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: option.color,
                    }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span
                    className="text-[11px] text-center"
                    style={{
                      color: 'var(--rayo-ink-700)',
                      fontWeight: 500,
                    }}
                  >
                    {option.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cancel */}
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full h-12 rounded-xl"
            style={{
              fontWeight: 600,
            }}
          >
            Cancelar
          </Button>
        </div>

        {/* Safe area spacing */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </motion.div>
    </div>
  );
}

// Hook for easy sharing
export function useNativeShare() {
  const share = async (data: ShareData) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url,
        });
        return true;
      }
      return false;
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
      return false;
    }
  };

  const canShare = 'share' in navigator;

  return { share, canShare };
}
