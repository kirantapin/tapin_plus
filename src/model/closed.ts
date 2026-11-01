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

export const TAPIN_URL = "https://www.tapin.app";
export const TAPIN_HOST = "www.tapin.app";

export const closedLead = "Early access is closed.";
export const closedMore = "You can still get TapIn at";
export const closedCta = `Go to ${TAPIN_HOST}`;
