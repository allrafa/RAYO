import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { ZoomIn, ZoomOut } from "lucide-react";

// Task #219 — Editor de recorte da capa de comunidade. Moldura 16:5 fixa,
// suporte a drag (pointer events, funciona em mouse + touch) e pinch-to-zoom
// com dois dedos, slider de zoom 1×–3×. Recebe um File e devolve um Blob já
// no enquadramento escolhido, prontinho pra subir nos endpoints existentes
// de cover (não precisa mexer no backend).
//
// O preview reflete exatamente o `object-cover` que o banner usa em prod —
// `width = containerW`, `height = containerW / aspect`. A imagem é
// posicionada absoluta dentro da moldura, em escala `baseScale * zoom`,
// onde baseScale = max(containerW/imgW, containerH/imgH) (cover-fit no
// zoom=1×). O offset é restringido pra nunca expor área vazia na moldura.
//
// Output: canvas de até 1600×500 (mantendo 16:5), encode em JPEG/WebP/PNG
// de acordo com o input. O backend (sharp + putPublicObject) recebe a
// imagem já recortada — `optimizeCmsImage` continua aplicando a otimização
// final, mas só sobre os bytes que o usuário enquadrou.

const ASPECT = 16 / 5;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
// Saída em alta resolução. 1600×500 cobre Retina sem inflar payload.
const OUTPUT_W = 1600;
const OUTPUT_H = Math.round(OUTPUT_W / ASPECT); // 500

interface CoverCropperProps {
  file: File;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
  // Em mobile o modal vira viewport quase-cheio; deixar o caller controlar
  // a largura máxima evita layout shift dentro do Dialog.
  maxWidthClass?: string;
}

type Pointer = { id: number; x: number; y: number };

