import { useEffect, type RefObject } from "react";

/* ══ THE DOCK'S NUDGE (Sam, 6 Nov 2026: "don't like the pulsing animation
   here", replacing the 6 Nov swell of the whole button) ════════════════════
   The docked button holds still. Its arrow (shell/DockArrow.tsx) nudges
   forward twice, a quiet "this way", only once the visitor has stopped:
   after a few seconds with no scroll, tap or key. Any of those resets the
   wait; it nudges at most four times a visit, a little further apart each
   time, and never with reduced motion or a hidden tab. Only the arrow moves,
   so the island (shell/island.ts) always measures the button at rest.
   `on`: the dock is showing and nothing has grown out of it. `swap`: changes
   when the dock's button is replaced (Join becoming Get the app). */
const NUDGE: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(5px)", offset: 0.18 },
  { transform: "translateX(0)", offset: 0.36 },
  { transform: "translateX(5px)", offset: 0.54 },
  { transform: "translateX(0)", offset: 0.72 },
  { transform: "translateX(0)" },
];
const IDLE_MS = 3200;
const MAX_NUDGES = 4;

export function useDockPulse(dock: RefObject<HTMLElement | null>, on: boolean, swap?: unknown) {
  useEffect(() => {
    const arrow = dock.current?.querySelector<HTMLElement>(".tpa-dock-arrow");
    if (!arrow || !on || typeof arrow.animate !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let done = 0;
    let timer = 0;
    let run: Animation | null = null;
    const arm = () => {
      window.clearTimeout(timer);
      if (done < MAX_NUDGES) timer = window.setTimeout(nudge, IDLE_MS + done * 2000);
    };
    const nudge = () => {
      if (document.hidden) return arm();
      done += 1;
      run = arrow.animate(NUDGE, { duration: 1100, easing: "cubic-bezier(.4,0,.2,1)" });
      arm();
    };
    const busy = () => {
      run?.cancel();
      arm();
    };
    const opts: AddEventListenerOptions = { passive: true, capture: true };
    window.addEventListener("scroll", busy, opts);
    window.addEventListener("pointerdown", busy, opts);
    window.addEventListener("keydown", busy, opts);
    arm();
    return () => {
      window.clearTimeout(timer);
      run?.cancel();
      window.removeEventListener("scroll", busy, opts);
      window.removeEventListener("pointerdown", busy, opts);
      window.removeEventListener("keydown", busy, opts);
    };
  }, [dock, on, swap]);
}
