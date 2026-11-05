/* ══ ONE SCROLL LOCK FOR EVERY POP-UP ══════════════════════════════════════
   Each pop-up used to save body.style.overflow, set it to hidden, and put
   back what it saved. When one pop-up hands over to another (a place pop-up,
   the walkthrough or Try it once opening the checkout), their saves and
   restores interleave and the page was left frozen after the checkout
   closed (found in review, 4 Nov 2026). A count instead: the page locks when
   the first pop-up asks and unlocks when the last one lets go. */

let held = 0;

/** Locks page scroll; the returned function lets go (once). */
export function lockScroll(): () => void {
  if (typeof document === "undefined") return () => {};
  if (held++ === 0) document.body.style.overflow = "hidden";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--held === 0) document.body.style.overflow = "";
  };
}

/** Whether a modal dialog is open (so a closing pop-up doesn't pull focus
 *  back behind it). */
export const modalOpen = () => typeof document !== "undefined" && !!document.querySelector('[aria-modal="true"]');
