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

export function CreatePostModal({ open, onOpenChange, currentPage = "home", initialForumId }: CreatePostModalProps) {
  const { userData, createPost } = useApp();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Relacionamento");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [forumOptions, setForumOptions] = useState<ForumOption[]>([]);
  const [selectedForumId, setSelectedForumId] = useState<number | null>(initialForumId ?? null);

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

  const uploadOne = async (file: File): Promise<UploadedImage | null> => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/community/posts/attachments", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = (await r.json()) as {
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
        return null;
      }
      return {
        previewUrl: URL.createObjectURL(file),
        storedUrl: json.data.attachment.attachment_url,
      };
    } catch {
      enhancedToast.error({
        title: "Erro de conexão",
        description: "Não foi possível enviar a imagem",
        haptic: true,
      });
      return null;
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = ""; // permite re-selecionar o mesmo arquivo

    if (files.length + uploadedImages.length > POST_MAX_IMAGES) {
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
    const results = await Promise.all(validFiles.map(uploadOne));
    setUploadingCount((c) => c - validFiles.length);
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
    if (!content.trim() && uploadedImages.length === 0) {
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
      const ok = await createPost(content, selectedCategory, {
        visibility: "comunidade",
        images: uploadedImages.map((i) => i.storedUrl),
        forum_id: selectedForumId,
      });
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
        title: "Erro ao publicar",
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
            Criar Publicação
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
              Enviando {uploadingCount} imagem(ns)…
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
                disabled={uploadedImages.length >= POST_MAX_IMAGES || uploadingCount > 0}
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
                (!content.trim() && uploadedImages.length === 0) ||
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
