import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TapInIcon from "./TapInIcon";
import { logoField, venues, type Venue } from "../model/content";
import { campaignTrialPlaces } from "../model/campaign";

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
 * reads as nothing. The card leaves on its own and blocks nothing: the one
 * card over a layer sits above the sheet's X, not on it (§35.4, feed.css).
 *
 * ══ WHAT IT REFUSES ════════════════════════════════════════════════════════
 * Names, faces or initials (but the one card over a layer, below); a running
 * count; sound; any page but the pitch and Coffeeholics (never the deck, and
 * over the checkout only that one card); text under 14px; any colour but the
 * tokens, and no green "live" dot.
 *
 * ══ "TRIED IT FOR FREE" NAMES ONLY WHERE THE TRIAL EXISTS (§35) ══════════
 * It drew from every Plus venue, as §34 asked, and so could name a place with
 * no free trial at all. It now draws from `campaignTrialPlaces`
 * (model/campaign.ts) — the places the trial can actually be taken — so an
 * invented line at least never names an offer that does not exist.
 *
 * ══ THE ONE CARD OVER A LAYER (§35, §35.1–§35.4) ══════════════════════════
 * The checkout's invented seat drop (model/seatsSession.ts) asks for it with
 * a `tapin:feed` event on `window`, so the sheet and the feed stay strangers.
 * It reads "{name} in {place} just purchased TapIn Plus · just now": the one
 * card that names someone, Sam's call over §34 ("we need to show a random
 * name in the modal, and the location as well"). The name and the place are
 * as invented as the rest. It is the only card shown while a layer is up: the
 * cadence stays paused, and this card runs on its own clock, above the layer,
 * as a banner at the top centre (feed.css), portalled to <body> because
 * `main.column` is a stacking context (z 1) that no z-index inside it can
 * climb out of. It is not one of the session's eight, and from 640 the X
 * still stops it; below 640 it is one line in a pill, the event alone, with
 * no mark, no "just now" and no X (§35.4).
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
/** The event the checkout's drop sends, and the card it asks for. */
const FEED_EVENT = "tapin:feed";
/* The purchase card's names and places (§35.3): invented, weighted to
   Blacksburg. The feed's own cards keep "Someone". */
const NAMES = [
  "Maya", "Jordan", "Ava", "Ethan", "Chloe", "Liam", "Priya", "Noah", "Sofia", "Caleb",
  "Emma", "Tyler", "Hannah", "Marcus", "Grace", "Elijah", "Zoe", "Andre", "Lily", "Owen",
  "Nia", "Ryan", "Isabella", "Jake", "Aisha", "Ben", "Olivia", "Mason", "Leah", "Diego",
];
const PLACES = ["Blacksburg", "Blacksburg", "Blacksburg", "Christiansburg"];
const purchase = (): Card => ({
  what: `${NAMES[between(0, NAMES.length - 1)]} in ${PLACES[between(0, PLACES.length - 1)]} just purchased TapIn Plus`,
  when: "just now",
  venue: null,
});

type Kind = "viewed" | "joined" | "tried";
interface Card {
  what: string;
  when: string;
  venue: Venue | null;
}

/** Where the trial can actually be taken — campaign.ts's places, in its order. */
const trialVenues: Venue[] = campaignTrialPlaces
  .map((place) => venues.find((v) => v.id === place.venueId))
  .filter((v): v is Venue => v !== undefined);

const between = (lo: number, hi: number): number =>
  lo + Math.floor(Math.random() * (hi - lo + 1));

/** A line, a time and a place. Never the same kind twice running. */
const draw = (last: Kind | null): { kind: Kind; card: Card } => {
  const kinds = (["viewed", "joined", "tried"] as const).filter(
    (k) => k !== last && (k !== "tried" || trialVenues.length > 0),
  );
  const kind = kinds[between(0, kinds.length - 1)];
  const venue = kind === "tried" ? trialVenues[between(0, trialVenues.length - 1)] : null;
  const what =
    kind === "viewed"
      ? "Someone just viewed this page"
      : kind === "joined"
        ? "Someone just purchased TapIn Plus"
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
  /* Set while the one card over a layer is up; feed.css places it. */
  const [over, setOver] = useState(false);
  const dismiss = useRef<() => void>(() => {});

  useEffect(() => {
    const start = stored();

    /* ══ ONE TIMER SCHEDULE ═══════════════════════════════════════════════
       wait → show (5s) → leave (180ms) → wait (14–30s) → … At most one
       timeout is pending at any moment, and `arm` is the only thing that
       sets one. A pause keeps what was left of a wait; a pause during a card
       sends it out, and the next card is a fresh gap after the page is
       clear again. */
    let timer = 0;
    let due = 0;
    let left = FIRST_MS;
    let stage: "wait" | "show" | "leave" | "done" =
      start.off || start.shown >= MAX ? "done" : "wait";
    let paused = false;
    let stopped = start.off;
    let last: Kind | null = null;
    /* The card over a layer keeps its own clock; `overUntil` is when it will
       be gone, 0 while it is not up. */
    let overTimer = 0;
    let overUntil = 0;

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
      /* The card over a layer is still up (the layer closed under it): the
         cadence's next card waits for it to go. */
      if (overUntil) {
        arm(Math.max(0, overUntil - Date.now()), show);
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
      if (!overUntil) {
        setCard(null);
        setOut(false);
      }
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

    /* ══ THE ONE CARD OVER A LAYER ═══════════════════════════════════════
       Shown however the cadence stands — paused, as it is while the layer
       that asked is up, or done — for 5s, then out the usual way. */
    const overGone = () => {
      overUntil = 0;
      setCard(null);
      setOut(false);
      setOver(false);
    };
    const overLeave = () => {
      setOut(true);
      overTimer = window.setTimeout(overGone, OUT_MS);
    };
    const onFeed = (e: Event) => {
      if ((e as CustomEvent<{ kind?: string }>).detail?.kind !== "purchase") return;
      if (stopped || stored().off) return;
      /* A cadence card on screen (only possible with no layer up) gives way
         and the cadence starts a fresh gap. */
      if (stage === "show" || stage === "leave") {
        stage = "wait";
        left = between(GAP_MS[0], GAP_MS[1]);
        if (paused) window.clearTimeout(timer);
        else arm(left, show);
      }
      window.clearTimeout(overTimer);
      overUntil = Date.now() + SHOW_MS + OUT_MS;
      setOver(true);
      setOut(false);
      setCard(purchase());
      overTimer = window.setTimeout(overLeave, SHOW_MS);
    };
    window.addEventListener(FEED_EVENT, onFeed);

    dismiss.current = () => {
      stopped = true;
      store("off");
      if (stage === "show") leave();
      if (overUntil) {
        window.clearTimeout(overTimer);
        overLeave();
      }
    };

    if (stage === "done") {
      return () => {
        window.clearTimeout(overTimer);
        window.removeEventListener(FEED_EVENT, onFeed);
        dismiss.current = () => {};
      };
    }

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
      window.clearTimeout(overTimer);
      window.removeEventListener(FEED_EVENT, onFeed);
      watch.disconnect();
      document.removeEventListener("visibilitychange", check);
      dismiss.current = () => {};
    };
  }, []);

  if (!card) return null;

  return createPortal(
    <div
      className={`feed${out ? " is-out" : ""}${over ? " is-over" : ""}`}
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
    </div>,
    document.body,
  );
}
