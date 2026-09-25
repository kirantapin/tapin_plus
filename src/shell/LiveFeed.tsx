import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import TapInIcon from "./TapInIcon";
import { useReserveCta } from "./useReserveCta";
import { logoField, venues, type Venue } from "../model/content";
import { campaignTrialPlaces } from "../model/campaign";
import { tryable } from "../model/feedHours";
import { agoText, buildLedger, type FeedEvent } from "../model/feedLedger";

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
 * ══ WHAT IT SAYS (§53) ══════════════════════════════════════════════════════
 * Purchases and free tries only. Sam, 24 Sep 2026: "these should be purchase
 * notifications and 'tried it free' notifications … Purchase notifications
 * should be more frequent, and … have a subtle pulsing animation … While
 * someone is viewing either page, they should be seeing purchase
 * notifications." So "viewed this page" is gone, about three cards in four
 * are purchases (a try never follows a try), and a purchase card's mark
 * pulses (feed.css `.is-buy`).
 *
 * ══ LATER, AND A HISTORY THAT HOLDS TOGETHER (§57) ═════════════════════════
 * Sam, 25 Sep 2026: the cards were "a bit too frequent … It looks a bit fake";
 * they should be "for those who have spent a decent amount of time on the
 * platform, like 30 seconds or so"; "it's fine to show them more frequently,
 * if it's like '[name] purchased Tapin plus 4 hours ago' but … more
 * realistic"; "use best practices". So the first card waits for 30s of the
 * site in front, summed across both pages and reloads (`SEEN_KEY`); then one
 * every 25–45s, up to 8 a session. What they show is the session's invented
 * history (model/feedLedger.ts): purchases hours apart, newest first, each
 * with its own "ago"; never a card twice; never "just now" but the one below.
 *
 * ══ WHAT A HAND CAN DO TO IT (§53) ═════════════════════════════════════════
 * Sam, 24 Sep 2026: a bar "that shows when they're going to close", "if
 * someone presses and holds the notification it stops, if they swipe up it
 * goes away, and if they click it it'd take them to the relevant page", and
 * "slide into view from the top of the screen, then go back up when done".
 * So every card drops in from above the screen's top edge and lifts back out;
 * a bar along its foot runs down its 5s; a press (or a mouse resting on it)
 * holds the bar and the clock; a swipe up sends that one card away; a tap
 * opens the checkout for a purchase and the free-try window for a try. The X
 * still turns the feed off for the session. Keyboards never reach it: it is
 * a second door to the page's own buttons, hidden from assistive tech.
 *
 * ══ FREE TRIES KEEP REAL HOURS (§53, §57) ═════════════════════════════════
 * A try is only drawn when the moment it claims (now less its "ago") falls in
 * its place's hours, Blacksburg time (model/feedHours.ts): Coffeeholics every
 * day 10am–7pm, The Burg Thursday to Saturday from 9pm to 2am. Outside them
 * every card is a purchase.
 *
 * ══ PURCHASES CARRY A FIRST NAME (§53, §57) ═══════════════════════════════
 * Sam, 24 Sep 2026: "we can have fake names for those who purchased tapin
 * plus." A purchase reads "{name} purchased TapIn Plus" over its "ago", each
 * name once a session. A free try still reads "Someone".
 *
 * ══ WHAT IT REFUSES ════════════════════════════════════════════════════════
 * Names on anything but a purchase, faces or initials; a running
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
 * climb out of. It is not one of the session's twenty, and from 640 the X
 * still stops it; below 640 it is one line in a pill, the event alone, with
 * no mark, no "just now" and no X (§35.4).
 */

/** One key for the session: "off" once the X is pressed, else how many
 *  cards this session has shown. A reload keeps both. */
const KEY = "tapin.feed";
/** Time with the site in front, summed across the session, in ms (§57). */
const SEEN_KEY = "tapin.feed.seen";
/** How much of it comes before the first card. */
const ENGAGED_MS = 30_000;
/** A card's life on screen; feed.css's bar reads it from `--feed-life`. */
const SHOW_MS = 5_000;
const GAP_MS: readonly [number, number] = [25_000, 45_000];
/** How often a card is a free try rather than a purchase (never twice running). */
const TRIED_SHARE = 0.3;
/** Matches feed.css's lift, so the card unmounts as it finishes leaving. */
const OUT_MS = 260;
const MAX = 8;
/** The event the checkout's drop sends, and the card it asks for. */
const FEED_EVENT = "tapin:feed";

/* The gestures (§53). Up this far on release, or flicked up this fast, and
   the card goes; still and shorter than a hold, and it is a tap. */
const SWIPE_PX = 28;
const FLICK_PX_PER_MS = -0.35;
const SLOP_PX = 6;
const TAP_MS = 450;

