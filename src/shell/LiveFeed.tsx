import { useEffect, useRef, useState } from "react";
import TapInIcon from "./TapInIcon";
import { logoField, plusVenues, type Venue } from "../model/content";

/**
 * ══ THIS FEED IS INVENTED. NOTHING IT SAYS HAPPENED. ═══════════════════════
 *
 * It reports no event. There is no activity table behind it, no query, no
 * socket, no server. Every line is drawn at random from the pool in this
 * file, every "seconds ago" is a random number, and the place is picked from
 * the venue records — not from anyone who did anything there.
 *
 * Sam asked for it in those terms on 23 Sep 2026 — "for both, can we have a
 * simulated live purchase feed, like 'someone just viewed this' 'someone just
 * purchased' with the 'X' seconds ago in 'blacksburg'." Simulated is his word.
 * It is the same kind of device as the seat counter (model/seats.ts), which
 * docs/TRUTH.md retires by name, and it is his call in the same way: recorded
 * here rather than argued again, and recorded LOUDLY so that nobody reading
 * this file in 2027 mistakes a card for a real event or wires analytics to it.
 * docs/POLISH-2026-09-21.md §34.
 *
 * ══ HOW IT SAYS SO WHERE IT RENDERS ════════════════════════════════════════
 * The root carries `data-simulated`, so anyone inspecting the page is told.
 * It is `aria-hidden`, because announcing invented activity to a screen
 * reader is noise, not news — and for the same reason the X is kept out of
 * the tab order: a focusable control inside a hidden subtree is a stop that
 * reads as nothing. The card never blocks anything and leaves on its own.
 *
 * ══ WHAT IT REFUSES ════════════════════════════════════════════════════════
 * Names, faces or initials; a running count; sound; any page but the pitch
 * and Coffeeholics (never the deck, never the checkout); text under 14px; any
 * colour but the tokens, and no green "live" dot.
 *
 * ⚠ ONE LINE NAMES AN OFFER THAT IS NOT EVERYWHERE. "Tried it for free at
 * {venue}" draws from every Plus venue, as §34 asks, but the one free trial
 * the site links to today is Coffeeholics' (model/campaign.ts). Flagged for
 * Sam; not narrowed here.
 */

/** One key for the session: "off" once the X is pressed, else how many
 *  cards this session has shown. A reload keeps both. */
const KEY = "tapin.feed";
const FIRST_MS = 6_000;
const SHOW_MS = 5_000;
const GAP_MS: readonly [number, number] = [14_000, 30_000];
/** Matches feed.css's exit, so the card unmounts as it finishes leaving. */
const OUT_MS = 180;
const MAX = 8;

type Kind = "viewed" | "joined" | "tried";
interface Card {
  what: string;
  when: string;
  venue: Venue | null;
}

const between = (lo: number, hi: number): number =>
  lo + Math.floor(Math.random() * (hi - lo + 1));

/** A line, a time and a place. Never the same kind twice running. */
const draw = (last: Kind | null): { kind: Kind; card: Card } => {
  const kinds = (["viewed", "joined", "tried"] as const).filter(
    (k) => k !== last && (k !== "tried" || plusVenues.length > 0),
  );
  const kind = kinds[between(0, kinds.length - 1)];
  const venue = kind === "tried" ? plusVenues[between(0, plusVenues.length - 1)] : null;
  const what =
    kind === "viewed"
      ? "Someone just viewed this page"
      : kind === "joined"
        ? "Someone just got early access"
        : `Someone just tried it for free at ${venue?.name}`;
  const ago =
    Math.random() < 0.5
      ? `${between(8, 59)} seconds ago`
      : `${between(2, 9)} minutes ago`;
  return { kind, card: { what, when: `${ago} · Blacksburg`, venue } };
};

const stored = (): { off: boolean; shown: number } => {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v === "off") return { off: true, shown: MAX };
    const n = Number(v);
    return { off: false, shown: Number.isFinite(n) && n > 0 ? n : 0 };
  } catch {
    return { off: false, shown: 0 };
  }
};
const store = (v: string): void => {
  try {
    sessionStorage.setItem(KEY, v);
  } catch {
    /* private mode: the feed simply runs again after a reload */
  }
};

