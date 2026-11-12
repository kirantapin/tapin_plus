import { useEffect, useRef, type RefObject } from "react";

/* ══ THE PLACES ROW AS A TICKER (Sam, 12 Nov 2026: "let's not have it be a
   carousel but rather a ticker - scrolling on its own but also still
   horizontally scrollable") ════════════════════════════════════════════════
   The row drifts left on its own by moving its own scroll position, so it is
   still a real scrolling row: a swipe, a trackpad or the arrows move it, and
   the drift picks up from wherever they leave it a moment later. The list is
   drawn twice (the page marks the second copy data-ticker-copy) so the drift
   wraps without a jump: once it has scrolled one whole set, it steps back by
   exactly that set.
   It holds still while the pointer is over it, while anything in it has
   focus, while it is off screen or the tab is hidden, while `paused` is set
   (the page's pause button), and always with reduced motion. */
const SPEED = 28; // px a second
const IDLE_AFTER_USER = 2600; // ms

export function useTicker(rail: RefObject<HTMLElement | null>, on: boolean, paused: boolean, resetKey: unknown) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    const el = rail.current;
    if (!el || !on) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = 0;
    let pos = el.scrollLeft;
    let wrote = pos;
    let hold = false;
    let seen = true;
    let userUntil = 0;
    /* One set's width: from the first card to the first card of the copy. */
    const setWidth = () => {
      const first = el.querySelector<HTMLElement>(":scope > li");
      const copy = el.querySelector<HTMLElement>(":scope > li[data-ticker-copy]");
      return first && copy ? copy.offsetLeft - first.offsetLeft : 0;
    };
    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      const dt = last ? Math.min(64, t - last) : 0;
      last = t;
      /* Someone scrolled it: take their position, wait, then carry on. */
      if (Math.abs(el.scrollLeft - wrote) > 1.5) {
        pos = el.scrollLeft;
        wrote = pos;
        userUntil = t + IDLE_AFTER_USER;
      }
      if (hold || !seen || pausedRef.current || document.hidden || t < userUntil) return;
      const w = setWidth();
      if (w <= 0) return;
      pos += (SPEED * dt) / 1000;
      if (pos >= w) pos -= w;
      el.scrollLeft = pos;
      wrote = el.scrollLeft;
    };
    const enter = () => (hold = true);
    const leave = () => {
      hold = el.contains(document.activeElement);
    };
    const focusIn = () => (hold = true);
    const focusOut = (e: FocusEvent) => {
      hold = el.matches(":hover") || el.contains(e.relatedTarget as Node | null);
    };
    const touch = (e: Event) => {
      userUntil = performance.now() + IDLE_AFTER_USER;
      if (e.type === "touchstart") hold = true;
    };
    const untouch = () => {
      hold = false;
      userUntil = performance.now() + IDLE_AFTER_USER;
    };
    const io = typeof IntersectionObserver === "function" ? new IntersectionObserver(([e]) => (seen = e.isIntersecting)) : null;
    io?.observe(el);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("focusin", focusIn);
    el.addEventListener("focusout", focusOut);
    el.addEventListener("touchstart", touch, { passive: true });
    el.addEventListener("touchend", untouch, { passive: true });
    el.addEventListener("wheel", touch, { passive: true });
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("focusin", focusIn);
      el.removeEventListener("focusout", focusOut);
      el.removeEventListener("touchstart", touch);
      el.removeEventListener("touchend", untouch);
      el.removeEventListener("wheel", touch);
    };
    // resetKey: the filter, which changes what's in the row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rail, on, resetKey]);
}