/* The purchase cards' names and places (§35.3, §53): invented. A free try
   keeps "Someone". */
const NAMES = [
  "Maya", "Jordan", "Ava", "Ethan", "Chloe", "Liam", "Priya", "Noah", "Sofia", "Caleb",
  "Emma", "Tyler", "Hannah", "Marcus", "Grace", "Elijah", "Zoe", "Andre", "Lily", "Owen",
  "Nia", "Ryan", "Isabella", "Jake", "Aisha", "Ben", "Olivia", "Mason", "Leah", "Diego",
];
/* Always Blacksburg (Sam, 24 Sep 2026: "we should say it's in blacksburg - not
   some random place"). */
const PLACES = ["Blacksburg"];

type Kind = "joined" | "tried";
interface Card {
  /** A fresh id a card, so each one mounts anew and its bar starts full. */
  id: number;
  what: string;
  when: string;
  venue: Venue | null;
  /** A purchase: its mark pulses and a tap opens the checkout. */
  buy: boolean;
}
let serial = 0;

const between = (lo: number, hi: number): number =>
  lo + Math.floor(Math.random() * (hi - lo + 1));

/** Where the trial can actually be taken — campaign.ts's places, in its order. */
const trialVenues: Venue[] = campaignTrialPlaces
  .map((place) => venues.find((v) => v.id === place.venueId))
  .filter((v): v is Venue => v !== undefined);

/* ══ THE SESSION'S HISTORY (§57, model/feedLedger.ts) ══════════════════════
   Built on first use and kept for the session with what has been shown, so a
   card is never shown twice and every "ago" agrees across pages and reloads.
   `memo` keeps it where sessionStorage is refused. */
const LEDGER_KEY = "tapin.feed.ledger";
interface Ledger {
  events: FeedEvent[];
  shown: string[];
}
let memo: Ledger | null = null;
const keepLedger = (l: Ledger): void => {
  memo = l;
  try {
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify(l));
  } catch {
    /* private mode: `memo` keeps it for this page */
  }
};
const ledger = (): Ledger => {
  if (memo) return memo;
  try {
    const v = JSON.parse(sessionStorage.getItem(LEDGER_KEY) ?? "null") as Ledger | null;
    if (v && Array.isArray(v.events) && Array.isArray(v.shown)) return (memo = v);
  } catch {
    /* unreadable: build a new one */
  }
  const fresh = { events: buildLedger(Date.now(), NAMES, trialVenues.map((v) => v.id)), shown: [] };
  keepLedger(fresh);
  return fresh;
};

/** An invented first name for the checkout's card: never one the history
 *  already used, nor the one before it. */
let lastName = "";
const aName = (): string => {
  const used = new Set(ledger().events.map((e) => e.name));
  const pool = NAMES.filter((n) => n !== lastName && !used.has(n));
  lastName = pool.length ? pool[between(0, pool.length - 1)] : NAMES[between(0, NAMES.length - 1)];
  return lastName;
};

const purchase = (): Card => ({
  id: ++serial,
  what: `${aName()} in ${PLACES[between(0, PLACES.length - 1)]} just purchased TapIn Plus`,
  when: "just now",
  venue: null,
  buy: true,
});

/** The next event not yet shown: purchases newest first, and now and then
 *  a free try, only while its place's hours are open now (feedHours.ts) and
 *  never two tries running. Null once the history is spent. */
