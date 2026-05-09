import { useEffect, type RefObject } from "react";

export function useAutofocusOnDesktop<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia?.("(pointer: fine)").matches;
    if (!isDesktop) return;
    const t = window.setTimeout(() => {
      ref.current?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, [enabled, ref]);
}
