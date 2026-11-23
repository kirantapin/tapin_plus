/* ══ A PARENT'S GIFT: EVERY MONTH, OR JUST ONE (Sam, 23 Nov 2026: "is it
   possible to give them the option to pay for tapin plus for a month instead
   of a recurring subscription?"; then "$9.99 for one month") ══════════════
   On the parents checkout the parent picks Every month (the normal gift: the
   first month's price, then monthly until cancelled) or Just one month:
   $9.99, charged once when the student claims it, never renewing.

   The backend for one month is item 6 of the claim spec for Kiran (artifact
   EY7RTenqQDoYFnJREoBgMy): a $9.99 price, a one_month flag on the gift, the
   claim ending it after the month, no "cancelled" text. Until that's live
   (ONE_MONTH_LIVE) the choice shows only with ?gterm=1, and a one-month gift
   can't be sent or paid by wallet: it would go out as a monthly one. */

import { useSyncExternalStore } from "react";

export type GiftTerm = "monthly" | "once";

/** What one month costs, in cents. */
export const ONE_MONTH_CENTS = 999;

/** Flip once Kiran's one-month gift ships, with the cart's $9.99 price. */
export const ONE_MONTH_LIVE = false;

const FLAG_KEY = "tp_gift_term_preview";

/** The choice is on the checkout: live, or previewed with ?gterm=1 (kept for
 *  the tab, so it survives the steps; ?gterm=0 turns it off). */
export function oneMonthShown(): boolean {
  if (ONE_MONTH_LIVE) return true;
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search).get("gterm");
  try {
    if (q === "1") sessionStorage.setItem(FLAG_KEY, "1");
    if (q === "0") sessionStorage.removeItem(FLAG_KEY);
    return sessionStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return q === "1";
  }
}

let term: GiftTerm = "monthly";
const listeners = new Set<() => void>();

export function setGiftTerm(next: GiftTerm) {
  if (next === term) return;
  term = next;
  listeners.forEach((l) => l());
}

/** The parent's pick, shared by every step of the checkout. */
export function useGiftTerm(): GiftTerm {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => term,
    () => "monthly",
  );
}
