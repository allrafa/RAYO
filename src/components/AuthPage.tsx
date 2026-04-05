import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "./AuthContext";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import logoFull from "figma:asset/91df98d68db1bbd58de3db20caeed5acda1da6fc.png";

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
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "var(--raio-bg-primary, #FAFAFA)" }}
    >
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      <motion.div
        className="relative w-full max-w-sm mx-auto px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
      >
        <div className="text-center mb-10">
          <img
            src={logoFull}
            alt="RAIO"
            className="h-10 mx-auto mb-3"
            style={{ filter: "brightness(0) saturate(100%)" }}
          />
          <p style={{ color: "var(--raio-text-secondary, #8E8E93)", fontSize: "0.9rem" }}>
            {mode === "login"
              ? "Bem-vindo(a) de volta"
              : "Crie sua conta gratuita"}
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
              <div className="space-y-1.5">
                <Label
                  htmlFor="name"
                  className="text-sm font-medium"
                  style={{ color: "var(--raio-text-primary, #1C1C1E)" }}
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
                  className="h-12 rounded-xl border-0 text-base"
                  style={{
                    background: "var(--raio-bg-secondary, #F2F2F7)",
                    color: "var(--raio-text-primary, #1C1C1E)",
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-medium"
                style={{ color: "var(--raio-text-primary, #1C1C1E)" }}
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
                className="h-12 rounded-xl border-0 text-base"
                style={{
                  background: "var(--raio-bg-secondary, #F2F2F7)",
                  color: "var(--raio-text-primary, #1C1C1E)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium"
                style={{ color: "var(--raio-text-primary, #1C1C1E)" }}
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
                  className="h-12 rounded-xl border-0 text-base pr-12"
                  style={{
                    background: "var(--raio-bg-secondary, #F2F2F7)",
                    color: "var(--raio-text-primary, #1C1C1E)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "var(--raio-text-secondary, #8E8E93)" }}
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
                  color: "#FF3B30",
                  background: "rgba(255, 59, 48, 0.08)",
                }}
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
              style={{
                background: "var(--raio-accent-primary, #FF6B00)",
                color: "#FFFFFF",
              }}
            >
              {isSubmitting ? (
                <div
                  className="w-5 h-5 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: "rgba(255,255,255,0.3)",
                    borderTopColor: "#FFFFFF",
                  }}
                />
              ) : (
                <>
                  {mode === "login" ? "Entrar" : "Criar conta"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        <div className="mt-8 text-center space-y-3">
          <button
            onClick={switchMode}
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--raio-accent-primary, #FF6B00)" }}
          >
            {mode === "login" ? (
              <span style={{ color: "var(--raio-text-secondary, #8E8E93)" }}>
                Ainda não tem conta?{" "}
                <span style={{ color: "var(--raio-accent-primary, #FF6B00)" }}>
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
              style={{ color: "var(--raio-text-tertiary, #AEAEB2)" }}
            >
              Voltar ao início
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
