// ============================================================================
// 📚 RAYO — PdfViewer (Task #252)
// Leitor PDF real usando react-pdf. Navega página a página, atalhos
// de teclado e callback de mudança de página pra persistir progresso.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Vite resolve esse URL pra um asset bundled — same-origin, sem CDN externa.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface PdfViewerProps {
  fileUrl: string;
  initialPage?: number;
  onPageChange?: (page: number, totalPages: number) => void;
}

export function PdfViewer({ fileUrl, initialPage = 1, onPageChange }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(Math.max(1, initialPage));
  const [pageInput, setPageInput] = useState<string>(String(Math.max(1, initialPage)));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [width, setWidth] = useState<number>(800);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Re-syncs quando o initialPage muda (e.g. trocar de livro).
  useEffect(() => {
    setPageNumber(Math.max(1, initialPage));
    setPageInput(String(Math.max(1, initialPage)));
  }, [initialPage, fileUrl]);

  // Largura responsiva: usa o container, com tope de 900px pra leitura confortável.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      const w = el.clientWidth;
      setWidth(Math.min(900, Math.max(280, w - 16)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const total = numPages || 1;
      const clamped = Math.max(1, Math.min(total, Math.floor(next)));
      setPageNumber(clamped);
      setPageInput(String(clamped));
      onPageChange?.(clamped, total);
    },
    [numPages, onPageChange],
  );

  const goPrev = useCallback(() => goTo(pageNumber - 1), [goTo, pageNumber]);
  const goNext = useCallback(() => goTo(pageNumber + 1), [goTo, pageNumber]);

  // Atalhos teclado — só quando o foco não está em input/textarea.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); goNext(); }
      else if (e.key === 'Home') { e.preventDefault(); goTo(1); }
      else if (e.key === 'End') { e.preventDefault(); goTo(numPages || 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, goTo, numPages]);

  const onDocLoad = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total);
      setLoadError(null);
      // Garante que o initialPage não passa do total.
      const start = Math.max(1, Math.min(total, pageNumber));
      if (start !== pageNumber) {
        setPageNumber(start);
        setPageInput(String(start));
      }
      onPageChange?.(start, total);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const fileProp = useMemo(() => ({ url: fileUrl }), [fileUrl]);

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center">
      {loadError ? (
        <div
          className="my-12 px-6 py-4 rounded-lg text-center max-w-md"
          style={{
            background: 'var(--rayo-sand-50)',
            border: '1px solid var(--rayo-sand-300)',
            color: 'var(--rayo-ink-700)',
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 6 }}>Não foi possível abrir o PDF</p>
          <p className="text-sm" style={{ color: 'var(--rayo-ink-400)' }}>{loadError}</p>
        </div>
      ) : (
        <Document
          file={fileProp}
          onLoadSuccess={onDocLoad}
          onLoadError={(err) => setLoadError(err?.message || 'Erro ao carregar arquivo.')}
          loading={
            <div className="flex items-center gap-2 my-12" style={{ color: 'var(--rayo-ink-400)' }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Carregando livro…</span>
            </div>
          }
          error={
            <div className="my-12 text-center" style={{ color: 'var(--rayo-ink-400)' }}>
              Não foi possível abrir o PDF.
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={width}
            renderTextLayer
            renderAnnotationLayer
          />
        </Document>
      )}

      {/* Navegação */}
      {numPages > 0 && !loadError && (
        <div
          className="sticky bottom-2 mt-6 flex items-center gap-3 px-4 py-2 rounded-full shadow-lg"
          style={{
            background: 'var(--rayo-sand-50)',
            border: '1px solid var(--rayo-sand-300)',
          }}
        >
          <button
            onClick={goPrev}
            disabled={pageNumber <= 1}
            aria-label="Página anterior"
            className="p-2 rounded-full disabled:opacity-40"
            style={{ color: 'var(--rayo-ink-700)' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(pageInput, 10);
              if (Number.isFinite(n)) goTo(n); else setPageInput(String(pageNumber));
            }}
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--rayo-ink-700)' }}
          >
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={() => {
                const n = parseInt(pageInput, 10);
                if (Number.isFinite(n)) goTo(n); else setPageInput(String(pageNumber));
              }}
              inputMode="numeric"
              aria-label="Número da página"
              className="w-12 text-center rounded px-1 py-0.5"
              style={{
                background: 'var(--rayo-sand-100)',
                border: '1px solid var(--rayo-sand-300)',
                color: 'var(--rayo-forest-900)',
              }}
            />
            <span style={{ color: 'var(--rayo-ink-400)' }}>de {numPages}</span>
          </form>

          <button
            onClick={goNext}
            disabled={pageNumber >= numPages}
            aria-label="Próxima página"
            className="p-2 rounded-full disabled:opacity-40"
            style={{ color: 'var(--rayo-ink-700)' }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
