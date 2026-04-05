import { useState } from 'react';
import { Bell, X, CheckCircle, Sparkles, Heart, MessageCircle, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { useNotifications } from './NotificationManager';

/**
 * 🔔 NOTIFICATION PERMISSIONS MODAL
 * 
 * Modal iOS-style para solicitar permissão de notificações
 * Demonstra integração nativa para aprovação App Store
 * 
 * Features:
 * - Explicação clara do valor
 * - Design iOS-style
 * - Animações suaves
 * - Pode pular (mas incentiva permitir)
 */

interface NotificationPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function NotificationPermissionsModal({
  isOpen,
  onClose,
  onComplete,
}: NotificationPermissionsModalProps) {
  const { requestPermission } = useNotifications();
  const [isRequesting, setIsRequesting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAllow = async () => {
    setIsRequesting(true);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    const granted = await requestPermission();
    
    setIsRequesting(false);
    
    if (granted) {
      setShowSuccess(true);
      
      // Show success state briefly then close
      setTimeout(() => {
        onComplete();
        onClose();
      }, 1500);
    } else {
      // Even if not granted, continue
      onComplete();
      onClose();
    }
  };

  const handleSkip = () => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
    
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
          onClick={handleSkip}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: 'var(--raio-bg-primary)',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-10 p-2 rounded-full transition-colors"
            style={{
              background: 'var(--raio-bg-tertiary)',
              color: 'var(--raio-text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--raio-bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--raio-bg-tertiary)';
            }}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8">
            {!showSuccess ? (
              <>
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <motion.div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)',
                      boxShadow: 'var(--raio-shadow-glow)',
                    }}
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <Bell className="w-10 h-10 text-white" />
                  </motion.div>
                </div>

                {/* Title */}
                <h2
                  className="text-center text-[28px] mb-3"
                  style={{
                    fontWeight: 700,
                    color: 'var(--raio-text-primary)',
                  }}
                >
                  Fique por dentro!
                </h2>

                {/* Description */}
                <p
                  className="text-center text-[16px] mb-8"
                  style={{
                    color: 'var(--raio-text-secondary)',
                    lineHeight: 1.6,
                  }}
                >
                  Receba notificações importantes sobre sua jornada de transformação
                </p>

                {/* Benefits */}
                <div className="space-y-4 mb-8">
                  <BenefitItem
                    icon={<Sparkles className="w-5 h-5" />}
                    title="Novos conteúdos"
                    description="Seja avisado de cursos e vídeos selecionados para você"
                  />
                  <BenefitItem
                    icon={<MessageCircle className="w-5 h-5" />}
                    title="Comunidade"
                    description="Notificações de respostas e interações nos seus posts"
                  />
                  <BenefitItem
                    icon={<Trophy className="w-5 h-5" />}
                    title="Conquistas"
                    description="Comemore seus marcos e objetivos alcançados"
                  />
                  <BenefitItem
                    icon={<Heart className="w-5 h-5" />}
                    title="Lembretes"
                    description="Nunca perca sua sequência diária e hábitos"
                  />
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={handleAllow}
                    disabled={isRequesting}
                    className="w-full h-14 rounded-xl text-[16px]"
                    style={{
                      fontWeight: 600,
                      background: isRequesting
                        ? 'var(--raio-bg-tertiary)'
                        : 'var(--raio-accent-primary)',
                      color: '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      if (!isRequesting) {
                        e.currentTarget.style.background = 'var(--raio-accent-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isRequesting) {
                        e.currentTarget.style.background = 'var(--raio-accent-primary)';
                      }
                    }}
                  >
                    {isRequesting ? 'Aguarde...' : 'Permitir Notificações'}
                  </Button>

                  <button
                    onClick={handleSkip}
                    className="w-full h-12 rounded-xl text-[15px] transition-colors"
                    style={{
                      fontWeight: 500,
                      color: 'var(--raio-text-secondary)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--raio-bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Agora não
                  </button>
                </div>

                {/* Privacy note */}
                <p
                  className="text-center text-[12px] mt-6"
                  style={{
                    color: 'var(--raio-text-tertiary)',
                    lineHeight: 1.5,
                  }}
                >
                  Você pode mudar suas preferências a qualquer momento nas configurações
                </p>
              </>
            ) : (
              /* Success State */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                  }}
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{
                    background: 'var(--raio-success)',
                  }}
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>

                <h3
                  className="text-[24px] mb-2"
                  style={{
                    fontWeight: 700,
                    color: 'var(--raio-text-primary)',
                  }}
                >
                  Tudo certo!
                </h3>

                <p
                  className="text-[16px]"
                  style={{
                    color: 'var(--raio-text-secondary)',
                  }}
                >
                  Agora você receberá notificações importantes
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Benefit item component
interface BenefitItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function BenefitItem({ icon, title, description }: BenefitItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: 'var(--raio-accent-light)',
          color: 'var(--raio-accent-primary)',
        }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h4
          className="text-[15px] mb-1"
          style={{
            fontWeight: 600,
            color: 'var(--raio-text-primary)',
          }}
        >
          {title}
        </h4>
        <p
          className="text-[13px]"
          style={{
            color: 'var(--raio-text-secondary)',
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
