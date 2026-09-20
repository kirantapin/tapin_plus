import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { seatNoun } from "../model/content";

/**
 * The checkout as a FULL-PAGE MODAL that slides up over the page you came from.
 *
 * Sam, 14 Sep 2026: "this page should be a modal that slides up from the
 * bottom of the page… there should be an 'X' out button at the top" — then,
 * shown a bottom sheet: "i still want the same background we had, and the
 * sticky buttons and such. Maybe this can just be a full page modal instead."
 *
 * So the page is unchanged inside: the photo band with the card on it, the
 * sticky bar, the two-column desktop layout — all of /reserve's own CSS keys
 * off `.column`, and `.sheet-column` IS a `.column`. What the layer adds is
 * the frame: a fixed, full-viewport surface that rises from the bottom edge
 * (translateY 100% → 0, 360ms, the house curve) under a 180ms scrim fade, its
 * own scroller, and a close that puts the reader back on the pitch with their
 * scroll position intact. Exit is the layer unmounting — the page beneath is
 * already painted, so nothing is faster. Reduced motion: no animation.
 *
 * ROUTING is the app window's (AppLayer): a link into /reserve carries
 * `state.background`; App.tsx renders that location in the main <Routes> and
 * this layer renders <Reserve/> for the real URL. A direct visit gets the
 * pitch underneath, the right default for a shared link. Coming BACK from the
 * app window (`state.fromLayer`) skips the entrance — the modal was already
 * open in the reader's mind.
 *
 * THE HEADER is the one piece of chrome the modal adds (Sam, 14 Sep 2026:
 * "on the checkout page can we have a sticky header?" and "add the tapin logo
 * with the blacksburg chip with a location icon next to it"). Wordmark, a
 * Blacksburg chip with the pitch's own pin glyph, the X. It is glass over the
 * scroller — photography runs under it at the top, the page beneath it after —
 * and it never scrolls away, so the way out is always one tap.
 *
 * FIXED CHILDREN (the sticky bar, the checkout sheet's scrim) keep working:
 * while the sheet is mid-slide its transform makes it their containing block,
 * and it is inset:0, so "the sheet's bottom edge" and "the viewport's bottom
 * edge" are the same line; when the animation settles on `transform:none`
 * the containing block is the viewport again. The scroller is a separate
 * inner box, so neither ever scrolls away with the content.
 */
export default function ReserveLayer({
  background,
  children,
}: {
  background: Location | undefined;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const still = Boolean((location.state as { fromLayer?: boolean } | null)?.fromLayer);
  const sheet = useRef<HTMLDivElement>(null);

  /* ══ THE WAY OUT IS ANIMATED TOO ══════════════════════════════════════════
     Sam, 15 Sep 2026: "/impeccable animate for the slide in and out animation
     for this modal." Leaving used to be the layer unmounting — instant. Now
     the sheet slides back down under the scrim's fade, quicker than it came
     (260ms, ease-in: an object leaving does not decelerate into the edge it
     is leaving through), and the route changes when the motion is done. One
     close at a time; a second tap during the exit is ignored rather than
     queued. Reduced motion: no exit animation, the route changes at once. */
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    if (closing) return;
    const to = background
      ? `${background.pathname}${background.search}${background.hash}`
      : "/";
    const go = () => navigate(to, { state: { fromLayer: true } });
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      go();
      return;
    }
    setClosing(true);
    window.setTimeout(go, 280);
  }, [background, navigate, closing]);

  useEffect(() => {
    sheet.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      /* Escape closes the modal — unless the checkout sheet is open on top of
         it, which owns Escape itself. */
      if (e.key === "Escape" && !document.querySelector(".cs-scrim")) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
      <div className={`reserve-layer${still ? " is-still" : ""}${closing ? " is-closing" : ""}`}>
        <div className="reserve-scrim" aria-hidden="true" />
        <div
          className="reserve-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={`Get the ${seatNoun}`}
          tabIndex={-1}
          ref={sheet}
        >
          {/* Sam, 15 Sep 2026: the wordmark and the Blacksburg chip doubled the
              card's own lockup and BLACKSBURG directly beneath them — "these
              should go in the footer not the header. In the header it can just
              say checkout." So: one word, centred, and the way out. */}
          <header className="sheet-head">
            <p className="sheet-title">Get early access</p>
            <button type="button" className="how-back sheet-close" onClick={close} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          <div className="sheet-scroll">
            <div className="column sheet-column">{children}</div>
          </div>
        </div>
      </div>
  );
}
