// ============================================================================
// 📚 RAYO ECOSYSTEM - BOOK READER PAGE
// Leitor de livros. Quando o livro tem `fileUrl` (PDF real do CMS),
// renderiza o PdfViewer. Quando não tem, cai pro fluxo legado de
// transcrição mock (mantido pra compat enquanto migramos catálogo).
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowLeftCircle, User, Settings2, BookMarked, StickyNote, Trash2, Pencil, Check, Share2, List, Sun, Moon, Minus, Plus, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { Book } from '../types/BookTypes';
import { useTheme } from '../ThemeProvider';
import { useApp } from '../AppContext';
import { BookReaderProvider, useBookReader } from './BookReaderContext';
import { getBookContent } from './mockTranscripts';
import { TranscriptViewer } from './TranscriptViewer';
import { CompactAudioPlayer } from './CompactAudioPlayer';
import { PdfViewer, type RenderedHighlight, type HighlightColor, type SelectionInfo, type NormalizedRect, type ReaderTheme, type OutlineItem } from './PdfViewer';
import { EpubViewer, type EpubViewerHighlight, type EpubSelectionInfo, type EpubOutlineItem, type EpubFontFamily } from './EpubViewer';
import { api } from '../../lib/api';
import { toast } from 'sonner@2.0.3';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '../ui/sheet';

interface ServerHighlight {
  id: string; page: number; text: string; color: HighlightColor; rects: NormalizedRect[]; createdAt: string;
}
interface ServerNote {
  id: string; page: number; selectedText: string; content: string; createdAt: string; updatedAt: string;
}
interface ForumOption {
  id: number; name: string; slug: string; icon?: string | null;
}
type ShareTarget =
  | { kind: 'hl'; id: string; page: number; text: string }
  | { kind: 'nt'; id: string; page: number; selectedText: string; content: string };

