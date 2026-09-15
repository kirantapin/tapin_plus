/**
 * PHONE SIGN-IN, AND WHAT IT RECORDS.
 *
 * Sam, 13 Sep 2026: "before they can actually purchase they have to sign in with
 * their phone number so we can actually map the membership to their account and
 * send them text notifications when we get closer to the launch."
 *
 * ══ THIS FILE USED TO SAY THE OPPOSITE OF WHAT IT NOW DOES ═════════════════
 * It carried a long note explaining that the project deliberately had NO
 * Supabase client — ~40kB to send two POSTs — and a `phoneAuth.live` pair that
 * let the step collect a number without verifying it when nothing was
 * configured. Both were right for a one-off anonymous deposit. Neither
 * survived the subscription: `create_simple_intent` takes its customer from an
 * access token, and a token has to be persisted and refreshed. The two raw
 * fetches verified a code and then THREW THE SESSION AWAY. See `supabase.ts`.
 *
 * ══ THE STEP IS ALSO THE ONLY PLACE THE ACCOUNT IS WRITTEN ═════════════════
 * Both entry points — the checkout sheet and the pitch's sign-in sheet — mount
 * the same `PhoneStep`, and both land in `verifyCode` below. So this is the one
 * function where the name and the marketing consent reach the auth user, and
 * the reason neither can be lost by taking a different door in.
 */
import { supabase } from "../supabase";

export const phoneAuth = {
  /** The client throws at import when it is unconfigured, so by the time
   *  anything reads this there is a project to talk to. */
  live: true,
};

/** Send the SMS. Resolves to an error string, or null on success. */
export async function sendCode(phone: string): Promise<string | null> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });
    /* GoTrue's own message is better than anything invented here — it
       distinguishes an unroutable number from a rate limit, and a reader who
       hits the second needs to be told to wait rather than to retype. */
    return error ? error.message || "We could not send that code." : null;
  } catch {
    return "We could not reach the network. Check your connection and try again.";
  }
}

/**
 * Check the code. Resolves to an error string, or null on success.
 *
 * On success supabase-js stores the session and fires `onAuthStateChange`, so
 * `auth_context` picks it up and the wallet has a token — that is the whole
 * reason this is no longer a bare fetch.
 */
export async function verifyCode(
  phone: string,
  token: string,
  name?: string,
  marketingOptIn?: boolean,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (error) return "That code did not match. Check it and try again.";

    /* ══ FIRST SIGN-IN ONLY ══════════════════════════════════════════════
       Both fields below are written ONCE, when the account has no value for
       them yet, and never on a re-login.

       FOR THE CONSENT THAT IS NOT TIDINESS, IT IS THE WHOLE POINT. The
       marketing box is unchecked by default and must stay that way (TCPA — see
       PhoneStep). So a member who opted in months ago, signs in again and does
       not re-tick it would arrive here with `false` and SILENTLY REVOKE their
       own consent. Writing only into the gap makes that impossible.

       FOR THE NAME it is the weaker version of the same argument: whatever the
       account already carries is what the member last chose to be called, and
       a stale value sitting in this session's `useName` store should not
       quietly replace it.

       WHICH MEANS THIS IS NOT "IS THIS A NEW USER". `created_at` against
       `last_sign_in_at` would answer that, and answer it fragilely — a clock
       skew or a retried verify and it is wrong. The question worth asking is
       whether the value is already recorded, which is what is asked here, and
       it also repairs an account that somehow missed one.

       CHANGING EITHER IS A SETTINGS JOB, not a side effect of signing in.
       There is no settings surface yet; when there is, it writes directly. */
    const existing = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    const profile: Record<string, unknown> = {};

    if (name?.trim() && typeof existing.display_name !== "string") {
      profile.display_name = name.trim();
      profile.full_name = name.trim();
    }

    if (
      typeof marketingOptIn === "boolean" &&
      typeof existing.marketing_opt_in !== "boolean"
    ) {
      profile.marketing_opt_in = marketingOptIn;
      profile.marketing_opt_in_at = new Date().toISOString();
    }

    /* DELIBERATELY NOT FATAL. The code matched and the session is real — the
       sign-in has succeeded. Failing it because a metadata write did not land
       would throw away a verification the member just completed, to fix a
       label. Logged, and the next sign-in fills the gap. */
    if (Object.keys(profile).length > 0) {
      const { error: profileError } = await supabase.auth.updateUser({
        data: profile,
      });
      if (profileError) console.error("Could not save the profile", profileError);
    }

    return null;
  } catch {
    return "We could not reach the network. Check your connection and try again.";
  }
}
