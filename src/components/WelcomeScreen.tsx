import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import logoFull from "figma:asset/91df98d68db1bbd58de3db20caeed5acda1da6fc.png";
import logoIcon from "figma:asset/827405fdf6d360d2a9ec31dfa3facf23fe3474fb.png";

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger animações após montagem
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setIsExiting(true);
    setTimeout(() => {
      onStart();
    }, 800);
  };

  return (
    <motion.div 
      className="fixed inset-0 bg-[#FAFAFA] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
    >
      {/* Subtle grain texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Radial gradient vignette - muito sutil */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.02) 100%)'
        }}
      />

      {/* Container principal */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[480px] px-8">
        
        {/* Logo e marca */}
        <motion.div 
          className="relative mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 20
          }}
          transition={{ 
            duration: 1.2, 
            delay: 0.2,
            ease: [0.43, 0.13, 0.23, 0.96]
          }}
        >
          {/* Logo icon com animação sutil */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            {/* Subtle glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(251, 191, 36, 0.08) 0%, transparent 70%)',
                filter: 'blur(20px)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            {/* Logo principal */}
            <motion.img
              src={logoIcon}
              alt="Raio"
              className="relative w-full h-full object-contain"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: isVisible ? 1 : 0.8,
                opacity: isVisible ? 1 : 0,
                y: isVisible ? [0, -8, 0] : 0,
                filter: isVisible ? [
                  'brightness(1) drop-shadow(0 0 0px rgba(251, 191, 36, 0))',
                  'brightness(1.1) drop-shadow(0 0 20px rgba(251, 191, 36, 0.15))',
                  'brightness(1) drop-shadow(0 0 0px rgba(251, 191, 36, 0))'
                ] : 'brightness(1) drop-shadow(0 0 0px rgba(251, 191, 36, 0))'
              }}
              transition={{ 
                duration: 1,
                delay: 0.4,
                ease: [0.43, 0.13, 0.23, 0.96],
                y: {
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.4
                },
                filter: {
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.4
                }
              }}
            />

            {/* Pulse ring sutil */}
            <motion.div
              className="absolute inset-0 rounded-full border border-[#FCD34D]/20"
              animate={{
                scale: [1, 1.8, 1.8],
                opacity: [0.4, 0, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          </div>

          {/* Logo text - opcional, pode usar a versão completa */}
          <div className="text-center">
            <motion.h1 
              className="text-[42px] tracking-[-0.02em] mb-0"
              style={{
                fontWeight: 700,
                color: '#1A1A1A',
                letterSpacing: '-0.03em',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: isVisible ? 1 : 0,
                y: isVisible ? 0 : 10
              }}
              transition={{ 
                duration: 0.8,
                delay: 0.6,
              }}
            >
              Rayo
            </motion.h1>
          </div>
        </motion.div>

        {/* Texto principal */}
        <motion.div 
          className="text-center space-y-4 mb-12"
          initial={{ opacity: 0, y: 15 }}
          animate={{ 
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 15
          }}
          transition={{ 
            duration: 0.8,
            delay: 0.8,
          }}
        >
          <h2 
            className="text-[28px] tracking-tight mb-3"
            style={{
              fontWeight: 600,
              color: '#1A1A1A',
              lineHeight: 1.2,
            }}
          >
            Bem-vindo
          </h2>

          <p 
            className="text-[15px] leading-relaxed max-w-[360px] mx-auto"
            style={{
              color: '#6B7280',
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            Vamos personalizar sua jornada para fortalecer seus laços familiares
          </p>
        </motion.div>

        {/* CTA Button - Minimalista */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ 
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 15
          }}
          transition={{ 
            duration: 0.8,
            delay: 1,
          }}
          className="w-full max-w-[280px]"
        >
          <motion.button
            onClick={handleStart}
            className="relative w-full group overflow-hidden"
            style={{
              background: '#1A1A1A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 32px',
              fontSize: '15px',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
            whileHover={{ 
              scale: 1.02,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ 
              duration: 0.2,
              ease: [0.43, 0.13, 0.23, 0.96]
            }}
          >
            {/* Subtle shimmer on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
            
            {/* Accent line - amarelo sutil */}
            <div 
              className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(90deg, transparent, #FCD34D, transparent)',
              }}
            />
            
            <span className="relative z-10">Começar</span>
          </motion.button>
        </motion.div>

        {/* Links legais - muito discreto */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <p 
            className="text-[11px] leading-relaxed max-w-[340px] mx-auto"
            style={{
              color: '#9CA3AF',
              fontWeight: 400,
            }}
          >
            Ao continuar, você concorda com nossos{' '}
            <a 
              href="#termos" 
              className="underline decoration-1 underline-offset-2 hover:text-[#6B7280] transition-colors"
              onClick={(e) => e.preventDefault()}
              style={{ color: '#9CA3AF' }}
            >
              Termos de Uso
            </a>
            {' '}e{' '}
            <a 
              href="#privacidade" 
              className="underline decoration-1 underline-offset-2 hover:text-[#6B7280] transition-colors"
              onClick={(e) => e.preventDefault()}
              style={{ color: '#9CA3AF' }}
            >
              Política de Privacidade
            </a>
          </p>
        </motion.div>
      </div>

      {/* Floating particles - muito sutis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              background: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0, 0.15, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Bottom accent line - amarelo muito sutil */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.15) 50%, transparent 100%)',
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ 
          scaleX: isVisible ? 1 : 0,
          opacity: isVisible ? 1 : 0
        }}
        transition={{ 
          duration: 1.5,
          delay: 1.4,
          ease: "easeOut"
        }}
      />
    </motion.div>
  );
}
