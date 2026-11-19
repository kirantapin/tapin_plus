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

/* ?claimv=out|listed|none|open|claimed|ended shows each state of /claim
   without an account, on the live site too (Sam, 19 Nov 2026: "can I preview
   the experience of signing in when my spot hasn't opened up yet, vs when it
   has, and what it looks like after i've claimed it?"). A preview never
   reaches the checkout: its Sign in goes to the open seat and its Claim to
   the claimed moment, so nobody can buy their way past the waitlist with it. */
export type ClaimPreview = "out" | "open" | "claimed" | "ended" | "listed" | "none";
const PREVIEWS: ReadonlyArray<ClaimPreview> = ["out", "listed", "none", "open", "claimed", "ended"];
export function claimPreview(): ClaimPreview | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("claimv");
  return PREVIEWS.find((p) => p === v) ?? null;
}
