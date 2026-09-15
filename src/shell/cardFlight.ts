import { useEffect } from "react";

const KEY = "tapin:cardFlight";
const DURATION = 820;
const CROSSFADE = 200;
/** Not the house curve: a flight is an arrival, and this is the curve the old
 *  build measured for it. */
const EASE = "cubic-bezier(.16,1,.3,1)";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
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
   * mid-entrance hands the flight an origin that is offset and scaled — the
   * clone then takes off from somewhere the card never was.
   *
   * The close slide carried "no entrance animation anywhere on this slide" for
   * exactly this reason, and that constraint bought a still card at the cost of
   * the deck's final beat having no arrival at all. Sam asked for the arrival
   * on 13 Sep 2026, so the guarantee moves here instead, where it is cheap:
   * finish any animation still running on the card or its ancestors, THEN read
   * the box. A finished animation sits on its 100% keyframe — which this build
   * guarantees is the resting state — so the rect is the settled one whether the
   * reader waited or tapped straight through.
   *
   * `getAnimations({subtree:true})` is on the ancestor chain rather than the
   * card alone because the entrance is authored on the wrapper; a transform on
   * any ancestor moves this rect just as surely as one on the element itself.
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
  const rect: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(rect));
  } catch {
    /* private mode, or storage disabled — the flight simply does not happen */
  }
}

/**
 * Fly the card from where it was on the previous surface onto this one's card.
 *
 * Three things the old build learned the hard way, all encoded here:
 *
 *  1. THE CARD NEVER FADES WHEN IT HAS SOMEWHERE TO LAND. The deck used to fade
 *     as one element, so the card flying out of it faded with it and there was
 *     no card on screen at all for ~600ms. The flying clone runs at full
 *     strength and the destination card fades in UNDERNEATH it.
 *
 *  2. IT IS FLIP, NOT top/left. Animating position properties drops the card off
 *     the compositor. The clone is placed at the DESTINATION and transformed
 *     back to the origin, then animated to identity — transform only.
 *
 *  3. REDUCED MOTION IS GATED IN JS. This is the Web Animations API, which a CSS
 *     `animation: none !important` cannot reach. The kill-switch has to live
 *     here or it does not exist.
 */
export function useCardFlight(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(KEY);
      if (raw) sessionStorage.removeItem(KEY);
    } catch {
      return;
    }
    if (!raw) return;

    const dest = ref.current;
    if (!dest) return;

    // The JS gate. CSS cannot switch off a WAAPI animation.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let from: Rect;
    try {
      from = JSON.parse(raw) as Rect;
    } catch {
      return;
    }
    const to = dest.getBoundingClientRect();
    if (!to.width || !from.width) return;

    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = from.width / to.width;
    const sy = from.height / to.height;

    const clone = dest.cloneNode(true) as HTMLElement;
    clone.setAttribute("aria-hidden", "true");
    Object.assign(clone.style, {
      position: "fixed",
      top: `${to.top}px`,
      left: `${to.left}px`,
      width: `${to.width}px`,
      height: `${to.height}px`,
      margin: "0",
      zIndex: "90",
      pointerEvents: "none",
      transformOrigin: "top left",
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(clone);

    const flight = clone.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transform: "translate(0, 0) scale(1, 1)" },
      ],
      { duration: DURATION, easing: EASE, fill: "both" },
    );

    // The destination card comes up UNDER the landed one, so there is never a
    // frame without a card. Driven by the animation's own fill rather than an
    // inline opacity, so a cancelled flight cannot strand the card invisible.
    dest.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: CROSSFADE,
      delay: DURATION - CROSSFADE,
      easing: "linear",
      fill: "both",
    });

    /* ══ THE PAGE HOLDS STILL WHILE THE CARD LANDS ═════════════════════════
       Sam, 13 Sep 2026: clicking Reserve "would take me directly to the
       checkout flow" rather than reading as a transition.

       He was right about what he saw and the flight was not broken. MEASURED:
       the card goes from 295x186 at y=245 on /how to 343x216 at y=124 on
       /reserve — a **122px** travel and a 0.86 -> 1 scale, under an expo-out
       that is ~95% complete by 300ms of its 820. So the card nudges a tenth of
       a screen while the ENTIRE checkout is already painted around it. There
       was nothing wrong with the animation; there was nothing for it to do.

       An arrival needs something to arrive into. This flag lets the
       destination hold its other content back and bring it up behind the
       landed card, which is the one authored moment on this route. It is an
       attribute on <html> rather than React state because the content it
       governs lives in three different subtrees on /reserve, two of which are
       `display:contents` on a phone and therefore cannot be animated at all. */
    document.documentElement.dataset.flight = "in";
    const clearFlag = () => delete document.documentElement.dataset.flight;

    // The clone owns its own life and is NOT torn down by React's cleanup.
    //
    // It used to be. In development React double-invokes effects: the first pass
    // consumed the stashed rect and built the clone, the simulated unmount
    // immediately removed it, and the second pass found no rect and did nothing
    // — so the flight never ran, and it would have shipped looking fine in a
    // production build while being dead in every dev session.
    flight.finished
      .then(() => {
        clone.remove();
        clearFlag();
      })
      .catch(() => {
        clone.remove();
        clearFlag();
      });
  }, [ref]);
}
