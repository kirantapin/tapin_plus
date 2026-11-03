/* ══ EARLY ACCESS IS CLOSED (Sam, 1 Nov 2026) ═══════════════════════════════
   "push an update to plus.tapin.app saying that the early access is closed,
   but they can still access Tapin by … going to … www.tapin.app … there
   should be a link to that."

   One switch. While it is true the site sells nothing: every "Get early
   access" goes to www.tapin.app instead of the checkout, /reserve sends you
   home, the announcement bar and the home page's price block say early access
   is closed, and the lines that described paying here are left out. Members
   who already bought still get "View your membership". Set it back to false
   and every surface is as it was. */
export const EARLY_ACCESS_CLOSED = true;

/* WHERE "GO TO WWW.TAPIN.APP" GOES (Sam, 3 Nov 2026): "here's the link to
   use for the web app with the plus purchase modal:
   www.tapin.app/discovery?zone=blacksburg&plus". */
export const TAPIN_URL = "https://www.tapin.app/discovery?zone=blacksburg&plus";

/** The ad's own tags. Meta adds fbclid to every ad click; the utm_ tags come
 *  from the ad's URL parameters. */
const CARRIED = /^(utm_[a-z_]+|fbclid|gclid|ttclid)$/;

/** TAPIN_URL with this visit's ad tags carried on, so the purchase on
 *  www.tapin.app is still the ad's (Sam, 3 Nov 2026: "pass along the ad's
 *  fbclid and utms"). Built by hand: the bare `plus` flag would become
 *  `plus=` through URLSearchParams. Read at click time, so it is always the
 *  address the visitor is on. */
export function tapinHref(): string {
  if (typeof window === "undefined") return TAPIN_URL;
  const out = new URLSearchParams();
  new URLSearchParams(window.location.search).forEach((v, k) => {
    if (CARRIED.test(k)) out.set(k, v);
  });
  const extra = out.toString();
  return extra ? `${TAPIN_URL}&${extra}` : TAPIN_URL;
}
export const TAPIN_HOST = "www.tapin.app";

export const closedLead = "Early access is closed.";
export const closedMore = "You can still get TapIn at";
export const closedCta = `Go to ${TAPIN_HOST}`;
