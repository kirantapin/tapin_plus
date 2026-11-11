/* ══ A PAGE'S OWN PUBLIC POLICY (Welcome Week flash sale, 11 Nov 2026) ═══════
   Some offers aren't behind a promo link: Kiran made Welcome Week's "$2.99
   forever" as a PUBLIC policy on the tapin row, which the checkout applies
   by its id with no link, the way it applies the ordinary welcome offer
   (model/checkout.ts). A page that sells one (a group with `policyId`,
   model/groups.ts) names it here before its first render; the price
   (model/plus.ts) and the checkout then try it ahead of the welcome offer.

   Kept for this tab's session, as a promo link is (model/link.ts), so it
   survives the sign-in step and a reload. It carries its own end: past it
   nothing applies it, so the page never sells the price after the sale
   closes, even with the tab left open (the backend's end_time is Kiran's). */

const KEY = "tp_plus_page_policy_v1";

interface Kept {
  policyId: string;
  endsMs: number | null;
}

let current: Kept | null = null;

function read(): Kept | null {
  if (current) return current;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    current = raw ? (JSON.parse(raw) as Kept) : null;
  } catch {
    current = null;
  }
  return current;
}

/** Called by the page that sells it, before its first render. */
export function setPagePolicy(policyId: string, endsMs: number | null) {
  current = { policyId, endsMs };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* Storage blocked: it applies to this page load only. */
  }
}

/** The page's policy id while its sale is on, else null. */
export function pagePolicy(): string | null {
  if (typeof window === "undefined") return null;
  const kept = read();
  if (!kept) return null;
  if (kept.endsMs !== null && Date.now() >= kept.endsMs) return null;
  return kept.policyId;
}
