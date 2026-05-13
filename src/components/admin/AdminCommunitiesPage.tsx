import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Plus, Pencil, Users, ShieldCheck, EyeOff, Eye, Image as ImageIcon, X } from "lucide-react";
import { api } from "../../lib/api";
import { enhancedToast } from "../EnhancedToast";
import { ImageWithFallback } from "../figma/ImageWithFallback";

// Task #198 — Admin CMS de comunidades. Lista todas as comunidades
// (oficiais + criadas por usuários, ativas + desativadas), permite
// criar/editar/desativar e gerenciar moderadores per-community.

interface AdminForum {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  life_context: string | null;
  cover_url: string | null;
  rules: string | null;
  is_official: boolean;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string | null;
  member_count: number | string;
  post_count: number | string;
  moderator_count: number | string;
}

interface Moderator {
  user_id: number;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export function AdminCommunitiesPage() {
  const [forums, setForums] = useState<AdminForum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AdminForum | null>(null);
  const [managingMods, setManagingMods] = useState<AdminForum | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ forums: AdminForum[] }>("/api/admin/community/forums");
    setLoading(false);
    if (res.success && res.data) {
      setForums(res.data.forums);
      setError(null);
    } else {
      setError(res.error?.message || "Falha ao carregar comunidades");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onToggleActive = async (f: AdminForum) => {
    const next = !f.is_active;
    const res = await api.post(`/api/admin/community/forums/${f.id}/active`, { active: next });
    if (res.success) {
      enhancedToast.success({
        title: next ? "Comunidade reativada" : "Comunidade desativada",
        description: `c/${f.slug}`,
        haptic: true,
      });
      void load();
    } else {
      enhancedToast.error({ title: "Falha", description: res.error?.message || "", haptic: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--rayo-forest-900)" }}>
            Comunidades
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie capa, descrição, regras e moderadores de cada fórum.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova comunidade
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {error && (
        <div className="rounded-lg p-4 text-sm" style={{ background: "var(--rayo-terra-50)", color: "var(--rayo-terra-700)" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {forums.map((f) => (
            <div
              key={f.id}
              className="rounded-xl overflow-hidden flex flex-col"
              style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)", opacity: f.is_active ? 1 : 0.6 }}
            >
              <div className="h-24 relative" style={{ background: "var(--rayo-terra-100)" }}>
                {f.cover_url ? (
                  <ImageWithFallback src={f.cover_url} alt={`Capa ${f.name}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">{f.icon || "💬"}</div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {f.is_official && (
                    <Badge style={{ background: "var(--rayo-forest-700)", color: "#fff", fontSize: 10 }}>Oficial</Badge>
                  )}
                  {!f.is_active && (
                    <Badge style={{ background: "var(--rayo-ink-400)", color: "#fff", fontSize: 10 }}>Inativa</Badge>
                  )}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-xl">{f.icon || "💬"}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate" style={{ color: "var(--rayo-forest-900)" }}>
                      {f.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">c/{f.slug}</p>
                  </div>
                </div>
                {f.description && (
                  <p className="text-xs line-clamp-2" style={{ color: "var(--rayo-ink-600)" }}>{f.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-auto pt-2">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {f.member_count}</span>
                  <span>📝 {f.post_count}</span>
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {f.moderator_count}</span>
                </div>
                {f.created_by_name && (
                  <p className="text-[10px] text-muted-foreground">por {f.created_by_name}</p>
                )}
                <div className="flex flex-wrap gap-1 pt-2 border-t" style={{ borderColor: "var(--rayo-sand-300)" }}>
                  <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs" onClick={() => setEditing(f)}>
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs" onClick={() => setManagingMods(f)}>
                    <ShieldCheck className="w-3 h-3" /> Mods
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs" onClick={() => onToggleActive(f)}>
                    {f.is_active ? <><EyeOff className="w-3 h-3" /> Desativar</> : <><Eye className="w-3 h-3" /> Reativar</>}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <ForumEditModal
          open={showCreate}
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); void load(); }}
        />
      )}
      {editing && (
        <ForumEditModal
          open={!!editing}
          mode="edit"
          forum={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
      {managingMods && (
        <ModeratorsModal
          forum={managingMods}
          onClose={() => setManagingMods(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Forum create/edit modal
// ─────────────────────────────────────────────────────────────────────
interface ForumEditModalProps {
  open: boolean;
  mode: "create" | "edit";
  forum?: AdminForum;
  onClose: () => void;
  onSaved: () => void;
}

function ForumEditModal({ open, mode, forum, onClose, onSaved }: ForumEditModalProps) {
  const [name, setName] = useState(forum?.name || "");
  const [slug, setSlug] = useState(forum?.slug || "");
  const [description, setDescription] = useState(forum?.description || "");
  const [icon, setIcon] = useState(forum?.icon || "💬");
  const [category, setCategory] = useState(forum?.category || "");
  const [lifeContext, setLifeContext] = useState(forum?.life_context || "");
  const [rules, setRules] = useState(forum?.rules || "");
  const [coverUrl, setCoverUrl] = useState<string | null>(forum?.cover_url || null);
  // Sentinel pendente de salvar. `null` = sem mudança em relação ao backend.
  // String vazia "" = pedido explícito pra remover (PATCH envia cover_url:null).
  const [coverSentinel, setCoverSentinel] = useState<string | null>(null);
  const [isOfficial, setIsOfficial] = useState(forum?.is_official ?? mode === "create");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onUploadCover = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/community/forums/cover", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    setUploading(false);
    const json = await res.json();
    if (json?.success && json?.data?.cover_url) {
      setCoverSentinel(json.data.cover_url);
      // Mostra preview local imediato (URL real só vem após save+reload).
      setCoverUrl(URL.createObjectURL(file));
    } else {
      enhancedToast.error({
        title: "Falha no upload",
        description: json?.error?.message || "Tente novamente",
        haptic: true,
      });
    }
  };

  const onSave = async () => {
    if (!name.trim()) {
      enhancedToast.error({ title: "Nome obrigatório", description: "", haptic: true });
      return;
    }
    setBusy(true);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      icon: icon || "💬",
      category: category.trim() || null,
      life_context: lifeContext.trim() || null,
      rules: rules.trim() || null,
      is_official: isOfficial,
    };
    if (coverSentinel !== null) payload.cover_url = coverSentinel === "" ? null : coverSentinel;
    if (mode === "edit" && slug && slug !== forum?.slug) payload.slug = slug;
    if (mode === "create" && slug.trim()) payload.slug = slug.trim();

    const res = mode === "create"
      ? await api.post("/api/admin/community/forums", payload)
      : await api.patch(`/api/admin/community/forums/${forum!.id}`, payload);
    setBusy(false);
    if (res.success) {
      enhancedToast.success({ title: mode === "create" ? "Comunidade criada" : "Comunidade atualizada", description: "", haptic: true });
      onSaved();
    } else {
      enhancedToast.error({ title: "Falha", description: res.error?.message || "Tente novamente", haptic: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nova comunidade" : `Editar c/${forum?.slug}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nome *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Slug (opcional)</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder={mode === "create" ? "Auto a partir do nome" : ""}
                maxLength={60}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Ícone (emoji)</label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value.slice(0, 2))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Categoria</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Casamento" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Contexto de vida</label>
              <Input value={lifeContext} onChange={(e) => setLifeContext(e.target.value)} placeholder="solteiro|namoro|noivos|casados|pais" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Capa</label>
            <div className="flex gap-3 items-center">
              <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--rayo-terra-100)", border: "1px solid var(--rayo-sand-300)" }}>
                {coverUrl ? (
                  <ImageWithFallback src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-muted-foreground" /></div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUploadCover(f); }}
                  disabled={uploading}
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">JPG/PNG/WebP até 5 MB</p>
                {uploading && <p className="text-[11px]">Enviando…</p>}
                {coverUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px] gap-1 text-destructive"
                    onClick={() => { setCoverUrl(null); setCoverSentinel(""); }}
                  >
                    <X className="w-3 h-3" /> Remover capa
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Descrição</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Regras</label>
            <Textarea value={rules} onChange={(e) => setRules(e.target.value)} maxLength={5000} rows={6}
              placeholder="Quebre por linha. Markdown não é renderizado — texto cru." />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isOfficial} onChange={(e) => setIsOfficial(e.target.checked)} />
            Comunidade oficial RAYO
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={onSave} disabled={busy || !name.trim()}>
            {busy ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Moderators per-community
// ─────────────────────────────────────────────────────────────────────
function ModeratorsModal({ forum, onClose, onChanged }: { forum: AdminForum; onClose: () => void; onChanged: () => void }) {
  const [mods, setMods] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ moderators: Moderator[] }>(`/api/admin/community/forums/${forum.id}/moderators`);
    setLoading(false);
    if (res.success && res.data) setMods(res.data.moderators);
  }, [forum.id]);

  useEffect(() => { void load(); }, [load]);

  const onAdd = async () => {
    const id = parseInt(userId, 10);
    if (!Number.isFinite(id) || id < 1) {
      enhancedToast.error({ title: "ID inválido", description: "Use o ID numérico do usuário", haptic: true });
      return;
    }
    setAdding(true);
    const res = await api.post(`/api/admin/community/forums/${forum.id}/moderators`, { user_id: id });
    setAdding(false);
    if (res.success) {
      setUserId("");
      enhancedToast.success({ title: "Moderador adicionado", description: "", haptic: true });
      void load();
      onChanged();
    } else {
      enhancedToast.error({ title: "Falha", description: res.error?.message || "", haptic: true });
    }
  };

  const onRemove = async (uid: number) => {
    const res = await api.delete(`/api/admin/community/forums/${forum.id}/moderators/${uid}`);
    if (res.success) {
      enhancedToast.success({ title: "Moderador removido", description: "", haptic: true });
      void load();
      onChanged();
    } else {
      enhancedToast.error({ title: "Falha", description: res.error?.message || "", haptic: true });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Moderadores de c/{forum.slug}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value.replace(/\D/g, ""))}
              placeholder="ID do usuário"
              inputMode="numeric"
            />
            <Button onClick={onAdd} disabled={adding || !userId.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Encontre o ID em /admin → Usuários. Adicionar não promove o role global.
          </p>

          {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!loading && mods.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum moderador local — apenas mods/admins globais podem moderar.</p>
          )}
          <ul className="space-y-2">
            {mods.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 rounded-lg p-2"
                style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}>
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ background: "var(--rayo-terra-100)" }}>
                  {m.avatar_url ? <ImageWithFallback src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">u/{m.user_id}</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onRemove(m.user_id)}
                  aria-label={`Remover ${m.name}`}>
                  <X className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
