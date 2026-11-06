import { useEffect, type RefObject } from "react";

/* ══ THE DOCK'S PULSE (Sam, 6 Nov 2026: "on all tapin plus pages, the sticky
   CTA at the bottom, when not expanded, should pulse gently") ═══════════════
   The docked button breathes: a slight swell and back, then a rest, every
   three seconds. Transform only (composited), so nothing repaints. It starts
   a beat after the dock is showing and stops:
     - while the checkout is open (the plate is hidden under the island, and
       a running animation there made the close stutter before);
     - the moment anything on the page is pressed, so the island measures the
       button at rest (shell/island.ts reads its box to dress its stand-in),
       and again a beat after if the press opened nothing;
     - with reduced motion, where it never runs.
   `on`: the dock is showing and nothing has grown out of it. `swap`: changes
   when the dock's button is replaced (Join becoming Get the app), so the
   pulse moves to the new one. */
const FRAMES: Keyframe[] = [
  { transform: "scale(1)", offset: 0, easing: "cubic-bezier(.45,0,.55,1)" },
  { transform: "scale(1.035)", offset: 0.16, easing: "cubic-bezier(.45,0,.55,1)" },
  { transform: "scale(1)", offset: 0.34 },
  { transform: "scale(1)", offset: 1 },
];

export function useDockPulse(dock: RefObject<HTMLElement | null>, on: boolean, swap?: unknown) {
  useEffect(() => {
    const el = dock.current?.querySelector<HTMLElement>(".tpa-dock-cta");
    if (!el || !on || typeof el.animate !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const run = el.animate(FRAMES, { duration: 3000, delay: 1400, iterations: Infinity });
    /* Still at the moment of any press on the page (the dock's own button or
       any other Join, which grows out of this same plate), so the island
       measures it at rest; back again if that press opened nothing (a scroll
       that started on the button, say). Restarting runs the 1.4s rest first. */
    const stop = (e: Event) => {
      const t = e.target as Element | null;
      if (e.type === "keydown" ? t === el : t?.closest?.("a, button")) run.cancel();
    };
    const resume = () => {
      window.setTimeout(() => {
        if (el.isConnected && run.playState !== "running") run.play();
      }, 0);
    };
    document.addEventListener("pointerdown", stop, true);
    document.addEventListener("pointerup", resume, true);
    document.addEventListener("pointercancel", resume, true);
    el.addEventListener("keydown", stop);
    el.addEventListener("keyup", resume);
    return () => {
      run.cancel();
      document.removeEventListener("pointerdown", stop, true);
      document.removeEventListener("pointerup", resume, true);
      document.removeEventListener("pointercancel", resume, true);
      el.removeEventListener("keydown", stop);
      el.removeEventListener("keyup", resume);
    };
  }, [dock, on, swap]);
}
