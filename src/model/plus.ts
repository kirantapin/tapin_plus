/* ══ TAPIN PLUS, AS THE BACKEND HAS IT (3 Nov 2026) ═══════════════════════════
   Plus is a real bundle on TapIn's own restaurants row ("tapin"), the same one
   the app sells. Its price and billing come from that row, and the welcome
   offer's first month from the offer policy, so nothing here is typed by hand.
   These figures are only for showing: what's charged is always the signed cart
   (model/checkout.ts). Mirrors the app's plus_offers.ts and tapin_admin_context. */

import { useEffect, useState } from "react";
import { environment, supabase } from "../supabase";
import { loadPlusLink } from "./link";
import { WELCOME_WEEK_LINK_ID } from "./invite";
import { COFFEEHOLICS_FOREVER_POLICY } from "./campaign";
import { pagePolicy } from "./pagePolicy";
import { WELCOME_WEEK_FLASH_POLICY } from "./groups";

export const TAPIN_ID = "tapin";

/** The welcome offer: a policy on the tapin row that adds Plus at a discount.
 *  Its id differs per database; null where it doesn't exist (Plus is then
 *  sold at full price). The same ids as the app's plus_offers.ts. */
const WELCOME_OFFER_ID: Record<typeof environment, string | null> = {
  production: "30371fd5-c174-44c7-8041-28b47f13e9e7",
  preview: null,
  dev: "31c993d7-2186-4725-89bd-14490c2efe40",
  local: "56b58354-ef49-4a7a-aee5-f029a679399e",
};
export const welcomeOfferId = WELCOME_OFFER_ID[environment];

export interface PlusBundle {
  bundle_id: string;
  name: string;
  price: number;
  billing: { interval: "day" | "week" | "month"; interval_count: number };
}

/** How long an offer's discount lasts: the first N months, or every one.
 *  Null: the first month only. The backend's DiscountDuration. */
export type DiscountDuration = { periods: number } | "forever" | null;

interface OfferPolicy {
  end_time: string | null;
  definition: {
    action: {
      type: string;
      free?: boolean;
      percentDiscount?: number;
      fixedDiscount?: number;
      discountDuration?: DiscountDuration;
    };
  };
}

/** What Plus costs, for the page. */
export interface PlusPrice {
  /** Every period after the first. */
  monthly: number;
  /** The first period: a promo link's offer or the welcome offer's price, or
   *  `monthly` without one. */
  first: number;
  /** How long `first` lasts: the offer's duration (null, the first month). */
  firstFor: DiscountDuration;
  /** "month", "2 weeks". */
  period: string;
  billing: PlusBundle["billing"];
  /** The promo link whose offer set `first` (model/link.ts), or null when the
   *  welcome offer or the full price did. The page dresses for its audience
   *  by it (model/invite.ts). */
  linkId: string | null;
  /** When that link's offer ends, or null for no end. */
  linkEnds: string | null;
  /** The page's own public policy (model/pagePolicy.ts) when it set
   *  `first`, else null or absent. */
  policyId?: string | null;
}

/** One billing period on from `from`, placed the way Stripe places it: a
 *  monthly date on the 31st falls on the last day of a shorter month. Ported
 *  from the backend's IntervalHandler.addIntervals (interval_handler.ts). */
export const nextBillingDate = ({ interval, interval_count }: PlusBundle["billing"], from = new Date()): Date => {
  const DAY = 24 * 60 * 60 * 1000;
  if (interval === "day") return new Date(from.getTime() + interval_count * DAY);
  if (interval === "week") return new Date(from.getTime() + interval_count * 7 * DAY);
  const target = new Date(from);
  target.setUTCDate(1);
  target.setUTCMonth(from.getUTCMonth() + interval_count);
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(from.getUTCDate(), lastDay));
  return target;
};

/** The first period's price under the offer, or null when it doesn't add
 *  Plus at a discount (or has ended). The app's firstPeriodPrice. */
const offerPrice = (offer: OfferPolicy | null, plus: PlusBundle): number | null => {
  if (!offer || (offer.end_time && new Date(offer.end_time) <= new Date())) return null;
  const action = offer.definition.action;
  if (action.type !== "add_item") return null;
  const price = action.free
    ? 0
    : action.percentDiscount
      ? Math.round(plus.price * (1 - action.percentDiscount) * 100) / 100
      : action.fixedDiscount
        ? Math.max(0, Math.round((plus.price - action.fixedDiscount) * 100) / 100)
        : null;
  return price !== null && price < plus.price ? price : null;
};