/** Anything in front of the page: a hidden tab, the reserve layer, a dialog. */
const blocked = (): boolean =>
  document.hidden ||
  document.documentElement.classList.contains("is-layered") ||
  document.querySelector('[role="dialog"], dialog[open]') !== null;

/**
 * Mounted on the pitch (`lit`, because every pop-up on that dark page is
 * light) and on Coffeeholics (already light, and tinted; `lit` would drop the
 * house neutral on it — TrialModal's reasoning).
 */
export default function LiveFeed({ lit }: { lit?: boolean }) {
  const [card, setCard] = useState<Card | null>(null);
  const [out, setOut] = useState(false);
  const dismiss = useRef<() => void>(() => {});

  useEffect(() => {
    const start = stored();
    if (start.off || start.shown >= MAX) return;

    /* ══ ONE TIMER SCHEDULE ═══════════════════════════════════════════════
       wait → show (5s) → leave (180ms) → wait (14–30s) → … At most one
       timeout is pending at any moment, and `arm` is the only thing that
       sets one. A pause keeps what was left of a wait; a pause during a card
       sends it out, and the next card is a fresh gap after the page is
       clear again. */
    let timer = 0;
    let due = 0;
    let left = FIRST_MS;
    let stage: "wait" | "show" | "leave" | "done" = "wait";
    let paused = false;
    let stopped = false;
    let last: Kind | null = null;

    const arm = (ms: number, fn: () => void) => {
      window.clearTimeout(timer);
      due = Date.now() + ms;
      timer = window.setTimeout(fn, ms);
    };
    const show = () => {
      const s = stored();
      if (stopped || s.off || s.shown >= MAX) {
        stage = "done";
        return;
      }
      store(String(s.shown + 1));
      const next = draw(last);
      last = next.kind;
      setOut(false);
      setCard(next.card);
      stage = "show";
      arm(SHOW_MS, leave);
    };
    const leave = () => {
      stage = "leave";
      setOut(true);
      arm(OUT_MS, gone);
    };
    const gone = () => {
      setCard(null);
      setOut(false);
      const s = stored();
      if (stopped || s.off || s.shown >= MAX) {
        stage = "done";
        return;
      }
      stage = "wait";
      left = between(GAP_MS[0], GAP_MS[1]);
      if (!paused) arm(left, show);
    };

    const pause = () => {
      paused = true;
      if (stage === "wait") {
        left = Math.max(0, due - Date.now());
        window.clearTimeout(timer);
      } else if (stage === "show") {
        leave();
      }
    };
    const resume = () => {
      paused = false;
      if (stage === "wait") arm(left, show);
    };
    const check = () => {
      const b = blocked();
      if (b && !paused) pause();
      else if (!b && paused) resume();
    };

    dismiss.current = () => {
      stopped = true;
      store("off");
      if (stage === "show") leave();
    };

    if (blocked()) paused = true;
    else arm(FIRST_MS, show);

    const watch = new MutationObserver(check);
    watch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    watch.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["role", "open"],
    });
    document.addEventListener("visibilitychange", check);

    return () => {
      window.clearTimeout(timer);
      watch.disconnect();
      document.removeEventListener("visibilitychange", check);
      dismiss.current = () => {};
    };
  }, []);

  if (!card) return null;

  return (
    <div
      className={`feed${out ? " is-out" : ""}`}
      data-simulated="true"
      data-lit={lit ? "" : undefined}
      aria-hidden="true"
    >
      <div className="feed-plate">
        {card.venue ? (
          <span
            className="collar feed-tile"
            data-field={logoField(card.venue.id)}
            style={{ ["--brand" as string]: card.venue.brandColor }}
          >
            <img src={card.venue.logo} alt="" decoding="async" />
          </span>
        ) : (
          <span className="feed-tile feed-mark">
            <TapInIcon />
          </span>
        )}
        <div className="feed-text">
          <p className="feed-what">{card.what}</p>
          <p className="feed-when">{card.when}</p>
        </div>
        <button
          type="button"
          className="feed-x"
          tabIndex={-1}
          aria-label="Close"
          onClick={() => dismiss.current()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m7 7 10 10M17 7 7 17"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
