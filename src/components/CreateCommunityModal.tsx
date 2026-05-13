import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { api } from "../lib/api";
import { enhancedToast } from "./EnhancedToast";

// Task #198 — Modal pra usuário criar a própria comunidade. Slug é
// derivado do nome no backend (ensureUniqueSlug). Categoria/ícone são
// opcionais; admin pode editar tudo depois.
interface CreateCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (slug: string) => void;
}

const ICON_CHOICES = ["💬", "❤️", "🙏", "🌱", "🏠", "👨‍👩‍👧", "💍", "🕊️", "📖", "✨"];

export function CreateCommunityModal({ open, onOpenChange, onCreated }: CreateCommunityModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("💬");
  const [rules, setRules] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setIcon("💬");
    setRules("");
  };

  const onSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      enhancedToast.error({ title: "Nome obrigatório", description: "Dê um nome à comunidade", haptic: true });
      return;
    }
    setBusy(true);
    const res = await api.post<{ forum: { slug: string; name: string } }>(
      "/api/community/forums",
      {
        name: trimmed,
        description: description.trim() || null,
        icon,
        rules: rules.trim() || null,
      },
    );
    setBusy(false);
    if (res.success && res.data) {
      enhancedToast.success({
        title: `Comunidade c/${res.data.forum.slug} criada`,
        description: "Você já é moderador e membro.",
        haptic: true,
      });
      reset();
      onOpenChange(false);
      onCreated?.(res.data.forum.slug);
    } else {
      const code = res.error?.code;
      enhancedToast.error({
        title: code === "RATE_LIMIT_EXCEEDED" ? "Limite atingido" : "Não foi possível criar",
        description: res.error?.message || "Tente novamente",
        haptic: true,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar comunidade</DialogTitle>
          <DialogDescription>
            Comunidades são espaços abertos pra conversar. Você será o primeiro moderador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "var(--rayo-ink-600)" }}>
              Nome <span style={{ color: "var(--rayo-terra-500)" }}>*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Casados em Cristo"
              maxLength={80}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              O endereço da comunidade (c/...) será gerado a partir do nome.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "var(--rayo-ink-600)" }}>Ícone</label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_CHOICES.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors"
                  style={{
                    background: icon === i ? "var(--rayo-terra-100)" : "var(--rayo-sand-50)",
                    border: `1px solid ${icon === i ? "var(--rayo-terra-500)" : "var(--rayo-sand-300)"}`,
                  }}
                  aria-pressed={icon === i}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "var(--rayo-ink-600)" }}>
              Descrição
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sobre o que essa comunidade conversa?"
              maxLength={500}
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground text-right">{description.length}/500</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "var(--rayo-ink-600)" }}>
              Regras (opcional)
            </label>
            <Textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Combinados de convivência, o que é encorajado e o que não é permitido."
              maxLength={5000}
              rows={4}
            />
            <p className="text-[11px] text-muted-foreground text-right">{rules.length}/5000</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={busy || !name.trim()}>
            {busy ? "Criando…" : "Criar comunidade"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
