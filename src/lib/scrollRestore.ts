import { useEffect, useRef } from "react";

const memory = new Map<string, number>();

export function useScrollRestore(key: string, isOverlayOpen: boolean) {
  const wasOpenRef = useRef(isOverlayOpen);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    if (!wasOpen && isOverlayOpen) {
      memory.set(key, window.scrollY);
    } else if (wasOpen && !isOverlayOpen) {
      const saved = memory.get(key);
      if (typeof saved === "number") {
        requestAnimationFrame(() => {
          window.scrollTo({ top: saved, behavior: "auto" });
        });
      }
    }
    wasOpenRef.current = isOverlayOpen;
  }, [key, isOverlayOpen]);
}
