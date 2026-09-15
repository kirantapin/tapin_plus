/**
 * WHETHER THIS BUILD CAN TAKE MONEY, AND FROM WHAT.
 *
 * Sam, 13 Sep 2026: the Reserve button should work on staging.tapin.app, with
 * real money. Everything the charge needs that is a SECRET-ADJACENT DEPLOY
 * FACT rather than a design decision comes in as a build-time variable, set in
 * the Vercel project's settings — never in a file. `.vercelignore` excludes
 * `.env*` precisely so a local one cannot ride along in an upload.
 *
 * The publishable key is publishable: it is designed to ship in a bundle and
 * is not a secret. It is still an env var because it differs per environment
 * and because pairing it with the wrong connected account silently breaks
 * confirmation ("No such payment_intent").
 *
 * ALL-OR-NOTHING, DELIBERATELY. `live` is true only when BOTH the key and the
 * account are present. A half-configured build must not render a wallet sheet:
 * a button that opens Apple Pay and then fails after the member has authorised
 * is worse than a button that says it is not live yet. With either missing the
 * checkout keeps the honest disabled state it has today.
 */
const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const acct = import.meta.env.VITE_STRIPE_ACCOUNT_ID as string | undefined;
const ref = import.meta.env.VITE_STRIPE_FUNCTIONS_REF as string | undefined;

export const checkout = {
  /** True only when a charge can actually be created and confirmed. */
  live: Boolean(pk && acct),
  publishableKey: pk ?? "",
  accountId: acct ?? "",
  /** Supabase project hosting `create_simple_intent`. Falls back to the
   *  component's own default when unset. */
  functionsRef: ref || undefined,
  /** `pk_test_…` charges nothing real. Surfaced so the page can say so rather
   *  than letting a tester believe money moved. */
  isTestKey: (pk ?? "").startsWith("pk_test_"),
  /**
   * A TEST RESERVATION WITH NO PROVIDER AT ALL. Sam, 14 Sep 2026: "allow me to
   * do a fake test purchase to see what it looks like after I purchase."
   *
   * Only when the build cannot take money AND is either a dev server or was
   * built with VITE_ALLOW_TEST_PURCHASE=1 — a deploy flag passed on the CLI
   * for staging, never set on a build that has keys. It writes a reservation
   * marked `test`, which every surface prints as a test, so nobody who finds
   * the button on staging can believe they hold a seat. The moment the Stripe
   * pair is set, `live` is true and this is false: the honest test path is
   * then a pk_test_ key and a real Stripe test-mode wallet.
   */
  testPurchase:
    !(pk && acct) &&
    (import.meta.env.DEV || import.meta.env.VITE_ALLOW_TEST_PURCHASE === "1"),
};
