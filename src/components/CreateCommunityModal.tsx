import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { api } from "../lib/api";
import { enhancedToast } from "./EnhancedToast";
import { EmailVerificationInline } from "./EmailVerificationInline";
import { CoverCropper } from "./CoverCropper";

// Task #198 — Modal pra usuário criar a própria comunidade. Slug é
// derivado do nome no backend (ensureUniqueSlug). Categoria/ícone são
// opcionais; admin pode editar tudo depois.
// Task #202 — também suporta modo edição (PATCH /api/community/forums/:id)
// quando `editingForum` é passado. Apenas criador/admin chega aqui via UI.
export interface EditableForum {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  category?: string | null;
  rules?: string | null;
  cover_url?: string | null;
}

interface CreateCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (slug: string) => void;
  editingForum?: EditableForum | null;
  onUpdated?: () => void;
}

const ICON_CHOICES = ["💬", "❤️", "🙏", "🌱", "🏠", "👨‍👩‍👧", "💍", "🕊️", "📖", "✨"];

const CATEGORY_CHOICES = [
  "Casamento", "Namoro", "Noivado", "Solteiros", "Pais",
  "Família", "Fé", "Finanças", "Saúde emocional", "Outros",
];

export function CreateCommunityModal({ open, onOpenChange, onCreated, editingForum, onUpdated }: CreateCommunityModalProps) {
  const isEdit = !!editingForum;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("💬");
  const [category, setCategory] = useState("");
  const [rules, setRules] = useState("");
  const [busy, setBusy] = useState(false);
  // Task #202 — capa só no modo edição (criação fica simples).
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Task #205 — quando o backend devolve EMAIL_NOT_VERIFIED, trocamos
  // o conteúdo do modal pelo painel inline (sem perder os campos).
  const [needsEmailVerify, setNeedsEmailVerify] = useState(false);
  // Task #219 — quando o usuário escolhe um arquivo, abrimos o editor
  // de recorte 16:5 antes de subir. A capa só vai pro backend depois
  // que o usuário confirma o enquadramento.
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);

  const reset = () => {
    setName("");
    setDescription("");
    setIcon("💬");
    setCategory("");
    setRules("");
    setCoverUrl(null);
    // Revoga blob anterior antes de zerar o preview pra evitar leak.
    setCoverPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      coverPreviewRef.current = null;
      return null;
    });
    setNeedsEmailVerify(false);
    setPendingCoverFile(null);
  };

  // Pre-fill quando entra em modo edição (ou reseta quando volta a criar).
  useEffect(() => {
    if (!open) return;
    if (editingForum) {
      setName(editingForum.name || "");
      setDescription(editingForum.description || "");
      setIcon(editingForum.icon || "💬");
      setCategory(editingForum.category || "");
      setRules(editingForum.rules || "");
      setCoverUrl(editingForum.cover_url || null);
      setCoverPreview(editingForum.cover_url || null);
    } else {
      reset();
    }
  }, [open, editingForum]);

  // Task #219 — Validação de arquivo + abertura do editor de recorte.
  // O upload real só acontece após o `onCropConfirm` devolver o blob
  // recortado. Mantém a validação de mime/size aqui pra rejeitar cedo.
  const onPickFile = (file: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      enhancedToast.error({ title: "Formato não suportado", description: "Use JPG, PNG ou WebP", haptic: true });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      enhancedToast.error({ title: "Arquivo grande demais", description: "Limite de 5 MB", haptic: true });
      return;
    }
    setPendingCoverFile(file);
  };

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    // try/finally garante que o spinner não fica preso quando o fetch
    // explode (offline, abort, etc) — sem isso o botão "Trocar capa"
    // ficaria desabilitado até reabrir o modal.
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Edição usa o endpoint atrelado ao fórum (mantém ACL legada de
      // moderador local). Criação usa o staging — a capa é enviada e o
      // sentinel objstore vem junto no POST /forums.
      const url = editingForum
        ? `/api/community/forums/${editingForum.id}/cover`
        : `/api/community/forums/cover-staging`;
      let json: any = {};
      try {
        const res = await fetch(url, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        json = await res.json().catch(() => ({}));
      } catch (err) {
        enhancedToast.error({
          title: "Falha de conexão",
          description: err instanceof Error ? err.message : "Verifique sua internet e tente novamente.",
          haptic: true,
        });
        return;
      }
      if (json?.success && json?.data?.cover_url) {
        setCoverUrl(json.data.cover_url as string);
        // Preview local mostra o blob recortado — é exatamente o que vai
        // aparecer no banner 16:5 da comunidade (sem cortes extras).
        setCoverPreview((prev) => {
          if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          const next = URL.createObjectURL(file);
          coverPreviewRef.current = next;
          return next;
        });
        enhancedToast.success({
          title: "Capa pronta",
          description: editingForum ? "Salve pra aplicar." : "Já vai junto na criação.",
          haptic: true,
        });
      } else {
        enhancedToast.error({
          title: "Não foi possível subir a capa",
          description: json?.error?.message || "Tente novamente",
          haptic: true,
        });
      }
    } finally {
      setUploadingCover(false);
    }
  };

  // Task #219 — confirma o crop → faz o upload do blob recortado e
  // fecha o editor. Cancelar volta sem alterar a capa atual. Erros raros
  // do canvas/encoder (ex: imagem corrompida) viram toast pro usuário.
  const onCropConfirm = async (cropped: File) => {
    setPendingCoverFile(null);
    try {
      await uploadCover(cropped);
    } catch (err) {
      enhancedToast.error({
        title: "Não foi possível processar a capa",
        description: err instanceof Error ? err.message : "Tente novamente",
        haptic: true,
      });
    }
  };
  const onCropCancel = () => setPendingCoverFile(null);

  // Task #219 — Revoga objectURL local de preview ao remover capa, ao
  // resetar/fechar o modal e ao desmontar. `coverPreviewRef` espelha o
  // último URL pra cleanup no unmount funcionar mesmo após múltiplas
  // trocas (effect cleanup com array vazio só veria o valor inicial).
  const coverPreviewRef = useRef<string | null>(null);
  const clearCoverPreview = useCallback(() => {
    setCoverPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      coverPreviewRef.current = null;
      return null;
    });
  }, []);
  useEffect(() => {
    return () => {
      const last = coverPreviewRef.current;
      if (last && last.startsWith("blob:")) URL.revokeObjectURL(last);
      coverPreviewRef.current = null;
    };
  }, []);

  const onSubmit = async () => {
    const trimmed = name.trim();
    const cat = category.trim();
    if (!trimmed) {
      enhancedToast.error({ title: "Nome obrigatório", description: "Dê um nome à comunidade", haptic: true });
      return;
    }
    if (!cat) {
      enhancedToast.error({ title: "Categoria obrigatória", description: "Escolha um tema pra comunidade", haptic: true });
      return;
    }
    // Capa obrigatória APENAS na criação. Na edição, remover a capa
    // (voltar pro fallback gradiente) continua permitido.
    if (!isEdit && !coverUrl) {
      enhancedToast.error({
        title: "Capa obrigatória",
        description: "Adicione uma imagem de capa pra apresentar a comunidade.",
        haptic: true,
      });
      return;
    }
    setBusy(true);
    if (isEdit && editingForum) {
      const patchBody: Record<string, unknown> = {
        name: trimmed,
        description: description.trim() || null,
        icon,
        category: cat,
        rules: rules.trim() || null,
      };
      // Só inclui cover_url se mudou em relação ao backend (evita reescrever).
      if ((coverUrl || null) !== (editingForum.cover_url || null)) {
        patchBody.cover_url = coverUrl; // null = remover, sentinel objstore = nova
      }
      const res = await api.patch<{ forum: { slug: string; name: string } }>(
        `/api/community/forums/${editingForum.id}`,
        patchBody,
      );
      setBusy(false);
      if (res.success) {
        enhancedToast.success({
          title: "Comunidade atualizada",
          description: "Mudanças salvas.",
          haptic: true,
        });
        onOpenChange(false);
        onUpdated?.();
      } else {
        enhancedToast.error({
          title: "Não foi possível salvar",
          description: res.error?.message || "Tente novamente",
          haptic: true,
        });
      }
      return;
    }
    const res = await api.post<{ forum: { slug: string; name: string } }>(
      "/api/community/forums",
      {
        name: trimmed,
        description: description.trim() || null,
        icon,
        category: cat,
        rules: rules.trim() || null,
        // Sentinel objstore vindo do staging upload — backend valida e
        // persiste em forums.cover_url. Sem isso a criação falha na
        // validação do client (capa obrigatória).
        cover_url: coverUrl,
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
      // Task #205 — em vez de toast genérico, troca pro fluxo inline.
      if (code === "EMAIL_NOT_VERIFIED") {
        setNeedsEmailVerify(true);
        return;
      }
      enhancedToast.error({
        title: code === "RATE_LIMIT_EXCEEDED" ? "Limite atingido" : "Não foi possível criar",
        description: res.error?.message || "Tente novamente",
        haptic: true,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o && !isEdit) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {needsEmailVerify
              ? "Confirme seu e-mail"
              : isEdit
              ? "Editar comunidade"
              : "Criar comunidade"}
          </DialogTitle>
          <DialogDescription>
            {needsEmailVerify
              ? "Só falta um passo pra criar a sua comunidade."
              : isEdit
              ? "Atualize nome, descrição, ícone, categoria e regras."
              : "Comunidades são espaços abertos pra conversar. Você será o primeiro moderador."}
          </DialogDescription>
        </DialogHeader>

        {needsEmailVerify ? (
          <EmailVerificationInline
            reason="Pra criar comunidades, precisamos confirmar seu e-mail uma vez."
            onCancel={() => setNeedsEmailVerify(false)}
            onVerified={() => {
              setNeedsEmailVerify(false);
              void onSubmit();
            }}
          />
        ) : (
        <>
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

          {(
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "var(--rayo-ink-600)" }}>
                Capa {isEdit ? "(opcional)" : <span style={{ color: "var(--rayo-terra-500)" }}>*</span>}
              </label>
              <div
                className="relative w-full h-32 rounded-lg overflow-hidden flex items-center justify-center"
                style={{
                  background: "var(--rayo-sand-50)",
                  border: `1px dashed var(--rayo-sand-300)`,
                }}
              >
                {coverPreview ? (
                  <>
                    <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setCoverUrl(null); clearCoverPreview(); }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
                      aria-label="Remover capa"
                      disabled={uploadingCover}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-xs"
                    style={{ color: "var(--rayo-ink-500)" }}
                    disabled={uploadingCover}
                  >
                    <ImagePlus className="w-6 h-6" />
                    {uploadingCover ? "Enviando…" : "Adicionar capa"}
                  </button>
                )}
              </div>
              {coverPreview && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs underline"
                  style={{ color: "var(--rayo-terra-600)" }}
                  disabled={uploadingCover}
                >
                  {uploadingCover ? "Enviando…" : "Trocar capa"}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                  e.target.value = "";
                }}
              />
              <p className="text-[11px] text-muted-foreground">JPG, PNG ou WebP até 5 MB.</p>
              {pendingCoverFile && (
                <div
                  className="mt-3 rounded-xl p-3"
                  style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
                >
                  <CoverCropper
                    file={pendingCoverFile}
                    onConfirm={onCropConfirm}
                    onCancel={onCropCancel}
                  />
                </div>
              )}
            </div>
          )}

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
              Categoria <span style={{ color: "var(--rayo-terra-500)" }}>*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="px-2.5 py-1 rounded-full text-xs transition-colors"
                  style={{
                    background: category === c ? "var(--rayo-terra-500)" : "var(--rayo-sand-50)",
                    color: category === c ? "white" : "var(--rayo-ink-700)",
                    border: `1px solid ${category === c ? "var(--rayo-terra-500)" : "var(--rayo-sand-300)"}`,
                  }}
                  aria-pressed={category === c}
                >
                  {c}
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
          <Button
            onClick={onSubmit}
            disabled={busy || !name.trim() || !category.trim() || (!isEdit && !coverUrl) || uploadingCover}
          >
            {busy ? (isEdit ? "Salvando…" : "Criando…") : (isEdit ? "Salvar" : "Criar comunidade")}
          </Button>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
