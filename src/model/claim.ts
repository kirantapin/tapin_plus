/* ══ CLAIMING A SEAT FROM THE WAITLIST (Sam, 19 Nov 2026) ══════════════════
   "when it does open up, they have 48 hours to claim it before their seat
   is no longer available ... a page where they can claim their seat, there'd
   be a login, then when they sign in they'd see the landing page but the
   header would be a countdown to when their seat closes."

   The invite is written by the backend, never the page: when Sam opens N
   seats, the next N on the list get `app_metadata.plus_invite` = { opened_at,
   ends_at } (ISO) and a text with plus.tapin.app/claim. app_metadata is the
   part of the account only the server can write, so a student can't hand
   themselves a seat. A seat left unclaimed past ends_at goes to the back of
   the line (Sam, 19 Nov 2026); the backend does that when it next opens seats. */

export const CLAIM_HOURS = 48;

export type SeatInvite = { openedMs: number; endsMs: number };

/** The invite on the account, if there is one (open or ended). */
export function readInvite(meta: Record<string, unknown> | undefined | null): SeatInvite | null {
  const raw = meta?.plus_invite;
  if (!raw || typeof raw !== "object") return null;
  const inv = raw as Record<string, unknown>;
  const ends = typeof inv.ends_at === "string" ? Date.parse(inv.ends_at) : NaN;
  if (!Number.isFinite(ends)) return null;
  const opened = typeof inv.opened_at === "string" ? Date.parse(inv.opened_at) : NaN;
  return { openedMs: Number.isFinite(opened) ? opened : ends - CLAIM_HOURS * 3_600_000, endsMs: ends };
}

/* ?claimv=out|listed|none|sale|open|claimed|ended shows each state of /claim
   without an account, on the live site too (Sam, 19 Nov 2026: "can I preview
   the experience of signing in when my spot hasn't opened up yet, vs when it
   has, and what it looks like after i've claimed it?"). A preview never
   reaches the checkout: its Sign in goes to the open seat and its Claim to
   the claimed moment, so nobody can buy their way past the waitlist with it. */
export type ClaimPreview = "out" | "open" | "sale" | "claimed" | "ended" | "listed" | "none";
const PREVIEWS: ReadonlyArray<ClaimPreview> = ["out", "listed", "none", "sale", "open", "claimed", "ended"];
export function claimPreview(): ClaimPreview | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("claimv");
  return PREVIEWS.find((p) => p === v) ?? null;
}

/* ══ THE WAITLIST'S BLACK FRIDAY–CYBER MONDAY PRICE (Sam, 25 Nov 2026:
   "let's get a BFCM offer going for those who are on our waitlist. It'd be
   $4.99 for life, ending on Tuesday after cyber monday. I'd like this to be
   just for our waitlisted people"; "Then we'll get a text going") ═════════
   Until 11:59pm Eastern on Tuesday 1 December (Cyber Monday is 30 Nov, the
   same end as /vip), everyone already on the list has an open seat on
   /claim, the link in the text, at $4.99 a month for life: the public
   policy 2220e5ff ($3 off $7.99, forever; the parents' rate), applied on
   /claim alone (model/pagePolicy.ts).

   THE LIST IS THE GATE. Signed out, /claim asks for the number they joined
   the waitlist with. An account on the list (`waitlist_at`) gets the price,
   including anyone who joins during the sale (Sam, 25 Nov 2026: "let people
   who join the waitlist during the sale get it too"): a join goes to /claim,
   which opens their seat. Not on the list: the way to join.
   The backend doesn't check the list (the policy is public), so the gate is
   the page's, as it is for /vip. */
export const WAITLIST_SALE_POLICY = "2220e5ff-12b4-422b-9c18-36be156d4021";
/* When the page went up, for the bar that drains to the end. */
export const WAITLIST_SALE_FROM = Date.UTC(2026, 10, 25, 19, 0, 0); // Wed 25 Nov, 2pm EST
export const WAITLIST_SALE_ENDS = (() => {
  const end = Date.UTC(2026, 11, 2, 4, 59, 0); // Tue 1 Dec, 11:59pm EST
  /* Local dev: ?wsends=<ISO> moves the end, to see it close. */
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const q = Date.parse(new URLSearchParams(window.location.search).get("wsends") ?? "");
    if (Number.isFinite(q)) return q;
  }
  return end;
})();

export const waitlistSaleOn = (): boolean => Date.now() < WAITLIST_SALE_ENDS;

/** On the list in time for the sale: any join before it ends (one with no
 *  readable time counts: it was written before the time was kept). */
export const listedForSale = (sinceMs: number | undefined): boolean =>
  sinceMs === undefined || sinceMs < WAITLIST_SALE_ENDS;

/* A purchase from the sale, so the page plays the claimed moment rather
   than sending a new member straight to /in (a seat from the list has no
   plus_invite on the account). */
const SALE_KEY = "tp_claim_sale_v1";
export const markSaleClaim = () => {
  try {
    sessionStorage.setItem(SALE_KEY, "1");
  } catch {
    /* Private mode: they land on /in, which is fine. */
  }
};
export const saleClaimHere = (): boolean => {
  try {
    return sessionStorage.getItem(SALE_KEY) === "1";
  } catch {
    return false;
  }
};
