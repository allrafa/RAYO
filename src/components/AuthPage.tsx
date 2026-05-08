import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "./AuthContext";
import { api } from "../lib/api";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   OAuth (Google + Apple) — pergunta ao backend quais providers
   estão configurados. Quando indisponível, mostra "Em breve".
   ────────────────────────────────────────────────────────────── */
type ProvidersFlags = { google: boolean; apple: boolean };

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.351z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.596-4.123H3.064v2.59A9.997 9.997 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.404 13.9a6.005 6.005 0 0 1 0-3.8V7.51H3.064a10 10 0 0 0 0 8.98l3.34-2.59z"
      />
      <path
        fill="#EA4335"
        d="M12 5.977c1.468 0 2.786.504 3.823 1.495l2.868-2.868C16.96 2.99 14.696 2 12 2A9.997 9.997 0 0 0 3.064 7.51l3.34 2.59C7.19 7.736 9.395 5.977 12 5.977z"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.42 2.22-1.13 3.04-.79.93-2.07 1.65-3.27 1.55-.14-1.13.42-2.3 1.1-3.04.78-.86 2.13-1.5 3.3-1.55zM20.5 17.18c-.55 1.27-.81 1.83-1.52 2.95-.99 1.56-2.39 3.5-4.13 3.51-1.55.02-1.95-1.01-4.06-1-2.1.01-2.55 1.02-4.1 1-1.74-.01-3.07-1.76-4.06-3.32-2.77-4.36-3.06-9.48-1.35-12.2 1.21-1.93 3.13-3.06 4.93-3.06 1.84 0 3 1.01 4.52 1.01 1.48 0 2.38-1.01 4.51-1.01 1.61 0 3.31.88 4.52 2.4-3.97 2.18-3.33 7.85.74 9.72z"
      />
    </svg>
  );
}

