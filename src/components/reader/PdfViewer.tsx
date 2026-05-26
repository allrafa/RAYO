// ============================================================================
// 📚 RAYO — PdfViewer (Tasks #252 + #255 + Kindle UX)
// Leitor PDF estilo Kindle:
// - Tap nas laterais vira página (esq = anterior, dir = próxima).
// - Tap no centro pede pro pai mostrar/esconder o chrome (header/footer).
// - Swipe horizontal vira página.
// - Seleção de texto continua funcionando → menu "Destacar"/"Anotar".
// - Tema (claro / sépia / escuro) e zoom controlados pelo pai.
// - Outline (sumário do PDF) extraído e devolvido pro pai via callback.
// O pai é dono de TODA a chrome (back, título, scrubber, settings, TOC).
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, Highlighter, StickyNote, X } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Vite resolve esse URL pra um asset bundled — same-origin, sem CDN externa.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';
export type ReaderTheme = 'light' | 'sepia' | 'dark';

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

export interface OutlineItem {
  title: string;
  page: number;
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
  /** Tema visual do leitor. Default "light". */
  theme?: ReaderTheme;
  /** Multiplicador do tamanho da página renderizada. Default 1. */
  zoom?: number;
  /** Tap no centro da tela — pai usa pra mostrar/esconder chrome. */
  onTapCenter?: () => void;
  /** Sumário (outline) do PDF — devolvido após o load. */
  onOutlineReady?: (items: OutlineItem[]) => void;
  /** Some o menu flutuante de seleção (usado quando chrome do pai esconde). */
  hideSelectionMenu?: boolean;
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

// Filtros CSS por tema. "dark" usa truque clássico do reader mode (inverte
// cores e roda hue 180º) — mantém as cores das fotos quase intactas.
const THEME_FILTER: Record<ReaderTheme, string> = {
  light: 'none',
  sepia: 'sepia(0.45) saturate(1.05)',
  dark: 'invert(1) hue-rotate(180deg)',
};

// Thresholds dos gestos. Mantemos taps "estacionários" (delta pequeno) e
// rápidos (<350ms), enquanto swipes são horizontais (dx > 60 e dx > 2×dy).
const TAP_MAX_DELTA = 10;
const TAP_MAX_DURATION = 350;
const SWIPE_MIN_DX = 60;
const SWIPE_DX_RATIO = 2;

export function PdfViewer({
  fileUrl,
  initialPage = 1,
  onPageChange,
  highlights = [],
  onCreateHighlight,
  onCreateNote,
  jumpToPage,
  theme = 'light',
  zoom = 1,
  onTapCenter,
  onOutlineReady,
  hideSelectionMenu = false,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(Math.max(1, initialPage));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState<number>(0);
  const [width, setWidth] = useState<number>(800);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageWrapRef = useRef<HTMLDivElement | null>(null);

  // Refs pra evitar stale closures em callbacks assíncronos.
  const pageNumberRef = useRef(pageNumber);
  const onPageChangeRef = useRef(onPageChange);
  const onTapCenterRef = useRef(onTapCenter);
  const onOutlineReadyRef = useRef(onOutlineReady);
  useEffect(() => { pageNumberRef.current = pageNumber; }, [pageNumber]);
  useEffect(() => { onPageChangeRef.current = onPageChange; }, [onPageChange]);
  useEffect(() => { onTapCenterRef.current = onTapCenter; }, [onTapCenter]);
  useEffect(() => { onOutlineReadyRef.current = onOutlineReady; }, [onOutlineReady]);

  // Re-syncs quando o initialPage muda (e.g. trocar de livro).
  useEffect(() => {
    setPageNumber(Math.max(1, initialPage));
  }, [initialPage, fileUrl]);

  // Largura responsiva — usada como base; zoom multiplica em cima.
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

  // ──────────────────────────────────────────────────────────────────────────
  // Load do documento: numPages + outline (sumário)
  // ──────────────────────────────────────────────────────────────────────────
  const onDocLoad = useCallback(async (doc: { numPages: number } & Record<string, unknown>) => {
    setNumPages(doc.numPages);
    setLoadError(null);
    const current = pageNumberRef.current;
    const start = Math.max(1, Math.min(doc.numPages, current));
    if (start !== current) setPageNumber(start);
    onPageChangeRef.current?.(start, doc.numPages);

    // Extrai outline em background — falha silenciosa se o PDF não tiver.
    // Achatamos a árvore (depth-first) pra suportar PDFs com TOC aninhado,
    // que é o caso da maioria dos livros (Parte > Capítulo > Seção).
    try {
      type RawOutlineItem = { title: string; dest: unknown; items?: RawOutlineItem[] };
      type DocApi = {
        getOutline: () => Promise<RawOutlineItem[] | null>;
        getDestination: (name: string) => Promise<unknown[] | null>;
        getPageIndex: (ref: unknown) => Promise<number>;
      };
      const api = doc as unknown as DocApi;
      const raw = await api.getOutline();
      if (!raw || raw.length === 0) {
        onOutlineReadyRef.current?.([]);
        return;
      }
      const flat: Array<{ title: string; dest: unknown; depth: number }> = [];
      const walk = (nodes: RawOutlineItem[], depth: number) => {
        for (const n of nodes) {
          if (n && n.title) flat.push({ title: n.title, dest: n.dest, depth });
          if (n?.items && n.items.length) walk(n.items, depth + 1);
        }
      };
      walk(raw, 0);

      const resolved = await Promise.all(
        flat.map(async (node): Promise<OutlineItem | null> => {
          try {
            const dest = typeof node.dest === 'string'
              ? await api.getDestination(node.dest)
              : (node.dest as unknown[] | null);
            if (!dest || !Array.isArray(dest) || dest.length === 0) return null;
            const idx = await api.getPageIndex(dest[0]);
            // Indenta visualmente subcapítulos com NBSP (preserva no React).
            const indent = node.depth > 0 ? '\u00A0\u00A0'.repeat(node.depth) : '';
            return { title: indent + node.title.trim(), page: idx + 1 };
          } catch {
            return null;
          }
        }),
      );
      const items = resolved.filter((x): x is OutlineItem => x !== null);
      onOutlineReadyRef.current?.(items);
    } catch {
      onOutlineReadyRef.current?.([]);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fileProp = useMemo(() => ({ url: fileUrl }), [fileUrl, loadKey]);

  // ──────────────────────────────────────────────────────────────────────────
  // Seleção de texto → menu flutuante
  // ──────────────────────────────────────────────────────────────────────────
  interface SelectionMenuState {
    top: number;
    left: number;
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

  // ──────────────────────────────────────────────────────────────────────────
  // Gestos: tap nas laterais / centro + swipe horizontal
  // Tudo via pointer events no wrapper da página. Se o usuário acabou de
  // selecionar texto, ignoramos pra não interferir nos highlights.
  // ──────────────────────────────────────────────────────────────────────────
  const gestureRef = useRef<{ x: number; y: number; t: number; pointerId: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    // Ignora cliques em botões / inputs internos (menu flutuante).
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-gesture]')) return;
    gestureRef.current = { x: e.clientX, y: e.clientY, t: Date.now(), pointerId: e.pointerId };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g || g.pointerId !== e.pointerId) return;

    // Se o usuário acabou de selecionar texto, não trate como gesto.
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;

    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dt = Date.now() - g.t;

    // Swipe horizontal: dx grande, predominante sobre dy.
    if (adx >= SWIPE_MIN_DX && adx > ady * SWIPE_DX_RATIO) {
      if (dx < 0) goNext(); else goPrev();
      return;
    }

    // Tap estacionário e rápido.
    if (adx <= TAP_MAX_DELTA && ady <= TAP_MAX_DELTA && dt <= TAP_MAX_DURATION) {
      const wrap = pageWrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      if (rect.width <= 0) return;
      const relX = (e.clientX - rect.left) / rect.width;
      if (relX < 0.25) goPrev();
      else if (relX > 0.75) goNext();
      else onTapCenterRef.current?.();
    }
  };

  // Largura efetiva (base × zoom). Clampa pra não estourar layout.
  const effectiveWidth = Math.max(220, Math.min(1600, Math.round(width * zoom)));

  // Cor de fundo do wrapper (atrás do PDF) — combina com tema.
  const themeBg =
    theme === 'sepia' ? '#f3e9d2' :
    theme === 'dark'  ? '#1a1d23' :
    'transparent';

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col items-center relative select-text"
      style={{ background: themeBg, transition: 'background 200ms ease' }}
    >
      {loadError ? (
        <div
          className="my-12 px-6 py-4 rounded-lg text-center max-w-md"
          style={{
            background: 'var(--rayo-sand-50)',
            border: '1px solid var(--rayo-sand-300)',
            color: 'var(--rayo-ink-700)',
          }}
          data-no-gesture
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
        <div
          ref={pageWrapRef}
          className="relative"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { gestureRef.current = null; }}
          // Permite swipe horizontal sem o browser interpretar como scroll.
          style={{ touchAction: 'pan-y' }}
        >
          <div style={{ filter: THEME_FILTER[theme], transition: 'filter 200ms ease' }}>
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
                width={effectiveWidth}
                renderTextLayer
                renderAnnotationLayer
                onRenderSuccess={(p) => {
                  const viewport = p.getViewport({ scale: 1 });
                  const ratio = viewport.height / viewport.width;
                  setPageSize({ w: effectiveWidth, h: Math.round(effectiveWidth * ratio) });
                }}
              />
            </Document>
          </div>

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
      {!hideSelectionMenu && selectionMenu && (onCreateHighlight || onCreateNote) && (
        <div
          data-no-gesture
          className="absolute z-20 flex items-center gap-1 px-2 py-1.5 rounded-full shadow-lg"
          style={{
            top: selectionMenu.top,
            left: selectionMenu.left,
            background: 'var(--rayo-forest-900)',
            color: '#FFFFFF',
          }}
          role="toolbar"
          aria-label="Ações da seleção"
          onMouseDown={(e) => e.preventDefault()}
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
    </div>
  );
}
