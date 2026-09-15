/**
 * WHETHER THIS BUILD CAN VERIFY A PHONE NUMBER.
 *
 * Sam, 13 Sep 2026: "before they can actually purchase they have to sign in with
 * their phone number so we can actually map the membership to their account and
 * send them text notifications when we get closer to the launch."
 *
 * Modelled on `checkoutEnv` deliberately, because it is the same class of fact:
 * a deploy detail rather than a design decision, and one that must be able to be
 * absent without the surface lying about what it can do.
 *
 * ══ NO SUPABASE CLIENT, AND THAT IS NOT AN OVERSIGHT ═══════════════════════
 * PRODUCT.md is explicit that this build carries no Supabase client. Adding
 * `@supabase/supabase-js` — about 40kB over the wire — to send two POSTs for a
 * feature that is not yet configured would be the wrong trade on a page whose
 * first paint is the argument for a purchase. GoTrue's OTP endpoints are plain
 * REST and take an anon key in a header, so `fetch` is the whole integration.
 *
 * ══ ALL-OR-NOTHING, LIKE THE CHARGE ════════════════════════════════════════
 * `live` is true only when BOTH the project URL and the anon key are present.
 * Half-configured, the step must not send a code it cannot verify — the same
 * reasoning that stops the checkout rendering a wallet it cannot confirm.
 *
 * WITH IT UNSET the step still runs and still collects the number: that is what
 * gets the membership mapped to a person and makes a launch text possible,
 * which is the whole of what Sam asked for. What is missing without it is proof
 * the number belongs to whoever typed it, and the step says so in those words
 * rather than implying a verification that did not happen.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const phoneAuth = {
  /** True only when a code can actually be sent AND checked. */
  live: Boolean(url && key),
  url: (url ?? "").replace(/\/+$/, ""),
  key: key ?? "",
};

/** GoTrue: send the SMS. Resolves to an error string, or null on success. */
export async function sendCode(phone: string): Promise<string | null> {
  if (!phoneAuth.live) return null;
  try {
    const res = await fetch(`${phoneAuth.url}/auth/v1/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: phoneAuth.key },
      body: JSON.stringify({ phone, create_user: true }),
    });
    if (res.ok) return null;
    /* GoTrue's own message is better than anything invented here — it
       distinguishes an unroutable number from a rate limit, and a reader who
       hits the second needs to be told to wait rather than to retype. */
    const body = (await res.json().catch(() => null)) as { msg?: string; error_description?: string } | null;
    return body?.msg || body?.error_description || "We could not send that code.";
  } catch {
    return "We could not reach the network. Check your connection and try again.";
  }
}

/** GoTrue: check the code. Resolves to an error string, or null on success. */
export async function verifyCode(
  phone: string,
  token: string,
): Promise<string | null> {
  if (!phoneAuth.live) return null;
  try {
    const res = await fetch(`${phoneAuth.url}/auth/v1/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: phoneAuth.key },
      body: JSON.stringify({ phone, token, type: "sms" }),
    });
    if (res.ok) return null;
    return "That code did not match. Check it and try again.";
  } catch {
    return "We could not reach the network. Check your connection and try again.";
  }
}
