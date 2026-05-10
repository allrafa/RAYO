// Task #164 — Lightbox simples para imagens de post.
// Renderizado via createPortal(document.body) pelo mesmo motivo do
// CommentsPanel (Task #115): qualquer ancestor com transform quebra
// `position: fixed`. ESC ou click no backdrop fecha. Setas de navegação
// quando há mais de uma imagem.

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface Props {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

export function PostImageLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: Props) {
  const total = images.length;
  const safeIndex = Math.max(0, Math.min(index, total - 1));

  const goPrev = useCallback(() => {
    if (total < 2) return;
    onIndexChange((safeIndex - 1 + total) % total);
  }, [safeIndex, total, onIndexChange]);

  const goNext = useCallback(() => {
    if (total < 2) return;
    onIndexChange((safeIndex + 1) % total);
  }, [safeIndex, total, onIndexChange]);

  // Body scroll lock + atalhos de teclado.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, goPrev, goNext]);

  if (total === 0) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualizar imagem"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Fechar"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: 22,
          background: "rgba(255,255,255,0.12)",
          color: "#fff",
          border: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X className="w-5 h-5" />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Imagem anterior"
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Próxima imagem"
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "min(96vw, 1200px)",
          maxHeight: "88vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ImageWithFallback
          src={images[safeIndex]}
          alt={`Imagem ${safeIndex + 1} de ${total}`}
          className="block"
          style={{
            maxWidth: "100%",
            maxHeight: "88vh",
            objectFit: "contain",
            borderRadius: 8,
          }}
        />
      </div>

      {total > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            color: "#fff",
            fontSize: 13,
            background: "rgba(0,0,0,0.5)",
            padding: "6px 12px",
            borderRadius: 12,
          }}
        >
          {safeIndex + 1} / {total}
        </div>
      )}
    </div>,
    document.body,
  );
}
