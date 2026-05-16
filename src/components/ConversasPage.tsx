import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MessageCircle, MessageSquarePlus, Search, MoreVertical, Send, ArrowLeft, Loader2,
  Check, CheckCheck, Archive, Trash2, ArchiveRestore, Image as ImageIcon,
  Mic, Square, X, Paperclip, SmilePlus,
} from "lucide-react";
import { EmojiReactionPicker, type ReactionAggregate } from "./EmojiReactionPicker";
import { AudioBubble } from "./AudioBubble";
import { motion, type PanInfo } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useAuth } from "./AuthContext";
import { toast } from "sonner@2.0.3";
import { api } from "../lib/api";
import { EmptyStateNoConversations, EmptyStateError } from "./EmptyState";
import { SkeletonLoader } from "./SkeletonLoader";
import { useUnreadMessages, type MessageStreamEvent } from "./hooks/useUnreadMessages";
import { onScrollTop } from "../lib/scrollTop";
import { useAutofocusOnDesktop } from "../lib/useAutofocusOnDesktop";
import { annotateMessages, isOnlyEmoji } from "../lib/messageGrouping";
import { emitWithAck } from "../lib/realtime/socket";

type MessageKind = "text" | "image" | "audio";

interface ConversationItem {
  id: number;
  user_a_id: number;
  user_b_id: number;
  last_message_at: string;
  created_at: string;
  other_user_id: number;
  other_user_name: string;
  other_user_avatar_url: string | null;
  last_message_kind: MessageKind | null;
  last_message_content: string | null;
  last_message_sender_id: number | null;
  last_message_created_at: string | null;
  last_message_meta: Record<string, unknown> | null;
  unread_count: number;
  archived_at: string | null;
}

interface MessageItem {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  kind: MessageKind;
  content: string;
  attachment_url: string | null;
  attachment_meta: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  reactions: ReactionAggregate[];
  user_reaction: string | null;
}

// Task #148 — wrapper para long-press (mobile) / hover (desktop) que abre
// o picker de reações ancorado na bolha. Os chips agregados aparecem
// logo abaixo. Reusa a paleta `REACTION_EMOJIS` da Comunidade.
const LONG_PRESS_MS = 450;

interface MessageReactionsControlProps {
  messageId: number;
  mine: boolean;
  reactions: ReactionAggregate[];
  userReaction: string | null;
  onChange: (next: { reactions: ReactionAggregate[]; userReaction: string | null }) => void;
  children: ReactNode;
}

function MessageReactionsControl({
  messageId, mine, reactions, userReaction, onChange, children,
}: MessageReactionsControlProps) {
  const [open, setOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPressing(false);
  }, []);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Só ativa long-press em toque/caneta — desktop usa hover.
    if (e.pointerType === "mouse") return;
    longPressFiredRef.current = false;
    setPressing(true);
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      if ("vibrate" in navigator) navigator.vibrate(20);
      setOpen(true);
      setPressing(false);
    }, LONG_PRESS_MS);
  };
  const handlePointerEnd = () => clearLongPress();
  const handleClickCapture = (e: React.MouseEvent) => {
    // Se long-press disparou, suprime o click "tap" subsequente
    // (que abriria lightbox / play do áudio sem querer).
    if (longPressFiredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressFiredRef.current = false;
    }
  };

  return (
    <div className={`ra-chat-bubble-wrap ${mine ? "mine" : ""} ${pressing ? "pressing" : ""}`}>
      <button
        type="button"
        className="ra-chat-react-trigger"
        aria-label="Reagir à mensagem"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <SmilePlus className="w-3.5 h-3.5" />
      </button>
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onClickCapture={handleClickCapture}
        onContextMenu={(e) => {
          // Long-press no Android dispara contextmenu — bloqueia o menu nativo
          // pra deixar o picker tomar conta.
          if (open || pressing) e.preventDefault();
        }}
      >
        {children}
      </div>
      {/* Picker + chips agregados — reusa o EmojiReactionPicker da Comunidade
          (Task #122) com targetType="message". Controle externo de `open`
          permite abrir via long-press na bolha; trigger interno fica
          escondido (`hideTrigger`) porque a UI de abrir é a própria bolha. */}
      <div className={`ra-chat-reactions-wrap ${mine ? "justify-end" : "justify-start"}`}>
        <EmojiReactionPicker
          targetType="message"
          targetId={messageId}
          reactions={reactions}
          userReaction={userReaction}
          onChange={onChange}
          variant="compact"
          hideTrigger
          open={open}
          onOpenChange={setOpen}
        />
      </div>
    </div>
  );
}

interface UserSearchResult {
  id: number;
  name: string;
  avatar_url: string | null;
}

const CONVERSATION_FALLBACK_POLL_MS = 60_000;
const MESSAGES_FALLBACK_POLL_MS = 30_000;
const SWIPE_THRESHOLD = 80;
const RECORD_MAX_SEC = 120;

function getInitials(name: string): string {
  return (name || "?").trim().slice(0, 2).toUpperCase();
}
function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d);
}
function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("pt-BR");
}
function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
function previewFor(conv: ConversationItem, currentUserId: number): string {
  const isMine = conv.last_message_sender_id === currentUserId;
  const prefix = isMine ? "Você: " : "";
  if (!conv.last_message_kind && !conv.last_message_content) return "Comece a conversa...";
  if (conv.last_message_kind === "image") return `${prefix}📷 Foto`;
  if (conv.last_message_kind === "audio") {
    const dur = (conv.last_message_meta as { duration_sec?: number } | null)?.duration_sec;
    return typeof dur === "number"
      ? `${prefix}🎤 Áudio (${formatDuration(dur)})`
      : `${prefix}🎤 Mensagem de áudio`;
  }
  return prefix + (conv.last_message_content || "");
}

