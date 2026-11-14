/* ══ GROUP LANDING PAGES (Sam, 10 Nov 2026) ═════════════════════════════════
   The home page, said to one group of people: first Smith's Landing (an
   apartment complex on Plantation Road), with a second group coming. Same
   offer, checkout, dock and questions as plus.tapin.app; only the header's
   words and one section are the group's own.

   Only true things about a group go here. Smith's Landing's rate is agreed
   with them (Sam, 10 Nov 2026), so "exclusive we set up with Smith's
   Landing" is said; the header is Sam's own collage of The Lodge; their
   logo stays off unless Sam says. The facts are where it is and how far
   the Plus spots are. Distances were routed on OpenStreetMap
   (routing.openstreetmap.de, 10 Nov 2026) from 870 Plantation Rd to 211
   Draper Rd (Coffeeholics, The Milk Parlor; The Burg is across the street
   at 204): 1.47 miles in a straight line, so "about 1.5 miles"; by car 2.39
   miles, 8.4 minutes with no traffic (via Prices Fork Rd and Main St), so
   "about 8 minutes". College Ave (Sweetopia) routed 8.5, Jackson St (Olaika)
   9.1. Sam remembers it as a 20 to 30 minute walk (it's by Oak Lane), but
   OSRM and Valhalla both route the walk at 2.2 miles and 42 to 45 minutes,
   so the page says no walking time. Blacksburg Transit routes weren't
   confirmed, so the page never names a bus.

   THE OFFER: $3.99 a month FOR LIFE (Sam, 11 Nov 2026: "the $3.99/month
   would be for life btw"; on 10 Nov it was "for the first year"), agreed
   with Smith's Landing, for anyone with the link, no end date, 300 spots.
   It's a promo link (model/link.ts) on a private policy, $4 off, discount
   duration "forever", which the checkout already prices ("$3.99 every
   month"). Kiran makes the link; its id goes in `linkId`, and the route
   puts it in the address so everything downstream applies it. Until then
   the page is the ordinary offer; ?slpreview shows it on local dev.

   BREXX AT BLACKSBURG (Sam, 11 Nov 2026: "this apartment complex in
   blacksburg as well, with the $3.99/month for life exclusive rate"): the
   student cottages at 1800 Redd Road (off Prices Fork, by Hethwood; once
   The Retreat at Blacksburg). A partnership rate, so "exclusive" is said.
   $3.99 a month for as long as you're a member: a promo link on a private
   policy, $4 off, discount duration "forever", which the checkout already
   prices ("$3.99 every month"). Kiran makes the link; until its id is in
   `linkId` the page is the ordinary offer, and ?brexxpreview shows the
   for-life version on local dev. No spots counter (Sam hasn't asked for
   one). Distance, routed on OpenStreetMap 11 Nov 2026 from 1800 Redd Rd to
   211 Draper Rd: 1.76 miles in a straight line ("about 1.8 miles"); by car
   2.31 miles, 6.9 minutes (Carpenter Blvd, Prices Fork, Turner St, Main),
   so "about 7 minutes". The page names neither yet, and never a walk time
   or a bus. */

import type { SeatSchedule } from "./seats";
import { asset } from "../asset";

export interface Group {
  /** The route and the analytics value. */
  id: string;
  /** How the page names the people it's for. */
  name: string;
  /** "About 8 minutes by car", from the routing above; none for a group
   *  that isn't a place (Welcome Week). */
  minutes?: number;
  /** "About 1.5 miles", in a straight line to Draper Rd. */
  miles?: number;
  /** The promo link that carries the group's price, or null until it
   *  exists (the page is then the ordinary offer). */
  linkId: string | null;
  /** How long the group's price lasts: its first 12 months ("year"), or
   *  for as long as you're a member ("forever"). The link's own discount
   *  duration must match, or the page shows the ordinary offer. */
  term: "year" | "forever";
  /** The group's own invented spots count (model/seats.ts), shown in place
   *  of the $7.99-then-$14.99 one while the group's price applies; null
   *  shows none. */
  seats: SeatSchedule | null;
  /** A PUBLIC policy that carries the group's price with no link
   *  (model/pagePolicy.ts), or none. */
  policyId?: string | null;
  /** A real end to the group's price, and when it started (for the bar that
   *  drains between them). Past the end the page is the ordinary offer and
   *  says the price ended; none for no end. */
  endsMs?: number | null;
  startMs?: number;
  /** The headline, in place of "A more rewarding Blacksburg, for {name}." */
  headline?: string;
  /** Whose price it is, in the header line: "Resident exclusive" unless
   *  said. */
  label?: string;
  /** A mark beside the price in the header, in place of the tag. */
  mark?: { src: string; alt: string };
  /** How the clock names the end: "Ends at midnight tonight" unless said,
   *  and its short form, "Ends at midnight". */
  endsLine?: string;
  endsShort?: string;
  /** The line once it's over: "The {name} price ended at midnight." unless
   *  said. */
  endedLine?: string;
  /** One more line under the price in the header. */
  note?: string;
  /** The page's own "Why is it $X?" question, in place of the stock one. */
  faq?: (first: string, monthly: string) => { q: string; a: string };
}

export const SMITHS_LANDING: Group = {
  id: "smiths-landing",
  name: "Smith’s Landing",
  minutes: 8,
  miles: 1.5,
  /* Kiran's private-policy link, $4 off, duration forever. */
  linkId: null,
  term: "forever",
  /* 300 spots, 10 to 20 fewer a day (Sam, 10 Nov 2026), from launch at 6pm
     Eastern on 10 November; floors at 12. */
  seats: { cap: 300, startMs: Date.UTC(2026, 10, 10, 23, 0, 0), min: 10, max: 20, floor: 12, seed: 31 },
};

