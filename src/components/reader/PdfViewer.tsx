// ============================================================================
// 📚 RAYO — PdfViewer (Tasks #252 + #255)
// Leitor PDF real usando react-pdf. Suporta:
// - Navegação página a página, atalhos e callback de mudança de página.
// - Seleção de texto que abre menu flutuante "Destacar" / "Anotar".
// - Overlay de destaques persistidos (renderizados em rects normalizados).
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, Highlighter, StickyNote, X } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Vite resolve esse URL pra um asset bundled — same-origin, sem CDN externa.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface NormalizedRect { x: number; y: number; w: number; h: number }

export interface RenderedHighlight {
  id: string;
  page: number;
  color: HighlightColor;
  rects: NormalizedRect[];
  text: string;
}

export interface SelectionInfo {
  page: number;
  text: string;
  rects: NormalizedRect[];
}

export interface PdfViewerProps {
  fileUrl: string;
  initialPage?: number;
  onPageChange?: (page: number, totalPages: number) => void;
  /** Destaques já persistidos (todas as páginas — o viewer filtra pela atual). */
  highlights?: RenderedHighlight[];
  /** Chamado quando o usuário pede pra destacar a seleção corrente. */
  onCreateHighlight?: (sel: SelectionInfo, color: HighlightColor) => void;
  /** Chamado quando o usuário pede pra anotar a seleção corrente. */
  onCreateNote?: (sel: SelectionInfo) => void;
  /** Página que o pai quer focar (controlado externamente — "ir pra anotação"). */
  jumpToPage?: number;
}

const COLOR_BG: Record<HighlightColor, string> = {
  yellow: 'rgba(253, 224, 71, 0.45)',
  green: 'rgba(134, 239, 172, 0.45)',
  blue: 'rgba(147, 197, 253, 0.45)',
  pink: 'rgba(249, 168, 212, 0.45)',
};

const COLOR_SWATCH: Record<HighlightColor, string> = {
  yellow: '#FACC15',
  green: '#4ADE80',
  blue: '#60A5FA',
  pink: '#F472B6',
};