interface SwipeRowProps {
  conv: ConversationItem;
  isActive: boolean;
  isArchivedView: boolean;
  currentUserId: number;
  typingHint?: string | null;
  onOpen: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
}

// Menu desktop por item (hover/click no "..."), independente do swipe
// (que continua sendo o caminho mobile).
function ConversationItemMenu({ isArchivedView, onArchiveToggle, onDelete }: {
  isArchivedView: boolean;
  onArchiveToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 bg-card/80 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
            aria-label="Mais ações"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchiveToggle(); }}>
            {isArchivedView
              ? <><ArchiveRestore className="w-4 h-4 mr-2" /> Desarquivar</>
              : <><Archive className="w-4 h-4 mr-2" /> Arquivar</>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Excluir conversa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SwipeRow({ conv, isActive, isArchivedView, currentUserId, typingHint, onOpen, onArchiveToggle, onDelete }: SwipeRowProps) {
  // Spec Task #79:
  //  ← swipe à esquerda  → revela "Arquivar" (lado direito do card)
  //  → swipe à direita   → revela "Excluir"  (lado esquerdo do card)
  const [revealed, setRevealed] = useState<"none" | "archive" | "delete">("none");

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setRevealed("archive");
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      setRevealed("delete");
    } else {
      setRevealed("none");
    }
  };

  // x positivo = card desliza pra direita expondo o lado esquerdo (delete).
  // x negativo = card desliza pra esquerda expondo o lado direito (archive).
  const x = revealed === "archive" ? -96 : revealed === "delete" ? 96 : 0;

  return (
    <div className="group relative overflow-hidden rounded-lg">
      {/* Lado esquerdo do card → revelado ao arrastar pra direita: EXCLUIR */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pr-2 bg-destructive text-destructive-foreground">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); setRevealed("none"); }}
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs"
          aria-label="Excluir conversa"
        >
          <Trash2 className="w-5 h-5" />
          <span>Excluir</span>
        </button>
      </div>
      {/* Lado direito do card → revelado ao arrastar pra esquerda: ARQUIVAR */}
      <div className="absolute inset-y-0 right-0 flex items-center pl-2 pr-4 bg-amber-500/90 text-white">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onArchiveToggle(); setRevealed("none"); }}
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs"
          aria-label={isArchivedView ? "Desarquivar conversa" : "Arquivar conversa"}
        >
          {isArchivedView ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
          <span>{isArchivedView ? "Desarquivar" : "Arquivar"}</span>
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -96, right: 96 }}
        dragElastic={0.15}
        animate={{ x }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        onDragEnd={handleDragEnd}
        className="relative bg-card touch-pan-y"
      >
        <ConversationItemMenu
          isArchivedView={isArchivedView}
          onArchiveToggle={() => { onArchiveToggle(); setRevealed("none"); }}
          onDelete={() => { onDelete(); setRevealed("none"); }}
        />
        <button
          type="button"
          onClick={() => { if (revealed !== "none") { setRevealed("none"); return; } onOpen(); }}
          className={`ra-disc-item w-full ${isActive ? "active" : ""}`}
        >
          <Avatar className="ra-disc-avatar terra w-12 h-12">
            {conv.other_user_avatar_url && (
              <AvatarImage src={conv.other_user_avatar_url} alt={conv.other_user_name} />
            )}
            <AvatarFallback>{getInitials(conv.other_user_name)}</AvatarFallback>
          </Avatar>
          <div className="ra-disc-body">
            <div className="flex items-center justify-between gap-2">
              <h3 className="ra-disc-title">{conv.other_user_name}</h3>
              {conv.last_message_created_at && (
                <span className="ra-disc-meta shrink-0">
                  {formatRelative(conv.last_message_created_at)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              {typingHint ? (
                <p className="ra-disc-snippet italic text-primary" aria-live="polite">{typingHint}</p>
              ) : (
                <p className="ra-disc-snippet">{previewFor(conv, currentUserId)}</p>
              )}
              {conv.unread_count > 0 && (
                <Badge className="ml-2 shrink-0">{conv.unread_count}</Badge>
              )}
            </div>
          </div>
        </button>
      </motion.div>
    </div>
  );
}

interface PendingAttachment {
  kind: "image" | "audio";
  attachment_url: string;
  attachment_meta: Record<string, unknown>;
  previewUrl: string;
  durationSec?: number;
}

export function ConversasPage() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? 0;
  const { subscribe: subscribeStream, streamConnected } = useUnreadMessages();

  // Lista única (estilo WhatsApp): conversas ativas + seção colapsada
  // "Arquivadas (N)". Carregamos os dois escopos em paralelo e exibimos
  // os arquivados num accordion no fim da lista.
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<ConversationItem[]>([]);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  // Task #179 — activeId é DERIVADO da URL `/conversas/:id`. Sem isso,
  // refresh dentro de uma conversa caía na inbox vazia e share do link
  // não funcionava. `setActiveId(x)` foi mantido como API (mesma
  // assinatura) mas por baixo navega — todos os ~10 callsites
  // existentes (handleStartConversation, openConversationFromArchived,
  // SwipeRow.onOpen, header back, handleDeleteConfirm, onScrollTop,
  // etc) continuam funcionando sem precisar tocar neles. Back/forward
  // do navegador fechar a conversa funciona de graça.
  const dmLocation = useLocation();
  const dmNavigate = useNavigate();
  const dmConvMatch = dmLocation.pathname.match(/^\/conversas\/(\d+)\/?$/);
  const activeId = dmConvMatch ? Number(dmConvMatch[1]) : null;
  const setActiveId = useCallback(
    (id: number | null) => {
      if (id == null) dmNavigate("/conversas");
      else dmNavigate(`/conversas/${id}`);
    },
    [dmNavigate],
  );
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordTickRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showNewConvDialog, setShowNewConvDialog] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<ConversationItem | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  // IDs de mensagens cuja imagem falhou ao carregar — evita innerHTML
  // direto e mantém a renderização 100% controlada pelo React.
  const [imgErrorIds, setImgErrorIds] = useState<Set<number>>(new Set());
  const markImgError = useCallback((id: number) => {
    setImgErrorIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const [typingByConv, setTypingByConv] = useState<Record<number, { user_id: number; expiresAt: number }>>({});
  const [listeningByConv, setListeningByConv] = useState<Record<number, { user_id: number; expiresAt: number }>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Task #117 — autofocus desktop no input de mensagem ao abrir uma
  // conversa (matchMedia pointer:fine pra não roubar o foco no mobile,
  // que abriria teclado virtual sem necessidade).
  const messageInputRef = useRef<HTMLInputElement>(null);
  useAutofocusOnDesktop(messageInputRef, activeId != null);
  const lastMessageIdRef = useRef<number | null>(null);
  const activeIdRef = useRef<number | null>(null);
  const streamConnectedRef = useRef(false);
  const lastTypingSentAtRef = useRef<number>(0);
  const typingExpiryTimersRef = useRef<Map<number, number>>(new Map());
  const lastListeningSentAtRef = useRef<Map<number, number>>(new Map());
  const listeningExpiryTimersRef = useRef<Map<number, number>>(new Map());

  const activeConversation = useMemo(
    () =>
      conversations.find((c) => c.id === activeId) ||
      archivedConversations.find((c) => c.id === activeId) ||
      null,
    [conversations, archivedConversations, activeId]
  );

  const loadConversations = useCallback(async () => {
    const [activeRes, archivedRes] = await Promise.all([
      api.get<{ conversations: ConversationItem[] }>(`/api/messages/conversations?scope=active`),
      api.get<{ conversations: ConversationItem[] }>(`/api/messages/conversations?scope=archived`),
    ]);
    if (activeRes.success && activeRes.data) {
      setConversations(activeRes.data.conversations);
      setConversationsError(null);
    } else if (activeRes.error) {
      setConversationsError(activeRes.error.message);
    }
    if (archivedRes.success && archivedRes.data) {
      setArchivedConversations(archivedRes.data.conversations);
    }
    setConversationsLoading(false);
  }, []);

  const loadMessages = useCallback(async (conversationId: number, silent = false): Promise<{ hasNewIncoming: boolean }> => {
    if (!silent) {
      setMessagesLoading(true);
      setMessagesError(null);
    }
    const res = await api.get<{ messages: MessageItem[] }>(
      `/api/messages/conversations/${conversationId}/messages?limit=100`
    );
    let hasNewIncoming = false;
    if (res.success && res.data) {
      const newestMsg = res.data.messages[res.data.messages.length - 1];
      const newest = newestMsg?.id ?? null;
      const prevNewest = lastMessageIdRef.current;
      setMessages(res.data.messages);
      lastMessageIdRef.current = newest;
      hasNewIncoming =
        newest !== null && newest !== prevNewest && !!newestMsg && newestMsg.sender_id !== currentUserId;
      if (!silent || (newest !== null && newest !== prevNewest)) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: silent ? "smooth" : "auto" });
        });
      }
    } else if (res.error && !silent) {
      setMessagesError(res.error.message);
    }
    if (!silent) setMessagesLoading(false);
    return { hasNewIncoming };
  }, [currentUserId]);

  const markRead = useCallback(async (conversationId: number) => {
    // Task #222 — Socket-first com fallback REST. O servidor (handler
    // `message:read` em server/realtime/io.ts) delega pra
    // markConversationRead, que dispara `message:read` + `unread:changed`
    // pelos transportes ativos — UI converge via broadcast. Otimismo
    // local: zera badge da conversa imediatamente.
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );
    const ok = await emitWithAck("message:read", { conversation_id: conversationId });
    if (!ok) {
      // Fallback REST: socket desligado (SOCKET_IO_ENABLED=false) ou sem ack em 2s.
      await api.post<{ marked: number }>(`/api/messages/conversations/${conversationId}/read`);
    }
  }, []);

  useEffect(() => {
    return () => {
      for (const handle of typingExpiryTimersRef.current.values()) {
        window.clearTimeout(handle);
      }
      typingExpiryTimersRef.current.clear();
      for (const handle of listeningExpiryTimersRef.current.values()) {
        window.clearTimeout(handle);
      }
      listeningExpiryTimersRef.current.clear();
      lastListeningSentAtRef.current.clear();
      if (recordTickRef.current) window.clearInterval(recordTickRef.current);
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== "inactive") {
        try { rec.stop(); } catch { /* */ }
        rec.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // Task #123 — quando uma conversa está aberta no mobile, marca o
  // body com `rayo-dm-conversation-open` pra esconder a bottom nav
  // (CSS em globals.css). Sem isso a nav fica por cima do composer
  // OU empurra o composer pra fora da viewport visível no iOS.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const cls = "rayo-dm-conversation-open";
    if (activeId != null) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
    return () => document.body.classList.remove(cls);
  }, [activeId]);

  // Task #144 — enquanto ConversasPage está montada (com ou sem conversa
  // aberta), marca body com `rayo-dm-page` pra neutralizar paddings do
  // <main> que faziam a janela inteira rolar fora da viewport. Sem isso,
  // mesmo no estado lista-only, main.navbar-bottom-spacing (mobile) e
  // main.desktop-layout* (desktop) mantinham padding-bottom que somava
  // com o shell de 100dvh e empurrava a página pra rolar.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const cls = "rayo-dm-page";
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, []);
  useEffect(() => { streamConnectedRef.current = streamConnected; }, [streamConnected]);

  // Task #115 — re-tap na aba Mensagens fecha a conversa aberta (quando
  // houver), devolvendo o usuário à lista de conversas. Sem isso o
  // re-tap parece inerte porque o chat ocupa a tela inteira no mobile.
  useEffect(() => {
    return onScrollTop(() => {
      if (activeIdRef.current != null) setActiveId(null);
    }, "conversas");
  }, []);

  // Task #179 — Stash legado `rayo-pending-conversation`/
  // `raio-pending-conversation` foi consumido por SPAs antigos. Como
  // /conversas/:id agora é rota persistente, novos callsites navegam
  // direto pela URL. Mantemos o consumo do stash legado por uma janela
  // de transição (cobre tabs abertas com SPA pré-#179) — convertemos
  // pra navigate em vez de setState direto.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const pending =
        sessionStorage.getItem("rayo-pending-conversation") ??
        sessionStorage.getItem("raio-pending-conversation");
      if (pending) {
        sessionStorage.removeItem("rayo-pending-conversation");
        sessionStorage.removeItem("raio-pending-conversation");
        const id = Number.parseInt(pending, 10);
        if (Number.isFinite(id) && id > 0) {
          dmNavigate(`/conversas/${id}`, { replace: true });
        }
      }
    } catch { /* ignore */ }
  }, [dmNavigate]);

  useEffect(() => {
    setConversationsLoading(true);
    void loadConversations();
    const interval = window.setInterval(() => {
      if (streamConnectedRef.current) return;
      if (document.visibilityState === "visible") void loadConversations();
    }, CONVERSATION_FALLBACK_POLL_MS);
    return () => window.clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    lastTypingSentAtRef.current = 0;
    if (activeId == null) {
      setMessages([]);
      lastMessageIdRef.current = null;
      return;
    }
    void loadMessages(activeId, false).then(() => void markRead(activeId));
    const interval = window.setInterval(() => {
      if (streamConnectedRef.current) return;
      if (document.visibilityState !== "visible") return;
      void loadMessages(activeId, true).then(({ hasNewIncoming }) => {
        if (hasNewIncoming) void markRead(activeId);
      });
    }, MESSAGES_FALLBACK_POLL_MS);
    return () => window.clearInterval(interval);
  }, [activeId, loadMessages, markRead]);

  useEffect(() => {
    const unsubscribe = subscribeStream((event: MessageStreamEvent) => {
      if (event.type === "connected") {
        void loadConversations();
        const openId = activeIdRef.current;
        if (openId != null) {
          void loadMessages(openId, true).then(({ hasNewIncoming }) => {
            if (hasNewIncoming) void markRead(openId);
          });
        }
        return;
      }
      if (event.type === "message:read") {
        const { conversation_id, message_ids, read_at } = event.payload;
        if (activeIdRef.current === conversation_id) {
          const idSet = new Set(message_ids);
          setMessages((prev) =>
            prev.map((m) =>
              m.sender_id === currentUserId && m.read_at == null && (idSet.size === 0 || idSet.has(m.id))
                ? { ...m, read_at } : m
            )
          );
        }
        return;
      }
      if (event.type === "typing") {
        const { conversation_id, user_id } = event.payload;
        if (user_id === currentUserId) return;
        const expiresAt = Date.now() + 4500;
        setTypingByConv((prev) => ({ ...prev, [conversation_id]: { user_id, expiresAt } }));
        const timers = typingExpiryTimersRef.current;
        const existing = timers.get(conversation_id);
        if (existing) window.clearTimeout(existing);
        const handle = window.setTimeout(() => {
          setTypingByConv((prev) => {
            const cur = prev[conversation_id];
            if (!cur || cur.expiresAt > Date.now()) return prev;
            const next = { ...prev };
            delete next[conversation_id];
            return next;
          });
          timers.delete(conversation_id);
        }, 4600);
        timers.set(conversation_id, handle);
        return;
      }
      if (event.type === "listening") {
        const { conversation_id, user_id } = event.payload;
        if (user_id === currentUserId) return;
        const expiresAt = Date.now() + 6500;
        setListeningByConv((prev) => ({ ...prev, [conversation_id]: { user_id, expiresAt } }));
        const timers = listeningExpiryTimersRef.current;
        const existing = timers.get(conversation_id);
        if (existing) window.clearTimeout(existing);
        const handle = window.setTimeout(() => {
          setListeningByConv((prev) => {
            const cur = prev[conversation_id];
            if (!cur || cur.expiresAt > Date.now()) return prev;
            const next = { ...prev };
            delete next[conversation_id];
            return next;
          });
          timers.delete(conversation_id);
        }, 6600);
        timers.set(conversation_id, handle);
        return;
      }
      if (event.type === "message:reaction") {
        const { conversation_id, message_id, reactions } = event.payload;
        if (activeIdRef.current !== conversation_id) return;
        setMessages((prev) => prev.map((m) => {
          if (m.id !== message_id) return m;
          // O payload do socket é compartilhado entre os dois lados — só carrega o
          // agregado, não o `user_reaction` per-tab. Reconciliamos local:
          // se o emoji que eu reagi não está mais no agregado (outra aba minha
          // removeu / autor moderou), limpa minha reação. Caso contrário,
          // mantém — o servidor é a fonte da verdade pro próximo fetch /
          // toggle.
          const stillThere = m.user_reaction
            ? reactions.some((r) => r.emoji === m.user_reaction)
            : false;
          return {
            ...m,
            reactions,
            user_reaction: stillThere ? m.user_reaction : null,
          };
        }));
        return;
      }
      if (event.type === "message:new") {
        const { conversation_id, message } = event.payload as { conversation_id: number; message: MessageItem };
        if (message.sender_id !== currentUserId) {
          setTypingByConv((prev) => {
            if (!prev[conversation_id]) return prev;
            const next = { ...prev };
            delete next[conversation_id];
            return next;
          });
          const timer = typingExpiryTimersRef.current.get(conversation_id);
          if (timer) {
            window.clearTimeout(timer);
            typingExpiryTimersRef.current.delete(conversation_id);
          }
        }
        const openId = activeIdRef.current;
        if (openId === conversation_id) {
          setMessages((prev) => prev.some((m) => m.id === message.id) ? prev : [...prev, message]);
          lastMessageIdRef.current = message.id;
          if (message.sender_id !== currentUserId) {
            requestAnimationFrame(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            });
            void markRead(conversation_id);
          }
        }
        void loadConversations();
      }
    });
    return unsubscribe;
  }, [subscribeStream, currentUserId, loadConversations, loadMessages, markRead]);

  // User search debounce
  useEffect(() => {
    if (!showNewConvDialog) return;
    const q = userSearchQuery.trim();
    if (q.length < 2) { setUserSearchResults([]); return; }
    setUserSearching(true);
    const handle = window.setTimeout(async () => {
      const res = await api.get<{ users: UserSearchResult[] }>(
        `/api/messages/users/search?q=${encodeURIComponent(q)}`
      );
      if (res.success && res.data) setUserSearchResults(res.data.users);
      else setUserSearchResults([]);
      setUserSearching(false);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [userSearchQuery, showNewConvDialog]);

  // Task #229 — typing/listening trafegam por Socket.IO (latência
  // bem menor que POST round-trip). Se o socket não estiver conectado
  // ou o servidor não der ack, cai pro POST tradicional como fallback
  // defensivo (SOCKET_IO_ENABLED=false etc).
  const sendTypingPing = useCallback((conversationId: number) => {
    const now = Date.now();
    if (now - lastTypingSentAtRef.current < 2000) return;
    lastTypingSentAtRef.current = now;
    // Task #222 — evento renomeado pra `message:typing` no Socket.IO.
    // Fallback POST permanece com a rota legada `/typing`.
    void emitWithAck("message:typing", { conversation_id: conversationId }).then((ok) => {
      if (!ok) void api.post(`/api/messages/conversations/${conversationId}/typing`);
    });
  }, []);

  const sendListeningPing = useCallback((conversationId: number, messageId: number) => {
    const now = Date.now();
    const last = lastListeningSentAtRef.current.get(messageId) ?? 0;
    if (now - last < 5000) return;
    lastListeningSentAtRef.current.set(messageId, now);
    void emitWithAck("dm:listening", { conversation_id: conversationId, message_id: messageId }).then((ok) => {
      if (!ok) void api.post(`/api/messages/conversations/${conversationId}/listening`, { message_id: messageId });
    });
  }, []);

  // ─────────── Anexos ───────────

  const uploadAttachment = async (file: File, kind: "image" | "audio", durationSec?: number) => {
    if (activeId == null) return;
    setUploadingAttachment(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/messages/conversations/${activeId}/attachments`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json?.data?.attachment) {
        throw new Error(json?.error?.message || "Falha ao enviar anexo");
      }
      const att = json.data.attachment as { kind: "image" | "audio"; attachment_url: string; attachment_meta: Record<string, unknown> };
      const previewUrl = URL.createObjectURL(file);
      setPendingAttachment({
        kind: att.kind,
        attachment_url: att.attachment_url,
        attachment_meta: { ...att.attachment_meta, ...(durationSec != null ? { duration_sec: durationSec } : {}) },
        previewUrl,
        durationSec,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar anexo");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handlePickPhoto = () => {
    if (activeId == null) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    await uploadAttachment(f, "image");
  };

  const cancelPendingAttachment = () => {
    if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
    setPendingAttachment(null);
  };

  // ─────────── Gravação de áudio ───────────

  const startRecording = async () => {
    if (activeId == null) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Gravação de áudio não disponível neste navegador");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferred.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m));
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      recordChunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        const durationSec = Math.round((Date.now() - recordStartRef.current) / 1000);
        const blob = new Blob(recordChunksRef.current, { type: rec.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (recordTickRef.current) {
          window.clearInterval(recordTickRef.current);
          recordTickRef.current = null;
        }
        setRecording(false);
        setRecordSec(0);
        if (blob.size === 0) return;
        const ext = (rec.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: blob.type });
        await uploadAttachment(file, "audio", durationSec);
      };
      recordStartRef.current = Date.now();
      setRecordSec(0);
      recordTickRef.current = window.setInterval(() => {
        const sec = Math.round((Date.now() - recordStartRef.current) / 1000);
        setRecordSec(sec);
        // Auto-stop ao bater no limite (server reforça em 120s).
        if (sec >= RECORD_MAX_SEC) {
          const r = mediaRecorderRef.current;
          if (r && r.state !== "inactive") {
            try { r.stop(); } catch { /* */ }
            toast.info("Gravação encerrada automaticamente em 2 minutos");
          }
        }
      }, 250);
      setRecording(true);
      rec.start();
    } catch {
      toast.error("Permissão de microfone negada");
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  };

  const cancelRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      recordChunksRef.current = [];
      try { rec.stop(); } catch { /* */ }
    }
    if (recordTickRef.current) {
      window.clearInterval(recordTickRef.current);
      recordTickRef.current = null;
    }
    setRecording(false);
    setRecordSec(0);
  };

  // ─────────── Enviar / Ações ───────────

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (activeId == null || sending) return;
    if (!pendingAttachment && !content) return;
    setSending(true);
    const body: Record<string, unknown> = pendingAttachment
      ? {
          kind: pendingAttachment.kind,
          content,
          attachment_url: pendingAttachment.attachment_url,
          attachment_meta: pendingAttachment.attachment_meta,
        }
      : { kind: "text", content };
    const res = await api.post<{ message: MessageItem }>(
      `/api/messages/conversations/${activeId}/messages`,
      body,
    );
    setSending(false);
    if (res.success && res.data) {
      setNewMessage("");
      cancelPendingAttachment();
      lastTypingSentAtRef.current = 0;
      const sent = res.data.message;
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      lastMessageIdRef.current = sent.id;
      requestAnimationFrame(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); });
      void loadConversations();
    } else if (res.error) {
      toast.error(res.error.message);
    }
  };

  const handleStartConversation = async (otherUserId: number) => {
    if (creatingConversation) return;
    setCreatingConversation(true);
    const res = await api.post<{ conversation: { id: number } }>(
      "/api/messages/conversations",
      { user_id: otherUserId }
    );
    setCreatingConversation(false);
    if (res.success && res.data) {
      const id = res.data.conversation.id;
      setShowNewConvDialog(false);
      setUserSearchQuery("");
      setUserSearchResults([]);
      await loadConversations();
      setActiveId(id);
      // Task #222 — Conversa nova: a sala `conversation:<id>` ainda
      // não existe no socket deste cliente (auto-join roda só no
      // connect). Pede join explícito pro servidor pra que eventos
      // de typing/listening cheguem nesta conversa imediatamente.
      // Mensagens (`message:new`) já vão pela `user:<id>` então não
      // dependem desse join.
      void emitWithAck("conversation:join", { conversation_id: id });
    } else if (res.error) {
      toast.error(res.error.message);
    }
  };

  const handleArchiveToggle = async (conv: ConversationItem) => {
    const archived = conv.archived_at == null;
    const res = await api.post<{ archived: boolean }>(
      `/api/messages/conversations/${conv.id}/archive`,
      { archived },
    );
    if (res.success) {
      // Move entre as duas listas em vez de remover.
      const stamped: ConversationItem = { ...conv, archived_at: archived ? new Date().toISOString() : null };
      if (archived) {
        setConversations((prev) => prev.filter((c) => c.id !== conv.id));
        setArchivedConversations((prev) => [stamped, ...prev.filter((c) => c.id !== conv.id)]);
      } else {
        setArchivedConversations((prev) => prev.filter((c) => c.id !== conv.id));
        setConversations((prev) => [stamped, ...prev.filter((c) => c.id !== conv.id)]);
      }
      toast.success(archived ? "Conversa arquivada" : "Conversa desarquivada");
    } else if (res.error) {
      toast.error(res.error.message);
    }
  };

  // Spec Task #79: clicar numa conversa arquivada DEVE desarquivar e abrir.
  const openConversationFromArchived = async (conv: ConversationItem) => {
    const res = await api.post<{ archived: boolean }>(
      `/api/messages/conversations/${conv.id}/archive`,
      { archived: false },
    );
    if (res.success) {
      const stamped: ConversationItem = { ...conv, archived_at: null };
      setArchivedConversations((prev) => prev.filter((c) => c.id !== conv.id));
      setConversations((prev) => [stamped, ...prev.filter((c) => c.id !== conv.id)]);
      setActiveId(conv.id);
    } else if (res.error) {
      toast.error(res.error.message);
    }
  };

  const handleDeleteConfirm = async () => {
    const conv = confirmDelete;
    if (!conv) return;
    setConfirmDelete(null);
    const res = await api.delete<{ deleted: boolean }>(`/api/messages/conversations/${conv.id}`);
    if (res.success) {
      setConversations((prev) => prev.filter((c) => c.id !== conv.id));
      setArchivedConversations((prev) => prev.filter((c) => c.id !== conv.id));
      if (activeId === conv.id) setActiveId(null);
      toast.success("Conversa excluída");
    } else if (res.error) {
      toast.error(res.error.message);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.other_user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredArchived = archivedConversations.filter((c) =>
    c.other_user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const composerDisabled = sending || uploadingAttachment;
  const canSend = !composerDisabled && (!!pendingAttachment || newMessage.trim().length > 0);

  return (
    <div
      className={`ra-page flex max-w-6xl mx-auto rayo-dm-shell ${activeId == null ? "rayo-dm-shell--list" : ""}`}
      style={{ background: 'var(--rayo-sand-100)' }}
    >
      {/* Lista de Conversas */}
      <div className={`${activeId != null ? "hidden md:block" : "block"} w-full md:w-1/3 border-r border-border bg-card flex flex-col min-h-0`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display font-bold">Mensagens</h1>
            <Dialog open={showNewConvDialog} onOpenChange={setShowNewConvDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <MessageSquarePlus className="w-4 h-4 mr-2" />
                  Nova
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Nova conversa</DialogTitle>
                  <DialogDescription className="font-body">
                    Procure por nome ou e-mail exato de outro usuário do RAYO
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome ou e-mail..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  <ScrollArea className="h-64">
                    {userSearching ? (
                      <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Procurando...
                      </div>
                    ) : userSearchQuery.trim().length < 2 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Digite ao menos 2 caracteres
                      </p>
                    ) : userSearchResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nenhum usuário encontrado
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {userSearchResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleStartConversation(u.id)}
                            disabled={creatingConversation}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent text-left disabled:opacity-50"
                          >
                            <Avatar className="w-8 h-8">
                              {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.name} />}
                              <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{u.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="p-4">
              <SkeletonLoader type="list" count={4} />
            </div>
          ) : conversationsError ? (
            <EmptyStateError onRetry={() => { setConversationsLoading(true); void loadConversations(); }} />
          ) : filteredConversations.length === 0 && filteredArchived.length === 0 ? (
            <EmptyStateNoConversations onStart={() => setShowNewConvDialog(true)} />
          ) : (
            <div className="ra-disc-list p-3 space-y-1">
              {filteredConversations.map((conv) => {
                const t = typingByConv[conv.id];
                const l = listeningByConv[conv.id];
                const showTyping = !!(t && t.user_id === conv.other_user_id);
                const showListening = !showTyping && !!(l && l.user_id === conv.other_user_id);
                const typingHint = showTyping
                  ? "digitando..."
                  : showListening
                    ? "ouvindo seu áudio..."
                    : null;
                return (
                  <SwipeRow
                    key={conv.id}
                    conv={conv}
                    isActive={activeId === conv.id}
                    isArchivedView={false}
                    currentUserId={currentUserId}
                    typingHint={typingHint}
                    onOpen={() => setActiveId(conv.id)}
                    onArchiveToggle={() => handleArchiveToggle(conv)}
                    onDelete={() => setConfirmDelete(conv)}
                  />
                );
              })}

              {filteredArchived.length > 0 && (
                <div className="mt-3 border-t pt-2">
                  <button
                    type="button"
                    onClick={() => setArchivedExpanded((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm"
                    aria-expanded={archivedExpanded}
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Archive className="w-4 h-4" />
                      <span>Arquivadas</span>
                      <Badge variant="secondary" className="ml-1">{filteredArchived.length}</Badge>
                    </span>
                    {archivedExpanded
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  {archivedExpanded && (
                    <div className="space-y-1 mt-1">
                      {filteredArchived.map((conv) => (
                        <SwipeRow
                          key={conv.id}
                          conv={conv}
                          isActive={activeId === conv.id}
                          isArchivedView={true}
                          currentUserId={currentUserId}
                          // Spec: clicar numa arquivada desarquiva e abre.
                          onOpen={() => void openConversationFromArchived(conv)}
                          onArchiveToggle={() => handleArchiveToggle(conv)}
                          onDelete={() => setConfirmDelete(conv)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Área de Conversa */}
      <div className={`${activeId != null ? "flex" : "hidden md:flex"} flex-1 flex-col min-h-0 overflow-hidden`}>
        {activeConversation ? (
          <>
            <div className="p-4 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setActiveId(null)}
                  aria-label="Voltar para a lista de conversas"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="w-10 h-10">
                  {activeConversation.other_user_avatar_url && (
                    <AvatarImage src={activeConversation.other_user_avatar_url} alt={activeConversation.other_user_name} />
                  )}
                  <AvatarFallback>{getInitials(activeConversation.other_user_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-body font-medium">{activeConversation.other_user_name}</h2>
                  {(() => {
                    const t = typingByConv[activeConversation.id];
                    const l = listeningByConv[activeConversation.id];
                    const showTyping = t && t.user_id === activeConversation.other_user_id;
                    const showListening = !showTyping && l && l.user_id === activeConversation.other_user_id;
                    if (!showTyping && !showListening) return null;
                    return (
                      <p className="text-xs text-muted-foreground italic" aria-live="polite">
                        {showTyping
                          ? `${activeConversation.other_user_name} está digitando...`
                          : `${activeConversation.other_user_name} está ouvindo seu áudio...`}
                      </p>
                    );
                  })()}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Opções da conversa">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void loadMessages(activeConversation.id, false)}>
                    Atualizar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleArchiveToggle(activeConversation)}>
                    {activeConversation.archived_at ? (
                      <><ArchiveRestore className="w-4 h-4 mr-2" /> Desarquivar</>
                    ) : (
                      <><Archive className="w-4 h-4 mr-2" /> Arquivar</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmDelete(activeConversation)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir conversa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Carregando mensagens...
                </div>
              ) : messagesError ? (
                <div className="text-center py-6">
                  <p className="text-sm text-destructive mb-3">{messagesError}</p>
                  <Button size="sm" variant="outline" onClick={() => void loadMessages(activeConversation.id, false)}>
                    Tentar novamente
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="ra-empty">
                  <div className="ra-empty-icon"><MessageCircle className="w-5 h-5" /></div>
                  <p className="ra-empty-title">Nenhuma mensagem ainda.</p>
                  <p className="ra-empty-sub">Envie a primeira para começar a conversa.</p>
                </div>
              ) : (
                <div>
                  {annotateMessages(messages, currentUserId).map((info, idx) => {
                    const m = info.message;
                    const mine = m.sender_id === currentUserId;
                    const meta = (m.attachment_meta || {}) as { duration_sec?: number };
                    const hasText = !!(m.content && m.content.trim());
                    const isImageOnly = m.kind === "image" && !!m.attachment_url && !hasText;
                    const isEmojiOnly = m.kind === "text" && isOnlyEmoji(m.content);

                    const footer = (info.showTimestamp || (mine && info.showReadIndicator)) ? (
                      <div className={`ra-chat-meta ${mine ? "justify-end" : "justify-start"}`}>
                        {info.showTimestamp && <span>{formatTime(m.created_at)}</span>}
                        {mine && info.showReadIndicator && (
                          m.read_at ? (
                            <CheckCheck
                              className="w-3.5 h-3.5"
                              style={{ color: "var(--rayo-terra-500)" }}
                              role="img"
                              aria-label={`Lido às ${formatTime(m.read_at)}`}
                            />
                          ) : (
                            <Check
                              className="w-3.5 h-3.5"
                              role="img"
                              aria-label="Enviado"
                            />
                          )
                        )}
                      </div>
                    ) : null;

                    return (
                      <div key={m.id}>
                        {info.dateSeparator && (
                          <div className="ra-chat-date-pill-wrap">
                            <span className="ra-chat-date-pill">{info.dateSeparator}</span>
                          </div>
                        )}
                        <div
                          className={`ra-chat-row flex ${mine ? "justify-end" : "justify-start"} ${
                            !info.isFirstOfGroup ? "grouped" : ""
                          } ${idx === 0 && !info.dateSeparator ? "first" : ""}`}
                        >
                          <div className={`flex flex-col w-fit max-w-[min(80%,560px)] ${mine ? "items-end" : "items-start"}`}>
                            <MessageReactionsControl
                              messageId={m.id}
                              mine={mine}
                              reactions={m.reactions || []}
                              userReaction={m.user_reaction || null}
                              onChange={({ reactions, userReaction }) => {
                                setMessages((prev) => prev.map((mm) =>
                                  mm.id === m.id ? { ...mm, reactions, user_reaction: userReaction } : mm
                                ));
                              }}
                            >
                            {isImageOnly ? (
                              imgErrorIds.has(m.id) ? (
                                <div className="ra-chat-attachment-fallback">Imagem indisponível</div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setLightboxUrl(m.attachment_url)}
                                  className="ra-chat-attachment"
                                  aria-label="Abrir foto em tela cheia"
                                >
                                  <img
                                    src={m.attachment_url!}
                                    alt="Foto enviada"
                                    loading="lazy"
                                    onError={() => markImgError(m.id)}
                                  />
                                </button>
                              )
                            ) : isEmojiOnly ? (
                              <p className="ra-chat-emoji-jumbo">{m.content}</p>
                            ) : m.kind === "audio" && m.attachment_url ? (
                              <AudioBubble
                                src={m.attachment_url}
                                durationSec={typeof meta.duration_sec === "number" ? meta.duration_sec : null}
                                variant={mine ? "user" : "assistant"}
                                onPlay={() => sendListeningPing(m.conversation_id, m.id)}
                                onTimeUpdate={() => sendListeningPing(m.conversation_id, m.id)}
                              />
                            ) : (
                              <div className={`ra-chat-bubble ${mine ? "user" : "assistant"}`}>
                                {m.kind === "image" && m.attachment_url && (
                                  imgErrorIds.has(m.id) ? (
                                    <div
                                      className="ra-chat-attachment-fallback"
                                      style={{ width: "100%", height: 120, marginBottom: ".5rem" }}
                                    >
                                      Imagem indisponível
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setLightboxUrl(m.attachment_url)}
                                      className="block focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                                      aria-label="Abrir foto em tela cheia"
                                    >
                                      <img
                                        src={m.attachment_url}
                                        alt="Foto enviada"
                                        className="rounded-lg max-w-full max-h-72 object-cover mb-2 cursor-zoom-in"
                                        loading="lazy"
                                        onError={() => markImgError(m.id)}
                                      />
                                    </button>
                                  )
                                )}
                                {hasText && (
                                  <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                                )}
                              </div>
                            )}
                            </MessageReactionsControl>
                            {footer}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div
              className="p-4 border-t bg-card rayo-dm-composer"
              style={{
                paddingBottom: "max(1rem, calc(1rem + env(safe-area-inset-bottom)))",
              }}
            >
              {pendingAttachment && (
                <div className="mb-3 p-2 rounded-lg bg-muted/50 flex items-center gap-3">
                  {pendingAttachment.kind === "image" ? (
                    <img src={pendingAttachment.previewUrl} alt="Pré-visualização" className="w-14 h-14 rounded object-cover" />
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <Mic className="w-4 h-4 text-primary flex-shrink-0" />
                      <AudioBubble
                        src={pendingAttachment.previewUrl}
                        durationSec={pendingAttachment.durationSec ?? null}
                        variant="compact"
                      />
                    </div>
                  )}
                  <div className="flex-1 text-sm text-muted-foreground">
                    {pendingAttachment.kind === "image" ? "Foto pronta para enviar" : "Áudio pronto para enviar"}
                  </div>
                  <Button variant="ghost" size="sm" onClick={cancelPendingAttachment} aria-label="Remover anexo">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {recording ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm flex-1">Gravando... {formatDuration(recordSec)}</span>
                  <Button variant="ghost" size="sm" onClick={cancelRecording} aria-label="Cancelar gravação">
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={stopRecording} aria-label="Parar gravação">
                    <Square className="w-4 h-4 mr-1" /> Parar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePickPhoto}
                    disabled={composerDisabled || !!pendingAttachment}
                    aria-label="Anexar foto"
                  >
                    {uploadingAttachment ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={startRecording}
                    disabled={composerDisabled || !!pendingAttachment}
                    aria-label="Gravar áudio"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <div className="flex-1">
                    <Input
                      ref={messageInputRef}
                      placeholder={pendingAttachment ? "Adicionar legenda (opcional)..." : "Digite sua mensagem..."}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        if (e.target.value.trim().length > 0 && activeId != null) {
                          sendTypingPing(activeId);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      onFocus={() => {
                        // Task #123 — quando o teclado virtual abre no
                        // iOS, a viewport encolhe e a última mensagem
                        // pode ficar atrás do composer. Disparamos
                        // scrollIntoView no próximo frame pra empurrar
                        // a lista até o fim e manter o contexto visível.
                        if (typeof window === "undefined") return;
                        window.requestAnimationFrame(() => {
                          messagesEndRef.current?.scrollIntoView({ block: "end" });
                        });
                      }}
                      disabled={sending}
                      maxLength={4000}
                    />
                  </div>
                  <Button onClick={handleSendMessage} disabled={!canSend} aria-label="Enviar mensagem">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <Paperclip className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-30" />
              <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="font-display font-medium mb-2">Selecione uma conversa</h2>
              <p className="font-body text-muted-foreground">
                Escolha uma conversa ou inicie uma nova para começar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox in-app para fotos enviadas */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl p-2 bg-black/95 border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto em tela cheia</DialogTitle>
            <DialogDescription>Pressione Esc para fechar</DialogDescription>
          </DialogHeader>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Foto em tela cheia"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa com <strong>{confirmDelete?.other_user_name}</strong> será removida da sua lista
              e o histórico anterior ficará oculto para você. A outra pessoa não é avisada e o histórico
              dela continua intacto. Se vocês trocarem novas mensagens, a conversa volta a aparecer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
