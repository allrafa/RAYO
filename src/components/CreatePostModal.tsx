import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, Image as ImageIcon, Send, X, Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { enhancedToast } from "./EnhancedToast";
import { api } from "../lib/api";

interface ForumOption {
  id: number;
  name: string;
  icon: string;
  slug?: string;
}

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage?: string;
  /** Quando passado, pre-seleciona a comunidade no composer. */
  initialForumId?: number;
  /** Task #93 — quando setado, modal entra em modo edição (PATCH). */
  editingPost?: {
    id: number;
    content?: string;
    category?: string;
    forum_id?: number;
    /** URLs assinadas (resolvidas) — usadas só pra renderizar thumbs. */
    images?: string[];
    /** Sentinels CRUS (objstore://posts/<file>) — únicos aceitos no PATCH. */
    image_refs?: string[];
  } | null;
}

// Task #92 — Composer estilo Reddit: comunidade é OBRIGATÓRIA, fotos são
// enviadas para Object Storage ANTES do publish (sentinels persistentes,
// nada de blob: URLs que somem ao recarregar). Vídeo NÃO é aceito —
// servidor recusa qualquer mime fora de jpg/png/webp.
const POST_MAX_IMAGES = 4;
const POST_IMAGE_MAX = 5 * 1024 * 1024;
const POST_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface UploadedImage {
  previewUrl: string;
  storedUrl: string; // sentinel objstore://posts/<file>
}

