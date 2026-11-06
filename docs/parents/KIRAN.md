# Parents pay for their student's Tapin Plus: what's needed to switch it on

For Kiran, from Sam (6 Nov 2026). The short version. The full spec is
`docs/PARENTS_FLOW.md` on the backend branch, and the contract is `docs/parents/API.md`
in this repo.

## What it does

1. A parent opens **plus.tapin.app/parents**, types their student's first name and phone
   number (twice), then their own name and email, can add **a note** for their student,
   how it's signed ("Mom"), **a photo** and **a background** for the gift page, and pays **$3.99** by card, Apple Pay or Google Pay.
   After that it's **$7.99 a month** on the parent's card.
2. Plus goes onto **the student's phone number** right away. The student gets one text
   with a link to their gift (**plus.tapin.app/gift/{token}**): an envelope they tap
   open, the parent's note, then "Get the app" and sign in with that number. Plus is
   already there. It's the same membership as a self-bought Plus.
3. If the student hasn't signed in within **14 days**, it's canceled and the parent is
   refunded in full. The page promises this.

## Who manages it

Sam, 6 Nov 2026: "parents can manage their subscription any time by emailing
support@tapin.app - or their student can cancel it in the tapin app."

- **The student manages it in the app**, like any Plus. If they cancel in the app, the
  parent's billing stops and the parent gets an email.
- **The parent emails support@tapin.app** to change or cancel; a person does it. The
  receipt email should say that (not link a manage page). Email is an easy way to cancel
  for Virginia's auto-renewal rule, as long as support answers promptly.
- The manage page and `parent_manage` are built and can stay, unlinked, for later.

For this first version we're also leaving out: changing the student's number after
paying, resending the text, and "Ask a parent" links from the student's checkout.
"Ask a parent" is already switched off on the live site (`PARENTS_BACKEND_LIVE = false`
in `src/model/parents.ts`); leave it off.

## Where the code is

- **Frontend:** done, in `kirantapin/tapin_plus` (the /parents page, the checkout, the
  manage page). Until the backend is live, the checkout shows an error at the payment
  step, and no card can be charged.
- **Backend:** branch `feature/parents-flow` in `kirantapin/tapin_edge_functions`: one
  migration, seven new edge functions, and small changes to `stripe_webhook_handler` and
  `manage_subscription`, each marked `PARENTS FLOW`. The grant reuses the exact path a
  self-bought Plus takes (`createSubscription` → `toOwnershipRow` →
  `create_full_transaction`). Not type-checked or deployed yet.

## To switch it on

1. Run `deno check` on the new functions plus `stripe_webhook_handler` and
   `manage_subscription`. It hasn't been run yet.
2. Apply the migration `20261106000000_parents_flow.sql`. It also creates the private
   Storage bucket `gift-photos` for the parents' photos.
3. Set the secrets:
   - `PARENT_WELCOME_POLICY_ID`: production `30371fd5-c174-44c7-8041-28b47f13e9e7`
   - `RESEND_API_KEY`, for the receipt and cancel emails. Verify the sending domain in
     Resend.
   - Optional: `EMAIL_FROM`, `EMAIL_REPLY_TO`, `PLUS_SITE_URL`.

   Twilio and Stripe use the keys that are already set.
4. Deploy `parent_checkout_start`, `parent_checkout_confirm`, `parent_manage`,
   `parent_unclaimed`, `ask_link_create`, `ask_link_lookup` and `gift_lookup`
   (no JWT, like `ask_link_lookup`). Redeploy
   `stripe_webhook_handler` and `manage_subscription`.
5. Set `app_config.parent_unclaimed_job_url` to the deployed `parent_unclaimed` URL. It
   runs daily: it sends the reminder texts and does the day-14 refund.
6. Test in the Stripe sandbox with card `4242 4242 4242 4242`: pay with a note, a photo
   and a background, open the
   gift link from the student's text, sign in as the student, cancel from the parent's
   email link (the gift link then says it has ended), cancel from the app. The full test
   plan is in `PARENTS_FLOW.md`.

## Three things only you can answer

1. Does `signInWithOtp({ phone })` sign in a user that `admin.createUser({ phone,
   phone_confirm: false })` created? The student's first sign-in depends on it.
2. Does GoTrue update `auth.users.last_sign_in_at` only on an SMS sign-in, and not on a
   token refresh? The 14-day check reads it.
3. In the app, a parent-paid student shouldn't see "Restart" or "Pay now", because
   `manage_subscription` refuses both with `PARENT_PAID`. Hide them, or show that
   message?
