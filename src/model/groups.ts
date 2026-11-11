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

export interface Group {
  /** The route and the analytics value. */
  id: string;
  /** How the page names the people it's for. */
  name: string;
  /** "About 8 minutes by car", from the routing above. */
  minutes: number;
  /** "About 1.5 miles", in a straight line to Draper Rd. */
  miles: number;
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
