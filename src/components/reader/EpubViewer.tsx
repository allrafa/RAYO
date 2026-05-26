// ============================================================================
// 📚 RAYO — EpubViewer (Task #261)
// Leitor EPUB estilo Kindle. Renderiza com epubjs em modo paginado por
// colunas (texto flui na largura da tela). API espelha o PdfViewer
// onde faz sentido — quem coordena chrome/sheets/anotações é o pai.
//
// Diferenças vs PDF:
// - Não tem páginas fixas. Posição é um CFI (Canonical Fragment
//   Identifier) e a "página" pra ordenar/persistir vira o permil
//   1..1000 derivado de `location.start.percentage`.
// - Destaques são CFI ranges; renderizados via rendition.annotations.
// - Conteúdo mora num iframe — gestos e seleção são capturados via
//   rendition.hooks.content.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ePub, { type Book as EpubBook, type Rendition, type NavItem, type Contents } from 'epubjs';
import { Loader2, Highlighter, StickyNote, X } from 'lucide-react';
import type { HighlightColor, ReaderTheme } from './PdfViewer';

export interface EpubViewerHighlight {
  id: string;
  cfiRange: string;
  color: HighlightColor;
}

export interface EpubSelectionInfo {
  /** Permil 1..1000 derivado da posição atual (pra persistência/ordem). */
  page: number;
  /** Trecho selecionado. */
  text: string;
  /** CFI range — endereço canônico do trecho dentro do livro. */
  cfiRange: string;
}

export interface EpubOutlineItem {
  title: string;
  cfi: string;
  depth: number;
}

export type EpubFontFamily = 'serif' | 'sans' | 'mono';

export interface EpubViewerProps {
  fileUrl: string;
  /** CFI inicial pra retomar onde parou. Se ausente, abre no começo. */
  initialCfi?: string | null;
  /** Chamado a cada navegação. `permille` é Math.round(pct * 1000) em [1,1000]. */
  onLocationChange?: (info: { permille: number; cfi: string }) => void;
  highlights?: EpubViewerHighlight[];
  onCreateHighlight?: (sel: EpubSelectionInfo, color: HighlightColor) => void;
  onCreateNote?: (sel: EpubSelectionInfo) => void;
  /** Salto externo controlado pelo pai (cliques em "ir pra anotação"/TOC). */
  jumpToCfi?: string;
  /** Pula pra uma posição percentual (permil 1..1000) — usado pelo scrubber.
   *  Gera `book.locations` na primeira vez (custo único; pode levar 1-3s pra
   *  livros longos), depois mapeia permil→CFI e chama display. */
  seekToPermille?: number | null;
  theme?: ReaderTheme;
  /** Tamanho da fonte em % (80..180). Default 100. */
  fontSize?: number;
  fontFamily?: EpubFontFamily;
  /** Espaçamento entre linhas (1.2..2.0). Default 1.5. */
  lineHeight?: number;
  onTapCenter?: () => void;
  onOutlineReady?: (items: EpubOutlineItem[]) => void;
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

// Themes registrados no rendition.themes — aplicados como CSS dentro do iframe.
const THEME_RULES: Record<ReaderTheme, Record<string, Record<string, string>>> = {
  light: {
    body: { color: '#1a1d23 !important', background: '#FFFFFF !important' },
    a: { color: '#b85c3a !important' },
  },
  sepia: {
    body: { color: '#5a4a2a !important', background: '#efe3c8 !important' },
    a: { color: '#a05030 !important' },
  },
  dark: {
    body: { color: '#e7e3d6 !important', background: '#15181d !important' },
    a: { color: '#f4a672 !important' },
  },
};

const FAMILY_STACK: Record<EpubFontFamily, string> = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: '"Outfit", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", Menlo, monospace',
};

// Thresholds dos gestos (mesmos do PdfViewer pra consistência).
const TAP_MAX_DELTA = 10;
const TAP_MAX_DURATION = 350;
const SWIPE_MIN_DX = 60;
const SWIPE_DX_RATIO = 2;

