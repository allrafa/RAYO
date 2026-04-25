import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MessageCircle, UserPlus, Search, MoreVertical, Send, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useAuth } from "./AuthContext";
import { toast } from "sonner@2.0.3";
import { api } from "../lib/api";
import { EmptyStateNoConversations, EmptyStateError } from "./EmptyState";
import { SkeletonLoader } from "./SkeletonLoader";

interface ConversationItem {
  id: number;
  user_a_id: number;
  user_b_id: number;
  last_message_at: string;
  created_at: string;
  other_user_id: number;
  other_user_name: string;
  last_message_content: string | null;
  last_message_sender_id: number | null;
  last_message_created_at: string | null;
  unread_count: number;
}

interface MessageItem {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface UserSearchResult {
  id: number;
  name: string;
}

const CONVERSATION_POLL_MS = 30_000;
const MESSAGES_POLL_MS = 10_000;

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

export function ConversasPage() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? 0;

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [showNewConvDialog, setShowNewConvDialog] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const loadConversations = useCallback(async () => {
    const res = await api.get<{ conversations: ConversationItem[] }>("/api/messages/conversations");
    if (res.success && res.data) {
      setConversations(res.data.conversations);
      setConversationsError(null);
    } else if (res.error) {
      setConversationsError(res.error.message);
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
      // Only consider it "new incoming" if a newer message arrived AND it's from the other user.
      hasNewIncoming =
        newest !== null &&
        newest !== prevNewest &&
        !!newestMsg &&
        newestMsg.sender_id !== currentUserId;
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
    const res = await api.post<{ marked: number }>(`/api/messages/conversations/${conversationId}/read`);
    if (res.success && res.data && res.data.marked > 0) {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
      );
    }
  }, []);

  // Initial load + polling for conversation list
  useEffect(() => {
    void loadConversations();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadConversations();
    }, CONVERSATION_POLL_MS);
    return () => window.clearInterval(interval);
  }, [loadConversations]);

  // Load messages and poll when conversation is active
  useEffect(() => {
    if (activeId == null) {
      setMessages([]);
      lastMessageIdRef.current = null;
      return;
    }
    // Mark as read once on open (the conversation may have unread messages from before).
    void loadMessages(activeId, false).then(() => void markRead(activeId));
    // While the conversation is open, only mark-as-read when a new incoming
    // message actually arrives. Avoids hammering POST /read on every poll tick.
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadMessages(activeId, true).then(({ hasNewIncoming }) => {
        if (hasNewIncoming) void markRead(activeId);
      });
    }, MESSAGES_POLL_MS);
    return () => window.clearInterval(interval);
  }, [activeId, loadMessages, markRead]);

  // User search debounce
  useEffect(() => {
    if (!showNewConvDialog) return;
    const q = userSearchQuery.trim();
    if (q.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setUserSearching(true);
    const handle = window.setTimeout(async () => {
      const res = await api.get<{ users: UserSearchResult[] }>(
        `/api/messages/users/search?q=${encodeURIComponent(q)}`
      );
      if (res.success && res.data) {
        setUserSearchResults(res.data.users);
      } else {
        setUserSearchResults([]);
      }
      setUserSearching(false);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [userSearchQuery, showNewConvDialog]);

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!content || activeId == null || sending) return;
    setSending(true);
    const res = await api.post<{ message: MessageItem }>(
      `/api/messages/conversations/${activeId}/messages`,
      { content }
    );
    setSending(false);
    if (res.success && res.data) {
      setNewMessage("");
      setMessages((prev) => [...prev, res.data!.message]);
      lastMessageIdRef.current = res.data.message.id;
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
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
    } else if (res.error) {
      toast.error(res.error.message);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.other_user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-6xl mx-auto bg-background">
      {/* Lista de Conversas */}
      <div className={`${activeId != null ? "hidden md:block" : "block"} w-full md:w-1/3 border-r border-border bg-card`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display font-bold">Mensagens</h1>
            <Dialog open={showNewConvDialog} onOpenChange={setShowNewConvDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nova
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Nova conversa</DialogTitle>
                  <DialogDescription className="font-body">
                    Procure por nome ou e-mail exato de outro usuário do RAIO
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
          ) : filteredConversations.length === 0 ? (
            <EmptyStateNoConversations onStart={() => setShowNewConvDialog(true)} />
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveId(conv.id)}
                className={`w-full p-4 cursor-pointer hover:bg-accent border-b transition-colors text-left ${
                  activeId === conv.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback>{getInitials(conv.other_user_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium truncate">{conv.other_user_name}</h3>
                      {conv.last_message_created_at && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatRelative(conv.last_message_created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message_content
                          ? (conv.last_message_sender_id === currentUserId ? "Você: " : "") + conv.last_message_content
                          : "Comece a conversa..."}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge className="ml-2 shrink-0">{conv.unread_count}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Área de Conversa */}
      <div className={`${activeId != null ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
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
                  <AvatarFallback>{getInitials(activeConversation.other_user_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-body font-medium">{activeConversation.other_user_name}</h2>
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
                <div className="text-center py-10 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem ainda. Envie a primeira!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const mine = m.sender_id === currentUserId;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            mine ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              mine ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t bg-card">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    disabled={sending}
                    maxLength={4000}
                  />
                </div>
                <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending} aria-label="Enviar mensagem">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="font-display font-medium mb-2">Selecione uma conversa</h2>
              <p className="font-body text-muted-foreground">
                Escolha uma conversa ou inicie uma nova para começar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
