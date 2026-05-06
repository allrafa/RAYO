import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "./AuthContext";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ArrowRight, ArrowLeft, Eye, EyeOff, Mail, ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import logoIcon from "figma:asset/827405fdf6d360d2a9ec31dfa3facf23fe3474fb.png";

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

export function AuthPage({ defaultMode = "login", prefillName, prefillSegments, prefillInterests, onGoBack, resetToken, onResetComplete }: AuthPageProps) {
  const { login, register, sendVerificationCode, verifyEmailCode, requestPasswordReset, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>(resetToken ? "reset" : defaultMode);
  const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState(prefillName || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
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
      if (!result.success) {
        setError(result.error || "Erro ao criar conta");
      }
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
            "Se o e-mail informado estiver cadastrado, você receberá um link para redefinir a sua senha em instantes.",
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
      if (result.success) {
        setResetSuccess(true);
      } else {
        setError(result.error || "Não foi possível redefinir a senha.");
      }
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
      if (!result.success) {
        setError(result.error || "Erro ao fazer login");
      }
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
      for (let i = 0; i < 6; i++) {
        newCode[i] = digits[i] || "";
      }
      setVerificationCode(newCode);
      const nextEmpty = newCode.findIndex((d) => d === "");
      if (nextEmpty >= 0) {
        codeInputRefs.current[nextEmpty]?.focus();
      } else {
        codeInputRefs.current[5]?.focus();
      }
      return;
    }

    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setRegisterStep("form");
    setError("");
    setForgotMessage("");
    setVerificationCode(["", "", "", "", "", ""]);
  };

  const goToForgot = () => {
    setMode("forgot");
    setError("");
    setForgotMessage("");
  };

  const backToLogin = () => {
    setMode("login");
    setError("");
    setForgotMessage("");
    setPassword("");
  };

  const canSendCode = name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canRequestReset = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeComplete = verificationCode.every((d) => d !== "");

  const renderContent = () => {
    if (mode === "login") {
      return (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 mx-auto mb-6">
              <img src={logoIcon} alt="Rayo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-[24px] tracking-tight mb-3" style={{ fontWeight: 600, color: "var(--foreground)" }}>
              Bem-vindo(a) de volta
            </h2>
            <p className="text-[15px]" style={{ color: "var(--rayo-ink-500)", lineHeight: 1.6 }}>
              Entre com seus dados para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: "var(--foreground)", fontSize: "14px", fontWeight: 500 }}>Email</Label>
              <Input
                id="email" type="email" placeholder="seu@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus
                className="h-12 bg-white border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-lg focus:border-[var(--ring)] focus:ring-1 focus:ring-[var(--ring)] text-[15px]"
                style={{ boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" style={{ color: "var(--foreground)", fontSize: "14px", fontWeight: 500 }}>Senha</Label>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? "text" : "password"} placeholder="Sua senha"
                  value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                  className="h-12 bg-white border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-lg focus:border-[var(--ring)] focus:ring-1 focus:ring-[var(--ring)] text-[15px] pr-12"
                  style={{ boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "var(--muted-foreground)" }} tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="text-right -mt-2">
              <button
                type="button"
                onClick={goToForgot}
                className="text-sm transition-colors hover:underline"
                style={{ color: "var(--rayo-ink-500)", fontWeight: 500 }}
              >
                Esqueci minha senha
              </button>
            </div>

            {error && <ErrorMessage message={error} />}

            <ActionButton label="Entrar" isSubmitting={isSubmitting} />
          </form>
        </motion.div>
      );
    }

    if (mode === "forgot") {
      return (
        <motion.div
          key="forgot"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center mb-10">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "var(--rayo-terra-100)" }}>
              <KeyRound className="w-7 h-7" style={{ color: "var(--accent)" }} />
            </div>
            <h2 className="text-[24px] tracking-tight mb-3" style={{ fontWeight: 600, color: "var(--foreground)" }}>
              Esqueceu sua senha?
            </h2>
            <p className="text-[15px]" style={{ color: "var(--rayo-ink-500)", lineHeight: 1.6 }}>
              Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
            </p>
          </div>

          {forgotMessage ? (
            <div className="space-y-6">
              <div
                className="text-sm text-center py-4 px-4 rounded-lg"
                style={{ color: "#065F46", background: "rgba(16, 185, 129, 0.08)" }}
              >
                <CheckCircle2 className="w-5 h-5 mx-auto mb-2" />
                {forgotMessage}
              </div>
              <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
                Verifique também a caixa de spam. O link é válido por 30 minutos.
              </p>
              <div className="text-center">
                <button
                  onClick={backToLogin}
                  className="text-sm flex items-center justify-center gap-1 mx-auto transition-colors"
                  style={{ color: "var(--foreground)", fontWeight: 500 }}
                >
                  <ArrowLeft size={14} />
                  Voltar para login
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" style={{ color: "var(--foreground)", fontSize: "14px", fontWeight: 500 }}>Email</Label>
                <Input
                  id="forgot-email" type="email" placeholder="seu@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus
                  className="h-12 bg-white border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-lg focus:border-[var(--ring)] focus:ring-1 focus:ring-[var(--ring)] text-[15px]"
                  style={{ boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}
                />
              </div>

              {error && <ErrorMessage message={error} />}

              <div className="w-full max-w-[280px] mx-auto pt-2">
                <motion.button
                  type="submit"
                  disabled={isSubmitting || !canRequestReset}
                  className="relative w-full group overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: "16px",
                    padding: "16px 32px", fontSize: "15px", fontWeight: 500, letterSpacing: "-0.01em",
                    cursor: "pointer", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  }}
                  whileHover={canRequestReset && !isSubmitting ? { scale: 1.02, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" } : {}}
                  whileTap={canRequestReset && !isSubmitting ? { scale: 0.98 } : {}}
                >
                  {isSubmitting ? <Spinner /> : (
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Enviar link
                      <Mail className="w-4 h-4" />
                    </span>
                  )}
                </motion.button>
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
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-10">
              <div className="w-14 h-14 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "var(--rayo-sage-100)" }}>
                <CheckCircle2 className="w-7 h-7" style={{ color: "var(--rayo-forest-700)" }} />
              </div>
              <h2 className="text-[24px] tracking-tight mb-3" style={{ fontWeight: 600, color: "var(--foreground)" }}>
                Senha redefinida!
              </h2>
              <p className="text-[15px]" style={{ color: "var(--rayo-ink-500)", lineHeight: 1.6 }}>
                Sua senha foi atualizada e todas as sessões anteriores foram encerradas. Faça login com a nova senha para continuar.
              </p>
            </div>

            <div className="w-full max-w-[280px] mx-auto pt-2">
              <motion.button
                type="button"
                onClick={() => {
                  setResetSuccess(false);
                  setPassword("");
                  setMode("login");
                  onResetComplete?.();
                }}
                className="relative w-full group overflow-hidden"
                style={{
                  background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: "16px",
                  padding: "16px 32px", fontSize: "15px", fontWeight: 500, letterSpacing: "-0.01em",
                  cursor: "pointer", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
                whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Ir para login
                  <ArrowRight className="w-4 h-4" />
                </span>
              </motion.button>
            </div>
          </motion.div>
        );
      }

      return (
        <motion.div
          key="reset"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center mb-10">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "var(--rayo-terra-100)" }}>
              <KeyRound className="w-7 h-7" style={{ color: "var(--accent)" }} />
            </div>
            <h2 className="text-[24px] tracking-tight mb-3" style={{ fontWeight: 600, color: "var(--foreground)" }}>
              Crie uma nova senha
            </h2>
            <p className="text-[15px]" style={{ color: "var(--rayo-ink-500)", lineHeight: 1.6 }}>
              Escolha uma senha forte para proteger sua conta.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password" style={{ color: "var(--foreground)", fontSize: "14px", fontWeight: 500 }}>Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-password" type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres"
                  value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                  autoComplete="new-password" autoFocus
                  className="h-12 bg-white border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-lg focus:border-[var(--ring)] focus:ring-1 focus:ring-[var(--ring)] text-[15px] pr-12"
                  style={{ boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "var(--muted-foreground)" }} tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <ErrorMessage message={error} />}

            <ActionButton label="Redefinir senha" isSubmitting={isSubmitting} />

            {error && (
              <div className="pt-2 flex flex-col items-center gap-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    onResetComplete?.();
                    setPassword("");
                    setError("");
                    setForgotMessage("");
                    setMode("forgot");
                  }}
                  className="text-sm transition-colors hover:underline"
                  style={{ color: "var(--foreground)", fontWeight: 500 }}
                >
                  Solicitar um novo link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetComplete?.();
                    setPassword("");
                    setError("");
                    setMode("login");
                  }}
                  className="text-xs transition-colors flex items-center justify-center gap-1"
                  style={{ color: "var(--muted-foreground)" }}
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

    if (registerStep === "form") {
      return (
        <motion.div
          key="register-form"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 mx-auto mb-6">
              <img src={logoIcon} alt="Rayo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-[24px] tracking-tight mb-3" style={{ fontWeight: 600, color: "var(--foreground)" }}>
              Crie sua conta
            </h2>
            <p className="text-[15px]" style={{ color: "var(--rayo-ink-500)", lineHeight: 1.6 }}>
              Vamos verificar seu email para começar
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" style={{ color: "var(--foreground)", fontSize: "14px", fontWeight: 500 }}>Nome</Label>
              <Input
                id="name" type="text" placeholder="Seu nome" value={name}
                onChange={(e) => setName(e.target.value)} autoComplete="name"
                className="h-12 bg-white border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-lg focus:border-[var(--ring)] focus:ring-1 focus:ring-[var(--ring)] text-[15px]"
                style={{ boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email" style={{ color: "var(--foreground)", fontSize: "14px", fontWeight: 500 }}>Email</Label>
              <Input
                id="reg-email" type="email" placeholder="seu@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                className="h-12 bg-white border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-lg focus:border-[var(--ring)] focus:ring-1 focus:ring-[var(--ring)] text-[15px]"
                style={{ boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}
              />
            </div>

            {error && <ErrorMessage message={error} />}

            <div className="w-full max-w-[280px] mx-auto pt-2">
              <motion.button
                type="button"
                onClick={handleSendCode}
                disabled={isSubmitting || !canSendCode}
                className="relative w-full group overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: "16px",
                  padding: "16px 32px", fontSize: "15px", fontWeight: 500, letterSpacing: "-0.01em",
                  cursor: "pointer", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
                whileHover={canSendCode && !isSubmitting ? { scale: 1.02, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" } : {}}
                whileTap={canSendCode && !isSubmitting ? { scale: 0.98 } : {}}
              >
                {isSubmitting ? <Spinner /> : (
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Enviar código
                    <Mail className="w-4 h-4" />
                  </span>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      );
    }

    if (registerStep === "verify") {
      return (
        <motion.div
          key="register-verify"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center mb-10">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "var(--rayo-terra-100)" }}>
              <Mail className="w-7 h-7" style={{ color: "var(--accent)" }} />
            </div>
            <h2 className="text-[24px] tracking-tight mb-3" style={{ fontWeight: 600, color: "var(--foreground)" }}>
              Verifique seu email
            </h2>
            <p className="text-[15px]" style={{ color: "var(--rayo-ink-500)", lineHeight: 1.6 }}>
              Enviamos um código de 6 dígitos para
            </p>
            <p className="text-[15px] mt-1" style={{ color: "var(--foreground)", fontWeight: 500 }}>
              {email}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center gap-3">
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { codeInputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={index === 0 ? 6 : 1}
                  value={digit}
                  onChange={(e) => handleCodeInput(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-semibold rounded-lg border focus:outline-none transition-all"
                  style={{
                    background: "var(--card)",
                    color: "var(--foreground)",
                    borderColor: digit ? "var(--ring)" : "var(--border)",
                    boxShadow: digit ? "0 0 0 1px var(--ring)" : "0 1px 2px rgba(14, 26, 20, 0.05)",
                  }}
                />
              ))}
            </div>

            {error && <ErrorMessage message={error} />}

            <div className="w-full max-w-[280px] mx-auto">
              <motion.button
                type="button"
                onClick={handleVerifyCode}
                disabled={isSubmitting || !codeComplete}
                className="relative w-full group overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: "16px",
                  padding: "16px 32px", fontSize: "15px", fontWeight: 500, letterSpacing: "-0.01em",
                  cursor: "pointer", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
                whileHover={codeComplete && !isSubmitting ? { scale: 1.02, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" } : {}}
                whileTap={codeComplete && !isSubmitting ? { scale: 0.98 } : {}}
              >
                {isSubmitting ? <Spinner /> : (
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Verificar
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                )}
              </motion.button>
            </div>

            <div className="text-center">
              <button
                onClick={handleResendCode}
                disabled={resendTimer > 0 || isSubmitting}
                className="text-sm transition-colors disabled:opacity-40"
                style={{ color: "var(--rayo-ink-500)" }}
              >
                {resendTimer > 0
                  ? `Reenviar código em ${resendTimer}s`
                  : "Reenviar código"}
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => { setRegisterStep("form"); setError(""); setVerificationCode(["", "", "", "", "", ""]); }}
                className="text-xs flex items-center justify-center gap-1 mx-auto transition-colors"
                style={{ color: "var(--muted-foreground)" }}
              >
                <ArrowLeft size={12} />
                Alterar email
              </button>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key="register-password"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center mb-10">
          <div className="w-14 h-14 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "var(--rayo-sage-100)" }}>
            <ShieldCheck className="w-7 h-7" style={{ color: "var(--rayo-forest-700)" }} />
          </div>
          <h2 className="text-[24px] tracking-tight mb-3" style={{ fontWeight: 600, color: "var(--foreground)" }}>
            Email verificado!
          </h2>
          <p className="text-[15px]" style={{ color: "var(--rayo-ink-500)", lineHeight: 1.6 }}>
            Agora escolha uma senha para sua conta
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reg-password" style={{ color: "var(--foreground)", fontSize: "14px", fontWeight: 500 }}>Senha</Label>
            <div className="relative">
              <Input
                id="reg-password" type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres"
                value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                autoComplete="new-password" autoFocus
                className="h-12 bg-white border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-lg focus:border-[var(--ring)] focus:ring-1 focus:ring-[var(--ring)] text-[15px] pr-12"
                style={{ boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "var(--muted-foreground)" }} tabIndex={-1}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <ErrorMessage message={error} />}

          <ActionButton label="Criar conta" isSubmitting={isSubmitting} />
        </form>
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ background: "var(--rayo-sand-50)" }}>
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      <motion.div
        className="relative w-full max-w-[400px] mx-auto px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
      >
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>

        <div className="mt-8 text-center space-y-3">
          {(mode === "login" || (mode === "register" && registerStep === "form")) && (
            <button onClick={switchMode} className="text-sm transition-colors" style={{ color: "var(--rayo-ink-500)", fontWeight: 400 }}>
              {mode === "login" ? (
                <span>
                  Ainda não tem conta?{" "}
                  <span style={{ color: "var(--foreground)", fontWeight: 500 }}>Criar conta</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <ArrowLeft size={14} />
                  Já tenho conta
                </span>
              )}
            </button>
          )}

          {mode === "forgot" && !forgotMessage && (
            <button onClick={backToLogin} className="text-sm transition-colors flex items-center justify-center gap-1 mx-auto" style={{ color: "var(--rayo-ink-500)", fontWeight: 400 }}>
              <ArrowLeft size={14} />
              Voltar para login
            </button>
          )}

          {onGoBack && (mode === "login" || (mode === "register" && registerStep === "form")) && (
            <button onClick={onGoBack} className="block mx-auto text-xs transition-colors" style={{ color: "var(--muted-foreground)" }}>
              Voltar ao início
            </button>
          )}
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.15) 50%, transparent 100%)" }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm text-center py-2 px-3 rounded-lg"
      style={{ color: "#DC2626", background: "rgba(220, 38, 38, 0.06)" }}
    >
      {message}
    </motion.p>
  );
}

function Spinner() {
  return (
    <div
      className="w-5 h-5 border-2 rounded-full animate-spin mx-auto"
      style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#FFFFFF" }}
    />
  );
}

function ActionButton({ label, isSubmitting }: { label: string; isSubmitting: boolean }) {
  return (
    <div className="w-full max-w-[280px] mx-auto pt-2">
      <motion.button
        type="submit"
        disabled={isSubmitting}
        className="relative w-full group overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: "16px",
          padding: "16px 32px", fontSize: "15px", fontWeight: 500, letterSpacing: "-0.01em",
          cursor: "pointer", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        }}
        whileHover={!isSubmitting ? { scale: 1.02, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" } : {}}
        whileTap={!isSubmitting ? { scale: 0.98 } : {}}
      >
        {isSubmitting ? <Spinner /> : (
          <span className="relative z-10 flex items-center justify-center gap-2">
            {label}
            <ArrowRight className="w-4 h-4" />
          </span>
        )}
      </motion.button>
    </div>
  );
}
