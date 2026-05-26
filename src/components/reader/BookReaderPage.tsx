// ============================================================================
// 📚 RAYO ECOSYSTEM - BOOK READER PAGE
// Leitor de livros. Quando o livro tem `fileUrl` (PDF real do CMS),
// renderiza o PdfViewer. Quando não tem, cai pro fluxo legado de
// transcrição mock (mantido pra compat enquanto migramos catálogo).
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, User, Settings2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Book } from '../types/BookTypes';
import { useTheme } from '../ThemeProvider';
import { useApp } from '../AppContext';
import { BookReaderProvider, useBookReader } from './BookReaderContext';
import { getBookContent } from './mockTranscripts';
import { TranscriptViewer } from './TranscriptViewer';
import { CompactAudioPlayer } from './CompactAudioPlayer';
import { PdfViewer } from './PdfViewer';
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

  // Carrega progresso persistido do servidor uma vez.
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await api.get<{ progress: { currentPage: number } | null }>(
        `/api/books/${encodeURIComponent(book.id)}/progress`,
      );
      if (!alive) return;
      const remote = res.success && res.data?.progress?.currentPage;
      if (remote && remote > 0) {
        setInitialPage(remote);
        setPage(remote);
      }
      setLoadedRemote(true);
    })();
    return () => { alive = false; };
  }, [book.id]);

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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} style={{ color: 'var(--rayo-ink-700)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center truncate text-sm" style={{ color: 'var(--rayo-forest-900)', fontWeight: 600 }}>
            {book.title}
          </div>
          <div className="text-xs tabular-nums" style={{ color: 'var(--rayo-ink-400)' }}>
            {total > 0 ? `${progressPct}%` : ''}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-2 sm:px-4 py-4">
        <PdfViewer
          fileUrl={book.fileUrl!}
          initialPage={initialPage}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Legacy flow (transcrição mock — preservado pra livros sem arquivo)
// ────────────────────────────────────────────────────────────────────────────

function LegacyBookReaderContent({ book, onBack }: BookReaderPageProps) {
  const { state, setNarrator, transcript } = useBookReader();
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
          <div className="flex-1" />
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

  // 3) Sem arquivo nem transcrição → mensagem amigável.
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
          <p className="text-sm" style={{ color: 'var(--rayo-ink-700)' }}>
            Nossa equipe está preparando o conteúdo. Volte em breve — você receberá uma notificação assim que estiver pronto.
          </p>
        </div>
      </div>
    </div>
  );
}
