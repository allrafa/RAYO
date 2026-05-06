import { useState, useEffect } from "react";
import { motion } from "motion/react";
import logoIcon from "figma:asset/827405fdf6d360d2a9ec31dfa3facf23fe3474fb.png";

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setIsExiting(true);
    setTimeout(() => {
      onStart();
    }, 700);
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 35%, var(--raio-bg-secondary) 0%, var(--raio-text-inverse) 55%, var(--raio-bg-warm-cream) 100%)",
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.7, ease: [0.43, 0.13, 0.23, 0.96] }}
    >
      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top eyebrow with hairline rule */}
      <motion.div
        className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -8 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <span className="block w-8 h-px bg-[var(--raio-text-primary)]/20" />
        <span
          className="text-[10px] tracking-[0.32em] uppercase"
          style={{ color: "var(--raio-text-secondary)", fontWeight: 500 }}
        >
          RAIO · Família
        </span>
        <span className="block w-8 h-px bg-[var(--raio-text-primary)]/20" />
      </motion.div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[520px] px-8">
        {/* Logo */}
        <motion.div
          className="relative mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 16,
          }}
          transition={{ duration: 1, delay: 0.4, ease: [0.43, 0.13, 0.23, 0.96] }}
        >
          <div className="relative w-[104px] h-[104px] mx-auto">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(var(--raio-accent-primary-rgb), 0.18) 0%, transparent 65%)",
                filter: "blur(24px)",
              }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.75, 0.5] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.img
              src={logoIcon}
              alt="Raio"
              className="relative w-full h-full object-contain"
              animate={{ y: isVisible ? [0, -6, 0] : 0 }}
              transition={{
                y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 },
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border border-[var(--raio-accent-primary)]/25"
              animate={{ scale: [1, 1.7, 1.7], opacity: [0.5, 0, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Editorial headline */}
        <motion.div
          className="text-center mb-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 12,
          }}
          transition={{ duration: 0.9, delay: 0.6 }}
        >
          <h1
            className="font-display-serif"
            style={{
              fontSize: "clamp(56px, 9vw, 84px)",
              lineHeight: 0.95,
              color: "var(--raio-text-primary)",
              letterSpacing: "-0.025em",
              fontWeight: 400,
            }}
          >
            Bem-<span style={{ fontStyle: "italic", color: "var(--raio-accent-hover)" }}>vindo</span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          className="text-center text-[15px] leading-relaxed max-w-[380px] mx-auto mb-12"
          style={{ color: "var(--raio-text-strong)", fontWeight: 400, lineHeight: 1.65 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 10,
          }}
          transition={{ duration: 0.9, delay: 0.8 }}
        >
          Vamos personalizar uma jornada para fortalecer
          <br className="hidden sm:block" /> os laços da sua família.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 12,
          }}
          transition={{ duration: 0.9, delay: 1 }}
          className="w-full max-w-[300px]"
        >
          <motion.button
            onClick={handleStart}
            className="relative w-full group overflow-hidden"
            style={{
              background: "var(--raio-text-primary)",
              color: "var(--raio-text-inverse)",
              border: "none",
              borderRadius: "14px",
              padding: "18px 32px",
              fontSize: "15px",
              fontWeight: 500,
              letterSpacing: "0.02em",
              cursor: "pointer",
              boxShadow:
                "0 1px 2px var(--raio-overlay-dark-medium), 0 8px 24px -10px var(--raio-accent-glow-medium)",
            }}
            whileHover={{
              scale: 1.015,
              boxShadow:
                "0 4px 12px var(--raio-overlay-dark-strong), 0 12px 32px -10px var(--raio-accent-glow-strong)",
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.43, 0.13, 0.23, 0.96] }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent"
              initial={{ x: "-100%" }}
              whileHover={{ x: "100%" }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
            />
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--raio-accent-bright) 50%, transparent)",
              }}
            />
            <span className="relative z-10">Começar agora</span>
          </motion.button>

          <p
            className="mt-6 text-center text-[11px] leading-relaxed max-w-[320px] mx-auto"
            style={{ color: "var(--raio-text-secondary)", fontWeight: 400 }}
          >
            Ao continuar, você concorda com nossos{" "}
            <a
              href="#termos"
              onClick={(e) => e.preventDefault()}
              className="underline decoration-[0.5px] underline-offset-2 hover:text-[var(--raio-text-primary)] transition-colors"
              style={{ color: "var(--raio-text-strong)" }}
            >
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a
              href="#privacidade"
              onClick={(e) => e.preventDefault()}
              className="underline decoration-[0.5px] underline-offset-2 hover:text-[var(--raio-text-primary)] transition-colors"
              style={{ color: "var(--raio-text-strong)" }}
            >
              Política de Privacidade
            </a>
            .
          </p>
        </motion.div>
      </div>

      {/* Bottom serif ornament */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 1, delay: 1.2 }}
      >
        <span className="block w-12 h-px bg-[var(--raio-text-primary)]/15" />
        <span
          className="font-display-serif italic text-[18px]"
          style={{ color: "var(--raio-accent-hover)", lineHeight: 1 }}
        >
          ·
        </span>
        <span className="block w-12 h-px bg-[var(--raio-text-primary)]/15" />
      </motion.div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              background: "linear-gradient(135deg, var(--raio-accent-bright), var(--raio-accent-hover))",
              left: `${15 + Math.random() * 70}%`,
              top: `${15 + Math.random() * 70}%`,
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0, 0.25, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              delay: Math.random() * 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