function useOAuthProviders(): ProvidersFlags | null {
  const [providers, setProviders] = useState<ProvidersFlags | null>(null);
  useEffect(() => {
    let cancelled = false;
    api
      .get<ProvidersFlags>("/api/auth/providers")
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setProviders(res.data);
        else setProviders({ google: false, apple: false });
      })
      .catch(() => {
        if (!cancelled) setProviders({ google: false, apple: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return providers;
}

function SocialButton({
  provider,
  label,
  icon,
  enabled,
  ready,
}: {
  provider: "google" | "apple";
  label: string;
  icon: React.ReactNode;
  enabled: boolean | undefined;
  ready: boolean;
}) {
  const disabled = !ready || !enabled;
  return (
    <button
      type="button"
      className="ra-auth-social-btn"
      disabled={disabled}
      onClick={() => {
        if (enabled) window.location.href = `/api/auth/${provider}`;
      }}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
      {ready && !enabled && <span className="soon">Em breve</span>}
    </button>
  );
}

function SocialRow() {
  const providers = useOAuthProviders();
  const ready = providers !== null;
  return (
    <div className="ra-auth-social-row">
      <SocialButton
        provider="google"
        label="Google"
        icon={<GoogleGlyph />}
        enabled={providers?.google}
        ready={ready}
      />
      <SocialButton
        provider="apple"
        label="Apple"
        icon={<AppleGlyph />}
        enabled={providers?.apple}
        ready={ready}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Brand side (aparece em todas as variantes do AuthPage)
   ────────────────────────────────────────────────────────────── */
function BrandSide({ mode }: { mode: AuthMode }) {
  // Texto editorial muda sutilmente conforme o modo, mas a estética
  // é a mesma — assim a "tela esquerda" mantém continuidade visual.
  const headline =
    mode === "register" ? (
      <>
        Comece
        <br />
        <span className="light">sua trilha</span>
        <br />
        <span className="ochre">no seu</span> ritmo.
      </>
    ) : mode === "forgot" || mode === "reset" ? (
      <>
        Vamos
        <br />
        <span className="light">recuperar</span>
        <br />
        <span className="ochre">seu</span> acesso.
      </>
    ) : (
      <>
        Continue
        <br />
        <span className="light">de onde</span>
        <br />
        você <span className="ochre">parou</span>.
      </>
    );

  const eyebrow =
    mode === "register"
      ? "Bem-vindo ao RAYO"
      : mode === "forgot" || mode === "reset"
        ? "Recuperar senha"
        : "Bem-vindo de volta";

  const quote =
    mode === "register"
      ? "Família é a primeira comunidade. Aqui você fortalece os laços com trilhas, missões e conversas honestas."
      : "A jornada é sua e ela te espera. Retome trilhas, missões e conversas — sem pressa, sem barulho.";

  return (
    <section className="ra-auth-brand">
      <div className="ra-auth-glow" aria-hidden />
      <div className="ra-auth-letter" aria-hidden>
        R
      </div>
      <div className="ra-auth-grain" aria-hidden />

      <div className="ra-auth-brand-top">
        <div className="ra-brand-lockup">
          <div className="ra-brand-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 19V5h7.2c2.3 0 4 1.7 4 4 0 1.7-.9 3.1-2.3 3.7L18 19h-3.4l-3.5-5.7H8V19H5z"
                fill="#FAF4E8"
              />
            </svg>
          </div>
          <div className="ra-brand-name">RAYO</div>
        </div>
      </div>

      <div className="ra-auth-edit">
        <div className="ra-auth-eyebrow-mono">
          <span className="ra-auth-live-dot" aria-hidden />
          {eyebrow}
        </div>
        <h1 className="ra-auth-headline">{headline}</h1>
        <p className="ra-auth-quote">
          {quote.split(/(\bte espera\b|\bhonestas\b)/).map((chunk, i) =>
            chunk === "te espera" || chunk === "honestas" ? (
              <em key={i}>{chunk}</em>
            ) : (
              <span key={i}>{chunk}</span>
            ),
          )}
        </p>
      </div>

      <div className="ra-auth-card" aria-hidden>
        <div className="ra-auth-card-mark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 3z"
              fill="#FAF4E8"
            />
          </svg>
        </div>
        <div>
          <div className="ra-auth-card-eyebrow">RAYO · Família</div>
          <div className="ra-auth-card-title">
            Conteúdo, comunidade e missões para a sua família crescer junta.
          </div>
          <div className="ra-auth-card-sub">
            Solteiro · Namoro · Noivos · Casados · Pais
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
   AuthPage principal — concentra todos os modos (login, register,
   verify, password, forgot, reset) dentro do shell .ra-auth.
   ────────────────────────────────────────────────────────────── */
type AuthMode = "login" | "register" | "forgot" | "reset";
type RegisterStep = "form" | "verify" | "password";

interface AuthPageProps {
  defaultMode?: AuthMode;
  prefillName?: string;
  prefillSegments?: string[];
  prefillInterests?: string[];
  onGoBack?: () => void;
  resetToken?: string;
  onResetComplete?: () => void;
}

export function AuthPage({
  defaultMode = "login",
  prefillName,
  prefillSegments,
  prefillInterests,
  onGoBack,
  resetToken,
  onResetComplete,
}: AuthPageProps) {
  const {
    login,
    register,
    sendVerificationCode,
    verifyEmailCode,
    requestPasswordReset,
    resetPassword,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>(resetToken ? "reset" : defaultMode);
  const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState(prefillName || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [resendTimer, setResendTimer] = useState(0);
  const [forgotMessage, setForgotMessage] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  /* ───────── Handlers ───────── */
  const handleSendCode = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const result = await sendVerificationCode(email);
      if (result.success) {
        setRegisterStep("verify");
        setResendTimer(60);
        setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
      } else {
        setError(result.error || "Erro ao enviar código");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join("");
    if (code.length !== 6) return;
    setError("");
    setIsSubmitting(true);
    try {
      const result = await verifyEmailCode(email, code);
      if (result.success) {
        setRegisterStep("password");
      } else {
        setError(result.error || "Código inválido");
        setVerificationCode(["", "", "", "", "", ""]);
        setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setError("");
    setIsSubmitting(true);
    try {
      const result = await sendVerificationCode(email);
      if (result.success) {
        setResendTimer(60);
        setVerificationCode(["", "", "", "", "", ""]);
        setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
      } else {
        setError(result.error || "Erro ao reenviar código");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await register(email, password, name, {
        segments: prefillSegments,
        interests: prefillInterests,
      });
      if (!result.success) setError(result.error || "Erro ao criar conta");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setForgotMessage("");
    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setForgotMessage(
          result.message ||
            "Se o e-mail estiver cadastrado, você receberá um link para redefinir a sua senha em instantes.",
        );
      } else {
        setError(result.error || "Não foi possível processar a solicitação.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!resetToken) {
      setError("Link de redefinição inválido.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await resetPassword(resetToken, password);
      if (result.success) setResetSuccess(true);
      else setError(result.error || "Não foi possível redefinir a senha.");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.success) setError(result.error || "Erro ao fazer login");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...verificationCode];
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6);
      for (let i = 0; i < 6; i++) newCode[i] = digits[i] || "";
      setVerificationCode(newCode);
      const nextEmpty = newCode.findIndex((d) => d === "");
      if (nextEmpty >= 0) codeInputRefs.current[nextEmpty]?.focus();
      else codeInputRefs.current[5]?.focus();
      return;
    }
    newCode[index] = value;
    setVerificationCode(newCode);
    if (value && index < 5) codeInputRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const switchToRegister = () => {
    setMode("register");
    setRegisterStep("form");
    setError("");
    setForgotMessage("");
    setVerificationCode(["", "", "", "", "", ""]);
  };
  const switchToLogin = () => {
    setMode("login");
    setRegisterStep("form");
    setError("");
    setForgotMessage("");
    setVerificationCode(["", "", "", "", "", ""]);
    setPassword("");
  };
  const goToForgot = () => {
    setMode("forgot");
    setError("");
    setForgotMessage("");
  };

  const canSendCode =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canRequestReset = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeComplete = verificationCode.every((d) => d !== "");

  /* ───────── Render por modo ───────── */
  const renderContent = () => {
    if (mode === "login") {
      return (
        <motion.div
          key="login"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="ra-auth-form"
        >
          <div className="ra-auth-form-eyebrow">Entrar</div>
          <h2 className="ra-auth-form-title">
            Que bom
            <br />
            <span className="light">te ver de novo.</span>
          </h2>
          <p className="ra-auth-form-sub">
            Entre com seus dados para retomar trilhas, missões e conversas. Primeira vez por aqui?{" "}
            <button type="button" className="linklike" onClick={switchToRegister}>
              Criar conta
            </button>
            .
          </p>

          <SocialRow />
          <div className="ra-auth-divider">
            <span>ou continue com email</span>
          </div>

          <form onSubmit={handleLogin}>
            <div className="ra-auth-field">
              <label className="ra-auth-field-label" htmlFor="login-email">
                <span>Email</span>
              </label>
              <div className="ra-auth-input-wrap">
                <input
                  id="login-email"
                  className="ra-auth-input"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="ra-auth-field">
              <label className="ra-auth-field-label" htmlFor="login-password">
                <span>Senha</span>
                <button
                  type="button"
                  className="ra-auth-field-help"
                  onClick={goToForgot}
                >
                  Esqueci
                </button>
              </label>
              <div className="ra-auth-input-wrap">
                <input
                  id="login-password"
                  className="ra-auth-input has-icon"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="ra-auth-input-icon"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="ra-auth-error" role="alert">{error}</div>}

            <button
              type="submit"
              className="ra-auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner />
              ) : (
                <>
                  <span>Entrar no RAYO</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="ra-auth-signup">
            <div className="ra-auth-signup-left">
              <span className="ra-auth-signup-eyebrow">Novo por aqui?</span>
              <span className="ra-auth-signup-text">
                Comece <strong>grátis</strong> e descubra sua trilha.
              </span>
            </div>
            <button type="button" className="ra-auth-signup-btn" onClick={switchToRegister}>
              Criar conta
              <ArrowRight size={12} />
            </button>
          </div>

          {onGoBack && (
            <div className="ra-auth-foot">
              <button type="button" className="ra-auth-foot-link" onClick={onGoBack}>
                <ArrowLeft size={12} />
                Voltar ao início
              </button>
            </div>
          )}
        </motion.div>
      );
    }

    if (mode === "forgot") {
      return (
        <motion.div
          key="forgot"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="ra-auth-form"
        >
          <div className="ra-auth-medal">
            <KeyRound size={22} />
          </div>
          <div className="ra-auth-form-eyebrow">Recuperar acesso</div>
          <h2 className="ra-auth-form-title">
            Esqueceu
            <br />
            <span className="light">a senha?</span>
          </h2>
          <p className="ra-auth-form-sub">
            Sem problema. Informe o e-mail da sua conta e te enviamos um link para criar uma nova.
          </p>

          {forgotMessage ? (
            <>
              <div className="ra-auth-success">
                <div className="ra-auth-success-icon">
                  <CheckCircle2 size={18} />
                </div>
                {forgotMessage}
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                  Verifique também a caixa de spam. O link expira em 30 minutos.
                </div>
              </div>
              <button type="button" className="ra-auth-submit" onClick={switchToLogin}>
                <span>Voltar para login</span>
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <div className="ra-auth-field">
                <label className="ra-auth-field-label" htmlFor="forgot-email">
                  <span>Email</span>
                </label>
                <div className="ra-auth-input-wrap">
                  <input
                    id="forgot-email"
                    className="ra-auth-input"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {error && <div className="ra-auth-error" role="alert">{error}</div>}

              <button
                type="submit"
                className="ra-auth-submit"
                disabled={isSubmitting || !canRequestReset}
              >
                {isSubmitting ? (
                  <Spinner />
                ) : (
                  <>
                    <span>Enviar link de recuperação</span>
                    <Mail size={16} />
                  </>
                )}
              </button>

              <div className="ra-auth-foot">
                <button type="button" className="ra-auth-foot-link" onClick={switchToLogin}>
                  <ArrowLeft size={12} />
                  Voltar para login
                </button>
              </div>
            </form>
          )}
        </motion.div>
      );
    }

    if (mode === "reset") {
      if (resetSuccess) {
        return (
          <motion.div
            key="reset-success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="ra-auth-form"
          >
            <div className="ra-auth-medal sage">
              <CheckCircle2 size={22} />
            </div>
            <div className="ra-auth-form-eyebrow">Tudo certo</div>
            <h2 className="ra-auth-form-title">
              Senha
              <br />
              <span className="light">redefinida.</span>
            </h2>
            <p className="ra-auth-form-sub">
              Sua senha foi atualizada e todas as sessões anteriores foram encerradas. Faça login com a nova senha para continuar.
            </p>
            <button
              type="button"
              className="ra-auth-submit"
              onClick={() => {
                setResetSuccess(false);
                setPassword("");
                setMode("login");
                onResetComplete?.();
              }}
            >
              <span>Ir para login</span>
              <ArrowRight size={16} />
            </button>
          </motion.div>
        );
      }

      return (
        <motion.div
          key="reset"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="ra-auth-form"
        >
          <div className="ra-auth-medal">
            <KeyRound size={22} />
          </div>
          <div className="ra-auth-form-eyebrow">Nova senha</div>
          <h2 className="ra-auth-form-title">
            Crie uma
            <br />
            <span className="light">nova senha.</span>
          </h2>
          <p className="ra-auth-form-sub">
            Escolha algo forte que você consiga lembrar — pelo menos 8 caracteres.
          </p>

          <form onSubmit={handleResetPassword}>
            <div className="ra-auth-field">
              <label className="ra-auth-field-label" htmlFor="reset-password">
                <span>Nova senha</span>
              </label>
              <div className="ra-auth-input-wrap">
                <input
                  id="reset-password"
                  className="ra-auth-input has-icon"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  className="ra-auth-input-icon"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="ra-auth-error" role="alert">{error}</div>}

            <button
              type="submit"
              className="ra-auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner />
              ) : (
                <>
                  <span>Redefinir senha</span>
                  <ShieldCheck size={16} />
                </>
              )}
            </button>

            {error && (
              <div className="ra-auth-foot">
                <button
                  type="button"
                  className="ra-auth-foot-link"
                  onClick={() => {
                    onResetComplete?.();
                    setPassword("");
                    setError("");
                    setForgotMessage("");
                    setMode("forgot");
                  }}
                >
                  Solicitar novo link
                </button>
                <button
                  type="button"
                  className="ra-auth-foot-link"
                  onClick={() => {
                    onResetComplete?.();
                    setPassword("");
                    setError("");
                    setMode("login");
                  }}
                >
                  <ArrowLeft size={12} />
                  Voltar para login
                </button>
              </div>
            )}
          </form>
        </motion.div>
      );
    }

    /* register */
    if (registerStep === "form") {
      return (
        <motion.div
          key="register-form"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="ra-auth-form"
        >
          <div className="ra-auth-form-eyebrow">Criar conta</div>
          <h2 className="ra-auth-form-title">
            Vem
            <br />
            <span className="light">caminhar com a gente.</span>
          </h2>
          <p className="ra-auth-form-sub">
            É grátis para começar. Já tem conta?{" "}
            <button type="button" className="linklike" onClick={switchToLogin}>
              Entrar
            </button>
            .
          </p>

          <SocialRow />
          <div className="ra-auth-divider">
            <span>ou cadastre seu email</span>
          </div>

          <div className="ra-auth-field">
            <label className="ra-auth-field-label" htmlFor="register-name">
              <span>Nome</span>
            </label>
            <div className="ra-auth-input-wrap">
              <input
                id="register-name"
                className="ra-auth-input"
                type="text"
                placeholder="Como prefere ser chamado(a)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                autoFocus
              />
            </div>
          </div>

          <div className="ra-auth-field">
            <label className="ra-auth-field-label" htmlFor="register-email">
              <span>Email</span>
            </label>
            <div className="ra-auth-input-wrap">
              <input
                id="register-email"
                className="ra-auth-input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {error && <div className="ra-auth-error" role="alert">{error}</div>}

          <button
            type="button"
            className="ra-auth-submit"
            onClick={handleSendCode}
            disabled={isSubmitting || !canSendCode}
          >
            {isSubmitting ? (
              <Spinner />
            ) : (
              <>
                <span>Enviar código por email</span>
                <Mail size={16} />
              </>
            )}
          </button>

          {onGoBack && (
            <div className="ra-auth-foot">
              <button type="button" className="ra-auth-foot-link" onClick={onGoBack}>
                <ArrowLeft size={12} />
                Voltar ao início
              </button>
            </div>
          )}
        </motion.div>
      );
    }

    if (registerStep === "verify") {
      return (
        <motion.div
          key="register-verify"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="ra-auth-form"
        >
          <div className="ra-auth-medal">
            <Mail size={22} />
          </div>
          <div className="ra-auth-form-eyebrow">Verificar email</div>
          <h2 className="ra-auth-form-title">
            Cheque
            <br />
            <span className="light">seu inbox.</span>
          </h2>
          <p className="ra-auth-form-sub">
            Enviamos um código de 6 dígitos para{" "}
            <strong style={{ color: "var(--rayo-forest-900)" }}>{email}</strong>.
          </p>

          <div
            className="ra-auth-code-row"
            role="group"
            aria-label="Código de verificação de 6 dígitos"
          >
            {verificationCode.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  codeInputRefs.current[index] = el;
                }}
                className="ra-auth-code-input"
                type="text"
                inputMode="numeric"
                maxLength={index === 0 ? 6 : 1}
                value={digit}
                onChange={(e) => handleCodeInput(index, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(index, e)}
                aria-label={`Dígito ${index + 1} de 6`}
                autoComplete={index === 0 ? "one-time-code" : "off"}
              />
            ))}
          </div>

          {error && <div className="ra-auth-error" role="alert">{error}</div>}

          <button
            type="button"
            className="ra-auth-submit"
            onClick={handleVerifyCode}
            disabled={isSubmitting || !codeComplete}
          >
            {isSubmitting ? (
              <Spinner />
            ) : (
              <>
                <span>Verificar código</span>
                <ShieldCheck size={16} />
              </>
            )}
          </button>

          <div className="ra-auth-foot">
            <button
              type="button"
              className="ra-auth-foot-link"
              onClick={handleResendCode}
              disabled={resendTimer > 0 || isSubmitting}
            >
              {resendTimer > 0
                ? `Reenviar código em ${resendTimer}s`
                : "Reenviar código"}
            </button>
            <button
              type="button"
              className="ra-auth-foot-link"
              onClick={() => {
                setRegisterStep("form");
                setError("");
                setVerificationCode(["", "", "", "", "", ""]);
              }}
            >
              <ArrowLeft size={12} />
              Alterar email
            </button>
          </div>
        </motion.div>
      );
    }

    /* registerStep === "password" */
    return (
      <motion.div
        key="register-password"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28 }}
        className="ra-auth-form"
      >
        <div className="ra-auth-medal sage">
          <ShieldCheck size={22} />
        </div>
        <div className="ra-auth-form-eyebrow">Email verificado</div>
        <h2 className="ra-auth-form-title">
          Agora
          <br />
          <span className="light">crie sua senha.</span>
        </h2>
        <p className="ra-auth-form-sub">
          Mínimo de 8 caracteres. Use algo único e fácil de lembrar.
        </p>

        <form onSubmit={handleRegister}>
          <div className="ra-auth-field">
            <label className="ra-auth-field-label" htmlFor="register-password">
              <span>Senha</span>
            </label>
            <div className="ra-auth-input-wrap">
              <input
                id="register-password"
                className="ra-auth-input has-icon"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                className="ra-auth-input-icon"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div className="ra-auth-error" role="alert">{error}</div>}

          <button type="submit" className="ra-auth-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Spinner />
            ) : (
              <>
                <span>Criar minha conta</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    );
  };

  return (
    <div className="ra-auth">
      <BrandSide mode={mode} />
      <section className="ra-auth-form-side">
        <div className="ra-auth-form-wrap">
          <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
        </div>
      </section>
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="w-5 h-5 border-2 rounded-full animate-spin"
      style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#FFFFFF" }}
      aria-label="Carregando"
    />
  );
}
