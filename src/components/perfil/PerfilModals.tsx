import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useAuth } from "../AuthContext";
import { toast } from "sonner@2.0.3";

// Task #45 — modais reusados na PerfilPage. Cada um é controlado por
// `open` + `onOpenChange` e fala com o backend através do AuthContext
// (updateProfile, updatePreferences, changePassword) — nada de fetch
// direto aqui.

const SEGMENT_OPTIONS: Array<{ id: string; label: string; emoji: string }> = [
  { id: "solteiro", label: "Solteiro", emoji: "💚" },
  { id: "namoro", label: "Namoro", emoji: "💕" },
  { id: "noivos", label: "Noivos", emoji: "💍" },
  { id: "casados", label: "Casados", emoji: "👰" },
  { id: "pais", label: "Pais", emoji: "👶" },
];

const INTEREST_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "relacionamento", label: "Relacionamento" },
  { id: "comunicacao", label: "Comunicação" },
  { id: "financas", label: "Finanças" },
  { id: "intimidade", label: "Intimidade" },
  { id: "fe", label: "Fé & Espiritualidade" },
  { id: "familia", label: "Família" },
  { id: "saude", label: "Saúde & Bem-estar" },
  { id: "carreira", label: "Carreira" },
  { id: "educacao", label: "Educação" },
  { id: "parentalidade", label: "Parentalidade" },
  { id: "lideranca", label: "Liderança" },
  { id: "auto-conhecimento", label: "Auto-conhecimento" },
  { id: "proposito", label: "Propósito" },
  { id: "crescimento", label: "Crescimento Pessoal" },
];

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [segments, setSegments] = useState<string[]>(user?.segments ?? []);
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.name ?? "");
      setBio(user?.bio ?? "");
      setSegments(user?.segments ?? []);
      setInterests(user?.interests ?? []);
    }
  }, [open, user]);

  const toggle = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const bioLength = bio.length;
  const bioOver = bioLength > 280;
  const nameInvalid = name.trim().length < 2 || name.trim().length > 80;
  const segmentsInvalid = segments.length === 0;
  const formInvalid = saving || nameInvalid || bioOver || segmentsInvalid;

  const handleSave = async () => {
    setSaving(true);
    const res = await updateProfile({
      name: name.trim(),
      bio: bio.trim() || null,
      segments,
      interests,
    });
    setSaving(false);
    if (res.success) {
      toast.success("Perfil atualizado!");
      onOpenChange(false);
    } else {
      toast.error(res.error || "Erro ao salvar perfil");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            Atualize seu nome, bio, contextos de vida e interesses.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Seu nome"
            />
            {nameInvalid && (
              <p className="text-xs" style={{ color: "rgb(220,38,38)" }}>
                Nome deve ter entre 2 e 80 caracteres.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-bio">Bio</Label>
            <Textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Conte um pouco sobre você"
            />
            <p
              className="text-xs text-right"
              style={{ color: bioOver ? "rgb(220,38,38)" : "var(--raio-text-tertiary)" }}
            >
              {bioLength}/280
            </p>
          </div>

          <div className="space-y-2">
            <Label>Contextos de vida (escolha pelo menos um)</Label>
            <div className="flex flex-wrap gap-2">
              {SEGMENT_OPTIONS.map((opt) => {
                const active = segments.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSegments((s) => toggle(s, opt.id))}
                    className="px-3 py-1.5 rounded-full text-sm transition-colors"
                    style={{
                      background: active
                        ? "var(--raio-accent-primary)"
                        : "var(--raio-bg-tertiary)",
                      color: active ? "#fff" : "var(--raio-text-primary)",
                      border: `1px solid ${active ? "var(--raio-accent-primary)" : "var(--raio-border-default)"}`,
                    }}
                  >
                    <span className="mr-1">{opt.emoji}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {segmentsInvalid && (
              <p className="text-xs" style={{ color: "rgb(220,38,38)" }}>
                Selecione pelo menos um contexto.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Interesses</Label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((opt) => {
                const active = interests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setInterests((s) => toggle(s, opt.id))}
                    className="px-3 py-1.5 rounded-full text-xs transition-colors"
                    style={{
                      background: active
                        ? "var(--raio-accent-primary)"
                        : "var(--raio-bg-tertiary)",
                      color: active ? "#fff" : "var(--raio-text-secondary)",
                      border: `1px solid ${active ? "var(--raio-accent-primary)" : "var(--raio-border-default)"}`,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={formInvalid}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open]);

  const handleSave = async () => {
    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }
    setSaving(true);
    const res = await changePassword(currentPassword, newPassword);
    setSaving(false);
    if (res.success) {
      toast.success("Senha alterada com sucesso!");
      onOpenChange(false);
    } else {
      toast.error(res.error || "Erro ao alterar senha");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
          <DialogDescription>
            Confirme sua senha atual e escolha uma nova com pelo menos 8 caracteres.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cp-current">Senha atual</Label>
            <Input
              id="cp-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-new">Nova senha</Label>
            <Input
              id="cp-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-confirm">Confirmar nova senha</Label>
            <Input
              id="cp-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          >
            {saving ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface LanguageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: string;
  onSelect: (lang: "pt-BR" | "en") => void | Promise<void>;
}

export function LanguageModal({ open, onOpenChange, current, onSelect }: LanguageModalProps) {
  // Apenas troca o ID da preferência salva no servidor — i18n real
  // ainda não existe (fora do escopo da Task #45). O label é informativo.
  const options = useMemo(
    () => [
      { id: "pt-BR" as const, label: "Português (Brasil)" },
      { id: "en" as const, label: "Inglês", note: "tradução em breve" },
    ],
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Idioma</DialogTitle>
          <DialogDescription>
            Sua escolha fica salva no seu perfil.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {options.map((opt) => {
            const active = opt.id === current;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={async () => {
                  await onSelect(opt.id);
                  onOpenChange(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left"
                style={{
                  background: active ? "var(--raio-bg-tertiary)" : "transparent",
                  border: `1px solid ${active ? "var(--raio-accent-primary)" : "var(--raio-border-default)"}`,
                }}
              >
                <div>
                  <p style={{ color: "var(--raio-text-primary)", fontWeight: 500 }}>
                    {opt.label}
                  </p>
                  {opt.note && (
                    <p className="text-xs" style={{ color: "var(--raio-text-tertiary)" }}>
                      {opt.note}
                    </p>
                  )}
                </div>
                {active && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--raio-accent-primary)", fontWeight: 600 }}
                  >
                    selecionado
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
