import { supabase } from "../supabase";

/* ══ INVITE ONLY: THE WAITLIST (Sam, 17 Nov 2026) ═════════════════════════
   "Tapin Plus is now invite only ... the only way to get in is join the
   waitlist." Every student page (/, the place pages, the group pages, /vip)
   stops selling and takes a number for the list instead. /parents keeps
   selling: a parent's gift is the one open door, and it's also an invite.

   THE SWITCH. `WAITLIST = false` puts every page back exactly as it was
   (the selling page is untouched underneath), so rolling back is this one
   line. ?open on local dev shows the selling page beside it.

   THE WORDS. "Invite only", never "sold out": the spots counter was ours to
   set, so "sold out" would be a claim we can't stand behind. Invite only is
   true the moment the switch is on, because nobody can buy without one.

   THE WAY IN. An invite is a promo link (?l=, model/link.ts) Sam or Kiran
   texts to people on the list; a page whose price came from a link that
   isn't the page's own (a group page puts its own link in the address)
   sells as before. An ended link falls back to the waitlist. */
export const WAITLIST = true;

export const waitlistOn = (): boolean => {
  if (!WAITLIST) return false;
  if (import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("open")) return false;
  return true;
};

/** On the list already: what the join below wrote on the account. */
export const onWaitlist = (meta: Record<string, unknown> | undefined | null): boolean =>
  !!meta && typeof meta.waitlist_at === "string";

/* This visit's join, so the page says "You're on the list" straight away,
   before the session's metadata refreshes. */
const KEY = "tp_plus_waitlist_v1";
export const joinedThisVisit = (): boolean => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** Puts the signed-in student on the list: written on their own account, so
 *  the list is every auth user with `waitlist_at` (Kiran can query it), first
 *  come first served by that time. Joining is asking to be texted when a spot
 *  opens, and the join sheet says so before the number, so the texts consent
 *  is recorded with it. Resolves to an error string, or null. */
export async function joinWaitlist(where: string, page: string): Promise<string | null> {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase.auth.updateUser({
      data: { waitlist_at: now, waitlist_where: where, waitlist_page: page, marketing_opt_in: true, marketing_opt_in_at: now },
    });
    if (error) return "We couldn’t add you just now. Try again in a moment.";
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* Private mode: the account still has it. */
    }
    return null;
  } catch {
    return "We could not reach the network. Check your connection and try again.";
  }
}

/* Whether the page on screen is taking waitlist joins, set by PlusHome each
   render (as model/priceGate.ts does for the price), so the pop-ups over it
   (a place, the walkthrough) say Join the waitlist and drop the price. */
let pageWaits = false;
export const setWaitlistPage = (on: boolean) => {
  pageWaits = on;
};
export const waitlistPage = (): boolean => pageWaits;
export const WAITLIST_CTA = "Join the waitlist";

/* How many students are on the waitlist, shown on the card and the dock
   (Sam, 17 Nov 2026: "13 is real"). The REAL count only: update it from
   Kiran's query (auth.users with waitlist_at) when it changes, never by a
   schedule. A made-up count of people would be fake social proof. */
export const WAITLIST_COUNT: number = 13;
export const waitlistCountLine = (): string => `${WAITLIST_COUNT} ${WAITLIST_COUNT === 1 ? "student" : "students"} on the waitlist`;