const nextCard = (last: Kind | null): { kind: Kind; card: Card } | null => {
  const l = ledger();
  const left = l.events.filter((e) => !l.shown.includes(e.id));
  const buys = left.filter((e) => e.kind === "joined");
  const tries = left.filter((e) => e.kind === "tried" && e.venueId && tryable(e.venueId, Date.now()));
  const takeTry = tries.length > 0 && last !== "tried" && (!buys.length || Math.random() < TRIED_SHARE);
  const e = takeTry ? tries[0] : buys[0];
  if (!e) return null;
  keepLedger({ ...l, shown: [...l.shown, e.id] });
  const venue = e.kind === "tried" ? (venues.find((v) => v.id === e.venueId) ?? null) : null;
  const what =
    e.kind === "joined"
      ? `${e.name} purchased TapIn Plus`
      : `Someone tried it for free at ${venue?.name}`;
  return {
    kind: e.kind,
    card: {
      id: ++serial,
      what,
      when: `${agoText(Date.now() - e.at)} · Blacksburg`,
      venue,
      buy: e.kind === "joined",
    },
  };
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
const seenBefore = (): number => {
  try {
    const n = Number(sessionStorage.getItem(SEEN_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
};
const keepSeen = (ms: number): void => {
  try {
    sessionStorage.setItem(SEEN_KEY, String(Math.round(ms)));
  } catch {
    /* private mode: each page counts its own 30s */
  }
};

/** Anything in front of the page: a hidden tab, the reserve layer, a dialog. */
const blocked = (): boolean =>
  document.hidden ||
  document.documentElement.classList.contains("is-layered") ||
  document.querySelector('[role="dialog"], dialog[open]') !== null;

/** What the gestures ask of the schedule, which lives in the effect. */
interface Controls {
  dismiss: () => void;
  hold: (why: string) => void;
  release: (why: string) => void;
  away: () => void;
  open: () => void;
}
const idle: Controls = { dismiss() {}, hold() {}, release() {}, away() {}, open() {} };

/**
 * Mounted on the pitch (`lit`, because every pop-up on that dark page is
 * light) and on Coffeeholics (already light, and tinted; `lit` would drop the
 * house neutral on it — TrialModal's reasoning). `onTry` opens the page's own
 * free-try window; a purchase opens the page's own checkout.
 */
export default function LiveFeed({ lit, onTry }: { lit?: boolean; onTry?: () => void }) {
  const [card, setCard] = useState<Card | null>(null);
  const [out, setOut] = useState(false);
  /* Set while the one card over a layer is up; feed.css places it. */
  const [over, setOver] = useState(false);
  const ctl = useRef<Controls>(idle);
  const root = useRef<HTMLDivElement>(null);
  const press = useRef<{ id: number; x: number; y: number; t: number; moved: boolean } | null>(null);
  /* A tap found on pointerup, acted on at the click that follows it. */
  const tapped = useRef(false);
  const cta = useReserveCta();
  const navigate = useNavigate();

  useEffect(() => {
    const start = stored();

    /* ══ ONE TIMER SCHEDULE ═══════════════════════════════════════════════
       wait → show (5s) → leave (260ms) → wait (25–45s) → … At most one
       timeout is pending at any moment, and `arm` is the only thing that
       sets one. A pause keeps what was left of a wait; a pause during a card
       sends it out, and the next card is a fresh gap after the page is
       clear again. A hold stops a card's clock where it is (§53). */
    /* ══ TIME ON THE SITE (§57) ═══════════════════════════════════════════
       Counted while the tab is in front and kept for the session, so a
       reader who moves between the two pages, or reloads, is not made to
       wait 30s again. */
    let seenBase = seenBefore();
    let seenSince = document.hidden ? 0 : Date.now();
    const seen = () => seenBase + (seenSince ? Date.now() - seenSince : 0);
    const tally = () => {
      seenBase = seen();
      seenSince = document.hidden ? 0 : Date.now();
      keepSeen(seenBase);
    };

    let timer = 0;
    let due = 0;
    let left = Math.max(0, ENGAGED_MS - seen());
    let showLeft = 0;
    let stage: "wait" | "show" | "leave" | "done" =
      start.off || start.shown >= MAX ? "done" : "wait";
    let paused = false;
    let stopped = start.off;
    let last: Kind | null = null;
    /* Why the card on screen is held: a press, a resting mouse. */
    const holds = new Set<string>();
    /* The card over a layer keeps its own clock; `overUntil` is when it will
       be gone, 0 while it is not up. */
    let overTimer = 0;
    let overUntil = 0;
    let overDue = 0;
    let overLeft = 0;
    let overLeaving = false;

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
         cadence's next card waits for it to go. Polled, since a hold can
         keep it up for as long as a finger stays down. */
      if (overUntil) {
        arm(Math.max(250, overUntil - Date.now()), show);
        return;
      }
      const next = nextCard(last);
      if (!next) {
        stage = "done";
        return;
      }
      store(String(s.shown + 1));
      last = next.kind;
      holds.clear();
      setOut(false);
      setCard(next.card);
      stage = "show";
      arm(SHOW_MS, leave);
    };
    const leave = () => {
      stage = "leave";
      holds.clear();
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
      overLeaving = false;
      holds.clear();
      setCard(null);
      setOut(false);
      setOver(false);
    };
    const overLeave = () => {
      overLeaving = true;
      window.clearTimeout(overTimer);
      setOut(true);
      overTimer = window.setTimeout(overGone, OUT_MS);
    };
    const overFor = (ms: number) => {
      window.clearTimeout(overTimer);
      overDue = Date.now() + ms;
      overUntil = overDue + OUT_MS;
      overTimer = window.setTimeout(overLeave, ms);
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
      holds.clear();
      overLeaving = false;
      setOver(true);
      setOut(false);
      setCard(purchase());
      overFor(SHOW_MS);
    };
    window.addEventListener(FEED_EVENT, onFeed);

    /* ══ WHAT THE HAND ASKS (§53) ═════════════════════════════════════════ */
    const hold = (why: string) => {
      const first = holds.size === 0;
      holds.add(why);
      if (!first) return;
      if (overUntil && !overLeaving) {
        overLeft = Math.max(0, overDue - Date.now());
        window.clearTimeout(overTimer);
      } else if (stage === "show") {
        showLeft = Math.max(0, due - Date.now());
        window.clearTimeout(timer);
      } else {
        holds.clear();
        return;
      }
      root.current?.classList.add("is-held");
    };
    const release = (why: string) => {
      if (!holds.delete(why) || holds.size) return;
      root.current?.classList.remove("is-held");
      if (overUntil && !overLeaving) overFor(overLeft);
      else if (stage === "show") arm(showLeft, leave);
    };
    /* One card goes; the feed carries on. */
    const away = () => {
      if (overUntil && !overLeaving) overLeave();
      else if (stage === "show") leave();
    };

    ctl.current = {
      dismiss: () => {
        stopped = true;
        store("off");
        if (stage === "show") leave();
        if (overUntil && !overLeaving) overLeave();
      },
      hold,
      release,
      away,
      open: away,
    };

    if (stage === "done") {
      return () => {
        window.clearTimeout(overTimer);
        window.removeEventListener(FEED_EVENT, onFeed);
        ctl.current = idle;
      };
    }

    document.addEventListener("visibilitychange", tally);
    window.addEventListener("pagehide", tally);
    if (blocked()) paused = true;
    else arm(left, show);

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
      tally();
      window.clearTimeout(timer);
      window.clearTimeout(overTimer);
      window.removeEventListener(FEED_EVENT, onFeed);
      watch.disconnect();
      document.removeEventListener("visibilitychange", check);
      document.removeEventListener("visibilitychange", tally);
      window.removeEventListener("pagehide", tally);
      ctl.current = idle;
    };
  }, []);

  if (!card) return null;

  /* ══ THE GESTURES (§53) ═════════════════════════════════════════════════
     Pointer events on the plate, captured for the length of a press. The
     drag moves the root, never the plate, whose arrival animation would
     hold its own transform over an inline one. */
  const snapBack = () => {
    const el = root.current;
    if (!el) return;
    el.style.transition = "transform 200ms var(--ease)";
    el.style.transform = "";
  };
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    tapped.current = false;
    if (e.button > 0 || (e.target as Element).closest(".feed-x")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    if (root.current) root.current.style.transition = "none";
    ctl.current.hold("press");
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.moved && Math.hypot(dx, dy) > SLOP_PX) p.moved = true;
    /* Up follows the finger; down gives a little, and resists. */
    if (p.moved && root.current) root.current.style.transform = `translateY(${dy < 0 ? dy : dy * 0.2}px)`;
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    const dy = e.clientY - p.y;
    const dt = Math.max(1, performance.now() - p.t);
    if (p.moved && (dy <= -SWIPE_PX || (dy < -SLOP_PX && dy / dt <= FLICK_PX_PER_MS))) {
      ctl.current.away();
      return;
    }
    snapBack();
    ctl.current.release("press");
    tapped.current = e.type === "pointerup" && !p.moved && dt < TAP_MS && !over;
  };
  /* A tap opens the page's own door for what the card is about — on the
     click, not the pointerup: opened any sooner, a phone's click lands on
     the new window's scrim beneath the finger and closes it again. */
  const onClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!tapped.current || (e.target as Element).closest(".feed-x")) return;
    tapped.current = false;
    ctl.current.open();
    if (card.buy) navigate(cta.to, { state: cta.state });
    else onTry?.();
  };
  const onEnter = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") ctl.current.hold("hover");
  };
  const onLeave = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") ctl.current.release("hover");
  };

  return createPortal(
    <div
      key={card.id}
      ref={root}
      className={`feed${out ? " is-out" : ""}${over ? " is-over" : ""}${card.buy ? " is-buy" : ""}`}
      data-simulated="true"
      data-lit={lit ? "" : undefined}
      aria-hidden="true"
      style={{ ["--feed-life" as string]: `${SHOW_MS}ms` }}
    >
      <div
        className="feed-plate"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onClick={onClick}
      >
        {card.venue ? (
          <span
            className="collar feed-tile"
            data-field={logoField(card.venue.id)}
            style={{ ["--brand" as string]: card.venue.brandColor }}
          >
            <img src={card.venue.logo} alt="" decoding="async" draggable={false} />
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
          onClick={() => ctl.current.dismiss()}
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
        <span className="feed-time">
          <i />
        </span>
      </div>
    </div>,
    document.body,
  );
}
