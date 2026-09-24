import { useLayoutEffect } from "react";

const KEY = "tapin:cardFlight";
const DURATION = 820;
/** A stash older than this is not a flight: the reader went somewhere else
 *  first (the CTA reads "View your membership" and goes to /in, say). */
const FRESH_MS = 5000;

interface Origin {
  top: number;
  left: number;
  width: number;
  height: number;
  at: number;
}

const reduced = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

function peek(): Origin | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Origin;
    return Date.now() - o.at < FRESH_MS ? o : null;
  } catch {
    return null;
  }
}

/**
 * Stash where the card is NOW, just before a route change takes it away.
 * Called on the control that navigates, not on a timer.
 */
export function stashCardOrigin(el: Element | null) {
  if (!el) return;
  /**
   * ══ SETTLE BEFORE MEASURING ═══════════════════════════════════════════════
   * `getBoundingClientRect` returns the TRANSFORMED box, so a card measured
   * mid-entrance or mid-float hands the flight an origin the card never
   * occupied. So finish every finite animation on the card and its ancestors,
   * cancel the perpetual ones (the close slide's float and drift), THEN read
   * the box: the rect is the still card whether the reader waited or tapped
   * straight through.
   */
  try {
    let node: Element | null = el;
    while (node) {
      node.getAnimations?.().forEach((a) => {
        try {
          /* A PERPETUAL ANIMATION HAS NO END TO JUMP TO. The close slide's card
             floats and drifts for as long as it is on screen (Sam, 14 Sep
             2026), and `finish()` throws on an infinite animation — which,
             inside one try around the whole walk, would have abandoned every
             animation after it unsettled. Those are cancelled instead: the
             effect is dropped and the element sits on its authored pose,
             which is the same still card a finished entrance leaves. Each
             animation gets its own guard so one that will not settle cannot
             stop the rest from doing so. */
          if (a.effect?.getComputedTiming().iterations === Infinity) a.cancel();
          else a.finish();
        } catch {
          /* This one stays as the browser has it; the others still settle. */
        }
      });
      node = node.parentElement;
    }
  } catch {
    /* getAnimations is unsupported — the measurement below is then whatever
       the browser reports, which is exactly the behaviour this had before the
       guard existed. */
  }
  const r = el.getBoundingClientRect();
  const origin: Origin = { top: r.top, left: r.left, width: r.width, height: r.height, at: Date.now() };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(origin));
  } catch {
    /* private mode, or storage disabled — the flight simply does not happen */
  }
}

/**
 * Whether a flight is waiting for /reserve. The layer reads it on its first
 * render and holds the sheet still (`is-still`), so the sheet does not play its
 * own entrance under the flight. False under reduced motion: no flight there.
 */
export function flightPending(): boolean {
  /* The checkout's card is not drawn below 1024 (reserve.css `.rs-inc-card`). */
  const shown = window.matchMedia?.("(min-width: 1024px)").matches ?? true;
  return shown && !reduced() && peek() !== null;
}

/* Off-screen, or not the same card (a resize between routes): no flight
   rather than a scaled one. The two surfaces draw it at one width. */
const flies = (from: Origin, to: DOMRect) =>
  to.width > 0 &&
  Math.abs(from.width - to.width) <= 2 &&
  Math.abs(from.height - to.height) <= 2 &&
  from.left < window.innerWidth &&
  from.left + from.width > 0 &&
  from.top < window.innerHeight &&
  from.top + from.height > 0;

const frame = () => new Promise<void>((done) => requestAnimationFrame(() => done()));

/**
 * Fly the card from where it was on the deck onto this one — the SAME card,
 * moved, not a clone (POLISH §25). A FLIP on the destination's own
 * `.card-stage` (the tilt owns `.tcard`'s transform): translate only, so the
 * card's size never changes in flight and nothing is swapped when it lands.
 *
 * Reduced motion is gated here, in JS: a CSS `animation:none` cannot reach
 * the Web Animations API.
 */
export function useCardFlight(ref: React.RefObject<HTMLElement | null>) {
  /* Layout effect, so the first painted frame already has the card on its
     origin: there is never a frame with the card at home before it flies.
     No cleanup: in development React runs this twice, and the first run has
     consumed the stash and owns the flight; the second finds nothing. */
  useLayoutEffect(() => {
    const from = peek();
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nothing stashed that could be read either */
    }
    const card = ref.current;
    const stage = card?.parentElement;
    if (!from || !card || !stage || reduced()) return;
    if (!flies(from, card.getBoundingClientRect())) return;

    /* ══ THE PAGE HOLDS STILL WHILE THE CARD LANDS ═════════════════════════
       Sam, 13 Sep 2026: an arrival needs something to arrive into. This flag
       holds the sheet's other content back (reserve.css, `arriveIn`) and
       brings it up behind the landing card; it is on <html> because on a
       phone the columns are `display:contents` and cannot be animated. */
    const html = document.documentElement;
    html.dataset.flight = "in";
    const place = (to: DOMRect) =>
      `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
    stage.style.transform = place(card.getBoundingClientRect());
    const land = () => {
      stage.style.transform = "";
      delete html.dataset.flight;
    };

    /* The landing is measured once the sheet has settled: fonts in, and two
       frames for the grid. Until then the card waits on its origin. */
    const fonts = document.fonts?.ready ?? Promise.resolve();
    Promise.race([fonts, new Promise((done) => setTimeout(done, 300))])
      .then(frame)
      .then(frame)
      .then(() => {
        stage.style.transform = "";
        const to = card.getBoundingClientRect();
        if (!flies(from, to)) {
          land();
          return;
        }
        const ease =
          getComputedStyle(html).getPropertyValue("--ease").trim() ||
          "cubic-bezier(.22,1,.36,1)";
        stage
          .animate([{ transform: place(to) }, { transform: "none" }], {
            duration: DURATION,
            easing: ease,
            fill: "backwards",
          })
          .finished.then(land, land);
      });
  }, [ref]);
}
