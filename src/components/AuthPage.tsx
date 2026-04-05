import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "./AuthContext";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import logoIcon from "figma:asset/827405fdf6d360d2a9ec31dfa3facf23fe3474fb.png";

type AuthMode = "login" | "register";

interface AuthPageProps {
  defaultMode?: AuthMode;
  prefillName?: string;
  onGoBack?: () => void;
}

export function AuthPage({ defaultMode = "login", prefillName, onGoBack }: AuthPageProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState(prefillName || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        const result = await register(email, password, name);
        if (!result.success) {
          setError(result.error || "Erro ao criar conta");
        }
      } else {
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error || "Erro ao fazer login");
        }
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "#FAFAFA" }}
    >
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
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-6">
            <img
              src={logoIcon}
              alt="Rayo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2
            className="text-[24px] tracking-tight mb-3"
            style={{
              fontWeight: 600,
              color: "#1A1A1A",
            }}
          >
            {mode === "login" ? "Bem-vindo(a) de volta" : "Crie sua conta"}
          </h2>
          <p
            className="text-[15px]"
            style={{
              color: "#6B7280",
              lineHeight: 1.6,
            }}
          >
            {mode === "login"
              ? "Entre com seus dados para continuar"
              : "Quase lá! Preencha seus dados para começar"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: mode === "register" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "register" ? -20 : 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {mode === "register" && (
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  style={{
                    color: "#1A1A1A",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Nome
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="h-12 bg-white border-[#e5e5e5] text-[#1A1A1A] placeholder:text-[#9CA3AF] rounded-lg focus:border-[#FCD34D] focus:ring-1 focus:ring-[#FCD34D] text-[15px]"
                  style={{
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  }}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                style={{
                  color: "#1A1A1A",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus={mode === "login"}
                className="h-12 bg-white border-[#e5e5e5] text-[#1A1A1A] placeholder:text-[#9CA3AF] rounded-lg focus:border-[#FCD34D] focus:ring-1 focus:ring-[#FCD34D] text-[15px]"
                style={{
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                style={{
                  color: "#1A1A1A",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "Mínimo 8 caracteres" : "Sua senha"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "register" ? 8 : undefined}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="h-12 bg-white border-[#e5e5e5] text-[#1A1A1A] placeholder:text-[#9CA3AF] rounded-lg focus:border-[#FCD34D] focus:ring-1 focus:ring-[#FCD34D] text-[15px] pr-12"
                  style={{
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "#9CA3AF" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-center py-2 px-3 rounded-lg"
                style={{
                  color: "#DC2626",
                  background: "rgba(220, 38, 38, 0.06)",
                }}
              >
                {error}
              </motion.p>
            )}

            <div className="w-full max-w-[280px] mx-auto pt-2">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="relative w-full group overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "#1A1A1A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "12px",
                  padding: "16px 32px",
                  fontSize: "15px",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
                whileHover={!isSubmitting ? {
                  scale: 1.02,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                } : {}}
                whileTap={!isSubmitting ? { scale: 0.98 } : {}}
              >
                {isSubmitting ? (
                  <div
                    className="w-5 h-5 border-2 rounded-full animate-spin mx-auto"
                    style={{
                      borderColor: "rgba(255,255,255,0.3)",
                      borderTopColor: "#FFFFFF",
                    }}
                  />
                ) : (
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {mode === "login" ? "Entrar" : "Criar conta"}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </motion.button>
            </div>
          </motion.form>
        </AnimatePresence>

        <div className="mt-8 text-center space-y-3">
          <button
            onClick={switchMode}
            className="text-sm transition-colors"
            style={{ color: "#6B7280", fontWeight: 400 }}
          >
            {mode === "login" ? (
              <span>
                Ainda não tem conta?{" "}
                <span style={{ color: "#1A1A1A", fontWeight: 500 }}>
                  Criar conta
                </span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <ArrowLeft size={14} />
                Já tenho conta
              </span>
            )}
          </button>

          {onGoBack && (
            <button
              onClick={onGoBack}
              className="block mx-auto text-xs transition-colors"
              style={{ color: "#9CA3AF" }}
            >
              Voltar ao início
            </button>
          )}
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.15) 50%, transparent 100%)",
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}
