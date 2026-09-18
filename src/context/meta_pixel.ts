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

/** Idempotent — `init` twice would double every event that follows. */
export function load(enabled: boolean): boolean {
  if (!enabled || !META_PIXEL_ID) return false;
  if (started) return true;
  started = true;

  try {
    injectBaseCode();
    window.fbq!("init", META_PIXEL_ID);
    /* No `fbq("track", "PageView")` here — see the note above. The first one
       arrives from the app's own route effect, like every one after it. */
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
  }
> = {
  $pageview: { name: "PageView" },

  /* The checkout sheet opening — the last step before money. routes/Reserve.tsx. */
  checkout_opened: { name: "InitiateCheckout" },

  /* The subscription, paid. `amount_cents` is FIRST_INVOICE_TOTAL_CENTS. */
  purchase: {
    name: "Purchase",
    props: (p) => ({
      value:
        typeof p.amount_cents === "number" ? p.amount_cents / 100 : undefined,
      currency: "USD",
      content_type: "product",
      content_ids: ["tapin_plus_membership"],
    }),
  },
};

/**
 * Called from `track()` for every event. Silent for anything not in the table
 * and for a pixel that never loaded, so the caller needs no branch of its own.
 */
export function mirror(event: string, props: Record<string, unknown>): void {
  if (!started || !window.fbq) return;
  const rule = MIRRORED[event];
  if (!rule) return;

  try {
    window.fbq("track", rule.name, rule.props ? rule.props(props) : undefined);
  } catch {
    console.error("Meta Pixel failed to send:", event);
  }
}
