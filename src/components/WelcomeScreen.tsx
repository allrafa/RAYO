import { useState, useEffect } from "react";
import { motion } from "motion/react";

interface WelcomeScreenProps {
  onStart: () => void;
  onSkipToLogin?: () => void;
}

function RayoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 19V5h7.2c2.3 0 4 1.7 4 4 0 1.7-.9 3.1-2.3 3.7L18 19h-3.4l-3.5-5.7H8V19H5z"
        fill="#FAF4E8"
      />
    </svg>
  );
}

export function WelcomeScreen({ onStart, onSkipToLogin }: WelcomeScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const openLegal = (path: "/privacy" | "/terms") => (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.location.href = path;
    }
  };

  return (
    <section className="ra-welcome" aria-label="Boas-vindas ao RAYO">
      <div className="ra-welcome-bg" aria-hidden />
      <div className="ra-welcome-scrim" aria-hidden />

      <motion.div
        className="ra-welcome-top"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -8 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="ra-brand-lockup">
          <div className="ra-brand-mark">
            <RayoMark size={20} />
          </div>
          <div className="ra-brand-name">RAYO</div>
        </div>
      </motion.div>

      <div className="ra-welcome-mid" />

      <motion.div
        className="ra-welcome-bot"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 16 }}
        transition={{ duration: 0.7, delay: 0.25, ease: [0.43, 0.13, 0.23, 0.96] }}
      >
        <div className="ra-welcome-eyebrow">Bem-vindo ao RAYO</div>
        <h1 className="ra-welcome-title">
          Onde
          <br />
          <span className="light">conhecimento</span>
          <br />
          <span className="ochre">vira</span> hábito.
        </h1>
        <p className="ra-welcome-sub">
          Trilhas, comunidade e missões para fortalecer os laços da sua família — no seu ritmo.
        </p>

        <button type="button" className="ra-welcome-cta" onClick={onStart}>
          <span>Começar agora</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M3 7h8m-3-3l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {onSkipToLogin && (
          <button type="button" className="ra-welcome-link" onClick={onSkipToLogin}>
            Já tenho conta — <strong>Entrar</strong>
          </button>
        )}

        <p className="ra-welcome-legal">
          Ao continuar, você concorda com os nossos{" "}
          <a href="/terms" onClick={openLegal("/terms")}>
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="/privacy" onClick={openLegal("/privacy")}>
            Política de Privacidade
          </a>
          .
        </p>
      </motion.div>
    </section>
  );
}
