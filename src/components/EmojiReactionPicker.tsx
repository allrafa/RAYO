import { useState, useCallback } from "react";
import { SmilePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { api } from "../lib/api";
import { enhancedToast } from "./EnhancedToast";

// Task #122 — set fechado de 6 emojis. Espelha `ALLOWED_REACTION_EMOJIS`
// no backend (server/features/community/service.ts). Ordem importa pra UI:
// é a mesma exibida no picker.
export const REACTION_EMOJIS = ["❤️", "😂", "🙏", "💡", "🔥", "👏"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface ReactionAggregate {
  emoji: string;
  count: number;
}

interface EmojiReactionPickerProps {
  // Identifica o alvo. O componente faz POST no endpoint correto
  // (`/api/community/posts|comments/:id/reactions` ou
  // `/api/messages/:id/reactions` para DM — Task #148) sozinho.
  targetType: "post" | "comment" | "message";
  targetId: number;
  reactions: ReactionAggregate[];
  userReaction: string | null;
  // Callback otimista — pai atualiza o estado local imediatamente. Em caso
  // de erro a reverter, o componente expõe o resultado real do servidor.
  onChange: (next: { reactions: ReactionAggregate[]; userReaction: string | null }) => void;
  // Estilo: "full" mostra picker + barra de chips agregada (uso em PostCard);
  // "compact" mostra só barra de chips inline (uso em comentários/DM).
  variant?: "full" | "compact";
  className?: string;
  // Controle externo opcional do popover — usado em DM (Task #148) pra
  // abrir via long-press na bolha. Se omitido, o componente gerencia
  // o estado internamente.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Esconde o botão "+" que abre o picker (mantendo só os chips
  // agregados). Em DM o trigger é a própria bolha (long-press / hover).
  hideTrigger?: boolean;
}

function totalReactionCount(reactions: ReactionAggregate[]): number {
  return reactions.reduce((acc, r) => acc + r.count, 0);
}

export function EmojiReactionPicker({
  targetType,
  targetId,
  reactions,
  userReaction,
  onChange,
  variant = "full",
  className = "",
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: EmojiReactionPickerProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenInternal(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );
  const [busy, setBusy] = useState(false);

  const send = useCallback(
    async (emoji: string) => {
      if (busy) return;
      setBusy(true);
      try {
        if ("vibrate" in navigator) navigator.vibrate(15);
        const url =
          targetType === "post"
            ? `/api/community/posts/${targetId}/reactions`
            : targetType === "comment"
              ? `/api/community/comments/${targetId}/reactions`
              : `/api/messages/${targetId}/reactions`;
        const res = await api.post<{
          reactions: ReactionAggregate[];
          user_reaction: string | null;
        }>(url, { emoji });
        if (res.success && res.data) {
          onChange({
            reactions: res.data.reactions,
            userReaction: res.data.user_reaction,
          });
        } else {
          enhancedToast.error({
            title: "Falha ao reagir",
            description: res.error?.message || "Tente novamente",
            haptic: true,
          });
        }
      } finally {
        setBusy(false);
        setOpen(false);
      }
    },
    [busy, onChange, targetId, targetType],
  );

  // Chips agregados — sempre que houver pelo menos 1 reação. Cada chip
  // é clicável: tap aplica/troca/remove a reação correspondente.
  const Chips = (
    <div className="flex flex-wrap items-center gap-1">
      {reactions.map((r) => {
        const mine = userReaction === r.emoji;
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => send(r.emoji)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] transition-colors"
            style={{
              border: `1px solid ${mine ? "var(--rayo-terra-500)" : "var(--rayo-sand-300)"}`,
              background: mine ? "var(--rayo-terra-100)" : "var(--rayo-sand-50)",
              color: mine ? "var(--rayo-terra-500)" : "var(--rayo-ink-700)",
              fontWeight: mine ? 600 : 500,
            }}
            aria-pressed={mine}
            aria-label={`${mine ? "Remover" : "Adicionar"} reação ${r.emoji}`}
          >
            <span aria-hidden="true">{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        );
      })}
    </div>
  );

  if (variant === "compact") {
    // Modo inline (comentários/DM): chips + (opcional) botão "+" pra abrir
    // o picker. Em DM (`hideTrigger`) o trigger é a própria bolha — o picker
    // é controlado externamente via prop `open`.
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {reactions.length > 0 && Chips}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {hideTrigger ? (
              // Âncora invisível pra o Popover se posicionar — ainda no fluxo
              // do DOM, sem ocupar espaço visual. O abrir/fechar vem do
              // controle externo (`open` prop).
              <span aria-hidden="true" className="sr-only" tabIndex={-1} />
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[12px] transition-colors hover:bg-black/5"
                style={{ color: "var(--rayo-ink-400)" }}
                aria-label="Reagir ao comentário"
                disabled={busy}
              >
                <SmilePlus className="w-3.5 h-3.5" />
              </button>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1.5 bg-card/95 backdrop-blur-sm" align="start" side="top">
            <div className="flex gap-1">
              {REACTION_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => send(e)}
                  disabled={busy}
                  className={`w-9 h-9 rounded-md text-xl transition-transform hover:scale-110 ${
                    userReaction === e ? "bg-[var(--rayo-terra-100)]" : ""
                  }`}
                  aria-label={`Reagir com ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Modo "full" (PostCard) — botão único que mostra reação do usuário (ou
  // "Reagir") + total. Ao tocar abre o picker. Os chips agregados são
  // renderizados ABAIXO da action row pelo PostCard (não aqui), pra não
  // poluir o alinhamento horizontal das ações.
  const total = totalReactionCount(reactions);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-2 transition-all duration-200 ${className}`}
          style={{
            color: userReaction ? "var(--rayo-terra-500)" : "var(--rayo-ink-400)",
          }}
          aria-label={userReaction ? `Reação atual: ${userReaction}` : "Reagir ao post"}
          disabled={busy}
        >
          {userReaction ? (
            <span className="text-base">{userReaction}</span>
          ) : (
            <SmilePlus className="w-4 h-4" />
          )}
          <span className="text-[13px]" style={{ fontWeight: 500 }}>
            {total > 0 ? total : ""}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2 bg-card/95 backdrop-blur-sm border shadow-lg"
        align="start"
        side="top"
      >
        <div className="flex gap-1">
          {REACTION_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => send(e)}
              disabled={busy}
              className={`w-11 h-11 rounded-lg text-2xl transition-transform hover:scale-110 ${
                userReaction === e ? "bg-[var(--rayo-terra-100)]" : "hover:bg-accent/50"
              }`}
              aria-label={`Reagir com ${e}`}
              title={e}
            >
              {e}
            </button>
          ))}
        </div>
        {userReaction && (
          <p className="mt-2 pt-2 border-t text-center text-[11px]" style={{ color: "var(--rayo-ink-400)" }}>
            Toque no mesmo emoji para remover
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Barra agregada standalone — usada no PostCard logo abaixo da action row
// quando há reações. Compartilha o mesmo onChange do picker.
export function ReactionsSummary(props: {
  targetType: "post" | "comment";
  targetId: number;
  reactions: ReactionAggregate[];
  userReaction: string | null;
  onChange: (next: { reactions: ReactionAggregate[]; userReaction: string | null }) => void;
}) {
  if (props.reactions.length === 0) return null;
  return (
    <EmojiReactionPicker
      {...props}
      variant="compact"
      className="mt-2"
    />
  );
}