export const periodOf = (plus: PlusBundle) => {
  const { interval, interval_count } = plus.billing;
  return interval_count === 1 ? interval : `${interval_count} ${interval}s`;
};

/** TapIn's one Plus bundle (a unique index allows only one). */
export async function fetchPlusBundle(): Promise<PlusBundle> {
  const { data, error } = await supabase
    .from("bundles")
    .select("bundle_id, name, price, billing")
    .eq("restaurant_id", TAPIN_ID)
    .is("deactivated_at", null)
    .maybeSingle<PlusBundle>();
  if (error) throw error;
  if (!data) throw new Error("Tapin Plus isn't on sale");
  return data;
}

/* Local dev only (stripped from builds): the local database has no Plus
   bundle, so the price never loads there. ?pricepreview shows the welcome
   offer's figures and ?wwpreview a Welcome Week link's free month
   (model/invite.ts), to see each page without the live database. */
const devPrice = (): PlusPrice | null => {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const base = { monthly: 7.99, period: "month", billing: { interval: "month" as const, interval_count: 1 }, linkEnds: null, firstFor: null };
  if (q.has("wwpreview") || q.get("l") === WELCOME_WEEK_LINK_ID) return { ...base, first: 0, linkId: WELCOME_WEEK_LINK_ID };
  if (q.has("pricepreview")) return { ...base, first: 3.99, linkId: null };
  /* A group's year-long link (model/groups.ts) before Kiran's link exists. */
  if (q.has("slpreview")) return { ...base, first: 3.99, firstFor: "forever", linkId: "slpreview" };
  /* Brexx's for-life link (model/groups.ts BREXX) before Kiran's exists. */
  if (q.has("brexxpreview")) return { ...base, first: 3.99, firstFor: "forever", linkId: "brexxpreview" };
  /* Welcome Week's $2.99 for life (model/groups.ts WELCOME_WEEK): a public
     policy the local database doesn't have. Off once its end has passed. */
  /* /coffeeholics' $4.99 for life (model/campaign.ts), which the local
     database doesn't have either. */
  if (q.has("cflpreview") && pagePolicy() === COFFEEHOLICS_FOREVER_POLICY)
    return { ...base, first: 4.99, firstFor: "forever", linkId: null, policyId: COFFEEHOLICS_FOREVER_POLICY };
  if (q.has("wwfpreview") && pagePolicy() === WELCOME_WEEK_FLASH_POLICY)
    return { ...base, first: 2.99, firstFor: "forever", linkId: null, policyId: WELCOME_WEEK_FLASH_POLICY };
  return null;
};

/* Local dev only: with no Plus bundle in the local database the price never
   loads and every figure reads "$–" (Sam, 5 Nov 2026, from localhost). There
   the welcome offer's sample figures stand in, so the page reads as it does
   live; a production build never gets here. */
const devFallback = (): PlusPrice => ({
  monthly: 7.99,
  first: 3.99,
  firstFor: null,
  period: "month",
  billing: { interval: "month", interval_count: 1 },
  linkId: null,
  linkEnds: null,
});

async function fetchPrice(): Promise<PlusPrice> {
  const preview = devPrice();
  if (preview) return preview;
  /* A page's own public policy in place of the welcome offer while its sale
     is on (model/pagePolicy.ts); the checkout tries it the same way. */
  const own = pagePolicy();
  const offerId = own ?? welcomeOfferId;
  const [plus, offer, link] = await Promise.all([
    fetchPlusBundle(),
    offerId
      ? supabase
          .from("policies")
          .select("end_time, definition")
          .eq("policy_id", offerId)
          .eq("active", true)
          .maybeSingle<OfferPolicy>()
          .then(({ data, error }) => {
            if (error) console.error("Loading the welcome offer failed", error);
            return data ?? null;
          })
      : Promise.resolve(null),
    loadPlusLink(),
  ]);
  // A promo link's offer in place of the welcome offer, as the checkout
  // tries it first (model/link.ts).
  const linked = offerPrice(link?.policy ?? null, plus);
  const offered = offerPrice(offer, plus);
  /* The page's own policy set the price: its duration is the term. */
  const ownSet = linked === null && own !== null && offered !== null;
  return {
    monthly: plus.price,
    first: linked ?? offered ?? plus.price,
    firstFor: linked !== null && link
      ? link.policy.definition.action.discountDuration ?? null
      : ownSet
        ? offer?.definition.action.discountDuration ?? null
        : null,
    policyId: ownSet ? own : null,
    period: periodOf(plus),
    billing: plus.billing,
    linkId: linked !== null && link ? link.linkId : null,
    linkEnds: linked !== null && link ? link.policy.end_time : null,
  };
}

