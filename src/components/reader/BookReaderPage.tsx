// ============================================================================
// 📚 RAYO ECOSYSTEM - BOOK READER PAGE
// Leitor de livros. Quando o livro tem `fileUrl` (PDF real do CMS),
// renderiza o PdfViewer. Quando não tem, cai pro fluxo legado de
// transcrição mock (mantido pra compat enquanto migramos catálogo).
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowLeftCircle, User, Settings2, BookMarked, StickyNote, Trash2, Pencil, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Book } from '../types/BookTypes';
import { useTheme } from '../ThemeProvider';
import { useApp } from '../AppContext';
import { BookReaderProvider, useBookReader } from './BookReaderContext';
import { getBookContent } from './mockTranscripts';
import { TranscriptViewer } from './TranscriptViewer';
import { CompactAudioPlayer } from './CompactAudioPlayer';
import { PdfViewer, type RenderedHighlight, type HighlightColor, type SelectionInfo, type NormalizedRect } from './PdfViewer';
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

interface BookReaderPageProps {
  book: Book;
  onBack: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// PDF flow (livros do CMS com `fileUrl`)
// ────────────────────────────────────────────────────────────────────────────

function PdfBookReader({ book, onBack }: BookReaderPageProps) {
  const { theme } = useTheme();
  const { updateBookProgress } = useApp();
  const [initialPage, setInitialPage] = useState<number>(book.currentPage > 0 ? book.currentPage : 1);
  const [page, setPage] = useState<number>(initialPage);
  const [total, setTotal] = useState<number>(book.pages || 0);
  const [loadedRemote, setLoadedRemote] = useState(false);
  const [highlights, setHighlights] = useState<ServerHighlight[]>([]);
  const [notes, setNotes] = useState<ServerNote[]>([]);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState<{ selection: SelectionInfo; content: string } | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');
  const [jumpToPage, setJumpToPage] = useState<number | undefined>(undefined);

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

  return (
    <div className="min-h-screen flex flex-col pb-10" style={{ background: 'var(--rayo-sand-100)' }}>
      <div
        className="sticky top-0 z-10 border-b backdrop-blur-lg"
        style={{
          background: theme === 'dark' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: 'var(--rayo-sand-300)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} style={{ color: 'var(--rayo-ink-700)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center truncate text-sm" style={{ color: 'var(--rayo-forest-900)', fontWeight: 600 }}>
            {book.title}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs tabular-nums hidden sm:block" style={{ color: 'var(--rayo-ink-400)' }}>
              {total > 0 ? `${progressPct}%` : ''}
            </div>
            <Sheet open={annotationsOpen} onOpenChange={setAnnotationsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  style={{ color: 'var(--rayo-ink-700)' }}
                  aria-label="Minhas anotações"
                >
                  <BookMarked className="w-4 h-4" />
                  <span className="text-xs tabular-nums">
                    {highlights.length + notes.length}
                  </span>
                </Button>
              </SheetTrigger>
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
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-2 sm:px-4 py-4">
        <PdfViewer
          fileUrl={book.fileUrl!}
          initialPage={initialPage}
          onPageChange={handlePageChange}
          highlights={renderedHighlights}
          onCreateHighlight={handleCreateHighlight}
          onCreateNote={handleStartNote}
          jumpToPage={jumpToPage}
        />
      </div>

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
}) {
  const {
    highlights, notes, onJump, onDeleteHighlight, onDeleteNote,
    editingNoteId, editingNoteText, setEditingNoteId, setEditingNoteText, onSaveEditedNote,
  } = props;

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
                aria-label={`Ir para a página ${item.page}`}
              >
                Pág. {item.page}
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
// Entrypoint — escolhe entre PDF real, legacy mock ou mensagem de "sem arquivo".
// ────────────────────────────────────────────────────────────────────────────

export function BookReaderPage({ book, onBack }: BookReaderPageProps) {
  // 1) Livro do CMS com arquivo real → leitor PDF de verdade.
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