export function CreatePostModal({ open, onOpenChange, currentPage = "home", initialForumId, editingPost }: CreatePostModalProps) {
  const { userData, createPost, loadPosts } = useApp();
  const { user } = useAuth();
  const isEditing = !!editingPost;
  const [content, setContent] = useState(editingPost?.content || "");
  const [selectedCategory, setSelectedCategory] = useState(editingPost?.category || "Relacionamento");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  // Task #92 — progresso per-file (0–100). Renderizamos a média.
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [forumOptions, setForumOptions] = useState<ForumOption[]>([]);
  const [selectedForumId, setSelectedForumId] = useState<number | null>(
    editingPost?.forum_id ?? initialForumId ?? null,
  );

  // Task #93 — em modo edição mantemos DOIS arrays paralelos:
  // `existingRefs` (sentinels crus pra mandar no PATCH) e `existingUrls`
  // (URLs assinadas pra renderizar). Remover um item remove dos dois ao
  // mesmo tempo (mesmo índice).
  const [existingRefs, setExistingRefs] = useState<string[]>(editingPost?.image_refs || []);
  const [existingUrls, setExistingUrls] = useState<string[]>(editingPost?.images || []);

  // Task #93 — quando o modal abre em modo edição, hidrata os campos com
  // o post sendo editado. Em modo criação, reseta tudo.
  useEffect(() => {
    if (!open) return;
    if (editingPost) {
      setContent(editingPost.content || "");
      setSelectedCategory(editingPost.category || "Relacionamento");
      setSelectedForumId(editingPost.forum_id ?? null);
      setExistingRefs(editingPost.image_refs || []);
      setExistingUrls(editingPost.images || []);
    } else {
      setExistingRefs([]);
      setExistingUrls([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingPost?.id]);

  const removeExistingImage = (idx: number) => {
    setExistingRefs((prev) => prev.filter((_, i) => i !== idx));
    setExistingUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    if (!open) return;
    api.get<{ forums: ForumOption[] }>("/api/community/forums").then((res) => {
      if (res.success && res.data) {
        setForumOptions(res.data.forums);
        if (initialForumId && res.data.forums.some((f) => f.id === initialForumId)) {
          setSelectedForumId(initialForumId);
        }
      }
    });
  }, [open, initialForumId]);

  const categories = [
    "Relacionamento",
    "Comunicação",
    "Finanças",
    "Família",
    "Espiritualidade",
    "Lazer",
    "Saúde",
    "Carreira",
  ];

  const selectedForum = useMemo(
    () => forumOptions.find((f) => f.id === selectedForumId) || null,
    [forumOptions, selectedForumId],
  );

  // Limpa previews ao fechar (libera memória dos blob: URLs).
  useEffect(() => {
    if (open) return;
    uploadedImages.forEach((img) => {
      try { URL.revokeObjectURL(img.previewUrl); } catch { /* noop */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  // Task #92 — XHR (e não fetch) pra ter `upload.onprogress` real e
  // mostrar a porcentagem por imagem. fetch ainda não suporta progress
  // confiável de upload em browsers (apenas streams experimentais).
  const uploadOne = (
    file: File,
    onProgress: (pct: number) => void,
  ): Promise<UploadedImage | null> => {
    return new Promise((resolve) => {
      const fd = new FormData();
      fd.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/community/posts/attachments", true);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText) as {
            success: boolean;
            data: { attachment: { attachment_url: string } } | null;
            error: { message: string } | null;
          };
          if (!json.success || !json.data) {
            enhancedToast.error({
              title: "Falha no upload",
              description: json.error?.message || "Tente outra imagem",
              haptic: true,
            });
            resolve(null);
            return;
          }
          onProgress(100);
          resolve({
            previewUrl: URL.createObjectURL(file),
            storedUrl: json.data.attachment.attachment_url,
          });
        } catch {
          enhancedToast.error({
            title: "Falha no upload",
            description: "Resposta inválida do servidor",
            haptic: true,
          });
          resolve(null);
        }
      };
      xhr.onerror = () => {
        enhancedToast.error({
          title: "Erro de conexão",
          description: "Não foi possível enviar a imagem",
          haptic: true,
        });
        resolve(null);
      };
      xhr.send(fd);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = ""; // permite re-selecionar o mesmo arquivo

    if (files.length + uploadedImages.length + existingRefs.length > POST_MAX_IMAGES) {
      enhancedToast.error({
        title: "Muitas imagens",
        description: `Você pode adicionar no máximo ${POST_MAX_IMAGES} imagens`,
        haptic: true,
      });
      return;
    }

    const validFiles = files.filter((file) => {
      if (!POST_IMAGE_MIMES.has(file.type)) {
        enhancedToast.error({
          title: "Formato inválido",
          description: "Use JPG, PNG ou WebP",
          haptic: true,
        });
        return false;
      }
      if (file.size > POST_IMAGE_MAX) {
        enhancedToast.error({
          title: "Imagem muito grande",
          description: "Cada imagem deve ter no máximo 5 MB",
          haptic: true,
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingCount((c) => c + validFiles.length);
    // Task #92 — progresso per-file via XHR onprogress. Mantemos um
    // array com o % de cada upload em curso e exibimos a média.
    const startIdx = uploadProgress.length;
    setUploadProgress((prev) => [...prev, ...validFiles.map(() => 0)]);
    const results = await Promise.all(
      validFiles.map((f, i) =>
        uploadOne(f, (pct) =>
          setUploadProgress((prev) => {
            const copy = [...prev];
            copy[startIdx + i] = pct;
            return copy;
          }),
        ),
      ),
    );
    setUploadingCount((c) => c - validFiles.length);
    setUploadProgress((prev) => prev.filter((_, i) => i < startIdx || i >= startIdx + validFiles.length));
    const ok = results.filter((r): r is UploadedImage => r !== null);
    if (ok.length > 0) {
      setUploadedImages((prev) => [...prev, ...ok]);
      enhancedToast.success({
        title: `${ok.length} imagem(ns) carregada(s)`,
        description: "Pronto pra publicar",
        haptic: true,
      });
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed) {
        try { URL.revokeObjectURL(removed.previewUrl); } catch { /* noop */ }
      }
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!selectedForumId) {
      enhancedToast.error({
        title: "Escolha uma comunidade",
        description: "Selecione onde sua publicação será exibida",
        haptic: true,
      });
      return;
    }
    if (!content.trim() && uploadedImages.length === 0 && existingRefs.length === 0) {
      enhancedToast.error({
        title: "Conteúdo necessário",
        description: "Adicione texto ou imagens para publicar",
        haptic: true,
      });
      return;
    }
    if (content.trim() && content.length < 5) {
      enhancedToast.error({
        title: "Texto muito curto",
        description: "Escreva pelo menos 5 caracteres",
        haptic: true,
      });
      return;
    }
    if (uploadingCount > 0) {
      enhancedToast.info({
        title: "Aguarde o upload terminar",
        description: "As imagens ainda estão sendo enviadas",
        haptic: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let ok = false;
      if (isEditing && editingPost) {
        // Task #93 — edição via PATCH. Conteúdo, categoria e fotos podem
        // ser alterados; comunidade (forum_id) é IMUTÁVEL no servidor.
        // SEMPRE mandamos sentinels CRUS (`existingRefs` + storedUrl das
        // novas) — o backend rejeita URL resolvida (`INVALID_IMAGE_REF`).
        const newRefs = uploadedImages.map((i) => i.storedUrl);
        const res = await api.patch<{ post: { id: number } }>(
          `/api/community/posts/${editingPost.id}`,
          {
            content,
            category: selectedCategory,
            images: [...existingRefs, ...newRefs].slice(0, POST_MAX_IMAGES),
          },
        );
        ok = res.success;
        if (ok) {
          enhancedToast.success({
            title: "Publicação atualizada",
            description: "Suas mudanças já estão visíveis.",
            haptic: true,
          });
          await loadPosts();
        } else {
          enhancedToast.error({
            title: "Erro ao atualizar",
            description: res.error?.message || "Tente novamente",
            haptic: true,
          });
        }
      } else {
        ok = await createPost(content, selectedCategory, {
          visibility: "comunidade",
          images: uploadedImages.map((i) => i.storedUrl),
          forum_id: selectedForumId,
        });
      }
      if (ok) {
        uploadedImages.forEach((img) => {
          try { URL.revokeObjectURL(img.previewUrl); } catch { /* noop */ }
        });
        setContent("");
        setSelectedCategory("Relacionamento");
        setUploadedImages([]);
        onOpenChange(false);
      }
    } catch {
      enhancedToast.error({
        title: isEditing ? "Erro ao atualizar" : "Erro ao publicar",
        description: "Tente novamente em alguns instantes",
        haptic: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            {isEditing ? "Editar Publicação" : "Criar Publicação"}
          </DialogTitle>
          <DialogDescription>
            Compartilhe com a comunidade RAYO. Apenas fotos são permitidas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 ring-2 ring-primary/20">
              {user?.avatar_url && <AvatarImage src={user.avatar_url} />}
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {(user?.name || userData.name)?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-medium text-lg">{user?.name || userData.name}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedForum
                  ? <>Publicando em <strong>c/{selectedForum.slug || selectedForum.name}</strong></>
                  : <span style={{ color: "var(--rayo-terra-700)" }}>Selecione uma comunidade abaixo</span>}
              </p>
            </div>
          </div>

          {/* Comunidade — OBRIGATÓRIO */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              Comunidade <span style={{ color: "var(--rayo-terra-700)" }}>*</span>
            </label>
            <Select
              value={selectedForumId ? String(selectedForumId) : ""}
              onValueChange={(v) => setSelectedForumId(parseInt(v, 10))}
            >
              <SelectTrigger
                className={selectedForumId ? "" : "border-[var(--rayo-terra-500)]"}
              >
                <SelectValue placeholder="Escolha onde publicar (obrigatório)" />
              </SelectTrigger>
              <SelectContent>
                {forumOptions.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.icon} c/{f.slug || f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Texto */}
          <div className="space-y-3">
            <Textarea
              placeholder="Compartilhe suas experiências e momentos especiais…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-32 resize-none border-none shadow-none text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0 p-0"
              maxLength={2000}
            />
            {content.length > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {content.length}/2000 caracteres
                </span>
                <span
                  className="font-medium"
                  style={{
                    color:
                      content.length < 5
                        ? "var(--rayo-ochre-700)"
                        : content.length > 1800
                        ? "var(--rayo-terra-700)"
                        : "var(--rayo-forest-700)",
                  }}
                >
                  {content.length < 5
                    ? "Continue escrevendo…"
                    : content.length > 1800
                    ? "Quase no limite"
                    : "Perfeito!"}
                </span>
              </div>
            )}
          </div>

          {/* Task #93 — Imagens já existentes (modo edição). Click no X
              remove do array `existingRefs` (e do PATCH subsequente). */}
          {isEditing && existingUrls.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Fotos atuais ({existingUrls.length})
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {existingUrls.map((url, index) => (
                  <div key={existingRefs[index] || `existing-${index}`} className="relative group">
                    <img
                      src={url}
                      alt={`Foto atual ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeExistingImage(index)}
                      type="button"
                      title="Remover foto"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image Preview Grid */}
          {uploadedImages.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Imagens ({uploadedImages.length}/{POST_MAX_IMAGES})
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {uploadedImages.map((img, index) => (
                  <div key={img.storedUrl} className="relative group">
                    <img
                      src={img.previewUrl}
                      alt={`Imagem ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadingCount > 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Enviando {uploadingCount} imagem(ns)… {uploadProgress.length > 0 && `${Math.round(uploadProgress.reduce((a, b) => a + b, 0) / uploadProgress.length)}%`}
            </div>
          )}

          {/* Botões de mídia */}
          <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-xl">
            <span className="text-sm font-medium text-muted-foreground">
              Adicionar à publicação:
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-[var(--rayo-sand-100)] hover:text-[var(--rayo-forest-700)] transition-colors"
                onClick={handleImageSelect}
                disabled={uploadedImages.length + existingRefs.length >= POST_MAX_IMAGES || uploadingCount > 0}
                title="Adicionar fotos"
                type="button"
              >
                <ImageIcon className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-[var(--rayo-sand-200)] hover:text-[var(--rayo-forest-700)] transition-colors"
                onClick={handleImageSelect}
                disabled={uploadedImages.length >= POST_MAX_IMAGES || uploadingCount > 0}
                title="Tirar foto"
                type="button"
              >
                <Camera className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Categoria */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:shadow-md hover:brightness-105 active:opacity-80"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex-shrink-0 pt-6 border-t">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-12"
              disabled={isSubmitting}
              type="button"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedForumId ||
                isSubmitting ||
                uploadingCount > 0 ||
                (!content.trim() && uploadedImages.length === 0 && existingRefs.length === 0) ||
                (content.trim().length > 0 && content.trim().length < 5)
              }
              className="flex-1 h-12 font-medium"
              type="button"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publicando…
                </div>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publicar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
