import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * THE MOVE FROM ONE STEP TO THE NEXT, ONCE.
 *
 * Sam, 21 Sep 2026, describing the checkout he wanted: "If I click on Checkout,
 * there's this slight fade/slide-to-the-left animation that takes me to the page
 * where I enter my details. Once I hit send me a code … it does that same left
 * slide/fade animation, which takes me to the two-factor authentication page."
 *
 * Two surfaces need exactly that: the checkout's four pages (ReserveLayer) and
 * PhoneStep's two stages, which run inside the checkout's page 1 AND inside the
 * sign-in sheet. Three places, one move — so it is a primitive rather than a
 * pattern copied three times, and a change to the motion is a change in one
 * file (docs/POLISH-2026-09-21.md §9.1).
 *
 * ══ IT IS A STACK, NOT A CAROUSEL ══════════════════════════════════════════
 * The pages sit on top of each other and only the current one is IN FLOW; the
 * rest are absolutely positioned at the top of the stack. That is what keeps
 * the sheet the height of the page you are on — a row of four pages is as tall
 * as its tallest, so a reader on the two-field details page would have been
 * given the seat-count page's scroll to fall down. It also means the move is
 * 32px of travel and an opacity, never a full viewport translate: no page is
 * ever off to the side, so there is nothing to scroll sideways into.
 *
 * ══ WHAT A PARKED PAGE IS ══════════════════════════════════════════════════
 * `visibility:hidden` (not painted), `inert` (not focusable, not clickable) and
 * `aria-hidden` (not read). All three, because each answers a different reader:
 * without `inert` a tab lands on a control nobody can see, and without
 * `aria-hidden` a screen reader recites three pages as one. The page KEEPS ITS
 * STATE — a number typed on the phone page is still typed when you come back to
 * it from the code page, which is the whole point of not unmounting.
 */

/** The move's duration. The CSS below and every host's timing read this. */
export const PAGE_MOVE_MS = 280;

const jumps = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * The stack. `dir` is which way the reader is going, and it is what makes Back
 * play the move mirrored — the CSS picks the keyframes off this attribute, so a
 * page needs to know nothing about where it sits in the sequence.
 */
export default function Pager({
  dir,
  className = "",
  children,
}: {
  dir: "fwd" | "back";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rs-pages${className ? ` ${className}` : ""}`} data-dir={dir}>
      {children}
    </div>
  );
}

/**
 * on  = in flow and shown, having arrived without a move (the page the stack
 *       opens on)
 * in  = in flow and shown, playing its entrance
 * out = playing its exit: still painted, already out of flow
 * off = parked: no layout, no paint, no focus, not read
 *
 * WHY "on" AND "in" ARE TWO STATES rather than a flag read at render time: a
 * page re-renders whenever its contents change, and an entrance derived from a
 * ref would re-attach its class on any of those renders and replay the move
 * — the checkout's page 0 re-renders every keystroke of the name on the card.
 * Held as state, the class changes only when the page actually moves.
 */
type Phase = "on" | "in" | "out" | "off";

export function Page({
  current,
  className = "",
  children,
}: {
  current: boolean;
  className?: string;
  children: ReactNode;
}) {
  /* The page that is up when the stack first paints has not MOVED there, so it
     does not play an entrance: the checkout's first page would otherwise fade
     in under a sheet that is already sliding up — two motions for one arrival. */
  const [phase, setPhase] = useState<Phase>(current ? "on" : "off");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (current) {
      setPhase((p) => (p === "on" || p === "in" ? p : "in"));
      return;
    }
    /* Leaving is a state of its own for exactly as long as the move: the page
       has to stay painted to fade out, and out of flow while it does, or the
       stack would be as tall as both pages for those 280ms. */
    setPhase((p) => ((p === "on" || p === "in") && !jumps() ? "out" : "off"));
    const t = window.setTimeout(() => setPhase("off"), PAGE_MOVE_MS);
    return () => window.clearTimeout(t);
  }, [current]);

  /* `inert` is not in React 18's attribute types, and a cast to get it into JSX
     would be a lie about the DOM rather than about the types — so it is set on
     the node. It also has to come off again the moment the page is current,
     which an attribute written once in markup would not do. */
  const shown = phase === "on" || phase === "in";
  useEffect(() => {
    box.current?.toggleAttribute("inert", !shown);
  }, [shown]);

  const state = phase === "in" ? " is-in" : phase === "out" ? " is-out" : phase === "off" ? " is-off" : "";

  return (
    <div
      ref={box}
      className={`rs-page${state}${className ? ` ${className}` : ""}`}
      aria-hidden={shown ? undefined : true}
    >
      {children}
    </div>
  );
}
