// Comunidade escopada por turma (Task #99). Reusa o feed `/api/community/posts`
// passando ?class_id=. Composer mínimo embutido (sem upload de imagem por
// agora — manter foco). Posts existentes da Comunidade global NÃO vazam aqui.

import { useEffect, useState, useCallback } from "react";
import { Loader2, Send } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useApp } from "../AppContext";
import { toast } from "sonner@2.0.3";

interface ClassPost {
  id: number;
  forum_id: number;
  forum_name: string;
  forum_slug: string;
  class_id: number | null;
  title: string | null;
  content: string;
  author_id: number;
  author_name: string;
  author_avatar: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
}

interface ClassForum {
  id: number;
  name: string;
  slug: string;
}

export function TurmaCommunityTab({ classId }: { classId: number }) {
  const { userData } = useApp();
  const [posts, setPosts] = useState<ClassPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState("");
  const [posting, setPosting] = useState(false);
  const [forums, setForums] = useState<ClassForum[]>([]);
  const [forumId, setForumId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ posts: ClassPost[] }>(`/api/community/posts?class_id=${classId}&limit=50`);
    if (res.success && res.data) setPosts(res.data.posts);
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  // Carrega "minhas comunidades" pra escolher onde publicar (precisa de forum_id).
  useEffect(() => {
    api.get<{ forums: ClassForum[] }>("/api/community/forums/me").then((res) => {
      if (res.success && res.data) {
        setForums(res.data.forums);
        if (res.data.forums.length > 0) setForumId(res.data.forums[0].id);
      }
    });
  }, []);

  const submit = async () => {
    const content = composer.trim();
    if (!content || !forumId) {
      if (!forumId) toast.error("Você precisa estar inscrito em uma comunidade pra publicar na turma.");
      return;
    }
    setPosting(true);
    const res = await api.post<{ post: ClassPost }>(`/api/community/posts`, {
      forum_id: forumId,
      content,
      class_id: classId,
    });
    setPosting(false);
    if (!res.success) {
      toast.error(res.error?.message || "Não consegui publicar.");
      return;
    }
    setComposer("");
    toast.success("Publicado!");
    load();
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Composer */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "white", border: "1px solid var(--rayo-sand-300)" }}>
        <div className="flex gap-2 items-start">
          <Avatar className="w-9 h-9">
            {userData?.avatar_url && <AvatarImage src={userData.avatar_url} />}
            <AvatarFallback>{(userData?.name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <Textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            placeholder="Compartilhe algo com a turma…"
            rows={2}
            className="flex-1 resize-none"
            maxLength={2000}
          />
        </div>
        <div className="flex items-center justify-between">
          {forums.length > 1 ? (
            <select
              value={forumId ?? ""}
              onChange={(e) => setForumId(parseInt(e.target.value, 10))}
              className="text-sm px-2 py-1 rounded border"
              style={{ borderColor: "var(--rayo-sand-300)" }}
            >
              {forums.map((f) => (
                <option key={f.id} value={f.id}>
                  c/{f.slug}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-muted-foreground">
              {forums[0] ? `Publicando em c/${forums[0].slug}` : "Inscreva-se em uma comunidade primeiro"}
            </span>
          )}
          <Button size="sm" onClick={submit} disabled={posting || !composer.trim() || !forumId}>
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--rayo-terra-500)" }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Ainda não há publicações dessa turma. Seja o primeiro!
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <article
              key={p.id}
              className="rounded-xl p-3"
              style={{ background: "white", border: "1px solid var(--rayo-sand-300)" }}
            >
              <header className="flex items-center gap-2 mb-2">
                <Avatar className="w-7 h-7">
                  {p.author_avatar && <AvatarImage src={p.author_avatar} />}
                  <AvatarFallback>{p.author_name.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-medium">{p.author_name}</div>
                  <div className="text-xs text-muted-foreground">
                    em c/{p.forum_slug} · {new Date(p.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              </header>
              {p.title && <h3 className="font-bold mb-1">{p.title}</h3>}
              <p className="whitespace-pre-line text-sm">{p.content}</p>
              <footer className="flex gap-3 text-xs text-muted-foreground mt-2">
                <span>♥ {p.like_count}</span>
                <span>💬 {p.comment_count}</span>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
