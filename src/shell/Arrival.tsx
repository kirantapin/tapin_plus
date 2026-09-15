import { useEffect, useState } from "react";
import TapInLogo from "./TapInLogo";

/**
 * The arrival. A page-load moment for the landing page: the wordmark lands,
 * the town is pinned, the veil lifts.
 *
 * Sam, 15 Sep 2026: "a page load animation on refresh or first load … 'there's
 * a new guy in town, and you're invited' … a quick animation with the tapin
 * logo, and the blacksburg name with the location icon."
 *
 * ══ THE THESIS ═════════════════════════════════════════════════════════════
 * Something new has arrived in town, and it arrived for you. Not a splash
 * screen — a splash is a loading state wearing a logo — but an ARRIVAL, told
 * in TapIn's own gesture: the mark is a tap, so the dot lands last and lands
 * hard; then the pin drops onto Blacksburg the way a pin drops on a map, and
 * the ring under it says "here". Nothing is written that the page does not
 * already say; the copy is the wordmark and the town. The "you're invited"
 * half is the veil lifting — the page was there the whole time.
 *
 * ══ WHERE, AND HOW OFTEN ═══════════════════════════════════════════════════
 * On the landing page only (/ and /welcome), and on every full load of it —
 * Sam asked for refresh as well as first load, so there is no once-per-session
 * memory. Never on a route change: a reader who taps How and comes back has
 * not arrived anywhere. Not on /how, /reserve or /in, which a shared link may
 * open straight into a task; the deck and the checkout are not the door.
 *
 * ══ WHAT IT MUST NEVER DO ══════════════════════════════════════════════════
 * · Block. A tap or a key ends it at once — no minimum, no "please wait".
 * · Play under reduced motion. It renders nothing at all; the page is simply
 *   there. A cross-fade would still be motion someone asked not to see.
 * · Delay the page. The page renders underneath from the first frame; the
 *   veil is opaque page-colour over a finished layout, so lifting it reveals
 *   a settled page and nothing shifts.
 * · Reach a screen reader. The wordmark and the town are on the page already;
 *   this is decoration and is hidden from the tree.
 *
 * Timing lives in arrival.css with the keyframes; this file only knows the
 * two cues — when to start the lift and when to unmount.
 */

/** When the lift starts, ms from mount. Mirrors the CSS choreography. */
const LIFT_AT = 1250;
/** How long the lift takes; after it the overlay is gone. */
const LIFT_MS = 480;

/** DEV seam: `?hold` keeps the veil up so a frame can be inspected. A tap
 *  or key still lifts it. Does nothing in a production build. */
const held = (): boolean =>
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("hold");

const reduced = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export default function Arrival() {
  const [phase, setPhase] = useState<"in" | "lift" | "done">(() =>
    reduced() ? "done" : "in",
  );

  useEffect(() => {
    if (phase !== "in") return;
    const t = held() ? 0 : window.setTimeout(() => setPhase("lift"), LIFT_AT);
    /* Any tap or key is the skip. Listened for on the window, so it works
       whether or not the veil itself has focus. */
    const skip = () => setPhase("lift");
    window.addEventListener("pointerdown", skip, { passive: true });
    window.addEventListener("keydown", skip);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "lift") return;
    const t = window.setTimeout(() => setPhase("done"), LIFT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div className={`arrival${phase === "lift" ? " is-lifting" : ""}`} aria-hidden="true">
      <div className="arrival-lockup">
        <TapInLogo className="arrival-logo" />
        <p className="arrival-place">
          <span className="arrival-pin">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"
                fill="none" stroke="currentColor" strokeWidth="1.9"
                strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
            </svg>
          </span>
          <span className="arrival-town">Blacksburg</span>
        </p>
      </div>
    </div>
  );
}
