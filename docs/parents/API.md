# Parents flow: the contract between plus.tapin.app and the backend

Status: the frontend is built against this contract; the backend is a package for Kiran
(branch `feature/parents-flow` in his edge-functions repo, `docs/PARENTS_FLOW.md`
there). Nothing here works live until he ships it. Local dev runs the whole flow with
`?parentmock` (src/model/parents.ts), which fakes every call.

## Decisions (Sam, 5 Nov 2026)
- **Charge at checkout.** "that's fine, they're charged immediately, we can have them
  type the number twice yeah." The parent pays $3.99 for the first month at checkout,
  then $7.99/month. Plus goes on the student's number at once; the student just signs
  in to Tapin with that number and it's there. No activation link or claim page.
- If the student hasn't signed in within **14 days**, the subscription is canceled and
  the parent refunded automatically.
- The student is texted once at checkout (the research session's text, "The text to the
  student wouldn't have to change"), with up to two reminders if they haven't signed in.
- A student **can cancel** a parent-paid membership in the app; that ends the parent's
  billing and the parent is emailed.
- Parent-paid members get **the same membership** (bars, cover, line skips included);
  the parent page doesn't advertise bar perks (the FAQ answers honestly).
- Payments are Stripe; the backend goes to Kiran as a Supabase migration and edge
  functions.
- Offer: the regular welcome offer, $3.99 the first month (while the welcome policy is
  live), then $7.99/month.

## Data model
Payer and member separate, so a prepaid semester can be added later.

```sql
payers (
  payer_id uuid pk, email text not null, name text not null, phone text null,
  stripe_customer_id text not null, created_at timestamptz
)
parent_subscriptions (
  parent_subscription_id uuid pk,
  payer_id uuid fk payers,
  member_phone text not null,            -- E.164, the student's number
  member_first_name text not null,
  member_user_id uuid null,              -- the student's auth user (found or created by phone)
  status text check in ('pending_payment','active','canceled','refunded'),
  billing_mode text check in ('monthly','prepaid_term') default 'monthly',
  stripe_subscription_id text null,
  stripe_payment_intent_id text null,    -- the first invoice's PaymentIntent
  starts_at timestamptz null, ends_at timestamptz null,
  first_signed_in_at timestamptz null,   -- when the student first signed in after this
  manage_token_hash text unique,         -- sha256; the parent's manage link
  source text check in ('parent_page','ask_link'),
  ask_link_id uuid null,
  utm jsonb, reminders_sent int default 0,
  created_at timestamptz, canceled_at timestamptz null,
  cancel_reason text null                -- 'parent','student','unclaimed','duplicate'
)
ask_links (
  ask_link_id uuid pk, member_user_id uuid not null, member_phone text not null,
  member_first_name text not null, token_hash text unique,
  expires_at timestamptz,                -- created_at + 14 days
  paid_parent_subscription_id uuid null, created_at timestamptz
)
```
Tokens are random 32-byte URL-safe strings; only their sha256 is stored. A phone number
never appears in a URL.

## Endpoints (Supabase edge functions, `supabase.functions.invoke(name, { body })`)
On a business error the body is `{ error: "message to show" }`, as the existing
functions do. Amounts in cents.

### `parent_checkout_start`
For a parent with no account. No auth.
```ts
req: {
  student_first_name: string; student_phone: string;   // E.164 +1XXXXXXXXXX
  parent_name: string; parent_email: string; parent_phone?: string | null;
  ask_token?: string | null;                            // from an Ask a parent link
  utm?: Record<string, string>;                         // first-touch utm_*, fbclid, referrer
}
res: {
  checkout_id: string;            // parent_subscription_id
  client_secret: string;          // the first invoice's PaymentIntent secret ("pi_…_secret_…")
  first_cents: number;            // due today (399)
  monthly_cents: number;          // 799
}
```
Creates (or reuses by email) the payer and their Stripe Customer, a
`pending_payment` row, and a Stripe Subscription on that Customer for Plus's monthly
price with the welcome first-month discount, `payment_behavior: "default_incomplete"`,
returning the first invoice's PaymentIntent secret. Radar on. Rate-limit by IP and by
student_phone. For an ask link the member comes from the link (phone fields ignored).

### `parent_checkout_confirm`
```ts
req: { checkout_id: string; payment_intent_id: string }
res: { status: "active"; manage_url: string; student_first_name: string; masked_phone: string }
```
Verifies the PaymentIntent succeeded for this subscription, then, idempotently:
1. Finds the student's auth user by phone, or creates one (phone, unconfirmed), and
   grants Plus to it the way a self-bought Plus is granted (ownership row for the
   tapin bundle), tied to this subscription.
2. If that user already pays for Plus themselves, ends their own subscription (cancel
   now, prorated refund to the student). Never charged twice.
3. If another parent's subscription already covers this number, this payment is
   refunded in full, the subscription canceled (`duplicate`), the parent emailed, and
   the response is `{ error: "Someone already covers this number's Tapin Plus. We've refunded you in full." }`.
   Only someone who has just paid can learn this, so it is not a free way to look up
   members. (A student paying for themselves is not "covered": see step 2.)
4. Texts the student once (ask links skip it: the student asked):
   `Tapin: {Parent first} signed you up for Tapin Plus, $5 back every week at 5 Blacksburg spots. Activate: https://plus.tapin.app/in Reply STOP to opt out`
5. Emails the parent the receipt: what they paid, the terms ($7.99 every month until
   canceled, the next charge date), how to cancel, and the manage link
   `https://plus.tapin.app/parents/manage/{token}`.

### `parent_manage`
```ts
req: { manage_token: string; action?: "status" | "cancel" | "change_number" | "resend";
       new_phone?: string }
res: { status; student_first_name; masked_phone; signed_in: boolean;
       next_charge_on?: string; next_charge_cents?: number;
       can_change_number: boolean; can_resend: boolean }
```
- `cancel`: cancel the Stripe Subscription at period end (Plus stays until then), email
  the parent.
- `change_number` (only until the student first signs in): move the grant to the new
  number's user, re-send the text.
- `resend` (only until the student first signs in): re-send the text (max 3 a day).

### `ask_link_create`
```ts
req: { userAccessToken: string; first_name?: string }
res: { url: string; expires_at: string }   // https://plus.tapin.app/parents?ask={token}
```
For a signed-in student; error if a parent already covers them.

### `ask_link_lookup`
```ts
req: { ask_token: string }
res: { student_first_name: string; masked_phone: string; expired: boolean; already_covered: boolean }
```

## Job (pg_cron, daily) — `parent_unclaimed`
For active parent subscriptions whose student hasn't signed in since checkout
(`first_signed_in_at` null; set from auth.users.last_sign_in_at > created_at):
- day 3 and day 7: re-text the student;
- day 7: email the parent (resend, or change the number from the manage link);
- day 14: cancel the subscription, refund the parent in full, remove the grant, email
  the parent (`cancel_reason = 'unclaimed'`).

## Webhooks
- The student cancels Plus in the app → the parent's Stripe Subscription is canceled
  (`cancel_reason = 'student'`) and the parent is emailed.
- `invoice.payment_failed` on a parent subscription → email the parent with the manage
  link (Stripe's retries apply).

## Analytics (frontend, PostHog; `parent_purchase` also to Meta as Subscribe)
`parent_page_view`, `parent_checkout_started`, `parent_purchase` (value = first charge),
`claim_sms_sent` (backend), `member_claimed` (backend, first sign-in),
`claim_expired` (backend, day 14), `ask_link_created`, `ask_link_opened`, `ask_paid`.
First-touch UTMs are kept in sessionStorage from the landing to checkout and sent to
`parent_checkout_start`.
