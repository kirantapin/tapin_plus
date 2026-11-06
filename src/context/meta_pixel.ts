import { META_PIXEL_ID } from "../constants";

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** Meta's base code, transliterated. Appends the loader and stubs `fbq`. */
function injectBaseCode(): void {
  if (window.fbq) return;

  const fbq: Fbq = function (...args: unknown[]) {
    /* Before the loader resolves, calls queue; after, they go straight through
       — `callMethod` is what fbevents.js installs on itself. */
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  };

  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = fbq;
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
}

let started = false;

/* ══ EVENTS THAT ARRIVE BEFORE THE PIXEL (3 Nov 2026) ═════════════════════
   The landing page's own $pageview fires from App's route effect, and a
   child's effect runs before its provider's, so it reached `mirror` a moment
   before `load` had run and was dropped: Meta saw no PageView from anyone who
   landed from an ad and stayed on one page (checked live: eventCount 0).
   Events that come early now wait here and go out right after `init`. */
const early: Array<[string, Record<string, unknown>]> = [];
const EARLY_MAX = 20;

/** Idempotent — `init` twice would double every event that follows. */
export function load(enabled: boolean): boolean {
  if (!enabled || !META_PIXEL_ID) return false;
  if (started) return true;
  started = true;

  try {
    injectBaseCode();
    window.fbq!("init", META_PIXEL_ID);
    /* No `fbq("track", "PageView")` here — see the note above. The first one
       arrives from the app's own route effect, like every one after it; if it
       came before this ran, it is waiting in `early`. */
    early.splice(0).forEach(([event, props]) => mirror(event, props));
  } catch {
    /* Analytics must never break a page that takes money. */
    console.error("Meta Pixel failed to load");
    return false;
  }
  return true;
}

/** Meta's own event names, which are the only ones its optimiser understands. */
type StandardEvent =
  | "PageView"
  | "ViewContent"
  | "InitiateCheckout"
  | "Lead"
  | "CompleteRegistration"
  | "Purchase"
  | "Subscribe";

/**
 * WHICH POSTHOG EVENTS REACH META, AND AS WHAT.
 *
 * Deliberately short. An event absent from this table is a PostHog-only event,
 * which is the default: Meta charges nothing for volume but its reporting gets
 * unreadable, and a custom event it does not recognise cannot be optimised for
 * anyway. Add a row only when the event is one an ad should be bid against.
 *
 * `props` maps this project's property names onto Meta's, which are fixed:
 * `value` is a MAJOR-unit number (dollars, not cents) and `currency` an ISO
 * code — a Purchase without both is dropped from ad reporting.
 */
const MIRRORED: Record<
  string,
  {
    name: StandardEvent;
    props?: (p: Record<string, unknown>) => Record<string, unknown>;
    /** Meta's dedup key, for an event the server also sends. */
    eventId?: (p: Record<string, unknown>) => string | undefined;
  }
> = {
  $pageview: { name: "PageView" },

  /* InitiateCheckout is the pay step showing, with its price, not the sheet
     opening (Grok's audit, 3 Nov 2026): the sheet opens before anyone has
     typed a number, so every curious tap counted as a checkout. */
  plus_pay_shown: {
    name: "InitiateCheckout",
    props: (p) => ({
      value:
        typeof p.amount_cents === "number" ? p.amount_cents / 100 : undefined,
      currency: "USD",
    }),
  },

  /* A Plus signup is a Subscribe, and only that. It no longer also sends
     Purchase: on this pixel Purchase means a food order (Grok's audit, 3 Nov
     2026), and a signup counted as both doubled it. PostHog still records
     `purchase`. The order id goes as the eventID, so the server's Subscribe
     for the same order can be matched to this one and counted once. */
  /* A parent signing up their student (Sam, 5 Nov 2026; docs/parents/API.md)
     is a Subscribe too, deduplicated by its checkout id. */
  parent_purchase: {
    name: "Subscribe",
    props: (p) => ({ value: typeof p.value === "number" ? p.value : undefined, currency: "USD" }),
    eventId: (p) => (typeof p.checkout_id === "string" && p.checkout_id ? `parent_${p.checkout_id}` : undefined),
  },
  subscription_purchase: {
    name: "Subscribe",
    props: (p) => ({
      value:
        typeof p.amount_cents === "number" ? p.amount_cents / 100 : undefined,
      currency: "USD",
    }),
    eventId: (p) => (typeof p.order_id === "string" && p.order_id ? p.order_id : undefined),
  },
};

/**
 * Called from `track()` for every event. Silent for anything not in the table
 * and for a pixel that never loaded, so the caller needs no branch of its own.
 */
export function mirror(event: string, props: Record<string, unknown>): void {
  const rule = MIRRORED[event];
  if (!rule) return;
  /* Nothing from a parent's manage page or a student's gift page: private
     pages, not visits an ad drove (their keys never reach the URL Meta sees,
     model/redact.ts). */
  if (typeof window !== "undefined" && /^\/(parents\/manage|gift)(\/|$)/.test(window.location.pathname)) return;
  if (!started) {
    if (early.length < EARLY_MAX) early.push([event, props]);
    return;
  }
  if (!window.fbq) return;

  try {
    const data = rule.props ? rule.props(props) : undefined;
    const eventID = rule.eventId?.(props);
    if (eventID) window.fbq("track", rule.name, data, { eventID });
    else window.fbq("track", rule.name, data);
  } catch {
    console.error("Meta Pixel failed to send:", event);
  }
}
