/* ══ THE ACCORDIONS, IN MOTION (Sam, 6 Nov 2026: "can we animate these
   accordions ... and all accordions actually") ════════════════════════════
   Every <details> on the Plus pages (.tpa) opens like paper unfolding rather
   than snapping: the box grows to its new height on a long ease-out while
   its words fade up into place a beat behind; closing folds it back a
   little faster on an ease-in, and the chevron turns with it (its own CSS
   transition; [data-closing] turns it back as the close starts, not after).
   A tap mid-way reverses from wherever it is. One listener for the whole
   document, so every accordion, now and later, gets it with no markup.
   Native toggling stays with reduced motion, and for anything outside .tpa. */

const EASE_OPEN = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_CLOSE = "cubic-bezier(0.4, 0, 1, 1)";
const running = new WeakMap<HTMLDetailsElement, Animation>();

const still = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The details' height with only its summary showing. */
function closedHeight(d: HTMLDetailsElement, summary: HTMLElement): number {
  const cs = getComputedStyle(d);
  const top = d.getBoundingClientRect().top;
  return summary.getBoundingClientRect().bottom - top + parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
}

function toggle(d: HTMLDetailsElement, summary: HTMLElement) {
  const from = d.getBoundingClientRect().height;
  running.get(d)?.cancel();
  const opening = !d.open || d.dataset.closing === "1";
  let to: number;
  if (opening) {
    delete d.dataset.closing;
    d.open = true;
    to = d.getBoundingClientRect().height;
  } else {
    d.dataset.closing = "1";
    to = closedHeight(d, summary);
  }
  const span = Math.abs(to - from);
  d.style.overflow = "hidden";
  const a = d.animate([{ height: `${from}px` }, { height: `${to}px` }], {
    duration: Math.round(Math.min(opening ? 420 : 320, Math.max(opening ? 240 : 180, span * 1.4))),
    easing: opening ? EASE_OPEN : EASE_CLOSE,
  });
  running.set(d, a);
  if (opening) {
    Array.from(d.children).forEach((child) => {
      if (child === summary) return;
      child.animate(
        [
          { opacity: 0, transform: "translateY(-4px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 300, delay: 60, easing: EASE_OPEN, fill: "backwards" },
      );
    });
  }
  a.onfinish = () => {
    running.delete(d);
    d.style.overflow = "";
    if (!opening) {
      d.open = false;
      delete d.dataset.closing;
    }
  };
}

export function installDetailsMotion() {
  if (typeof document === "undefined") return;
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const summary = (e.target as Element | null)?.closest?.("summary");
    const d = summary?.parentElement;
    if (!summary || !(d instanceof HTMLDetailsElement) || d.firstElementChild !== summary) return;
    if (!d.closest(".tpa") || still() || typeof d.animate !== "function") return;
    /* A link or button inside the summary keeps its own click. */
    const inner = (e.target as Element).closest("a, button");
    if (inner && summary.contains(inner)) return;
    e.preventDefault();
    toggle(d, summary as HTMLElement);
  });
}
