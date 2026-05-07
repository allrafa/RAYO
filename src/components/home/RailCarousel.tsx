import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RailCarouselProps {
  className: string;
  ariaLabel: string;
  children: ReactNode;
}

export function RailCarousel({ className, ariaLabel, children }: RailCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setCanPrev(el.scrollLeft > 2);
      setCanNext(el.scrollLeft < max - 2);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });

    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c as Element));

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [children]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="rh-rail">
      <div ref={scrollerRef} className={className} role="region" aria-label={ariaLabel}>
        {children}
      </div>
      <button
        type="button"
        className="rh-rail-arrow left"
        aria-label="Rolar para a esquerda"
        onClick={() => scrollByPage(-1)}
        hidden={!canPrev}
        tabIndex={canPrev ? 0 : -1}
      >
        <ChevronLeft className="w-5 h-5" aria-hidden />
      </button>
      <button
        type="button"
        className="rh-rail-arrow right"
        aria-label="Rolar para a direita"
        onClick={() => scrollByPage(1)}
        hidden={!canNext}
        tabIndex={canNext ? 0 : -1}
      >
        <ChevronRight className="w-5 h-5" aria-hidden />
      </button>
    </div>
  );
}
