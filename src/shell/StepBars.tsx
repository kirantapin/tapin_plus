import { useLayoutEffect, useRef } from "react";
import { reducedMotion } from "../routes/parents_kit";

/* ══ THE STEP BARS, WIPED (Sam, 7 Nov 2026: "can we have the carousel
   indicators animate forward or backwards depending on which direction im
   going, like wipe fill or wipe unfill") ══════════════════════════════════
   Each bar is a grey track with an ink fill (a scaleX'd <i>). Going on, the
   newly reached bars fill left to right, one after another; coming back,
   the bars left behind drain right to left, last first. The builder's head
   and the checkout's head are different elements, so the count carries
   across them in `lastLit` (cleared when the builder closes, so a fresh
   open doesn't wipe). Reduced motion: they just change. */
let lastLit: number | null = null;
/** The builder closed: the next set of bars starts fresh. */
export function resetStepBars() {
  lastLit = null;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function StepBars({ className, total, lit, label }: { className: string; total: number; lit: number; label: string }) {
  const ref = useRef<HTMLOListElement | null>(null);
  const prev = useRef<number | null>(null);
  useLayoutEffect(() => {
    const was = prev.current ?? lastLit;
    prev.current = lit;
    lastLit = lit;
    const ol = ref.current;
    if (!ol || was == null || was === lit || reducedMotion()) return;
    const fills = Array.from(ol.querySelectorAll<HTMLElement>(":scope > li > i"));
    if (typeof fills[0]?.animate !== "function") return;
    if (lit > was) {
      for (let i = was; i < lit && i < fills.length; i++)
        fills[i].animate([{ transform: "scaleX(0)", transformOrigin: "left" }, { transform: "scaleX(1)", transformOrigin: "left" }], {
          duration: 420,
          delay: (i - was) * 90,
          easing: EASE,
          fill: "backwards",
        });
    } else {
      for (let i = was - 1; i >= lit && i >= 0; i--)
        fills[i]?.animate([{ transform: "scaleX(1)", transformOrigin: "right" }, { transform: "scaleX(0)", transformOrigin: "right" }], {
          duration: 340,
          delay: (was - 1 - i) * 80,
          easing: EASE,
          fill: "backwards",
        });
    }
  }, [lit]);
  return (
    <ol ref={ref} className={`${className} step-bars`} aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <li key={i} data-on={i < lit ? "" : undefined}>
          <i aria-hidden="true" />
        </li>
      ))}
    </ol>
  );
}
