import { asset } from "../asset";
import type { PlusPrice } from "./plus";
import { PLUS_LINK_KEY } from "./link";

/**
 * INVITATIONS: A PROMO LINK DRESSED FOR ITS AUDIENCE (5 Nov 2026)
 *
 * Sam: "a version of this page for a free trial unlocked by students having
 * attended VT welcome week. This is an exclusive deal that only these
 * students have access to … it'd have the welcome week logo somewhere, tied
 * to the offer, and it should be a free month of tapin plus, then $7.99 a
 * month."
 *
 * The offer itself is Kiran's promo link (model/link.ts): plus.tapin.app/?l=
 * <link id> points at a private "Free first month" policy, which the checkout
 * applies only with that link's id. This file only says which links get
 * which look. The page wears the invitation when the price says that link's
 * offer is the one that applies (PlusPrice.linkId), so an expired or revoked
 * link falls back to the ordinary page and never shows a free month the
 * checkout won't give.
 *
 * History: from 14 Sep 2026 the Welcome Week text linked to /welcome, the
 * pitch with this logo and the same price as everyone ("it must never say the
 * offer is different"). That route has redirected home since 3 Nov. This
 * offer IS different, which is the point of it.
 *
 * The logo is Virginia Tech's Welcome Week mark, supplied by Sam, cut to its
 * circle (public/brand/vt-welcome-week.webp).
 */

/** The link Sam texts to Welcome Week students (Kiran, 5 Nov 2026). */
export const WELCOME_WEEK_LINK_ID = "5ed0ec82-18e4-4cea-b75c-b5e105ba8fea";

export interface Invite {
  id: "welcomeweek";
  logo: string;
  alt: string;
  /** Who it's for, short: "VT Welcome Week". */
  who: string;
  /** When the offer ends for this audience, and from when, so a bar can
   *  drain between them; null for no end. Past it the page is the ordinary
   *  one again (inviteFor). */
  ends: string | null;
  from: string;
  /** The end as the copy says it: "Sunday, Nov 8". */
  endsLabel: string;
}

const WELCOME_WEEK: Invite = {
  id: "welcomeweek",
  logo: asset("/brand/vt-welcome-week.webp"),
  alt: "VT Welcome Week",
  who: "VT Welcome Week",
  /* "a countdown until sunday, that's when we'll end the free first month
     for welcome week members" (Sam, 5 Nov 2026): the end of Sunday 8
     November, Blacksburg time (EST, UTC-5). From the policy's making, 5 Nov
     19:35 UTC. The link's own policy has no end_time yet: set it to this so
     the checkout stops giving the month when the page stops offering it. */
  ends: "2026-11-09T05:00:00Z",
  from: "2026-11-05T19:35:00Z",
  endsLabel: "Sunday, Nov\u00a08",
};

/** Whether an invitation's offer is still on. */
const live = (invite: Invite | undefined | null): Invite | null =>
  invite && (!invite.ends || Date.now() < Date.parse(invite.ends)) ? invite : null;

/** Link id → its look. Another link to the same audience goes here too. */
const BY_LINK: Record<string, Invite> = {
  [WELCOME_WEEK_LINK_ID]: WELCOME_WEEK,
};

/** The invitation the page wears: only once the price is in and only when
 *  this link's offer is the one that set it. */
export const inviteFor = (price: PlusPrice | null): Invite | null =>
  (price?.linkId && live(BY_LINK[price.linkId])) || null;

/** The link's look before the price is in, from the address (or the tab's
 *  kept link), so the first paint already has the logo and doesn't jump.
 *  Says nothing about the price; inviteFor does that once it loads. */
export const inviteExpected = (): Invite | null => {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  if (import.meta.env.DEV && q.has("wwpreview")) return live(WELCOME_WEEK);
  const asked = q.get("l");
  if (asked) return live(BY_LINK[asked]);
  try {
    const kept = window.sessionStorage.getItem(PLUS_LINK_KEY);
    const id = kept ? (JSON.parse(kept) as { linkId?: string }).linkId : undefined;
    return (id && live(BY_LINK[id])) || null;
  } catch {
    return null;
  }
};
