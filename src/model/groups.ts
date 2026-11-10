/* ══ GROUP LANDING PAGES (Sam, 10 Nov 2026) ═════════════════════════════════
   The home page, said to one group of people: first Smith's Landing (an
   apartment complex on Plantation Road), with a second group coming. Same
   offer, checkout, dock and questions as plus.tapin.app; only the header's
   words and one section are the group's own.

   Only true things about a group go here. Tapin has no deal with Smith's
   Landing and they don't sponsor this: no logo, photos or branding of
   theirs, and nothing that says they're involved. The facts are where it is
   and how far the Plus spots are. Distances were routed on OpenStreetMap
   (routing.openstreetmap.de, 10 Nov 2026) from 870 Plantation Rd to 211
   Draper Rd (Coffeeholics, The Milk Parlor; The Burg is across the street
   at 204): 1.47 miles in a straight line, so "about 1.5 miles"; by car 2.39
   miles, 8.4 minutes with no traffic (via Prices Fork Rd and Main St), so
   "about 8 minutes". College Ave (Sweetopia) routed 8.5, Jackson St (Olaika)
   9.1. Sam remembers it as a 20 to 30 minute walk (it's by Oak Lane), but
   OSRM and Valhalla both route the walk at 2.2 miles and 42 to 45 minutes,
   so the page says no walking time. Blacksburg Transit routes weren't
   confirmed, so the page never names a bus.

   THE OFFER (Sam, 10 Nov 2026): $3.99 a month for the first year, agreed
   with Smith's Landing, for anyone with the link, no end date. It's a promo
   link (model/link.ts) on a private policy, $4 off for 12 periods, which
   the checkout already prices ("$3.99/mo for 12 months, then $7.99/mo").
   Kiran makes the link; its id goes in `linkId`, and the route puts it in
   the address so everything downstream applies it. Until then the page is
   the ordinary offer; ?slpreview shows the year on local dev. */

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
  /** The group's own invented spots count (model/seats.ts), shown in place
   *  of the $7.99-then-$14.99 one while the group's price applies. */
  seats: SeatSchedule;
}

export const SMITHS_LANDING: Group = {
  id: "smiths-landing",
  name: "Smith’s Landing",
  minutes: 8,
  miles: 1.5,
  linkId: null,
  /* 300 spots, 10 to 20 fewer a day (Sam, 10 Nov 2026), from launch at 6pm
     Eastern on 10 November; floors at 12. */
  seats: { cap: 300, startMs: Date.UTC(2026, 10, 10, 23, 0, 0), min: 10, max: 20, floor: 12, seed: 31 },
};