export function PdfViewer({
  fileUrl,
  initialPage = 1,
  onPageChange,
  highlights = [],
  onCreateHighlight,
  onCreateNote,
  jumpToPage,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(Math.max(1, initialPage));
  const [pageInput, setPageInput] = useState<string>(String(Math.max(1, initialPage)));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState<number>(0);
  const [width, setWidth] = useState<number>(800);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageWrapRef = useRef<HTMLDivElement | null>(null);

  // Refs pra evitar stale closures no onDocLoad.
  const pageNumberRef = useRef(pageNumber);
  const onPageChangeRef = useRef(onPageChange);
  useEffect(() => { pageNumberRef.current = pageNumber; }, [pageNumber]);
  useEffect(() => { onPageChangeRef.current = onPageChange; }, [onPageChange]);

  // Re-syncs quando o initialPage muda (e.g. trocar de livro).
  useEffect(() => {
    setPageNumber(Math.max(1, initialPage));
    setPageInput(String(Math.max(1, initialPage)));
  }, [initialPage, fileUrl]);

  // Largura responsiva.
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
      setSelectionMenu(null);
    },
    [numPages, onPageChange],
  );

  const goPrev = useCallback(() => goTo(pageNumber - 1), [goTo, pageNumber]);
  const goNext = useCallback(() => goTo(pageNumber + 1), [goTo, pageNumber]);

  // Pulo externo (controlado pelo pai).
  useEffect(() => {
    if (typeof jumpToPage === 'number' && jumpToPage >= 1 && jumpToPage !== pageNumber) {
      goTo(jumpToPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToPage]);

  // Atalhos teclado — só quando foco não está em input/textarea.
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

  const onDocLoad = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setLoadError(null);
    const current = pageNumberRef.current;
    const start = Math.max(1, Math.min(total, current));
    if (start !== current) {
      setPageNumber(start);
      setPageInput(String(start));
    }
    onPageChangeRef.current?.(start, total);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fileProp = useMemo(() => ({ url: fileUrl }), [fileUrl, loadKey]);

  // ──────────────────────────────────────────────────────────────────────────
  // Seleção de texto → menu flutuante
  // ──────────────────────────────────────────────────────────────────────────
  interface SelectionMenuState {
    top: number;          // px relativo ao container
    left: number;         // px relativo ao container
    selection: SelectionInfo;
  }
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState | null>(null);

  const computeSelection = useCallback((): SelectionMenuState | null => {
    if (!pageWrapRef.current || !containerRef.current) return null;
    if (!pageSize) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const text = sel.toString().trim();
    if (!text) return null;
    const range = sel.getRangeAt(0);
    // Só ativa se a seleção estiver dentro da página renderizada.
    const startNode = range.startContainer.parentElement;
    const endNode = range.endContainer.parentElement;
    const wrap = pageWrapRef.current;
    if (!startNode || !endNode || !wrap.contains(startNode) || !wrap.contains(endNode)) {
      return null;
    }
    const pageRect = wrap.getBoundingClientRect();
    if (pageRect.width <= 0 || pageRect.height <= 0) return null;

    const clientRects = Array.from(range.getClientRects());
    const rects: NormalizedRect[] = [];
    for (const r of clientRects) {
      if (r.width <= 0 || r.height <= 0) continue;
      rects.push({
        x: (r.left - pageRect.left) / pageRect.width,
        y: (r.top - pageRect.top) / pageRect.height,
        w: r.width / pageRect.width,
        h: r.height / pageRect.height,
      });
    }
    if (rects.length === 0) return null;

    const containerRect = containerRef.current.getBoundingClientRect();
    const last = clientRects[clientRects.length - 1];
    const top = last.bottom - containerRect.top + 6;
    const left = Math.max(8, last.left - containerRect.left);

    return {
      top,
      left,
      selection: { page: pageNumber, text: text.slice(0, 4000), rects },
    };
  }, [pageNumber, pageSize]);

  useEffect(() => {
    const handler = () => {
      // pequeno debounce pra dar tempo do mouseup finalizar a seleção
      setTimeout(() => {
        const s = computeSelection();
        setSelectionMenu(s);
      }, 0);
    };
    document.addEventListener('mouseup', handler);
    document.addEventListener('touchend', handler);
    return () => {
      document.removeEventListener('mouseup', handler);
      document.removeEventListener('touchend', handler);
    };
  }, [computeSelection]);

  // Fecha o menu se a seleção sumir (ex: usuário clica em outro lugar).
  useEffect(() => {
    const onSelChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) setSelectionMenu(null);
    };
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, []);

  const closeMenu = () => {
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const onHighlightClick = (color: HighlightColor) => {
    if (!selectionMenu) return;
    onCreateHighlight?.(selectionMenu.selection, color);
    closeMenu();
  };
  const onNoteClick = () => {
    if (!selectionMenu) return;
    onCreateNote?.(selectionMenu.selection);
    closeMenu();
  };

  // Destaques da página atual.
  const pageHighlights = useMemo(
    () => highlights.filter((h) => h.page === pageNumber),
    [highlights, pageNumber],
  );

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center relative">
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
          <p className="text-sm mb-4" style={{ color: 'var(--rayo-ink-400)' }}>{loadError}</p>
          <button
            onClick={() => { setLoadError(null); setLoadKey((k) => k + 1); }}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: 'var(--rayo-terra-500)', color: '#FFFFFF', fontWeight: 600 }}
          >
            Tentar de novo
          </button>
        </div>
      ) : (
        <div ref={pageWrapRef} className="relative">
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
              onRenderSuccess={(p) => {
                // `getViewport({scale:1})` dá tamanho intrínseco; o tamanho
                // efetivo na tela vem de `width` × proporção do PDF.
                const viewport = p.getViewport({ scale: 1 });
                const ratio = viewport.height / viewport.width;
                setPageSize({ w: width, h: Math.round(width * ratio) });
              }}
            />
          </Document>

          {/* Overlay de destaques — pointer-events:none deixa a seleção fluir. */}
          {pageSize && pageHighlights.length > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ width: pageSize.w, height: pageSize.h }}
              aria-hidden="true"
            >
              {pageHighlights.map((h) =>
                h.rects.map((r, i) => (
                  <div
                    key={`${h.id}-${i}`}
                    style={{
                      position: 'absolute',
                      left: `${r.x * 100}%`,
                      top: `${r.y * 100}%`,
                      width: `${r.w * 100}%`,
                      height: `${r.h * 100}%`,
                      background: COLOR_BG[h.color] || COLOR_BG.yellow,
                      borderRadius: 2,
                      mixBlendMode: 'multiply',
                    }}
                  />
                )),
              )}
            </div>
          )}
        </div>
      )}

      {/* Menu flutuante de seleção */}
      {selectionMenu && (onCreateHighlight || onCreateNote) && (
        <div
          className="absolute z-20 flex items-center gap-1 px-2 py-1.5 rounded-full shadow-lg"
          style={{
            top: selectionMenu.top,
            left: selectionMenu.left,
            background: 'var(--rayo-forest-900)',
            color: '#FFFFFF',
          }}
          role="toolbar"
          aria-label="Ações da seleção"
          onMouseDown={(e) => e.preventDefault()} // não perder a seleção ao clicar
        >
          {onCreateHighlight && (
            <>
              <Highlighter className="w-4 h-4 ml-1 opacity-80" aria-hidden="true" />
              {(['yellow', 'green', 'blue', 'pink'] as HighlightColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onHighlightClick(c)}
                  aria-label={`Destacar em ${c}`}
                  className="w-6 h-6 rounded-full border border-white/40 hover:scale-110 transition-transform"
                  style={{ background: COLOR_SWATCH[c] }}
                />
              ))}
            </>
          )}
          {onCreateNote && (
            <button
              type="button"
              onClick={onNoteClick}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs hover:bg-white/10"
              aria-label="Anotar"
            >
              <StickyNote className="w-4 h-4" />
              <span>Anotar</span>
            </button>
          )}
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Fechar"
            className="ml-1 p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navegação */}
      {numPages > 0 && !loadError && (
        <div
          className="sticky bottom-2 mt-6 flex items-center gap-3 px-4 py-2 rounded-full shadow-lg"
          style={{ background: 'var(--rayo-sand-50)', border: '1px solid var(--rayo-sand-300)' }}
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
