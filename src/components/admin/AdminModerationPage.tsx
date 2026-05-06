import { useEffect, useState, useCallback } from "react";
import { Eye, EyeOff, MessageCircle, FileText } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner@2.0.3";

interface ModerationPost {
  id: number;
  forum_id: number;
  forum_name: string;
  title: string | null;
  content: string;
  author_id: number;
  author_name: string;
  is_hidden: boolean;
  hidden_at: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
}

interface ModerationComment {
  id: number;
  post_id: number;
  post_title: string | null;
  content: string;
  author_id: number;
  author_name: string;
  is_hidden: boolean;
  hidden_at: string | null;
  like_count: number;
  created_at: string;
}

type Status = "all" | "visible" | "hidden";

function StatusBadge({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
      <EyeOff className="w-3 h-3 mr-1" /> Oculto
    </Badge>
  ) : (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      <Eye className="w-3 h-3 mr-1" /> Visível
    </Badge>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function PostsList({ status }: { status: Status }) {
  const [items, setItems] = useState<ModerationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await api.get<{ posts: ModerationPost[] }>(
      `/api/admin/moderation/posts?status=${status}&limit=50`,
    );
    if (res.success && res.data) {
      setItems(res.data.posts);
    } else {
      setErrorMsg(res.error?.message || "Erro ao carregar posts");
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleHide = async (post: ModerationPost) => {
    setPendingId(post.id);
    const action = post.is_hidden ? "restore" : "hide";
    const res = await api.post<{ hidden: boolean }>(
      `/api/admin/moderation/posts/${post.id}/${action}`,
    );
    setPendingId(null);
    if (res.success) {
      toast.success(post.is_hidden ? "Post restaurado" : "Post ocultado");
      void load();
    } else {
      toast.error(res.error?.message || "Erro ao atualizar");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8" style={{ color: "var(--rayo-ink-400)" }}>
        Carregando posts...
      </div>
    );
  }
  if (errorMsg) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{ background: "var(--rayo-terra-100)", color: "var(--rayo-terra-700)" }}
      >
        {errorMsg}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: "var(--rayo-ink-400)" }}>
        Nenhum post {status === "hidden" ? "oculto" : status === "visible" ? "visível" : ""} encontrado.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((post) => (
        <div
          key={post.id}
          className="rounded-xl border p-4"
          style={{
            background: "var(--rayo-sand-50)",
            borderColor: "var(--rayo-sand-300)",
          }}
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline">{post.forum_name}</Badge>
                <StatusBadge hidden={post.is_hidden} />
                <span className="text-xs" style={{ color: "var(--rayo-ink-400)" }}>
                  {formatDate(post.created_at)}
                </span>
              </div>
              {post.title && (
                <h4
                  className="text-base"
                  style={{ color: "var(--rayo-forest-900)", fontWeight: 600 }}
                >
                  {post.title}
                </h4>
              )}
              <p
                className="text-sm mt-1 line-clamp-3"
                style={{ color: "var(--rayo-ink-700)" }}
              >
                {post.content}
              </p>
              <div
                className="mt-2 flex items-center gap-3 text-xs"
                style={{ color: "var(--rayo-ink-400)" }}
              >
                <span>por {post.author_name}</span>
                <span>· {post.like_count} curtidas</span>
                <span>· {post.comment_count} comentários</span>
              </div>
            </div>
            <Button
              variant={post.is_hidden ? "outline" : "destructive"}
              size="sm"
              disabled={pendingId === post.id}
              onClick={() => void toggleHide(post)}
            >
              {post.is_hidden ? (
                <>
                  <Eye className="w-4 h-4 mr-1" /> Restaurar
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 mr-1" /> Ocultar
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CommentsList({ status }: { status: Status }) {
  const [items, setItems] = useState<ModerationComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await api.get<{ comments: ModerationComment[] }>(
      `/api/admin/moderation/comments?status=${status}&limit=50`,
    );
    if (res.success && res.data) {
      setItems(res.data.comments);
    } else {
      setErrorMsg(res.error?.message || "Erro ao carregar comentários");
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleHide = async (comment: ModerationComment) => {
    setPendingId(comment.id);
    const action = comment.is_hidden ? "restore" : "hide";
    const res = await api.post<{ hidden: boolean }>(
      `/api/admin/moderation/comments/${comment.id}/${action}`,
    );
    setPendingId(null);
    if (res.success) {
      toast.success(comment.is_hidden ? "Comentário restaurado" : "Comentário ocultado");
      void load();
    } else {
      toast.error(res.error?.message || "Erro ao atualizar");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8" style={{ color: "var(--rayo-ink-400)" }}>
        Carregando comentários...
      </div>
    );
  }
  if (errorMsg) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{ background: "var(--rayo-terra-100)", color: "var(--rayo-terra-700)" }}
      >
        {errorMsg}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: "var(--rayo-ink-400)" }}>
        Nenhum comentário {status === "hidden" ? "oculto" : status === "visible" ? "visível" : ""} encontrado.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((c) => (
        <div
          key={c.id}
          className="rounded-xl border p-4"
          style={{
            background: "var(--rayo-sand-50)",
            borderColor: "var(--rayo-sand-300)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <StatusBadge hidden={c.is_hidden} />
                {c.post_title && (
                  <span className="text-xs" style={{ color: "var(--rayo-ink-400)" }}>
                    em "{c.post_title}"
                  </span>
                )}
                <span className="text-xs" style={{ color: "var(--rayo-ink-400)" }}>
                  · {formatDate(c.created_at)}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--rayo-forest-900)" }}>
                {c.content}
              </p>
              <div
                className="mt-2 text-xs"
                style={{ color: "var(--rayo-ink-400)" }}
              >
                por {c.author_name} · {c.like_count} curtidas
              </div>
            </div>
            <Button
              variant={c.is_hidden ? "outline" : "destructive"}
              size="sm"
              disabled={pendingId === c.id}
              onClick={() => void toggleHide(c)}
            >
              {c.is_hidden ? (
                <>
                  <Eye className="w-4 h-4 mr-1" /> Restaurar
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 mr-1" /> Ocultar
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminModerationPage() {
  const [status, setStatus] = useState<Status>("visible");

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl mb-1"
          style={{ color: "var(--rayo-forest-900)", fontWeight: 700 }}
        >
          Moderação da Comunidade
        </h2>
        <p className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
          Oculte conteúdos inadequados sem excluí-los em definitivo. Itens ocultos
          desaparecem do feed mas podem ser restaurados a qualquer momento.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
          Filtro:
        </span>
        <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="visible">Apenas visíveis</SelectItem>
            <SelectItem value="hidden">Apenas ocultos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts" className="gap-2">
            <FileText className="w-4 h-4" /> Posts
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-2">
            <MessageCircle className="w-4 h-4" /> Comentários
          </TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-4">
          <PostsList status={status} />
        </TabsContent>
        <TabsContent value="comments" className="mt-4">
          <CommentsList status={status} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
