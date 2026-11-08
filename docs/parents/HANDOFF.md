# Parent sign-up flow: the handoff (Sam, 5 Nov 2026)

Sam's answers to the handoff's open questions, 5 Nov 2026:
1. **Charge when the student activates**, not at checkout (a SetupIntent at checkout).
2. **The student can cancel** a parent-paid membership; that ends the parent's billing
   and the parent is emailed.
3. **Same membership** for parent-paid members, bars, cover and line skips included;
   the parent page doesn't advertise them.
4. **Stripe**, with the backend built as a package for Kiran (docs/parents/backend/).
Offer: the regular welcome offer, $3.99 the first month, then $7.99/month.

The contract both sides build to: docs/parents/API.md.

---

## Goal
A parent can subscribe their student to Tapin Plus. The parent types in the student's
mobile number and pays with their own card. They manage or cancel the billing
themselves and never need the student's SMS code. The student activates by verifying
their own number.

## The flow
1. Parent page (`/parents`), written to the parent, following the copy rules below.
2. Form: student's first name; student's mobile number, entered twice; parent's name;
   parent's email (required, for receipts and the manage link); parent's mobile
   (optional).
3. Plan: monthly, $3.99 the first month then $7.99/month. Data stored so a prepaid
   semester that doesn't renew can be added later.
4. Payment: card plus Apple Pay and Google Pay. The parent is the paying customer.
5. Confirmation screen, then a receipt email to the parent stating the terms, with a
   working link to manage or cancel.
6. Student text, only after payment succeeds: "[Parent first name] signed you up for
   Tapin Plus. Tap to activate: [single-use link]". Mentions Tapin and includes STOP.
7. Activation: the student opens the link and verifies their own number with the
   existing code flow. Plus becomes active on their phone, in the iOS app or the web app.
8. If nobody activates: text the student again on day 3 and day 7; on day 7 email the
   parent with options to resend or change the number; on day 14 cancel automatically
   and don't charge (or refund if a charge was taken).

## Edge cases
- The student already pays for Plus themselves: on activation, switch billing to the
  parent and end the student's own subscription. Never charge both. Never tell the
  parent whether a number already belongs to a member.
- Two parents buy for the same student: the first activation wins; the second is never
  charged (or is refunded).
- Wrong number: the parent can change it from the manage link until the student
  activates. Activation links expire.
- Cancelling: the parent cancels from the manage link. If the student cancels in the
  app, that also ends the parent's subscription, and the parent gets an email.
- Refunds always go to the payer. Don't mention the "Plus Promise" on the parent page
  until it's in the Terms (the July 2025 Terms say purchases are generally
  non-refundable).
- SMS abuse: only text a student after the parent has paid or added a payment method.
  No marketing texts to the student until they've activated and agreed.
- Card testing: Stripe Radar (or equivalent) on for this form.
- Android: activation works in the web app (no Play Store app).

## "Ask a parent" link
- A signed-in student taps "Ask a parent to cover it" and gets a link to share.
- The parent page then reads "[Name] asked you to cover their Tapin Plus" and shows only
  the masked number (e.g. •••1234). The student is already verified, so Plus starts as
  soon as the parent pays.
- If the student was paying themselves, billing switches to the parent.
- The link carries a server-side token that expires after about 14 days. Never put the
  phone number in the URL.

## Data model
Payer and member separate: `payer` (email, name, Stripe customer), `member` (the
student's phone), `parent_subscription` (payer_id, member_phone, status
pending_claim/active/canceled, billing_mode monthly/prepaid_term, starts_at, ends_at,
claim_token, claim_expires_at, source parent_page/ask_link, UTMs).

## Copy rules for the parent page
Positioning: a necessity, not a gift. Frame it around the meals they're already buying
downtown ("They're eating downtown anyway. Make it cost less."). It works alongside
whatever VT dining plan they have.

Say:
- the five Plus places by name: Coffeeholics, The Burg, Olaika, Sweetopia, The Milk Parlor
- $5 back every week at each place on orders of $10 or more of food or soft drinks, or
  15% off once a day (one per order)
- alcohol never counts
- two $10 orders a month cover the $7.99
- cancel anytime
- "you won't be charged until they activate"

Do not carry over from the student page:
- the "X of 100 spots left" counter
- "the average member saves $60 a month"
- the savings calculator
- "over 500 Virginia Tech students" and "$9.99 once these spots are gone"

Never say:
- "meal-plan alternative", "replaces their dining plan", "cheaper than a meal plan"
  (first-years must buy VT's Unlimited plan at $3,413 a semester)
- "budget control" or "the money goes to food" (Tapin holds no money)
- anything about 529 plans

Images: lead with food, Coffeeholics and Sweetopia. No bar, cover-charge or line-skip
images or benefits on the parent page.

## Tracking
Events: `parent_page_view`, `parent_checkout_started`, `parent_purchase` (with value),
`claim_sms_sent`, `member_claimed`, `claim_expired`, `ask_link_created`,
`ask_link_opened`, `ask_paid`. Keep UTMs from the first page through payment (parent
ads run outside the 3-mile Drillfield radius).

## Done when
- A parent on desktop Chrome, with no Apple Pay or Google Pay, can pay with a card.
- The parent never needs the student's SMS code.
- The student gets one text after payment, activates with their own code, sees Plus
  active.
- The parent's receipt email has a working manage/cancel link.
- An unclaimed signup keeps billing (no automatic refund since 7 Nov 2026); the student gets reminder texts.
- A student who already pays for Plus is never charged twice.
- The "Ask a parent" link fills in the student without the number in the URL.
- None of the "Do not carry over" or "Never say" claims appear on the parent page.
