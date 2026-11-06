/* ══ THE PARENTS FLOW: CLIENT FOR THE BACKEND IN docs/parents/API.md ════════
   Sam, 5 Nov 2026: "we should have a way for parents to sign their kids up for
   tapin", then the handoff (docs/parents/HANDOFF.md) and his calls: the
   parent is charged at checkout and the student just signs in with the
   number ("they're charged immediately, we can have them type the number
   twice"), the student can cancel too, the same membership, the backend as
   a package for Kiran.

   Every call goes to a Supabase edge function by the contract's name. Until
   Kiran ships them, local dev fakes them all with ?parentmock (never in a
   production build), so the whole flow can be walked: the parent page, the
   checkout (the mock skips Stripe) and the parent's manage page. */

import { supabase } from "../supabase";

export interface ParentCheckoutStart {
  student_first_name: string;
  student_phone: string;
  parent_name: string;
  parent_email: string;
  parent_phone?: string | null;
  ask_token?: string | null;
  utm?: Record<string, string>;
}
export interface ParentCheckoutStarted {
  checkout_id: string;
  /** The first invoice's PaymentIntent secret: paid now. */
  client_secret: string;
  first_cents: number;
  monthly_cents: number;
}
export type ParentStatus = "pending_payment" | "active" | "canceled" | "refunded";
export interface ParentConfirmed {
  status: "active";
  manage_url: string;
  student_first_name: string;
  masked_phone: string;
}
export interface ManageInfo {
  status: ParentStatus;
  student_first_name: string;
  masked_phone: string;
  /** Whether the student has signed in to Tapin since the parent paid. */
  signed_in: boolean;
  next_charge_on?: string;
  next_charge_cents?: number;
  can_change_number: boolean;
  can_resend: boolean;
}
export interface AskLinkInfo {
  student_first_name: string;
  masked_phone: string;
  expired: boolean;
  already_covered: boolean;
}

/** Whether Kiran's parents backend (docs/parents/API.md) is deployed. Until it
 *  is, "Ask a parent to cover it" stays off the live student checkout and
 *  Members page (it would call a function that doesn't exist yet); local dev
 *  and ?parentmock still show it. Flip to true once the functions are live. */
export const PARENTS_BACKEND_LIVE = false;

/** Local dev only: fake every backend call. */
export const parentMock = (): boolean =>
  import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("parentmock");

const GENERIC = "Something went wrong. Please try again.";

async function call<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const res = (error as { context?: Response }).context;
    let msg = GENERIC;
    try {
      const j = res?.clone ? await res.clone().json() : null;
      if (typeof j?.error === "string" && j.error) msg = j.error;
    } catch {
      /* Not JSON. */
    }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mask = (phone: string) => `•••${phone.replace(/\D/g, "").slice(-4)}`;

/* The mock's memory, for one tab. */
const MOCK_KEY = "tp_parent_mock_v1";
type MockState = { student_first_name: string; student_phone: string; parent_name: string; status: ParentStatus; signed_in?: boolean };
const mockGet = (): MockState | null => {
  try {
    return JSON.parse(sessionStorage.getItem(MOCK_KEY) || "null");
  } catch {
    return null;
  }
};
const mockSet = (s: MockState) => {
  try {
    sessionStorage.setItem(MOCK_KEY, JSON.stringify(s));
  } catch {
    /* fine */
  }
};

export async function startParentCheckout(req: ParentCheckoutStart): Promise<ParentCheckoutStarted> {
  if (parentMock()) {
    await wait(500);
    mockSet({ student_first_name: req.student_first_name || "Alex", student_phone: req.student_phone || "+15405550123", parent_name: req.parent_name, status: "pending_payment" });
    return { checkout_id: "mock", client_secret: "pi_mock_secret_mock", first_cents: 399, monthly_cents: 799 };
  }
  return call("parent_checkout_start", req as unknown as Record<string, unknown>);
}

export async function confirmParentCheckout(checkout_id: string, payment_intent_id: string): Promise<ParentConfirmed> {
  if (parentMock()) {
    await wait(600);
    const s = mockGet();
    if (s) mockSet({ ...s, status: "active", signed_in: false });
    return {
      status: "active",
      manage_url: `${window.location.origin}/parents/manage/mock?parentmock`,
      student_first_name: s?.student_first_name ?? "Alex",
      masked_phone: mask(s?.student_phone ?? "5405550123"),
    };
  }
  return call("parent_checkout_confirm", { checkout_id, payment_intent_id });
}

export async function manageParent(
  manage_token: string,
  action: "status" | "cancel" | "change_number" | "resend" = "status",
  new_phone?: string,
): Promise<ManageInfo> {
  if (parentMock()) {
    await wait(400);
    const s: MockState = mockGet() ?? { student_first_name: "Alex", student_phone: "+15405550123", parent_name: "Jordan Lee", status: "active", signed_in: false };
    if (action === "cancel") s.status = "canceled";
    if (action === "change_number" && new_phone) s.student_phone = new_phone;
    /* ?signedin previews the page after the student has signed in. */
    if (new URLSearchParams(window.location.search).has("signedin")) s.signed_in = true;
    mockSet(s);
    const waiting = s.status === "active" && !s.signed_in;
    return {
      status: s.status,
      student_first_name: s.student_first_name,
      masked_phone: mask(s.student_phone),
      signed_in: !!s.signed_in,
      next_charge_on: s.status === "active" ? new Date(Date.now() + 30 * 864e5).toISOString() : undefined,
      next_charge_cents: s.status === "active" ? 799 : undefined,
      can_change_number: waiting,
      can_resend: waiting,
    };
  }
  return call("parent_manage", { manage_token, action, new_phone });
}

export async function createAskLink(userAccessToken: string, first_name?: string): Promise<{ url: string; expires_at: string }> {
  if (parentMock()) {
    await wait(400);
    return { url: `${window.location.origin}/parents?ask=mock&parentmock`, expires_at: new Date(Date.now() + 14 * 864e5).toISOString() };
  }
  return call("ask_link_create", { userAccessToken, first_name });
}

export async function lookupAskLink(ask_token: string): Promise<AskLinkInfo> {
  if (parentMock()) {
    await wait(300);
    return { student_first_name: "Alex", masked_phone: "•••0123", expired: false, already_covered: false };
  }
  return call("ask_link_lookup", { ask_token });
}

/* ── First-touch UTMs, kept from the landing to the checkout ─────────────── */
const UTM_KEY = "tp_parent_utm_v1";
export function captureUtm(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(UTM_KEY)) return;
    const q = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    q.forEach((v, k) => {
      if (k.startsWith("utm_") || k === "fbclid" || k === "gclid") utm[k] = v;
    });
    if (document.referrer) utm.referrer = document.referrer;
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  } catch {
    /* Storage blocked: the checkout sends what the address has. */
  }
}
export function keptUtm(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}");
  } catch {
    return {};
  }
}

/** "+15405550123" from what a person typed; null if it isn't 10 US digits. */
export function toE164(raw: string): string | null {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `+1${d}` : null;
}