export function EpubViewer({
  fileUrl,
  initialCfi,
  onLocationChange,
  highlights = [],
  onCreateHighlight,
  onCreateNote,
  jumpToCfi,
  seekToPermille,
  theme = 'light',
  fontSize = 100,
  fontFamily = 'serif',
  lineHeight = 1.5,
  onTapCenter,
  onOutlineReady,
  hideSelectionMenu = false,
}: EpubViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  // Posição atual (em permil 1..1000) — pra contar pages locais e cfiRef.
  const permilleRef = useRef<number>(1);
  const currentCfiRef = useRef<string>('');

  // Refs pra evitar stale closures dentro de callbacks do epubjs
  // (hooks.content registra UMA vez por contents — temos que ler o
  // valor mais recente via ref toda vez que o handler dispara).
  const onTapCenterRef = useRef(onTapCenter);
  const onCreateHighlightRef = useRef(onCreateHighlight);
  const onCreateNoteRef = useRef(onCreateNote);
  const onLocationChangeRef = useRef(onLocationChange);
  const onOutlineReadyRef = useRef(onOutlineReady);
  const hideSelectionMenuRef = useRef(hideSelectionMenu);
  useEffect(() => { onTapCenterRef.current = onTapCenter; }, [onTapCenter]);
  useEffect(() => { onCreateHighlightRef.current = onCreateHighlight; }, [onCreateHighlight]);
  useEffect(() => { onCreateNoteRef.current = onCreateNote; }, [onCreateNote]);
  useEffect(() => { onLocationChangeRef.current = onLocationChange; }, [onLocationChange]);
  useEffect(() => { onOutlineReadyRef.current = onOutlineReady; }, [onOutlineReady]);
  useEffect(() => { hideSelectionMenuRef.current = hideSelectionMenu; }, [hideSelectionMenu]);

  // Selection menu state — posicionado em coords do nosso container,
  // não do iframe. Calculamos somando o offset do iframe + rect da seleção.
  interface SelectionMenuState {
    top: number;
    left: number;
    selection: EpubSelectionInfo;
  }
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState | null>(null);
  const closeMenu = useCallback(() => {
    setSelectionMenu(null);
    try {
      const win = (renditionRef.current as unknown as { manager?: { container?: HTMLElement } })?.manager?.container?.querySelector?.('iframe') as HTMLIFrameElement | null;
      win?.contentWindow?.getSelection()?.removeAllRanges();
    } catch {}
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Boot: abrir EPUB, montar rendition, exibir posição inicial, extrair TOC
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    setReady(false);
    setLoadError(null);
    setSelectionMenu(null);

    let cancelled = false;
    const container = containerRef.current;
    container.innerHTML = ''; // limpa render anterior em remount

    const book = ePub(fileUrl);
    bookRef.current = book;

    const rendition = book.renderTo(container, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      manager: 'default',
      spread: 'none',
      allowScriptedContent: false,
    });
    renditionRef.current = rendition;

    // Registra temas (todos de cara) e seleciona o atual.
    (['light', 'sepia', 'dark'] as ReaderTheme[]).forEach((t) => {
      try { rendition.themes.register(t, THEME_RULES[t]); } catch {}
    });
    try { rendition.themes.select(theme); } catch {}
    try { rendition.themes.fontSize(`${fontSize}%`); } catch {}
    // Tipografia: family + line-height via override genérico (alguns EPUBs
    // forçam suas próprias regras; usamos !important via THEME_RULES e
    // override extra aqui no body).
    try {
      rendition.themes.override('font-family', FAMILY_STACK[fontFamily], true);
      rendition.themes.override('line-height', String(lineHeight), true);
    } catch {}

    // Display inicial: tenta CFI salvo; senão começa do início.
    const startTarget = initialCfi && typeof initialCfi === 'string' ? initialCfi : undefined;
    rendition.display(startTarget).catch(() => {
      // CFI inválido (livro mudou ou stale) — abre do começo.
      rendition.display();
    });

    // Hook por iframe: gestos (tap nas laterais / centro, swipe).
    rendition.hooks.content.register((contents: Contents) => {
      const doc = contents.document;
      if (!doc) return;
      let gesture: { x: number; y: number; t: number } | null = null;

      const onPtrDown = (ev: PointerEvent) => {
        gesture = { x: ev.clientX, y: ev.clientY, t: Date.now() };
      };
      const onPtrUp = (ev: PointerEvent) => {
        const g = gesture; gesture = null;
        if (!g) return;
        // Se há seleção ativa, não trate como gesto de virar página.
        const sel = contents.window?.getSelection();
        if (sel && !sel.isCollapsed) return;

        const dx = ev.clientX - g.x;
        const dy = ev.clientY - g.y;
        const adx = Math.abs(dx); const ady = Math.abs(dy);
        const dt = Date.now() - g.t;

        if (adx >= SWIPE_MIN_DX && adx > ady * SWIPE_DX_RATIO) {
          if (dx < 0) renditionRef.current?.next();
          else renditionRef.current?.prev();
          return;
        }
        if (adx <= TAP_MAX_DELTA && ady <= TAP_MAX_DELTA && dt <= TAP_MAX_DURATION) {
          const w = doc.documentElement.clientWidth || 1;
          const relX = ev.clientX / w;
          if (relX < 0.25) renditionRef.current?.prev();
          else if (relX > 0.75) renditionRef.current?.next();
          else onTapCenterRef.current?.();
        }
      };

      doc.addEventListener('pointerdown', onPtrDown, { passive: true });
      doc.addEventListener('pointerup', onPtrUp, { passive: true });

      // Cleanup quando o iframe trocar de página: epubjs descarta e
      // recria, então não precisamos remover explicitamente.
    });

    // Seleção de texto — calcula posição absoluta do menu somando
    // offset do iframe ao rect da seleção dentro dele.
    rendition.on('selected', (cfiRange: string, contents: Contents) => {
      if (hideSelectionMenuRef.current) return;
      const sel = contents.window?.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (!text) return;
      const range = sel.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      if (rects.length === 0) return;
      const last = rects[rects.length - 1];

      // Encontra o iframe ativo (manager.container > iframe). Em
      // implementações default só existe 1 iframe visível por vez.
      const manager = (rendition as unknown as { manager?: { container?: HTMLElement } }).manager;
      const iframe = manager?.container?.querySelector?.('iframe') as HTMLIFrameElement | null;
      if (!iframe || !containerRef.current) return;
      const iframeRect = iframe.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      const top = (iframeRect.top - containerRect.top) + last.bottom + 6;
      const left = Math.max(8, (iframeRect.left - containerRect.left) + last.left);

      setSelectionMenu({
        top,
        left,
        selection: {
          page: permilleRef.current,
          text: text.slice(0, 4000),
          cfiRange,
        },
      });
    });

    // Posição: salva permil + cfi a cada navegação.
    rendition.on('relocated', (location: { start: { cfi: string; percentage?: number } }) => {
      const pct = typeof location.start.percentage === 'number' ? location.start.percentage : 0;
      const permille = Math.max(1, Math.min(1000, Math.round(pct * 1000) || 1));
      permilleRef.current = permille;
      currentCfiRef.current = location.start.cfi || '';
      onLocationChangeRef.current?.({ permille, cfi: location.start.cfi || '' });
      // Fechar menu de seleção quando muda de página.
      setSelectionMenu(null);
    });

    // Outline (TOC) — flatten depth-first com indentação NBSP igual ao PDF.
    book.ready.then(() => {
      if (cancelled) return;
      setReady(true);
      try {
        const toc = book.navigation?.toc as NavItem[] | undefined;
        if (!toc || toc.length === 0) {
          onOutlineReadyRef.current?.([]);
          return;
        }
        const flat: EpubOutlineItem[] = [];
        const walk = (nodes: NavItem[], depth: number) => {
          for (const n of nodes) {
            if (!n) continue;
            const title = (n.label || '').trim();
            const cfi = (n.href || '');
            if (title && cfi) {
              const indent = depth > 0 ? '\u00A0\u00A0'.repeat(depth) : '';
              flat.push({ title: indent + title, cfi, depth });
            }
            if (n.subitems && n.subitems.length) walk(n.subitems, depth + 1);
          }
        };
        walk(toc, 0);
        onOutlineReadyRef.current?.(flat);
      } catch {
        onOutlineReadyRef.current?.([]);
      }
    }).catch((err: unknown) => {
      if (cancelled) return;
      setLoadError(err instanceof Error ? err.message : 'Erro ao abrir o EPUB.');
    });

    return () => {
      cancelled = true;
      try { rendition.destroy(); } catch {}
      try { book.destroy(); } catch {}
      renditionRef.current = null;
      bookRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, loadKey]);

  // ──────────────────────────────────────────────────────────────────────────
  // Atualiza tema / fonte / espaçamento sem rebuildar o livro
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const r = renditionRef.current;
    if (!r || !ready) return;
    try { r.themes.select(theme); } catch {}
  }, [theme, ready]);

  useEffect(() => {
    const r = renditionRef.current;
    if (!r || !ready) return;
    try { r.themes.fontSize(`${fontSize}%`); } catch {}
  }, [fontSize, ready]);

  useEffect(() => {
    const r = renditionRef.current;
    if (!r || !ready) return;
    try { r.themes.override('font-family', FAMILY_STACK[fontFamily], true); } catch {}
  }, [fontFamily, ready]);

  useEffect(() => {
    const r = renditionRef.current;
    if (!r || !ready) return;
    try { r.themes.override('line-height', String(lineHeight), true); } catch {}
  }, [lineHeight, ready]);

  // Salto externo (TOC ou jump-to-annotation).
  useEffect(() => {
    if (!jumpToCfi) return;
    const r = renditionRef.current;
    if (!r || !ready) return;
    r.display(jumpToCfi).catch(() => {});
  }, [jumpToCfi, ready]);

  // Scrubber: permil 1..1000 → CFI via `book.locations`.
  // Gera locations sob demanda (uma vez por livro carregado). `generate` é
  // custoso (1-3s em livros longos) então só roda no primeiro seek.
  const locationsReadyRef = useRef(false);
  const locationsGenPromiseRef = useRef<Promise<unknown> | null>(null);
  useEffect(() => {
    if (seekToPermille == null) return;
    const r = renditionRef.current;
    const b = bookRef.current;
    if (!r || !b || !ready) return;
    const pct = Math.min(Math.max(seekToPermille / 1000, 0), 1);
    let cancelled = false;
    const doSeek = () => {
      if (cancelled) return;
      try {
        const cfi = b.locations.cfiFromPercentage(pct);
        if (cfi) r.display(cfi).catch(() => {});
      } catch {}
    };
    if (locationsReadyRef.current) {
      doSeek();
    } else {
      if (!locationsGenPromiseRef.current) {
        // 1024 chars por location dá boa precisão sem estourar tempo.
        locationsGenPromiseRef.current = b.locations.generate(1024).catch(() => null);
      }
      locationsGenPromiseRef.current.then(() => {
        locationsReadyRef.current = true;
        doSeek();
      });
    }
    return () => { cancelled = true; };
  }, [seekToPermille, ready]);

  // ──────────────────────────────────────────────────────────────────────────
  // Sync de highlights persistidos: epubjs annotations API.
  // Reconciliamos a cada mudança da lista — adiciona novos, remove sumidos.
  // ──────────────────────────────────────────────────────────────────────────
  const appliedRef = useRef<Map<string, { color: HighlightColor; cfiRange: string }>>(new Map());
  useEffect(() => {
    const r = renditionRef.current;
    if (!r || !ready) return;
    const ann = r.annotations as unknown as {
      add: (type: string, cfiRange: string, data: object, cb: unknown, className: string, styles: Record<string, string>) => void;
      remove: (cfiRange: string, type: string) => void;
    };

    const next = new Map<string, { color: HighlightColor; cfiRange: string }>();
    for (const h of highlights) {
      if (!h.cfiRange) continue;
      next.set(h.id, { color: h.color, cfiRange: h.cfiRange });
    }

    // Remove os que sumiram.
    for (const [id, prev] of appliedRef.current) {
      const cur = next.get(id);
      if (!cur || cur.cfiRange !== prev.cfiRange) {
        try { ann.remove(prev.cfiRange, 'highlight'); } catch {}
      }
    }
    // Adiciona os novos.
    for (const [id, cur] of next) {
      const prev = appliedRef.current.get(id);
      if (!prev || prev.cfiRange !== cur.cfiRange) {
        try {
          ann.add('highlight', cur.cfiRange, {}, undefined, `rayo-hl-${cur.color}`, {
            fill: COLOR_SWATCH[cur.color] || COLOR_SWATCH.yellow,
            'fill-opacity': '0.35',
            'mix-blend-mode': 'multiply',
          });
        } catch {}
      }
    }
    appliedRef.current = next;
  }, [highlights, ready]);

  // Fechar menu de seleção quando o pai pede (sheet abriu).
  useEffect(() => {
    if (hideSelectionMenu) setSelectionMenu(null);
  }, [hideSelectionMenu]);

  const onHighlightClick = (color: HighlightColor) => {
    if (!selectionMenu) return;
    onCreateHighlightRef.current?.(selectionMenu.selection, color);
    closeMenu();
  };
  const onNoteClick = () => {
    if (!selectionMenu) return;
    onCreateNoteRef.current?.(selectionMenu.selection);
    closeMenu();
  };

  // Atalhos teclado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const r = renditionRef.current;
      if (!r) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); r.prev(); }
      else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); r.next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const bgColor = theme === 'sepia' ? '#efe3c8' : theme === 'dark' ? '#15181d' : '#FFFFFF';

  return (
    <div
      className="w-full flex flex-col items-center relative"
      style={{ background: bgColor, transition: 'background 200ms ease', minHeight: 480 }}
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
          <p style={{ fontWeight: 600, marginBottom: 6 }}>Não foi possível abrir o livro</p>
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
        <>
          {!ready && (
            <div
              className="absolute inset-0 flex items-center justify-center gap-2 z-10"
              style={{ color: theme === 'dark' ? '#aaa' : 'var(--rayo-ink-400)', background: bgColor }}
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Carregando livro…</span>
            </div>
          )}
          {/* Container do epubjs — width 100%, altura definida pelo pai
              via CSS height (precisa ser fixa pra paginação por colunas
              funcionar). Usamos 75vh como padrão. */}
          <div
            ref={containerRef}
            className="w-full"
            style={{
              height: 'min(75vh, 900px)',
              maxWidth: 900,
            }}
            aria-label="Conteúdo do livro"
          />
        </>
      )}

      {/* Menu flutuante de seleção (mesmo design do PdfViewer) */}
      {!hideSelectionMenu && selectionMenu && (
        <div
          data-no-gesture
          className="absolute z-30 flex items-center gap-1 rounded-xl shadow-xl p-1"
          style={{
            top: Math.max(8, selectionMenu.top),
            left: selectionMenu.left,
            background: '#FFFFFF',
            border: '1px solid var(--rayo-sand-300)',
          }}
        >
          {(['yellow', 'green', 'blue', 'pink'] as HighlightColor[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onHighlightClick(c)}
              className="w-7 h-7 rounded-full hover:scale-110 transition-transform"
              style={{ background: COLOR_SWATCH[c], border: '2px solid #FFFFFF', boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }}
              aria-label={`Destacar em ${c}`}
            />
          ))}
          <div className="w-px h-6 mx-1" style={{ background: 'var(--rayo-sand-300)' }} />
          <button
            type="button"
            onClick={onNoteClick}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5"
            aria-label="Criar anotação"
          >
            <StickyNote className="w-4 h-4" style={{ color: 'var(--rayo-ink-700)' }} />
          </button>
          <button
            type="button"
            onClick={closeMenu}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" style={{ color: 'var(--rayo-ink-400)' }} />
          </button>
        </div>
      )}
    </div>
  );
}
