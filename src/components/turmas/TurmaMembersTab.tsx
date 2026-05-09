import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Shield, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";

interface Member {
  id: number;
  name: string;
  avatar_url: string | null;
  role: "client" | "producer" | "moderator" | "admin" | string;
  enrolled_at: string;
  progress_percentage: number | null;
  completed: boolean;
  karma: number;
}

interface MembersResponse {
  members: Member[];
  total: number;
  page: number;
  totalPages: number;
}

function roleLabel(role: string): { label: string; tone: "neutral" | "moderator" | "admin" } | null {
  if (role === "admin") return { label: "Admin", tone: "admin" };
  if (role === "moderator") return { label: "Moderador", tone: "moderator" };
  if (role === "producer") return { label: "Produtor", tone: "moderator" };
  return null;
}

export function TurmaMembersTab({ classId }: { classId: number }) {
  const [data, setData] = useState<MembersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    api.get<MembersResponse>(`/api/turmas/${classId}/members?limit=100`).then((res) => {
      if (cancel) return;
      if (!res.success || !res.data) {
        setError(res.error?.message || "Não consegui carregar a lista.");
      } else {
        setData(res.data);
      }
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--rayo-terra-500)" }} />
      </div>
    );
  }
  if (error) {
    return <div className="text-center py-12 text-muted-foreground">{error}</div>;
  }
  if (!data || data.members.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Nenhum membro ainda.</div>;
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="text-sm text-muted-foreground">
        {data.total} {data.total === 1 ? "membro" : "membros"} nessa turma
      </div>
      <ul className="grid sm:grid-cols-2 gap-2">
        {data.members.map((m) => {
          const tag = roleLabel(m.role);
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "white", border: "1px solid var(--rayo-sand-300)" }}
            >
              <Avatar className="w-10 h-10">
                {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                <AvatarFallback>{m.name.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{m.name}</span>
                  {tag && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase tracking-wide"
                      style={
                        tag.tone === "admin"
                          ? { background: "var(--rayo-terra-100)", color: "var(--rayo-terra-700)" }
                          : { background: "var(--rayo-sage-100)", color: "var(--rayo-sage-700)" }
                      }
                    >
                      {tag.tone === "admin" ? <Shield className="w-3 h-3 mr-1 inline" /> : null}
                      {tag.label}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {m.karma} karma
                  </span>
                  <span>·</span>
                  <span>Entrou em {new Date(m.enrolled_at).toLocaleDateString("pt-BR")}</span>
                  {m.progress_percentage != null && (
                    <>
                      <span>·</span>
                      <span>{Math.round(m.progress_percentage)}% concluído</span>
                    </>
                  )}
                </div>
              </div>
              {m.completed && (
                <CheckCircle2
                  className="w-5 h-5"
                  style={{ color: "var(--rayo-terra-500)" }}
                  aria-label="Concluiu a turma"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
