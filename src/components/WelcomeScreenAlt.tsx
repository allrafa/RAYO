import { useState, useEffect } from "react";
import { motion } from "motion/react";
import logoFull from "figma:asset/91df98d68db1bbd58de3db20caeed5acda1da6fc.png";
import logoIcon from "figma:asset/827405fdf6d360d2a9ec31dfa3facf23fe3474fb.png";

interface WelcomeScreenAltProps {
  onStart: () => void;
}

/**
 * VERSÃO ALTERNATIVA - Ultra Minimalista
 * Design ainda mais clean focado em tipografia e espaço em branco
 */
export function WelcomeScreenAlt({ onStart }: WelcomeScreenAltProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setIsExiting(true);
    setTimeout(onStart, 600);
  };

  return (
    <motion.div 
      className="fixed inset-0 bg-white flex items-center justify-center overflow-hidden px-6"
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
    >
      {/* Container principal - centralizado verticalmente */}
      <div className="w-full max-w-md">
        
        {/* Logo - apenas o ícone */}
        <motion.div
          className="flex justify-center mb-16"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: isVisible ? 1 : 0,
            scale: isVisible ? 1 : 0.9
          }}
          transition={{ 
            duration: 0.8,
            delay: 0.1,
            ease: [0.43, 0.13, 0.23, 0.96]
          }}
        >
          <div className="relative w-20 h-20">
            <img
              src={logoIcon}
              alt="Rayo"
              className="w-full h-full object-contain"
              style={{
                imageRendering: '-webkit-optimize-contrast',
              }}
            />
          </div>
        </motion.div>

        {/* Headline - Extra bold */}
        <motion.h1
          className="text-center mb-6"
          style={{
            fontSize: '48px',
            fontWeight: 800,
            color: '#000000',
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 20
          }}
          transition={{ 
            duration: 0.8,
            delay: 0.3,
            ease: [0.43, 0.13, 0.23, 0.96]
          }}
        >
          Bem-vindo<br />ao Rayo
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-center mb-12"
          style={{
            fontSize: '16px',
            fontWeight: 400,
            color: '#666666',
            lineHeight: 1.5,
            maxWidth: '340px',
            margin: '0 auto 3rem',
          }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ 
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 15
          }}
          transition={{ 
            duration: 0.8,
            delay: 0.5,
          }}
        >
          Vamos personalizar sua experiência para fortalecer seus laços familiares
        </motion.p>

        {/* CTA - Ultra clean */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ 
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 15
          }}
          transition={{ 
            duration: 0.8,
            delay: 0.7,
          }}
        >
          <button
            onClick={handleStart}
            className="w-full relative overflow-hidden group"
            style={{
              background: '#000000',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '18px 32px',
              fontSize: '15px',
              fontWeight: 500,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1A1A1A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#000000';
            }}
          >
            <span className="relative z-10">Começar jornada</span>
            
            {/* Accent bar - amarelo */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FCD34D] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          </button>
        </motion.div>

        {/* Footer legal */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 0.5 : 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <p 
            style={{
              fontSize: '11px',
              color: '#999999',
              lineHeight: 1.6,
            }}
          >
            Ao continuar, você concorda com nossos{' '}
            <a 
              href="#termos"
              className="underline hover:text-[#666666] transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              Termos
            </a>
            {' '}e{' '}
            <a 
              href="#privacidade"
              className="underline hover:text-[#666666] transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              Privacidade
            </a>
          </p>
        </motion.div>
      </div>

      {/* Accent line no topo - amarelo muito sutil */}
      <div 
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.2), transparent)',
        }}
      />
    </motion.div>
  );
}