interface BookReaderPageProps {
  book: Book;
  onBack: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// PDF flow (livros do CMS com `fileUrl`)
// ────────────────────────────────────────────────────────────────────────────

// Preferências de leitura — persistidas no browser.
const THEME_KEY = 'rayo:reader:theme';
const ZOOM_KEY = 'rayo:reader:zoom';
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 1.8;
const ZOOM_STEP = 0.1;

function readStoredTheme(): ReaderTheme {
  if (typeof window === 'undefined') return 'light';
  const v = window.localStorage.getItem(THEME_KEY);
  return v === 'sepia' || v === 'dark' || v === 'light' ? v : 'light';
}
function readStoredZoom(): number {
  if (typeof window === 'undefined') return 1;
  const v = parseFloat(window.localStorage.getItem(ZOOM_KEY) || '');
  return Number.isFinite(v) && v >= ZOOM_MIN && v <= ZOOM_MAX ? v : 1;
}

function PdfBookReader({ book, onBack }: BookReaderPageProps) {
  const { updateBookProgress } = useApp();
  const [initialPage, setInitialPage] = useState<number>(book.currentPage > 0 ? book.currentPage : 1);
  const [page, setPage] = useState<number>(initialPage);
  const [total, setTotal] = useState<number>(book.pages || 0);
  const [loadedRemote, setLoadedRemote] = useState(false);
  const [highlights, setHighlights] = useState<ServerHighlight[]>([]);
  const [notes, setNotes] = useState<ServerNote[]>([]);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState<{ selection: SelectionInfo; content: string } | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');
  const [jumpToPage, setJumpToPage] = useState<number | undefined>(undefined);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [forums, setForums] = useState<ForumOption[]>([]);
  const [forumsLoaded, setForumsLoaded] = useState(false);
  const [selectedForumId, setSelectedForumId] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  // Kindle UX: chrome visível por padrão; tap no centro alterna.
  const [chromeVisible, setChromeVisible] = useState(true);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>(() => readStoredTheme());
  const [zoom, setZoom] = useState<number>(() => readStoredZoom());
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  // Posição local do scrubber enquanto o usuário arrasta (commita no onChange final).
  const [scrubValue, setScrubValue] = useState<number | null>(null);

  // Persist preferências.
  useEffect(() => { try { localStorage.setItem(THEME_KEY, readerTheme); } catch {} }, [readerTheme]);
  useEffect(() => { try { localStorage.setItem(ZOOM_KEY, String(zoom)); } catch {} }, [zoom]);

  const toggleChrome = () => setChromeVisible((v) => !v);
  const anySheetOpen = annotationsOpen || tocOpen || settingsOpen || !!noteDraft || !!shareTarget;

  // Carrega progresso + anotações persistidos do servidor uma vez.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [progRes, annRes] = await Promise.all([
        api.get<{ progress: { currentPage: number } | null }>(
          `/api/books/${encodeURIComponent(book.id)}/progress`,
        ),
        api.get<{ highlights: ServerHighlight[]; notes: ServerNote[] }>(
          `/api/books/${encodeURIComponent(book.id)}/annotations`,
        ),
      ]);
      if (!alive) return;
      const remote = progRes.success && progRes.data?.progress?.currentPage;
      if (remote && remote > 0) {
        setInitialPage(remote);
        setPage(remote);
      }
      if (annRes.success && annRes.data) {
        setHighlights(annRes.data.highlights || []);
        setNotes(annRes.data.notes || []);
      }
      // Sincroniza os refs de persistência com o valor canônico do servidor
      // antes de liberar o agendador. Senão, o cleanup poderia flushar a
      // página inicial local sobre um progresso remoto mais avançado.
      if (remote && remote > 0) {
        lastSavedRef.current = remote;
        pendingPageRef.current = remote;
      }
      setLoadedRemote(true);
    })();
    return () => { alive = false; };
  }, [book.id]);

  // Mapeia ServerHighlight → RenderedHighlight (mesmo shape, mas o viewer
  // não precisa do createdAt).
  const renderedHighlights: RenderedHighlight[] = useMemo(
    () => highlights.map((h) => ({
      id: h.id, page: h.page, color: h.color, rects: h.rects, text: h.text,
    })),
    [highlights],
  );

  const handleCreateHighlight = async (sel: SelectionInfo, color: HighlightColor) => {
    const res = await api.post<{ highlight: ServerHighlight }>(
      `/api/books/${encodeURIComponent(book.id)}/highlights`,
      { page: sel.page, text: sel.text, color, rects: sel.rects },
    );
    if (res.success && res.data?.highlight) {
      setHighlights((prev) => [...prev, res.data!.highlight]);
      toast.success('Trecho destacado');
    } else {
      toast.error(res.error?.message || 'Não foi possível destacar');
    }
  };

  const handleStartNote = (sel: SelectionInfo) => {
    setNoteDraft({ selection: sel, content: '' });
  };

  const handleSaveNote = async () => {
    if (!noteDraft) return;
    const trimmed = noteDraft.content.trim();
    if (!trimmed) { toast.error('Escreva sua anotação'); return; }
    const res = await api.post<{ note: ServerNote }>(
      `/api/books/${encodeURIComponent(book.id)}/notes`,
      {
        page: noteDraft.selection.page,
        selectedText: noteDraft.selection.text,
        content: trimmed,
      },
    );
    if (res.success && res.data?.note) {
      setNotes((prev) => [...prev, res.data!.note]);
      setNoteDraft(null);
      toast.success('Anotação salva');
    } else {
      toast.error(res.error?.message || 'Não foi possível salvar a anotação');
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    const prev = highlights;
    setHighlights((cur) => cur.filter((h) => h.id !== id));
    const res = await api.delete(`/api/books/${encodeURIComponent(book.id)}/highlights/${id}`);
    if (!res.success) {
      setHighlights(prev);
      toast.error('Não foi possível remover o destaque');
    }
  };

  const handleDeleteNote = async (id: string) => {
    const prev = notes;
    setNotes((cur) => cur.filter((n) => n.id !== id));
    const res = await api.delete(`/api/books/${encodeURIComponent(book.id)}/notes/${id}`);
    if (!res.success) {
      setNotes(prev);
      toast.error('Não foi possível remover a anotação');
    }
  };

  const ensureForumsLoaded = async () => {
    if (forumsLoaded) return;
    const res = await api.get<{ forums: ForumOption[] }>(`/api/community/forums/me`);
    let list: ForumOption[] = res.success && res.data?.forums ? res.data.forums : [];
    if (list.length === 0) {
      const all = await api.get<{ forums: ForumOption[] }>(`/api/community/forums`);
      list = all.success && all.data?.forums ? all.data.forums : [];
    }
    setForums(list);
    if (list.length > 0) setSelectedForumId((cur) => cur ?? list[0].id);
    setForumsLoaded(true);
  };

  const openShare = async (target: ShareTarget) => {
    setShareTarget(target);
    await ensureForumsLoaded();
  };

  const handleShare = async () => {
    if (!shareTarget || !selectedForumId) {
      toast.error('Selecione uma comunidade');
      return;
    }
    setSharing(true);
    const path = shareTarget.kind === 'hl'
      ? `/api/books/${encodeURIComponent(book.id)}/highlights/${shareTarget.id}/share`
      : `/api/books/${encodeURIComponent(book.id)}/notes/${shareTarget.id}/share`;
    const res = await api.post<{ post: { id: number } }>(path, { forum_id: selectedForumId });
    setSharing(false);
    if (res.success) {
      toast.success('Compartilhado na comunidade');
      setShareTarget(null);
    } else {
      toast.error(res.error?.message || 'Não foi possível compartilhar');
    }
  };

  const handleSaveEditedNote = async (id: string) => {
    const trimmed = editingNoteText.trim();
    if (!trimmed) { toast.error('Anotação não pode ficar vazia'); return; }
    const res = await api.patch<{ note: ServerNote }>(
      `/api/books/${encodeURIComponent(book.id)}/notes/${id}`,
      { content: trimmed },
    );
    if (res.success && res.data?.note) {
      setNotes((cur) => cur.map((n) => (n.id === id ? res.data!.note : n)));
      setEditingNoteId(null);
      setEditingNoteText('');
    } else {
      toast.error(res.error?.message || 'Não foi possível atualizar');
    }
  };

  const goToPage = (p: number) => {
    setJumpToPage(p);
    setAnnotationsOpen(false);
    // reset depois pra permitir pular pra mesma página de novo se preciso
    setTimeout(() => setJumpToPage(undefined), 100);
  };

  // Debounced save (800ms) — evita bater backend a cada flip de página.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<number>(initialPage);
  const pendingPageRef = useRef<number>(initialPage);

  const schedulePersist = (next: number) => {
    pendingPageRef.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      saveTimer.current = null;
      const toSave = pendingPageRef.current;
      if (toSave === lastSavedRef.current) return;
      const res = await api.put<{ progress: { currentPage: number } }>(
        `/api/books/${encodeURIComponent(book.id)}/progress`,
        { currentPage: toSave },
      );
      if (res.success && res.data?.progress) {
        lastSavedRef.current = res.data.progress.currentPage;
      }
    }, 800);
  };

  const handlePageChange = (next: number, totalPages: number) => {
    setPage(next);
    setTotal(totalPages);
    // Atualiza estado local (badges/progress da home) imediatamente.
    updateBookProgress(book.id, next);
    if (loadedRemote) schedulePersist(next);
  };

  // Cleanup SÓ no unmount (ou troca de livro). Depender de `page` aqui faria
  // o cleanup rodar a cada flip de página e cancelaria o debounce —
  // a persistência só aconteceria no unmount. Fix do code review.
  useEffect(() => {
    const bookId = book.id;
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const last = pendingPageRef.current;
      if (last !== lastSavedRef.current) {
        // Flush final: sem await (estamos no cleanup) e fire-and-forget.
        api.put(`/api/books/${encodeURIComponent(bookId)}/progress`, { currentPage: last }).catch(() => {});
      }
    };
  }, [book.id]);

  const progressPct = total > 0 ? Math.round((page / total) * 100) : 0;
  const displayPage = scrubValue ?? page;

  // Cor de fundo da página inteira combina com o tema do leitor.
  const pageBg =
    readerTheme === 'sepia' ? '#efe3c8' :
    readerTheme === 'dark'  ? '#15181d' :
    'var(--rayo-sand-100)';
  // Cor do texto na chrome — contraste com pageBg.
  const chromeFg = readerTheme === 'dark' ? '#e7e3d6' : 'var(--rayo-ink-700)';
  const chromeBgGlass = readerTheme === 'dark'
    ? 'rgba(20, 23, 28, 0.85)'
    : readerTheme === 'sepia'
      ? 'rgba(239, 227, 200, 0.92)'
      : 'rgba(255, 255, 255, 0.92)';

  // Classes de auto-hide pras barras: slide pra fora + fade quando escondidas.
  const topBarClass = chromeVisible
    ? 'translate-y-0 opacity-100'
    : 'pointer-events-none -translate-y-full opacity-0';
  const bottomBarClass = chromeVisible
    ? 'translate-y-0 opacity-100'
    : 'pointer-events-none translate-y-full opacity-0';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: pageBg, transition: 'background 200ms ease' }}
    >
      {/* ── Top bar (auto-hide) ─────────────────────────────────────────── */}
      <div
        className={`fixed top-0 left-0 right-0 z-20 border-b backdrop-blur-lg transition-all duration-200 ${topBarClass}`}
        style={{
          background: chromeBgGlass,
          borderColor: readerTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'var(--rayo-sand-300)',
        }}
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} style={{ color: chromeFg }} aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center truncate text-sm" style={{ color: chromeFg, fontWeight: 600 }}>
            {book.title}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setAnnotationsOpen(true)}
            style={{ color: chromeFg }}
            aria-label="Minhas anotações"
          >
            <BookMarked className="w-4 h-4" />
            <span className="text-xs tabular-nums">{highlights.length + notes.length}</span>
          </Button>
        </div>
      </div>

      {/* ── Área de leitura (com padding pras barras não sobreporem texto) ─ */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-2 sm:px-4 pt-14 pb-24">
        <PdfViewer
          fileUrl={book.fileUrl!}
          initialPage={initialPage}
          onPageChange={handlePageChange}
          highlights={renderedHighlights}
          onCreateHighlight={handleCreateHighlight}
          onCreateNote={handleStartNote}
          jumpToPage={jumpToPage}
          theme={readerTheme}
          zoom={zoom}
          onTapCenter={toggleChrome}
          onOutlineReady={setOutline}
          hideSelectionMenu={anySheetOpen}
        />
      </div>

      {/* ── Bottom bar (auto-hide): scrubber + ações ────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-20 border-t backdrop-blur-lg transition-all duration-200 ${bottomBarClass}`}
        style={{
          background: chromeBgGlass,
          borderColor: readerTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'var(--rayo-sand-300)',
        }}
        // O próprio chrome não deve disparar o tap-center do viewer.
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex flex-col gap-2">
          {/* Scrubber */}
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums w-12 text-right" style={{ color: chromeFg }}>
              {displayPage}
            </span>
            <input
              type="range"
              min={1}
              max={Math.max(1, total)}
              value={displayPage}
              disabled={total <= 0}
              onChange={(e) => setScrubValue(parseInt(e.target.value, 10) || 1)}
              onMouseUp={() => {
                if (scrubValue != null) {
                  setJumpToPage(scrubValue);
                  setScrubValue(null);
                  setTimeout(() => setJumpToPage(undefined), 100);
                }
              }}
              onTouchEnd={() => {
                if (scrubValue != null) {
                  setJumpToPage(scrubValue);
                  setScrubValue(null);
                  setTimeout(() => setJumpToPage(undefined), 100);
                }
              }}
              className="flex-1 accent-current"
              style={{ color: 'var(--rayo-terra-500)' }}
              aria-label="Navegar pelas páginas"
            />
            <span className="text-xs tabular-nums w-12" style={{ color: chromeFg, opacity: 0.7 }}>
              {total > 0 ? `/${total}` : ''}
            </span>
          </div>
          {/* Ações: TOC / Ajustes / Progresso% */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setTocOpen(true)}
              disabled={outline.length === 0}
              style={{ color: chromeFg }}
              aria-label="Sumário"
            >
              <List className="w-4 h-4" />
              <span className="text-xs">Sumário</span>
            </Button>
            <div className="text-xs tabular-nums" style={{ color: chromeFg, opacity: 0.7 }}>
              {total > 0 ? `${progressPct}% lido` : ''}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setSettingsOpen(true)}
              style={{ color: chromeFg }}
              aria-label="Ajustes de leitura"
            >
              <Settings2 className="w-4 h-4" />
              <span className="text-xs">Ajustes</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Sheet: Anotações ────────────────────────────────────────────── */}
      <Sheet open={annotationsOpen} onOpenChange={setAnnotationsOpen}>
        <SheetContent side="right" style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--rayo-forest-900)' }}>Minhas anotações</SheetTitle>
            <SheetDescription style={{ color: 'var(--rayo-ink-400)' }}>
              Todos os destaques e anotações deste livro.
            </SheetDescription>
          </SheetHeader>
          <AnnotationsList
            highlights={highlights}
            notes={notes}
            onJump={goToPage}
            onDeleteHighlight={handleDeleteHighlight}
            onDeleteNote={handleDeleteNote}
            editingNoteId={editingNoteId}
            editingNoteText={editingNoteText}
            setEditingNoteId={setEditingNoteId}
            setEditingNoteText={setEditingNoteText}
            onSaveEditedNote={handleSaveEditedNote}
            onShare={openShare}
          />
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Sumário (TOC do PDF) ─────────────────────────────────── */}
      <Sheet open={tocOpen} onOpenChange={setTocOpen}>
        <SheetContent side="left" style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--rayo-forest-900)' }}>Sumário</SheetTitle>
            <SheetDescription style={{ color: 'var(--rayo-ink-400)' }}>
              Capítulos e seções deste livro.
            </SheetDescription>
          </SheetHeader>
          {outline.length === 0 ? (
            <div className="mt-10 text-center text-sm flex flex-col items-center gap-3" style={{ color: 'var(--rayo-ink-400)' }}>
              <BookOpen className="w-8 h-8 opacity-50" />
              <p>Este livro ainda não tem um sumário interno.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-1 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {outline.map((item, idx) => (
                <button
                  key={`${item.page}-${idx}`}
                  type="button"
                  onClick={() => { setTocOpen(false); goToPage(item.page); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:opacity-80 flex items-center justify-between gap-3"
                  style={{
                    background: page === item.page ? 'var(--rayo-sand-100)' : 'transparent',
                    color: 'var(--rayo-forest-900)',
                  }}
                >
                  <span className="text-sm truncate">{item.title}</span>
                  <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--rayo-ink-400)' }}>
                    {item.page}
                  </span>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Ajustes de leitura (tema + zoom) ─────────────────────── */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--rayo-forest-900)' }}>Ajustes de leitura</SheetTitle>
            <SheetDescription style={{ color: 'var(--rayo-ink-400)' }}>
              Personalize a aparência do leitor.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6 pb-6">
            {/* Tema */}
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--rayo-ink-400)', fontWeight: 600 }}>TEMA</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'light' as const, label: 'Claro', icon: <Sun className="w-4 h-4" />, bg: '#FFFFFF', fg: '#1a1d23' },
                  { id: 'sepia' as const, label: 'Sépia', icon: <BookOpen className="w-4 h-4" />, bg: '#efe3c8', fg: '#5a4a2a' },
                  { id: 'dark'  as const, label: 'Escuro', icon: <Moon className="w-4 h-4" />, bg: '#15181d', fg: '#e7e3d6' },
                ]).map((opt) => {
                  const active = readerTheme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReaderTheme(opt.id)}
                      className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl"
                      style={{
                        background: opt.bg,
                        color: opt.fg,
                        border: `2px solid ${active ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)'}`,
                        fontWeight: active ? 700 : 500,
                      }}
                      aria-pressed={active}
                    >
                      {opt.icon}
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zoom */}
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--rayo-ink-400)', fontWeight: 600 }}>
                TAMANHO DA PÁGINA · {Math.round(zoom * 100)}%
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
                  disabled={zoom <= ZOOM_MIN + 0.001}
                  aria-label="Diminuir tamanho"
                  style={{ color: 'var(--rayo-forest-900)' }}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={ZOOM_STEP}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1"
                  style={{ accentColor: 'var(--rayo-terra-500)' }}
                  aria-label="Zoom"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
                  disabled={zoom >= ZOOM_MAX - 0.001}
                  aria-label="Aumentar tamanho"
                  style={{ color: 'var(--rayo-forest-900)' }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(1)}
                  style={{ color: 'var(--rayo-ink-700)' }}
                >
                  100%
                </Button>
              </div>
            </div>

            <p className="text-xs" style={{ color: 'var(--rayo-ink-400)', textAlign: 'center' }}>
              Toque no centro da página pra esconder ou mostrar as barras.
              <br />Toque nas laterais ou arraste pra virar a página.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de compartilhamento — Task #256 */}
      {shareTarget && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Compartilhar na comunidade"
          onClick={(e) => { if (e.target === e.currentTarget && !sharing) setShareTarget(null); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-xl"
            style={{ background: 'var(--rayo-sand-50)', border: '1px solid var(--rayo-sand-300)' }}
          >
            <h3 className="text-base mb-3" style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}>
              Compartilhar na comunidade
            </h3>
            <blockquote
              className="text-sm mb-3 p-3 rounded-lg italic"
              style={{
                background: 'var(--rayo-sand-100)',
                borderLeft: '3px solid var(--rayo-terra-500)',
                color: 'var(--rayo-ink-700)',
              }}
            >
              “{(shareTarget.kind === 'hl' ? shareTarget.text : (shareTarget.selectedText || shareTarget.content)).slice(0, 240)}
              {(shareTarget.kind === 'hl' ? shareTarget.text : (shareTarget.selectedText || shareTarget.content)).length > 240 ? '…' : ''}”
            </blockquote>
            <label className="text-xs mb-1 block" style={{ color: 'var(--rayo-ink-400)' }}>
              Em qual comunidade?
            </label>
            {forums.length === 0 ? (
              <p className="text-sm py-3" style={{ color: 'var(--rayo-ink-400)' }}>
                {forumsLoaded
                  ? 'Você ainda não participa de nenhuma comunidade.'
                  : 'Carregando comunidades…'}
              </p>
            ) : (
              <select
                value={selectedForumId ?? ''}
                onChange={(e) => setSelectedForumId(parseInt(e.target.value, 10) || null)}
                className="w-full rounded-lg p-2 text-sm"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--rayo-sand-300)',
                  color: 'var(--rayo-forest-900)',
                }}
              >
                {forums.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.icon ? `${f.icon} ` : ''}{f.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                onClick={() => setShareTarget(null)}
                disabled={sharing}
                style={{ color: 'var(--rayo-ink-700)' }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleShare}
                disabled={sharing || !selectedForumId || forums.length === 0}
                style={{ background: 'var(--rayo-terra-500)', color: '#FFFFFF', fontWeight: 600 }}
              >
                {sharing ? 'Compartilhando…' : 'Compartilhar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de criação de nota */}
      {noteDraft && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Nova anotação"
          onClick={(e) => { if (e.target === e.currentTarget) setNoteDraft(null); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-xl"
            style={{ background: 'var(--rayo-sand-50)', border: '1px solid var(--rayo-sand-300)' }}
          >
            <h3 className="text-base mb-3" style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}>
              Nova anotação · pág. {noteDraft.selection.page}
            </h3>
            {noteDraft.selection.text && (
              <blockquote
                className="text-sm mb-3 p-3 rounded-lg italic"
                style={{
                  background: 'var(--rayo-sand-100)',
                  borderLeft: '3px solid var(--rayo-terra-500)',
                  color: 'var(--rayo-ink-700)',
                }}
              >
                “{noteDraft.selection.text.length > 280
                  ? noteDraft.selection.text.slice(0, 280) + '…'
                  : noteDraft.selection.text}”
              </blockquote>
            )}
            <textarea
              autoFocus
              value={noteDraft.content}
              onChange={(e) => setNoteDraft({ ...noteDraft, content: e.target.value })}
              placeholder="Escreva sua anotação…"
              rows={5}
              maxLength={4000}
              className="w-full rounded-lg p-3 text-sm resize-none"
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--rayo-sand-300)',
                color: 'var(--rayo-forest-900)',
              }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="ghost"
                onClick={() => setNoteDraft(null)}
                style={{ color: 'var(--rayo-ink-700)' }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveNote}
                style={{ background: 'var(--rayo-terra-500)', color: '#FFFFFF', fontWeight: 600 }}
              >
                Salvar anotação
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Lista de anotações (destaques + notas) no Sheet lateral
// ────────────────────────────────────────────────────────────────────────────

const HL_DOT: Record<HighlightColor, string> = {
  yellow: '#FACC15', green: '#4ADE80', blue: '#60A5FA', pink: '#F472B6',
};

function AnnotationsList(props: {
  highlights: ServerHighlight[];
  notes: ServerNote[];
  onJump: (page: number) => void;
  onDeleteHighlight: (id: string) => void;
  onDeleteNote: (id: string) => void;
  editingNoteId: string | null;
  editingNoteText: string;
  setEditingNoteId: (id: string | null) => void;
  setEditingNoteText: (s: string) => void;
  onSaveEditedNote: (id: string) => void;
  onShare: (target: ShareTarget) => void;
  /** Customiza o label do badge — pro EPUB renderizamos "X%" em vez de "Pág. N". */
  labelForPage?: (page: number) => string;
}) {
  const {
    highlights, notes, onJump, onDeleteHighlight, onDeleteNote,
    editingNoteId, editingNoteText, setEditingNoteId, setEditingNoteText, onSaveEditedNote,
    onShare, labelForPage,
  } = props;
  const fmt = labelForPage ?? ((p: number) => `Pág. ${p}`);

  type Item =
    | { kind: 'hl'; page: number; data: ServerHighlight }
    | { kind: 'nt'; page: number; data: ServerNote };

  const items: Item[] = useMemo(() => {
    const all: Item[] = [
      ...highlights.map((h) => ({ kind: 'hl' as const, page: h.page, data: h })),
      ...notes.map((n) => ({ kind: 'nt' as const, page: n.page, data: n })),
    ];
    all.sort((a, b) => a.page - b.page || a.data.createdAt.localeCompare(b.data.createdAt));
    return all;
  }, [highlights, notes]);

  if (items.length === 0) {
    return (
      <div className="mt-10 text-center text-sm" style={{ color: 'var(--rayo-ink-400)' }}>
        Selecione um trecho do livro pra criar seu primeiro destaque ou anotação.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 140px)' }}>
      {items.map((item) => {
        const isEditing = item.kind === 'nt' && editingNoteId === item.data.id;
        return (
          <div
            key={`${item.kind}-${item.data.id}`}
            className="rounded-xl p-3"
            style={{ background: '#FFFFFF', border: '1px solid var(--rayo-sand-300)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <button
                type="button"
                onClick={() => onJump(item.page)}
                className="text-xs px-2 py-0.5 rounded-full hover:opacity-80"
                style={{ background: 'var(--rayo-sand-100)', color: 'var(--rayo-forest-900)', fontWeight: 600 }}
                aria-label={`Ir para ${fmt(item.page)}`}
              >
                {fmt(item.page)}
              </button>
              <div className="flex items-center gap-1">
                {item.kind === 'hl' ? (
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ background: HL_DOT[item.data.color] || HL_DOT.yellow }}
                    aria-label={`Destaque ${item.data.color}`}
                  />
                ) : (
                  <StickyNote className="w-3.5 h-3.5" style={{ color: 'var(--rayo-ink-400)' }} />
                )}
                {item.kind === 'nt' && !isEditing && (
                  <button
                    type="button"
                    onClick={() => { setEditingNoteId(item.data.id); setEditingNoteText(item.data.content); }}
                    className="p-1 rounded hover:bg-black/5"
                    aria-label="Editar anotação"
                  >
                    <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--rayo-ink-700)' }} />
                  </button>
                )}
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      if (item.kind === 'hl') {
                        onShare({ kind: 'hl', id: item.data.id, page: item.data.page, text: item.data.text });
                      } else {
                        onShare({
                          kind: 'nt', id: item.data.id, page: item.data.page,
                          selectedText: item.data.selectedText, content: item.data.content,
                        });
                      }
                    }}
                    className="p-1 rounded hover:bg-black/5"
                    aria-label={item.kind === 'hl' ? 'Compartilhar destaque' : 'Compartilhar anotação'}
                  >
                    <Share2 className="w-3.5 h-3.5" style={{ color: 'var(--rayo-ink-700)' }} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => item.kind === 'hl' ? onDeleteHighlight(item.data.id) : onDeleteNote(item.data.id)}
                  className="p-1 rounded hover:bg-black/5"
                  aria-label={item.kind === 'hl' ? 'Remover destaque' : 'Remover anotação'}
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--rayo-ink-700)' }} />
                </button>
              </div>
            </div>

            {item.kind === 'hl' ? (
              <p className="text-sm" style={{ color: 'var(--rayo-ink-700)' }}>
                “{item.data.text}”
              </p>
            ) : (
              <>
                {item.data.selectedText && (
                  <blockquote
                    className="text-xs italic mb-2 pl-2"
                    style={{ borderLeft: '2px solid var(--rayo-terra-500)', color: 'var(--rayo-ink-400)' }}
                  >
                    “{item.data.selectedText.length > 180
                      ? item.data.selectedText.slice(0, 180) + '…'
                      : item.data.selectedText}”
                  </blockquote>
                )}
                {isEditing ? (
                  <div>
                    <textarea
                      autoFocus
                      value={editingNoteText}
                      onChange={(e) => setEditingNoteText(e.target.value)}
                      rows={4}
                      maxLength={4000}
                      className="w-full rounded p-2 text-sm resize-none"
                      style={{
                        background: 'var(--rayo-sand-50)',
                        border: '1px solid var(--rayo-sand-300)',
                        color: 'var(--rayo-forest-900)',
                      }}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingNoteId(null); setEditingNoteText(''); }}
                        style={{ color: 'var(--rayo-ink-700)' }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onSaveEditedNote(item.data.id)}
                        className="gap-1"
                        style={{ background: 'var(--rayo-terra-500)', color: '#FFFFFF', fontWeight: 600 }}
                      >
                        <Check className="w-3.5 h-3.5" /> Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--rayo-forest-900)' }}>
                    {item.data.content}
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Legacy flow (transcrição mock — preservado pra livros sem arquivo)
// ────────────────────────────────────────────────────────────────────────────

function LegacyBookReaderContent({ book, onBack }: BookReaderPageProps) {
  const { state, setMode, setNarrator, transcript } = useBookReader();
  const { theme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  const currentSegment = transcript.find(seg => seg.id === state.currentSegmentId);
  const currentChapter = currentSegment?.text.split('.')[0] || 'Capítulo atual';

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'var(--rayo-sand-100)' }}>
      <div
        className="sticky top-0 z-10 border-b backdrop-blur-lg"
        style={{
          background: theme === 'dark' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: 'var(--rayo-sand-300)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} style={{ color: 'var(--rayo-ink-700)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Mode tabs (Read / Listen / Read + Listen) — só pro fluxo legado
              de transcrição mock. No PDF real essa UI não existe. */}
          <div
            className="flex items-center gap-1 bg-opacity-50 rounded-full p-1"
            style={{ background: 'var(--rayo-sand-300)' }}
          >
            {(['read', 'listen', 'read-listen'] as const).map((m) => (
              <Button
                key={m}
                variant="ghost"
                size="sm"
                onClick={() => setMode(m)}
                className="rounded-full px-3"
                style={{
                  background: state.mode === m ? 'var(--rayo-sand-50)' : 'transparent',
                  color: state.mode === m ? 'var(--rayo-forest-900)' : 'var(--rayo-ink-400)',
                }}
              >
                {m === 'read' ? 'Read' : m === 'listen' ? 'Listen' : 'Read + Listen'}
              </Button>
            ))}
          </div>
          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" style={{ color: 'var(--rayo-ink-700)' }}>
                <Settings2 className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}>
              <SheetHeader>
                <SheetTitle style={{ color: 'var(--rayo-forest-900)' }}>Configurações</SheetTitle>
                <SheetDescription style={{ color: 'var(--rayo-ink-400)' }}>
                  Personalize sua experiência de leitura
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div>
                  <h3 className="text-sm mb-3 flex items-center gap-2" style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}>
                    <User className="w-4 h-4" /> Narrador
                  </h3>
                  <div className="space-y-2">
                    <Button
                      variant={state.narratorVoice === 'female' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => { setNarrator('female'); toast.success('Narrador alterado para voz feminina'); }}
                      style={{
                        background: state.narratorVoice === 'female' ? 'var(--rayo-terra-500)' : 'transparent',
                        color: state.narratorVoice === 'female'
                          ? (theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF')
                          : 'var(--rayo-ink-700)',
                        borderColor: state.narratorVoice === 'female' ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)',
                      }}
                    >
                      👩 Voz Feminina
                    </Button>
                    <Button
                      variant={state.narratorVoice === 'male' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => { setNarrator('male'); toast.success('Narrador alterado para voz masculina'); }}
                      style={{
                        background: state.narratorVoice === 'male' ? 'var(--rayo-terra-500)' : 'transparent',
                        color: state.narratorVoice === 'male'
                          ? (theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF')
                          : 'var(--rayo-ink-700)',
                        borderColor: state.narratorVoice === 'male' ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)',
                      }}
                    >
                      👨 Voz Masculina
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl lg:text-3xl mb-6 lg:mb-8 leading-tight" style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}>
          {currentChapter}
        </h1>
        <TranscriptViewer />
      </div>

      <CompactAudioPlayer book={book} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// EPUB flow (Task #261) — leitor com refluxo de texto via epubjs.
//
// Diferenças do PDF:
// - Posição é um CFI (string). Persistimos no localStorage por livro pra
//   retomar exato; servidor também recebe `currentPage` como permil
//   1..1000 derivado de `location.start.percentage` pra exibir "X% lido".
// - "Sumário" usa hrefs internos (CFIs) em vez de número de página.
// - Settings sheet expõe tamanho/família de fonte e espaçamento; tema
//   light/sépia/escuro continua igual.
// ────────────────────────────────────────────────────────────────────────────

const EPUB_FONT_SIZE_KEY = 'rayo:reader:epub:fontSize';
const EPUB_FONT_FAMILY_KEY = 'rayo:reader:epub:fontFamily';
const EPUB_LINE_HEIGHT_KEY = 'rayo:reader:epub:lineHeight';
const EPUB_CFI_KEY = (id: string) => `rayo:reader:epub:cfi:${id}`;
const EPUB_FONT_SIZE_MIN = 80;
const EPUB_FONT_SIZE_MAX = 180;
const EPUB_FONT_SIZE_STEP = 10;

function readStoredEpubFontSize(): number {
  if (typeof window === 'undefined') return 110;
  const v = parseInt(window.localStorage.getItem(EPUB_FONT_SIZE_KEY) || '', 10);
  return Number.isFinite(v) && v >= EPUB_FONT_SIZE_MIN && v <= EPUB_FONT_SIZE_MAX ? v : 110;
}
function readStoredEpubFamily(): EpubFontFamily {
  if (typeof window === 'undefined') return 'serif';
  const v = window.localStorage.getItem(EPUB_FONT_FAMILY_KEY);
  return v === 'sans' || v === 'mono' || v === 'serif' ? v : 'serif';
}
function readStoredEpubLineHeight(): number {
  if (typeof window === 'undefined') return 1.55;
  const v = parseFloat(window.localStorage.getItem(EPUB_LINE_HEIGHT_KEY) || '');
  return Number.isFinite(v) && v >= 1.2 && v <= 2.2 ? v : 1.55;
}

function EpubBookReader({ book, onBack }: BookReaderPageProps) {
  const { updateBookProgress } = useApp();
  // Posição persistida no servidor é o permil 1..1000.
  const initialPermille = book.currentPage > 0 ? book.currentPage : 1;
  const [permille, setPermille] = useState<number>(initialPermille);
  const [loadedRemote, setLoadedRemote] = useState(false);
  const [initialCfi, setInitialCfi] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return window.localStorage.getItem(EPUB_CFI_KEY(book.id)); } catch { return null; }
  });

  const [highlights, setHighlights] = useState<ServerHighlight[]>([]);
  const [notes, setNotes] = useState<ServerNote[]>([]);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState<{ selection: EpubSelectionInfo; content: string } | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');
  const [jumpToCfi, setJumpToCfi] = useState<string | undefined>(undefined);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [forums, setForums] = useState<ForumOption[]>([]);
  const [forumsLoaded, setForumsLoaded] = useState(false);
  const [selectedForumId, setSelectedForumId] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>(() => readStoredTheme());
  const [fontSize, setFontSize] = useState<number>(() => readStoredEpubFontSize());
  const [fontFamily, setFontFamily] = useState<EpubFontFamily>(() => readStoredEpubFamily());
  const [lineHeight, setLineHeight] = useState<number>(() => readStoredEpubLineHeight());
  const [outline, setOutline] = useState<EpubOutlineItem[]>([]);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  // Sinal monotônico pro EpubViewer reagir mesmo se o usuário commitar o mesmo
  // permil duas vezes. Incrementa nonce a cada commit.
  const [seekPermille, setSeekPermille] = useState<number | null>(null);
  const seekNonceRef = useRef(0);

  // Persistência das preferências.
  useEffect(() => { try { localStorage.setItem(THEME_KEY, readerTheme); } catch {} }, [readerTheme]);
  useEffect(() => { try { localStorage.setItem(EPUB_FONT_SIZE_KEY, String(fontSize)); } catch {} }, [fontSize]);
  useEffect(() => { try { localStorage.setItem(EPUB_FONT_FAMILY_KEY, fontFamily); } catch {} }, [fontFamily]);
  useEffect(() => { try { localStorage.setItem(EPUB_LINE_HEIGHT_KEY, String(lineHeight)); } catch {} }, [lineHeight]);

  const toggleChrome = () => setChromeVisible((v) => !v);
  const anySheetOpen = annotationsOpen || tocOpen || settingsOpen || !!noteDraft || !!shareTarget;

  // Carrega progresso + anotações persistidos do servidor uma vez.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [progRes, annRes] = await Promise.all([
        api.get<{ progress: { currentPage: number } | null }>(
          `/api/books/${encodeURIComponent(book.id)}/progress`,
        ),
        api.get<{ highlights: ServerHighlight[]; notes: ServerNote[] }>(
          `/api/books/${encodeURIComponent(book.id)}/annotations`,
        ),
      ]);
      if (!alive) return;
      const remote = progRes.success && progRes.data?.progress?.currentPage;
      if (remote && remote > 0) {
        setPermille(remote);
        lastSavedRef.current = remote;
        pendingPermilleRef.current = remote;
      }
      if (annRes.success && annRes.data) {
        setHighlights(annRes.data.highlights || []);
        setNotes(annRes.data.notes || []);
      }
      setLoadedRemote(true);
    })();
    return () => { alive = false; };
  }, [book.id]);

  // Sincroniza highlights persistidos pro formato que o EpubViewer espera
  // (somente os que têm cfiRange — qualquer entrada legada de PDF é
  // ignorada por segurança).
  const epubHighlights: EpubViewerHighlight[] = useMemo(
    () => highlights
      .filter((h) => typeof h.cfiRange === 'string' && h.cfiRange.length > 0)
      .map((h) => ({ id: h.id, cfiRange: h.cfiRange as string, color: h.color })),
    [highlights],
  );

  const handleCreateHighlight = async (sel: EpubSelectionInfo, color: HighlightColor) => {
    const res = await api.post<{ highlight: ServerHighlight }>(
      `/api/books/${encodeURIComponent(book.id)}/highlights`,
      { page: sel.page, text: sel.text, color, rects: [], cfiRange: sel.cfiRange },
    );
    if (res.success && res.data?.highlight) {
      setHighlights((prev) => [...prev, res.data!.highlight]);
      toast.success('Trecho destacado');
    } else {
      toast.error(res.error?.message || 'Não foi possível destacar');
    }
  };

  const handleStartNote = (sel: EpubSelectionInfo) => {
    setNoteDraft({ selection: sel, content: '' });
  };

  const handleSaveNote = async () => {
    if (!noteDraft) return;
    const trimmed = noteDraft.content.trim();
    if (!trimmed) { toast.error('Escreva sua anotação'); return; }
    const res = await api.post<{ note: ServerNote }>(
      `/api/books/${encodeURIComponent(book.id)}/notes`,
      {
        page: noteDraft.selection.page,
        selectedText: noteDraft.selection.text,
        content: trimmed,
        cfi: noteDraft.selection.cfiRange,
      },
    );
    if (res.success && res.data?.note) {
      setNotes((prev) => [...prev, res.data!.note]);
      setNoteDraft(null);
      toast.success('Anotação salva');
    } else {
      toast.error(res.error?.message || 'Não foi possível salvar a anotação');
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    const prev = highlights;
    setHighlights((cur) => cur.filter((h) => h.id !== id));
    const res = await api.delete(`/api/books/${encodeURIComponent(book.id)}/highlights/${id}`);
    if (!res.success) {
      setHighlights(prev);
      toast.error('Não foi possível remover o destaque');
    }
  };

  const handleDeleteNote = async (id: string) => {
    const prev = notes;
    setNotes((cur) => cur.filter((n) => n.id !== id));
    const res = await api.delete(`/api/books/${encodeURIComponent(book.id)}/notes/${id}`);
    if (!res.success) {
      setNotes(prev);
      toast.error('Não foi possível remover a anotação');
    }
  };

  const ensureForumsLoaded = async () => {
    if (forumsLoaded) return;
    const res = await api.get<{ forums: ForumOption[] }>(`/api/community/forums/me`);
    let list: ForumOption[] = res.success && res.data?.forums ? res.data.forums : [];
    if (list.length === 0) {
      const all = await api.get<{ forums: ForumOption[] }>(`/api/community/forums`);
      list = all.success && all.data?.forums ? all.data.forums : [];
    }
    setForums(list);
    if (list.length > 0) setSelectedForumId((cur) => cur ?? list[0].id);
    setForumsLoaded(true);
  };

  const openShare = async (target: ShareTarget) => {
    setShareTarget(target);
    await ensureForumsLoaded();
  };

  const handleShare = async () => {
    if (!shareTarget || !selectedForumId) {
      toast.error('Selecione uma comunidade');
      return;
    }
    setSharing(true);
    const path = shareTarget.kind === 'hl'
      ? `/api/books/${encodeURIComponent(book.id)}/highlights/${shareTarget.id}/share`
      : `/api/books/${encodeURIComponent(book.id)}/notes/${shareTarget.id}/share`;
    const res = await api.post<{ post: { id: number } }>(path, { forum_id: selectedForumId });
    setSharing(false);
    if (res.success) {
      toast.success('Compartilhado na comunidade');
      setShareTarget(null);
    } else {
      toast.error(res.error?.message || 'Não foi possível compartilhar');
    }
  };

  const handleSaveEditedNote = async (id: string) => {
    const trimmed = editingNoteText.trim();
    if (!trimmed) { toast.error('Anotação não pode ficar vazia'); return; }
    const res = await api.patch<{ note: ServerNote }>(
      `/api/books/${encodeURIComponent(book.id)}/notes/${id}`,
      { content: trimmed },
    );
    if (res.success && res.data?.note) {
      setNotes((cur) => cur.map((n) => (n.id === id ? res.data!.note : n)));
      setEditingNoteId(null);
      setEditingNoteText('');
    } else {
      toast.error(res.error?.message || 'Não foi possível atualizar');
    }
  };

  // Jump pra anotação: usa o CFI quando disponível; o fallback (sem CFI)
  // não tem como navegar — não exibimos o ícone "ir pra" nesse caso.
  const goToCfi = (cfi: string) => {
    setJumpToCfi(cfi);
    setAnnotationsOpen(false);
    setTimeout(() => setJumpToCfi(undefined), 100);
  };
  const onJumpFromList = (pagePermille: number) => {
    // Tenta achar uma anotação dessa permille com CFI e usa o CFI dela.
    const hit = highlights.find((h) => h.page === pagePermille && h.cfiRange)
      ?? notes.find((n) => n.page === pagePermille && n.cfi);
    const cfi = (hit as { cfiRange?: string; cfi?: string } | undefined)?.cfiRange
      ?? (hit as { cfi?: string } | undefined)?.cfi;
    if (cfi) goToCfi(cfi);
    else setAnnotationsOpen(false);
  };

  // Persistência do progresso (debounced + flush no unmount), e CFI local.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<number>(initialPermille);
  const pendingPermilleRef = useRef<number>(initialPermille);

  const schedulePersist = (next: number) => {
    pendingPermilleRef.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      saveTimer.current = null;
      const toSave = pendingPermilleRef.current;
      if (toSave === lastSavedRef.current) return;
      const res = await api.put<{ progress: { currentPage: number } }>(
        `/api/books/${encodeURIComponent(book.id)}/progress`,
        { currentPage: toSave },
      );
      if (res.success && res.data?.progress) {
        lastSavedRef.current = res.data.progress.currentPage;
      }
    }, 800);
  };

  const handleLocationChange = ({ permille: p, cfi }: { permille: number; cfi: string }) => {
    setPermille(p);
    updateBookProgress(book.id, p);
    // Guarda CFI local pra retomar exato em próxima abertura.
    if (cfi) {
      try { localStorage.setItem(EPUB_CFI_KEY(book.id), cfi); } catch {}
    }
    if (loadedRemote) schedulePersist(p);
    // Depois da primeira navegação real, o `initialCfi` deixa de importar
    // — limpamos pra evitar resets em re-renders.
    if (initialCfi !== null) setInitialCfi(null);
  };

  useEffect(() => {
    const bookId = book.id;
    return () => {
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      const last = pendingPermilleRef.current;
      if (last !== lastSavedRef.current) {
        api.put(`/api/books/${encodeURIComponent(bookId)}/progress`, { currentPage: last }).catch(() => {});
      }
    };
  }, [book.id]);

  const progressPct = Math.max(0, Math.min(100, Math.round(permille / 10)));
  const displayPct = scrubValue != null ? Math.round(scrubValue / 10) : progressPct;

  const pageBg =
    readerTheme === 'sepia' ? '#efe3c8' :
    readerTheme === 'dark'  ? '#15181d' :
    'var(--rayo-sand-100)';
  const chromeFg = readerTheme === 'dark' ? '#e7e3d6' : 'var(--rayo-ink-700)';
  const chromeBgGlass = readerTheme === 'dark'
    ? 'rgba(20, 23, 28, 0.85)'
    : readerTheme === 'sepia'
      ? 'rgba(239, 227, 200, 0.92)'
      : 'rgba(255, 255, 255, 0.92)';
  const topBarClass = chromeVisible
    ? 'translate-y-0 opacity-100'
    : 'pointer-events-none -translate-y-full opacity-0';
  const bottomBarClass = chromeVisible
    ? 'translate-y-0 opacity-100'
    : 'pointer-events-none translate-y-full opacity-0';

  const labelForPage = (p: number) => `${Math.max(0, Math.min(100, Math.round(p / 10)))}%`;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: pageBg, transition: 'background 200ms ease' }}
    >
      <div
        className={`fixed top-0 left-0 right-0 z-20 border-b backdrop-blur-lg transition-all duration-200 ${topBarClass}`}
        style={{
          background: chromeBgGlass,
          borderColor: readerTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'var(--rayo-sand-300)',
        }}
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} style={{ color: chromeFg }} aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center truncate text-sm" style={{ color: chromeFg, fontWeight: 600 }}>
            {book.title}
          </div>
          <Button
            variant="ghost" size="sm" className="gap-1"
            onClick={() => setAnnotationsOpen(true)}
            style={{ color: chromeFg }}
            aria-label="Minhas anotações"
          >
            <BookMarked className="w-4 h-4" />
            <span className="text-xs tabular-nums">{highlights.length + notes.length}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-2 sm:px-4 pt-14 pb-24">
        <EpubViewer
          fileUrl={book.fileUrl!}
          initialCfi={initialCfi}
          onLocationChange={handleLocationChange}
          highlights={epubHighlights}
          onCreateHighlight={handleCreateHighlight}
          onCreateNote={handleStartNote}
          jumpToCfi={jumpToCfi}
          seekToPermille={seekPermille}
          theme={readerTheme}
          fontSize={fontSize}
          fontFamily={fontFamily}
          lineHeight={lineHeight}
          onTapCenter={toggleChrome}
          onOutlineReady={setOutline}
          hideSelectionMenu={anySheetOpen}
        />
      </div>

      <div
        className={`fixed bottom-0 left-0 right-0 z-20 border-t backdrop-blur-lg transition-all duration-200 ${bottomBarClass}`}
        style={{
          background: chromeBgGlass,
          borderColor: readerTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'var(--rayo-sand-300)',
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums w-12 text-right" style={{ color: chromeFg }}>
              {displayPct}%
            </span>
            <input
              type="range"
              min={1}
              max={1000}
              value={scrubValue ?? permille}
              onChange={(e) => setScrubValue(parseInt(e.target.value, 10) || 1)}
              onMouseUp={() => {
                // Commit do scrub: pede ao EpubViewer pra gerar `book.locations`
                // (uma vez) e navegar pra CFI mapeado da percentagem. A primeira
                // chamada pode levar 1-3s em livros longos; chamadas seguintes
                // são instantâneas.
                if (scrubValue != null) {
                  seekNonceRef.current += 1;
                  // Codifica o nonce no permille via fracionária pra forçar
                  // mudança de identidade do prop a cada commit (até quando o
                  // usuário arrasta pro mesmo valor de novo).
                  setSeekPermille(scrubValue + seekNonceRef.current * 1e-6);
                  setPermille(scrubValue);
                  schedulePersist(scrubValue);
                  setScrubValue(null);
                }
              }}
              onTouchEnd={() => {
                if (scrubValue != null) {
                  seekNonceRef.current += 1;
                  setSeekPermille(scrubValue + seekNonceRef.current * 1e-6);
                  setPermille(scrubValue);
                  schedulePersist(scrubValue);
                  setScrubValue(null);
                }
              }}
              className="flex-1 accent-current"
              style={{ color: 'var(--rayo-terra-500)' }}
              aria-label="Progresso de leitura"
            />
            <span className="text-xs tabular-nums w-12" style={{ color: chromeFg, opacity: 0.7 }} />
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost" size="sm" className="gap-1.5"
              onClick={() => setTocOpen(true)}
              disabled={outline.length === 0}
              style={{ color: chromeFg }}
              aria-label="Sumário"
            >
              <List className="w-4 h-4" />
              <span className="text-xs">Sumário</span>
            </Button>
            <div className="text-xs tabular-nums" style={{ color: chromeFg, opacity: 0.7 }}>
              {progressPct}% lido
            </div>
            <Button
              variant="ghost" size="sm" className="gap-1.5"
              onClick={() => setSettingsOpen(true)}
              style={{ color: chromeFg }}
              aria-label="Ajustes de leitura"
            >
              <Settings2 className="w-4 h-4" />
              <span className="text-xs">Ajustes</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Sheet: Anotações */}
      <Sheet open={annotationsOpen} onOpenChange={setAnnotationsOpen}>
        <SheetContent side="right" style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--rayo-forest-900)' }}>Minhas anotações</SheetTitle>
            <SheetDescription style={{ color: 'var(--rayo-ink-400)' }}>
              Todos os destaques e anotações deste livro.
            </SheetDescription>
          </SheetHeader>
          <AnnotationsList
            highlights={highlights}
            notes={notes}
            onJump={onJumpFromList}
            onDeleteHighlight={handleDeleteHighlight}
            onDeleteNote={handleDeleteNote}
            editingNoteId={editingNoteId}
            editingNoteText={editingNoteText}
            setEditingNoteId={setEditingNoteId}
            setEditingNoteText={setEditingNoteText}
            onSaveEditedNote={handleSaveEditedNote}
            onShare={openShare}
            labelForPage={labelForPage}
          />
        </SheetContent>
      </Sheet>

      {/* Sheet: Sumário (TOC do EPUB) */}
      <Sheet open={tocOpen} onOpenChange={setTocOpen}>
        <SheetContent side="left" style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--rayo-forest-900)' }}>Sumário</SheetTitle>
            <SheetDescription style={{ color: 'var(--rayo-ink-400)' }}>
              Capítulos e seções deste livro.
            </SheetDescription>
          </SheetHeader>
          {outline.length === 0 ? (
            <div className="mt-10 text-center text-sm flex flex-col items-center gap-3" style={{ color: 'var(--rayo-ink-400)' }}>
              <BookOpen className="w-8 h-8 opacity-50" />
              <p>Este livro ainda não tem um sumário interno.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-1 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {outline.map((item, idx) => (
                <button
                  key={`${item.cfi}-${idx}`}
                  type="button"
                  onClick={() => { setTocOpen(false); goToCfi(item.cfi); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:opacity-80"
                  style={{ background: 'transparent', color: 'var(--rayo-forest-900)' }}
                >
                  <span className="text-sm">{item.title}</span>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet: Ajustes (tema + tipografia) */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--rayo-forest-900)' }}>Ajustes de leitura</SheetTitle>
            <SheetDescription style={{ color: 'var(--rayo-ink-400)' }}>
              Personalize a aparência do leitor.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6 pb-6">
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--rayo-ink-400)', fontWeight: 600 }}>TEMA</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'light' as const, label: 'Claro', icon: <Sun className="w-4 h-4" />, bg: '#FFFFFF', fg: '#1a1d23' },
                  { id: 'sepia' as const, label: 'Sépia', icon: <BookOpen className="w-4 h-4" />, bg: '#efe3c8', fg: '#5a4a2a' },
                  { id: 'dark'  as const, label: 'Escuro', icon: <Moon className="w-4 h-4" />, bg: '#15181d', fg: '#e7e3d6' },
                ]).map((opt) => {
                  const active = readerTheme === opt.id;
                  return (
                    <button
                      key={opt.id} type="button"
                      onClick={() => setReaderTheme(opt.id)}
                      className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl"
                      style={{
                        background: opt.bg, color: opt.fg,
                        border: `2px solid ${active ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)'}`,
                        fontWeight: active ? 700 : 500,
                      }}
                      aria-pressed={active}
                    >
                      {opt.icon}
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--rayo-ink-400)', fontWeight: 600 }}>
                TAMANHO DA FONTE · {fontSize}%
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setFontSize((s) => Math.max(EPUB_FONT_SIZE_MIN, s - EPUB_FONT_SIZE_STEP))}
                  disabled={fontSize <= EPUB_FONT_SIZE_MIN}
                  aria-label="Diminuir fonte"
                  style={{ color: 'var(--rayo-forest-900)' }}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <input
                  type="range"
                  min={EPUB_FONT_SIZE_MIN} max={EPUB_FONT_SIZE_MAX} step={EPUB_FONT_SIZE_STEP}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="flex-1"
                  style={{ accentColor: 'var(--rayo-terra-500)' }}
                  aria-label="Tamanho da fonte"
                />
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setFontSize((s) => Math.min(EPUB_FONT_SIZE_MAX, s + EPUB_FONT_SIZE_STEP))}
                  disabled={fontSize >= EPUB_FONT_SIZE_MAX}
                  aria-label="Aumentar fonte"
                  style={{ color: 'var(--rayo-forest-900)' }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setFontSize(110)}
                  style={{ color: 'var(--rayo-ink-700)' }}
                >
                  Reset
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--rayo-ink-400)', fontWeight: 600 }}>FAMÍLIA</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'serif' as const, label: 'Serifa', sample: 'Aa', style: { fontFamily: 'Georgia, serif' } },
                  { id: 'sans'  as const, label: 'Sem serifa', sample: 'Aa', style: { fontFamily: 'Outfit, system-ui, sans-serif' } },
                  { id: 'mono'  as const, label: 'Mono', sample: 'Aa', style: { fontFamily: 'JetBrains Mono, monospace' } },
                ]).map((opt) => {
                  const active = fontFamily === opt.id;
                  return (
                    <button
                      key={opt.id} type="button"
                      onClick={() => setFontFamily(opt.id)}
                      className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl"
                      style={{
                        background: '#FFFFFF',
                        color: 'var(--rayo-forest-900)',
                        border: `2px solid ${active ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)'}`,
                        fontWeight: active ? 700 : 500,
                      }}
                      aria-pressed={active}
                    >
                      <span className="text-lg" style={opt.style}>{opt.sample}</span>
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--rayo-ink-400)', fontWeight: 600 }}>
                ESPAÇAMENTO · {lineHeight.toFixed(2)}
              </p>
              <input
                type="range"
                min={1.2} max={2.2} step={0.05}
                value={lineHeight}
                onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--rayo-terra-500)' }}
                aria-label="Espaçamento entre linhas"
              />
            </div>

            <p className="text-xs" style={{ color: 'var(--rayo-ink-400)', textAlign: 'center' }}>
              Toque no centro pra esconder ou mostrar as barras.
              <br />Toque nas laterais ou arraste pra virar a página.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de compartilhamento */}
      {shareTarget && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          role="dialog" aria-modal="true" aria-label="Compartilhar na comunidade"
          onClick={(e) => { if (e.target === e.currentTarget && !sharing) setShareTarget(null); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-xl"
            style={{ background: 'var(--rayo-sand-50)', border: '1px solid var(--rayo-sand-300)' }}
          >
            <h3 className="text-base mb-3" style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}>
              Compartilhar na comunidade
            </h3>
            <blockquote
              className="text-sm mb-3 p-3 rounded-lg italic"
              style={{ background: 'var(--rayo-sand-100)', borderLeft: '3px solid var(--rayo-terra-500)', color: 'var(--rayo-ink-700)' }}
            >
              “{(shareTarget.kind === 'hl' ? shareTarget.text : (shareTarget.selectedText || shareTarget.content)).slice(0, 240)}
              {(shareTarget.kind === 'hl' ? shareTarget.text : (shareTarget.selectedText || shareTarget.content)).length > 240 ? '…' : ''}”
            </blockquote>
            <label className="text-xs mb-1 block" style={{ color: 'var(--rayo-ink-400)' }}>
              Em qual comunidade?
            </label>
            {forums.length === 0 ? (
              <p className="text-sm py-3" style={{ color: 'var(--rayo-ink-400)' }}>
                {forumsLoaded ? 'Você ainda não participa de nenhuma comunidade.' : 'Carregando comunidades…'}
              </p>
            ) : (
              <select
                value={selectedForumId ?? ''}
                onChange={(e) => setSelectedForumId(parseInt(e.target.value, 10) || null)}
                className="w-full rounded-lg p-2 text-sm"
                style={{ background: '#FFFFFF', border: '1px solid var(--rayo-sand-300)', color: 'var(--rayo-forest-900)' }}
              >
                {forums.map((f) => (
                  <option key={f.id} value={f.id}>{f.icon ? `${f.icon} ` : ''}{f.name}</option>
                ))}
              </select>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShareTarget(null)} disabled={sharing} style={{ color: 'var(--rayo-ink-700)' }}>
                Cancelar
              </Button>
              <Button
                onClick={handleShare}
                disabled={sharing || !selectedForumId || forums.length === 0}
                style={{ background: 'var(--rayo-terra-500)', color: '#FFFFFF', fontWeight: 600 }}
              >
                {sharing ? 'Compartilhando…' : 'Compartilhar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de criação de nota */}
      {noteDraft && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          role="dialog" aria-modal="true" aria-label="Nova anotação"
          onClick={(e) => { if (e.target === e.currentTarget) setNoteDraft(null); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-xl"
            style={{ background: 'var(--rayo-sand-50)', border: '1px solid var(--rayo-sand-300)' }}
          >
            <h3 className="text-base mb-3" style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}>
              Nova anotação · {labelForPage(noteDraft.selection.page)} lido
            </h3>
            {noteDraft.selection.text && (
              <blockquote
                className="text-sm mb-3 p-3 rounded-lg italic"
                style={{ background: 'var(--rayo-sand-100)', borderLeft: '3px solid var(--rayo-terra-500)', color: 'var(--rayo-ink-700)' }}
              >
                “{noteDraft.selection.text.length > 280
                  ? noteDraft.selection.text.slice(0, 280) + '…'
                  : noteDraft.selection.text}”
              </blockquote>
            )}
            <textarea
              autoFocus
              value={noteDraft.content}
              onChange={(e) => setNoteDraft({ ...noteDraft, content: e.target.value })}
              placeholder="Escreva sua anotação…"
              rows={5} maxLength={4000}
              className="w-full rounded-lg p-3 text-sm resize-none"
              style={{ background: '#FFFFFF', border: '1px solid var(--rayo-sand-300)', color: 'var(--rayo-forest-900)' }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" onClick={() => setNoteDraft(null)} style={{ color: 'var(--rayo-ink-700)' }}>Cancelar</Button>
              <Button
                onClick={handleSaveNote}
                style={{ background: 'var(--rayo-terra-500)', color: '#FFFFFF', fontWeight: 600 }}
              >
                Salvar anotação
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Entrypoint — escolhe entre EPUB, PDF, legacy mock ou mensagem de "sem arquivo".
// ────────────────────────────────────────────────────────────────────────────

function isEpubUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  // O fileUrl é uma signed URL — o path tem `.epub` antes da query string.
  return /\.epub(\?|#|$)/i.test(url);
}

export function BookReaderPage({ book, onBack }: BookReaderPageProps) {
  // 1) EPUB com refluxo (Task #261) — leitor estilo Kindle.
  if (book.fileUrl && isEpubUrl(book.fileUrl)) {
    return <EpubBookReader book={book} onBack={onBack} />;
  }
  // 2) Livro do CMS com arquivo real → leitor PDF de verdade.
  if (book.fileUrl) {
    return <PdfBookReader book={book} onBack={onBack} />;
  }

  // 2) Livro sem arquivo mas com transcrição mock → fluxo legado de áudio.
  const content = getBookContent(book.slug ?? book.id);
  if (content) {
    return (
      <BookReaderProvider book={book} transcript={content.transcript} audioUrl={content.audioUrl}>
        <LegacyBookReaderContent book={book} onBack={onBack} />
      </BookReaderProvider>
    );
  }

  // 3) Sem arquivo nem transcrição → mensagem amigável + CTA pra biblioteca.
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--rayo-sand-100)' }}>
      <div className="px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onBack} style={{ color: 'var(--rayo-ink-700)' }}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div
          className="max-w-md text-center px-6 py-8 rounded-2xl"
          style={{
            background: 'var(--rayo-sand-50)',
            border: '1px solid var(--rayo-sand-300)',
          }}
        >
          <h2 className="text-xl mb-2" style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}>
            Este livro ainda não tem arquivo disponível
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--rayo-ink-700)' }}>
            Nossa equipe está preparando o conteúdo. Volte em breve — você receberá uma notificação assim que estiver pronto.
          </p>
          <Button
            onClick={onBack}
            className="gap-2"
            style={{
              background: 'var(--rayo-terra-500)',
              color: '#FFFFFF',
              fontWeight: 600,
            }}
          >
            <ArrowLeftCircle className="w-4 h-4" />
            Voltar pra Biblioteca
          </Button>
        </div>
      </div>
    </div>
  );
}
