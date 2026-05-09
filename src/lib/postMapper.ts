// Task #99 — utilitário compartilhado pra evitar drift de shape entre o
// feed global da Comunidade (AppContext) e o feed escopado por turma
// (TurmaCommunityTab). Ambos consomem `/api/community/posts` e ambos
// renderizam via `PostCard`, que espera campos UI-friendly (author,
// avatar, time, likes, comments, shares, userReacted, isPinned…), não
// os snake_case crus do backend (author_name, like_count, …).

export interface APIPost {
  id: number;
  forum_id: number;
  class_id?: number | null;
  title: string | null;
  content: string;
  category: string;
  is_pinned: boolean;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  author_name: string;
  author_id: number;
  author_avatar?: string | null;
  forum_name?: string;
  forum_slug?: string;
  forum_icon?: string;
  images?: string[];
  image_refs?: string[];
  user_liked: boolean;
  is_saved?: boolean;
}

export interface MappedPost {
  id: number;
  author: string;
  avatar: string;
  time: string;
  content: string;
  category: string;
  likes: number;
  comments: number;
  shares: number;
  isPinned: boolean;
  userReacted: boolean;
  visibility: "comunidade";
  images: string[];
  image_refs: string[];
  forum_id?: number;
  forum_name?: string;
  forum_slug?: string;
  forum_icon?: string;
  author_id?: number;
  is_saved: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return date.toLocaleDateString("pt-BR");
}

export function mapAPIPost(p: APIPost): MappedPost {
  return {
    id: p.id,
    author: p.author_name || "Anônimo",
    avatar: p.author_avatar || "/placeholder-avatar.jpg",
    time: formatRelativeTime(p.created_at),
    content: p.content,
    category: p.category || "",
    likes: p.like_count ?? 0,
    comments: p.comment_count ?? 0,
    shares: p.share_count ?? 0,
    isPinned: !!p.is_pinned,
    userReacted: !!p.user_liked,
    visibility: "comunidade",
    images: Array.isArray(p.images) ? p.images : [],
    image_refs: Array.isArray(p.image_refs) ? p.image_refs : [],
    forum_id: p.forum_id,
    forum_name: p.forum_name,
    forum_slug: p.forum_slug,
    forum_icon: p.forum_icon,
    author_id: p.author_id,
    is_saved: !!p.is_saved,
  };
}
