import { useEffect, useRef, useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import { enhancedToast } from "./EnhancedToast";

// Task #205 — painel inline reutilizável pra confirmar e-mail SEM sair
// do contexto atual (modal de criar comunidade hoje; outros gates de
// e-mail podem reusar). Fluxo:
//   1) "Enviar código pra <email>" → POST /api/auth/resend-verification
//   2) Input de 6 dígitos + "Confirmar" → POST /api/auth/verify-code
//   3) onVerified() → caller retoma a ação original.
// Cooldown de 60s respeitado pelo backend (devolve 429 COOLDOWN).
interface Props {
  onVerified: () => void;
  onCancel: () => void;
  // Mensagem de contexto pro topo (ex: "Pra criar comunidades…").
  reason?: string;
}

export function EmailVerificationInline({ onVerified, onCancel, reason }: Props) {
  const { user } = useAuth();
  const email = user?.email ?? "";

  const [stage, setStage] = useState<"send" | "code">("send");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => {
      setCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (stage === "code") {
      const id = window.setTimeout(() => codeInputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [stage]);

  const sendCode = async () => {
    if (busy || cooldown > 0) return;
    setBusy(true);
    const res = await api.post<{ email: string }>(
      "/api/auth/resend-verification",
      {},
    );
    setBusy(false);
    if (res.success) {
      enhancedToast.success({
        title: "Código enviado",
        description: `Cheque ${email}`,
        haptic: true,
      });
      setStage("code");
      setCooldown(60);
    } else {
      const code = res.error?.code;
      if (code === "COOLDOWN") {
        // Mensagem do backend já tem o número de segundos.
        const match = /(\d+)/.exec(res.error?.message || "");
        const remain = match ? parseInt(match[1], 10) : 30;
        setCooldown(remain);
        setStage("code");
        enhancedToast.info({
          title: "Aguarde um instante",
          description: res.error?.message || "Reenvio em cooldown.",
        });
      } else {
        enhancedToast.error({
          title: "Não foi possível enviar",
          description: res.error?.message || "Tente novamente",
          haptic: true,
        });
      }
    }
  };

  const confirmCode = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      enhancedToast.error({ title: "Código incompleto", description: "Digite os 6 dígitos.", haptic: true });
      return;
    }
    setBusy(true);
    const res = await api.post<{ verified: boolean }>(
      "/api/auth/verify-code",
      { email, code: trimmed },
    );
    setBusy(false);
    if (res.success && res.data?.verified) {
      enhancedToast.success({
        title: "E-mail confirmado",
        description: "Pronto, seguindo…",
        haptic: true,
      });
      onVerified();
    } else {
      enhancedToast.error({
        title: "Código inválido",
        description: res.error?.message || "Confira e tente de novo.",
        haptic: true,
      });
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div
        className="flex items-start gap-3 p-3 rounded-lg"
        style={{
          background: "var(--rayo-sand-50)",
          border: `1px solid var(--rayo-sand-300)`,
        }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--rayo-terra-100)", color: "var(--rayo-terra-600)" }}
        >
          <Mail className="w-4 h-4" />
        </div>
        <div className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
          <div className="font-medium mb-0.5">Confirme seu e-mail</div>
          <div className="text-xs" style={{ color: "var(--rayo-ink-500)" }}>
            {reason ?? "Pra continuar, precisamos confirmar que esse e-mail é seu."}
            {email && (
              <>
                {" "}Vamos enviar um código pra <span style={{ color: "var(--rayo-ink-700)" }}>{email}</span>.
              </>
            )}
          </div>
        </div>
      </div>

      {stage === "send" ? (
        <div className="flex flex-col gap-2">
          <Button onClick={sendCode} disabled={busy || !email || cooldown > 0}>
            {busy
              ? "Enviando…"
              : cooldown > 0
              ? `Aguarde ${cooldown}s`
              : "Enviar código pro meu e-mail"}
          </Button>
          {cooldown === 0 && (
            <button
              type="button"
              onClick={() => setStage("code")}
              className="text-xs underline self-center"
              style={{ color: "var(--rayo-ink-500)" }}
            >
              Já tenho um código
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--rayo-ink-600)" }}
              htmlFor="email-verify-code"
            >
              Código de 6 dígitos
            </label>
            <Input
              id="email-verify-code"
              ref={codeInputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: 18 }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={confirmCode} disabled={busy || code.length !== 6}>
              {busy ? "Confirmando…" : "Confirmar e continuar"}
            </Button>
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || cooldown > 0}
              className="text-xs underline self-center disabled:opacity-50"
              style={{ color: "var(--rayo-terra-600)" }}
            >
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-start pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center gap-1 text-xs disabled:opacity-50"
          style={{ color: "var(--rayo-ink-500)" }}
        >
          <ArrowLeft className="w-3 h-3" />
          Voltar
        </button>
      </div>
    </div>
  );
}