/* Loaded once, on first use, and shared by every caller. A failed load is
   forgotten so the next mount tries again. */
let pricePromise: Promise<PlusPrice> | null = null;
const loadPrice = () =>
  (pricePromise ??= fetchPrice().catch((e) => {
    if (import.meta.env.DEV) {
      console.warn("Plus price unavailable locally; showing sample figures", e);
      return devFallback();
    }
    pricePromise = null;
    throw e;
  }));

/* Every mounted price hook, so the price can be read again when a page's
   own sale ends while it's open (model/pagePolicy.ts). */
const listeners = new Set<() => void>();
/** Forget the price and read it again, everywhere it's shown. */
export function refreshPlusPrice() {
  pricePromise = null;
  listeners.forEach((f) => f());
}

/** Plus's price, or null while it loads; `failed` once it couldn't be read,
 *  so a page that guessed an offer from its address can stop guessing. */
export function usePlusPriceLoad(): { price: PlusPrice | null; failed: boolean } {
  const [state, setState] = useState<{ price: PlusPrice | null; failed: boolean }>({ price: null, failed: false });
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const bump = () => setEpoch((n) => n + 1);
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);
  useEffect(() => {
    let live = true;
    loadPrice()
      .then((p) => live && setState({ price: p, failed: false }))
      .catch((e) => {
        console.error("Loading the Plus price failed", e);
        if (live) setState({ price: null, failed: true });
      });
    return () => {
      live = false;
    };
  }, [epoch]);
  return state;
}

/** Plus's price, or null while it loads (or if it couldn't be read). */
export function usePlusPrice(): PlusPrice | null {
  return usePlusPriceLoad().price;
}

/** The first month as a figure: "Free" for a free one (a promo link's,
 *  5 Nov 2026), else "$3.99". "$0" read as a price nobody would quote. */
export const firstFigure = (price: PlusPrice | null): string => (price?.first === 0 ? "Free" : usd(price?.first));

/** "Your first month free, then $7.99." or "$3.99 your first month, then
 *  $7.99." */
export const firstThen = (price: PlusPrice | null): string =>
  price?.first === 0
    ? `Your first month free, then ${usd(price.monthly)}.`
    : `${usd(price?.first)} your first month, then ${usd(price?.monthly)}.`;

/** How long the first price lasts, said after its figure: "first month",
 *  or for a promo link that lasts, "a month for your first full year" (12) or
 *  "a month for 6 months". The checkout says the same (PlusCheckout). */
export const firstTerm = (price: PlusPrice | null): string => {
  const f = price?.firstFor;
  /* A group's for-life price (model/groups.ts BREXX). */
  if (f === "forever") return "a month for life";
  if (!f || f.periods <= 1) return "first month";
  return f.periods === 12 ? "a month for your first full year" : `a month for ${f.periods} months`;
};
/** A promo link's price that lasts more than the first month. */
export const firstLasts = (price: PlusPrice | null): boolean => {
  const f = price?.firstFor;
  return !!f && f !== "forever" && f.periods > 1;
};
/** A promo link's price that lasts as long as you're a member. */
export const firstForever = (price: PlusPrice | null): boolean => price?.firstFor === "forever";

/** "Free first month" or "$3.99 first month". */
export const firstMonthLine = (price: PlusPrice | null): string =>
  price?.first === 0 ? "Free first month" : `${usd(price?.first)} first month`;

/** "$7.99", "$5", "$0". Placeholder "$–" while the price loads. */
export const usd = (n: number | undefined) =>
  n === undefined ? "$–" : Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;

/** Whether this user holds Plus right now: an ownership row for TapIn's
 *  bundle whose window covers now. The app's isPlus. */
export async function isPlusMember(userId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ownership")
    .select("ownership_id, bundles!inner(restaurant_id)")
    .eq("user_id", userId)
    .eq("bundles.restaurant_id", TAPIN_ID)
    .lte("starts_at", now)
    .gt("ends_at", now)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}