export const BREXX: Group = {
  id: "brexx",
  name: "Brexx",
  minutes: 7,
  miles: 1.8,
  /* Kiran's private-policy link, $4 off, duration forever. */
  linkId: null,
  term: "forever",
  seats: null,
};

/* ══ WELCOME WEEK, A FLASH SALE (Sam, 11 Nov 2026) ════════════════════════════
   "We want to do a $2.99 for life offer for them, closing end of day. It's a
   flash sale." For the VT Welcome Week students, the audience of the
   5 Nov invitation (model/invite.ts, whose free month ended Sunday 8 Nov).
   Sam: "it's $2.99 for life, welcome week only. As more spots join they
   don't pay more."

   THE OFFER: Kiran's PUBLIC policy f408a1cb ("$2.99 forever": add_item,
   fixedDiscount 5 off $7.99, discountDuration "forever"; read 11 Nov 2026),
   applied by its id with no link (model/pagePolicy.ts). $2.99 every month
   for as long as they're a member.

   THE END IS REAL: the end of Wednesday 11 November, Blacksburg time (EST,
   UTC-5), so the page counts down to it and, past it, stops applying the
   policy and shows the ordinary offer with a line saying the price ended.
   The policy itself had no end_time when read: Kiran should set it to
   2026-11-12T05:00:00Z so the checkout stops too. ?wwfpreview shows the
   sale on local dev (the local database has no such policy); ?wwfends=<ISO>
   moves the end there. */
export const WELCOME_WEEK_FLASH_POLICY = "f408a1cb-99f4-4e25-9167-55f848852d04";
const WW_ENDS_MS = Date.UTC(2026, 10, 12, 5, 0, 0);

/** Dev only: ?wwfends=<ISO> moves the end, to see the last minutes and the
 *  ended page. Never read in a production build. */
const wwEnds = (): number => {
  if (!import.meta.env.DEV || typeof window === "undefined") return WW_ENDS_MS;
  const raw = new URLSearchParams(window.location.search).get("wwfends");
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(t) ? t : WW_ENDS_MS;
};

export const WELCOME_WEEK: Group = {
  id: "welcome-week",
  name: "Welcome Week",
  linkId: null,
  term: "forever",
  seats: null,
  policyId: WELCOME_WEEK_FLASH_POLICY,
  endsMs: wwEnds(),
  /* When Kiran's policy was made (modified_at, 11 Nov 20:20 UTC). */
  startMs: Date.UTC(2026, 10, 11, 20, 20, 0),
  headline: "A more rewarding Blacksburg, for Welcome Week.",
  label: "Welcome Week only",
  mark: { src: asset("/brand/vt-welcome-week.webp"), alt: "VT Welcome Week" },
};


/* ══ VIP: A COMEBACK PRICE FOR THOSE WHO SIGNED IN BUT DIDN'T JOIN (Sam,
   14 Nov 2026: "a landing page for those who signed into tapin but didn't
   purchase ... an exclusive deal to one of our $2.99 or $3.99 for life
   policies. This would be a limited time offer, and we'd send SMS
   specifically to those who signed into Tapin in blacksburg but didn't
   purchase tapin plus") ══════════════════════════════════════════════════════
   plus.tapin.app/vip, the link in that text. THE OFFER: the same PUBLIC
   policy as Welcome Week's flash sale, f408a1cb ("$2.99 forever", $5 off
   $7.99, discountDuration forever; read active with no end_time on 14 Nov
   2026), applied by its id on this page alone (model/pagePolicy.ts).

   THE END IS EACH PERSON'S OWN (Sam: "each person would see the offer ending
   in 1 day"): 24 hours from when they first open the page on that phone,
   kept in localStorage. It's held on the device, so a second phone or a
   cleared browser starts its own day; the policy itself has no end, so the
   checkout would still take it after the page stops offering it. The pitch
   (Sam: "just using Tapin once, at one of our partners, is enough to make
   your money back and more"): one $5 credit is more than the $2.99 month. */
const VIP_KEY = "tp_vip_first_v1";
const VIP_HOURS = 24;

/** When this phone first opened /vip, recorded the first time it's asked. */
function vipFirstSeen(): number {
  const now = Date.now();
  try {
    const kept = Number(window.localStorage.getItem(VIP_KEY));
    if (Number.isFinite(kept) && kept > 0 && kept <= now) return kept;
    window.localStorage.setItem(VIP_KEY, String(now));
  } catch {
    /* No storage: the day starts now, each visit. */
  }
  return now;
}

/** The VIP group, with this person's own 24 hours. Built when /vip opens,
 *  never on another page, so only a visit to /vip starts the clock. */
export function vipGroup(): Group {
  const start = typeof window === "undefined" ? Date.now() : vipFirstSeen();
  return {
    id: "vip",
    name: "VIP",
    linkId: null,
    term: "forever",
    seats: null,
    policyId: WELCOME_WEEK_FLASH_POLICY,
    startMs: start,
    endsMs: start + VIP_HOURS * 3_600_000,
    headline: "Your own Plus price, for the next 24 hours.",
    label: "VIP offer",
    endsLine: "Your price ends today",
    endsShort: "Ends today",
    endedLine: "Your VIP price has ended.",
    note: "Use one $5 credit once and Plus has paid for itself.",
    faq: (first, monthly) => ({
      q: `Why is it ${first}?`,
      a: `It’s a VIP price for people who signed in to Tapin but haven’t joined Plus yet, and it lasts 24 hours from when you first open this page. Join in time and you pay ${first} a month for as long as you’re a member, even as more places join. Everyone else pays ${monthly} a month after their first. Use one $5 credit once and the month has paid for itself. Cancel anytime in the Tapin app.`,
    }),
  };
}