function dist(a: Pointer, b: Pointer): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function CoverCropper({ file, onConfirm, onCancel, maxWidthClass }: CoverCropperProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [containerW, setContainerW] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // Pointer drag/pinch state guardada em ref pra evitar re-render a cada
  // movimento (state-em-ref + setOffset/setZoom só nas paradas certas).
  const pointersRef = useRef<Map<number, Pointer>>(new Map());
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; offX: number; offY: number } | null>(null);

  // 1) objectURL do arquivo + cleanup. Sem revoke o blob fica em memória
  // até o GC do navegador, e abrir vários arquivos seguidos vaza.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // 2) Mede a largura real do container (ResizeObserver). Necessário pra
  // calcular baseScale corretamente quando o Dialog redimensiona.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const containerH = containerW / ASPECT;
  const baseScale = natural && containerW
    ? Math.max(containerW / natural.w, containerH / natural.h)
    : 1;
  const scale = baseScale * zoom;
  const scaledW = natural ? natural.w * scale : 0;
  const scaledH = natural ? natural.h * scale : 0;
  const maxX = Math.max(0, (scaledW - containerW) / 2);
  const maxY = Math.max(0, (scaledH - containerH) / 2);

  const clampOffset = useCallback((o: { x: number; y: number }, mx: number, my: number) => ({
    x: Math.max(-mx, Math.min(mx, o.x)),
    y: Math.max(-my, Math.min(my, o.y)),
  }), []);

  // 3) Quando o zoom muda, re-clamp o offset pros novos limites — senão
  // ao diminuir o zoom a imagem fica "presa" fora dos limites.
  useEffect(() => {
    setOffset((o) => clampOffset(o, maxX, maxY));
  }, [maxX, maxY, clampOffset]);

  // ── Pointer handlers ────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!natural) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 1) {
      dragStartRef.current = { x: e.clientX, y: e.clientY, offX: offset.x, offY: offset.y };
      pinchStartRef.current = null;
    } else if (pts.length === 2) {
      pinchStartRef.current = { dist: dist(pts[0], pts[1]), zoom };
      dragStartRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());
    if (pts.length >= 2 && pinchStartRef.current) {
      const d = dist(pts[0], pts[1]);
      const ratio = d / (pinchStartRef.current.dist || 1);
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartRef.current.zoom * ratio));
      setZoom(next);
    } else if (pts.length === 1 && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setOffset(clampOffset(
        { x: dragStartRef.current.offX + dx, y: dragStartRef.current.offY + dy },
        maxX,
        maxY,
      ));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) dragStartRef.current = null;
  };

  // ── Confirm: desenha o crop em canvas e devolve File ───────────────
  const handleConfirm = useCallback(async () => {
    if (!natural || !imgRef.current || busy) return;
    setBusy(true);
    try {
      // Coordenadas de origem na imagem natural (px). Veja explicação
      // matemática no topo do arquivo.
      const sx = natural.w / 2 - containerW / (2 * scale) - offset.x / scale;
      const sy = natural.h / 2 - containerH / (2 * scale) - offset.y / scale;
      const sw = containerW / scale;
      const sh = containerH / scale;

      // Não permite upscale além do tamanho natural útil. Garante
      // dimensão mínima ≥1 px pra evitar canvas inválido em imagens
      // minúsculas / zoom extremo (toBlob devolveria null sem isso).
      const outW = Math.max(1, Math.min(OUTPUT_W, Math.round(sw)));
      const outH = Math.max(1, Math.round(outW / ASPECT));

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outW, outH);

      // Preserva o formato original quando possível; PNG/WebP/JPEG ok.
      // Backend (`optimizeCmsImage`) re-encoda no formato canônico.
      const mime = /^image\/(png|webp|jpeg)$/.test(file.type) ? file.type : "image/jpeg";
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), mime, 0.92),
      );
      if (!blob) {
        // Erro raro de canvas/encoder — devolve controle pro caller pra
        // exibir feedback ao invés de travar silenciosamente.
        throw new Error("Não foi possível gerar a imagem. Tente outra capa.");
      }
      // Mantém o nome do arquivo original (cosmético — backend renomeia).
      const ext = mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".jpg";
      const base = file.name.replace(/\.[^.]+$/, "") || "capa";
      const cropped = new File([blob], `${base}${ext}`, { type: mime });
      onConfirm(cropped);
    } finally {
      setBusy(false);
    }
  }, [natural, containerW, containerH, scale, offset.x, offset.y, file.name, file.type, onConfirm, busy]);

  // Posição absoluta da imagem (sem origin transform — left/top + scale
  // em transform-origin top-left dá menos surpresa que rotate-around-center).
  const imgStyle = useMemo<React.CSSProperties>(() => {
    if (!natural) return { display: "none" };
    return {
      position: "absolute",
      width: scaledW,
      height: scaledH,
      left: (containerW - scaledW) / 2 + offset.x,
      top: (containerH - scaledH) / 2 + offset.y,
      maxWidth: "none",
      userSelect: "none",
      pointerEvents: "none",
      // touch-action none já vai no container; imagem fica passiva.
    };
  }, [natural, scaledW, scaledH, containerW, containerH, offset.x, offset.y]);

  return (
    <div className={`flex flex-col gap-3 ${maxWidthClass ?? ""}`}>
      <div className="text-xs" style={{ color: "var(--rayo-ink-500)" }}>
        Arraste a imagem pra reposicionar e use o controle pra aproximar.
        O que estiver dentro da moldura vira a capa.
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl select-none"
        style={{
          aspectRatio: "16 / 5",
          background: "var(--rayo-sand-100)",
          border: "1px solid var(--rayo-sand-300)",
          touchAction: "none",
          cursor: natural ? "grab" : "default",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {imgUrl && (
          <img
            ref={imgRef}
            src={imgUrl}
            alt="Pré-visualização da capa"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              setNatural({ w: img.naturalWidth, h: img.naturalHeight });
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
            style={imgStyle}
          />
        )}
        {/* Borda interna sutil pra deixar claro que aquilo É a moldura */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.65)" }}
        />
      </div>

      <div className="flex items-center gap-3">
        <ZoomOut className="w-4 h-4" style={{ color: "var(--rayo-ink-500)" }} />
        <Slider
          value={[zoom]}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          onValueChange={(v) => setZoom(v[0] ?? 1)}
          className="flex-1"
          aria-label="Zoom da capa"
        />
        <ZoomIn className="w-4 h-4" style={{ color: "var(--rayo-ink-500)" }} />
        <span
          className="text-[11px] tabular-nums w-10 text-right"
          style={{ color: "var(--rayo-ink-500)" }}
        >
          {zoom.toFixed(2)}×
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={handleConfirm} disabled={busy || !natural}>
          {busy ? "Aplicando…" : "Aplicar recorte"}
        </Button>
      </div>
    </div>
  );
}
