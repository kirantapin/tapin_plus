/* ══ A PROMO LINK'S OFFER (5 Nov 2026) ═════════════════════════════════════════
   plus.tapin.app/?l=<link_id>: a link on the tapin row (the links table) that
   points at a Plus policy, so each audience can get its own first-month price
   (the marketer's "$3 off for one, $2 for another"). The policy needn't be
   public: tapin_verify_order applies a private one only with its link's id,
   which the checkout sends with it (model/checkout.ts).

   Checked with validate_link (live, not expired or revoked, its policy active
   and on the tapin row) and kept for this tab's session, so it survives the
   sign-in step and a reload. A ?l that isn't a live Plus policy link clears
   whatever was kept. */

import { supabase } from "../supabase";
import { TAPIN_ID } from "./plus";

const KEY = "tp_plus_link_v1";

export interface PlusLink {
  linkId: string;
  policyId: string;
  /** The policy row validate_link returned, for the page's price. */
  policy: {
    policy_id: string;
    end_time: string | null;
    definition: { action: { type: string; free?: boolean; percentDiscount?: number; fixedDiscount?: number } };
  };
}

function kept(): PlusLink | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlusLink) : null;
  } catch {
    return null;
  }
}

function keep(link: PlusLink | null) {
  try {
    if (link) window.sessionStorage.setItem(KEY, JSON.stringify(link));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* Storage blocked: the link applies to this page load only. */
  }
}

async function load(): Promise<PlusLink | null> {
  if (typeof window === "undefined") return null;
  const linkId = new URLSearchParams(window.location.search).get("l");
  if (!linkId) return kept();
  const { data, error } = await supabase.rpc("validate_link", { p_link_id: linkId });
  const link =
    !error && data?.link_restaurant_id === TAPIN_ID && data.type === "policy" && data.policy
      ? { linkId, policyId: data.policy.policy_id, policy: data.policy }
      : null;
  if (error) console.error("Checking the promo link failed", error);
  keep(link);
  return link;
}

/* Read once per page load and shared: the price, the checkout and analytics
   all ask. */
let linkPromise: Promise<PlusLink | null> | null = null;
export const loadPlusLink = () => (linkPromise ??= load().catch(() => null));
