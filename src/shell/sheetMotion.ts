/* ══ HOW EVERY POP-UP LEAVES (Sam, 4 Nov 2026: "this modal should slide
   down when I close it instead of just a fade, can you do that for all
   modals") ═════════════════════════════════════════════════════════════════
   One exit for the Join checkout, the place pop-ups, the walkthrough and Try
   it once. On a phone, where they are sheets from the bottom, the sheet drops
   back off the bottom edge the way it came, accelerating as it goes, and the
   backdrop fades under it. On a computer, where they are cards in the middle,
   the card dips and fades: a full drop across a tall screen would be slow
   for no reason. Faster than the way in, since leaving should never make
   anyone wait. Reduced motion: gone at once. */

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const isSheet = () => typeof window !== "undefined" && !window.matchMedia?.("(min-width: 640px)").matches;

const EASE_OUT_OF_VIEW = "cubic-bezier(.4, 0, 1, 1)";

/** Slides `sheet` away (and fades `layer`), then calls `done` once. */
export function slideAway(sheet: HTMLElement | null, layer: HTMLElement | null, done: () => void): void {
  if (!sheet || still() || typeof sheet.animate !== "function") {
    done();
    return;
  }
  let called = false;
  const finish = () => {
    if (called) return;
    called = true;
    done();
  };
  const phone = isSheet();
  const drop = phone ? sheet.getBoundingClientRect().height + 24 : 28;
  const duration = phone ? 300 : 200;
  layer?.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-in", fill: "forwards" });
  const run = sheet.animate(
    phone
      ? [{ transform: "none" }, { transform: `translateY(${drop}px)` }]
      : [{ transform: "none", opacity: 1 }, { transform: `translateY(${drop}px)`, opacity: 0 }],
    { duration, easing: EASE_OUT_OF_VIEW, fill: "forwards" },
  );
  run.onfinish = finish;
  /* Belt and braces: a hidden tab can stall the animation's end. */
  window.setTimeout(finish, duration + 120);
}

