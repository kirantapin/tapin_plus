# TapIn — Blacksburg student membership

Durable product context for design work in this project. Rewritten 11 Sep 2026, when the project
was reduced to facts and images and the code deleted. It supersedes the version written 9 Sep,
which described a questionnaire, a $9.99 month-one price, an orange in the palette and a four-item
tab bar — all since retired.

**`docs/TRUTH.md` is the authority on every price, term, benefit, venue and figure.** This file
says what the product *is*; that one says what is *true*.

## What it is

A **founding preorder** for TapIn's direct-to-student membership in Blacksburg. A student pays a
deposit today to hold a founding seat, the membership starts when the service opens (expected
Spring 2027) and is authorized separately then, and they can take a full refund any time before
then. **$6.99** a month for **50** Early Bird seats (Sam, 15 Sep 2026, late; 35 shown left), then **$14.99**; 3 months **$17.99** / **$33.99** after (25% off the monthly); a year **$54.99** / **$107.99** after (40% off), with the tee. (Figures corrected 13 Sep 2026 — this file previously said $7.99 and $19.99/$21.99,
both of which contradicted `docs/data/money-and-terms.json` and the code.)

The membership unlocks three standing benefits — 15% off, a $5 weekly credit, 2× points, on food
and non-alcoholic drinks — at five independent Blacksburg venues, plus one-time offers from a
sixth.

## Who it is for

Students in Blacksburg, on a phone, often between classes or walking home. Usage is quick,
repeated and local: the same four or five places, several times a week. They are price-sensitive
and pattern-literate — DoorDash, Amex Offers, campus dining apps.

They are deciding, in seconds, whether this is worth $7.99.

## The surfaces, and the mode of each

Four pages in the first build. Nothing else.

1. **`/` — the pitch.** Mode: **Persuade**. First touch. It carries the savings figure with its
   basis, the ways to use TapIn with their status tags, the three benefits, the six venues, the
   guarantee, and one action onward. **It states no charge.**
2. **`/reserve` — the checkout.** Mode: **Operate**. The decision and nothing else: the plan, the
   three charge rows, the consent sentence, the button, and the full terms in a drill-down. **The
   only page that takes money.** Nothing is said in full on both this and the pitch.
3. **`/in` — sign-in and the receipt.** Mode: **Operate**.
4. **The shell** — tokens, glass, the animated ground, the three-item nav.

The member app comes later.

## Identity and constraints

- TapIn's own product: the TapIn wordmark, in **the dark world**. **The palette is Virginia
  Tech's, maroon only** — Chicago Maroon `#861F41`, Hokie Stone Gray `#75787B` (non-text only),
  Yardline White `#FFFFFF`, on a dark field. **No orange anywhere**, including the wordmark dot.
- **Frosted glass is the material.** Panels, sheets and chrome are translucent dark glass over one
  authored animated ground, and text never sits on the ground itself.
- **Primitives come from the merchant-facing TapIn app** in `~/desktop-ui`. Three designs have been
  rejected for not looking like TapIn.
- **Navigation is three items: Home · Places · You.** No badges, no counts, no fourth item.
- Merchant identity appears as logos and photography, never as a page skin. Venue brand colours are
  merchant property, not tokens.
- Every venue name, menu, price and photo is a frozen production snapshot. **No invented venues,
  items, balances, savings figures or seat counts.**
- **The checkout charges.** Sam, 13 Sep 2026: `/reserve` takes a real payment on
  staging.tapin.app. It is **one charge to hold a seat** — a deposit, not a subscription — because
  the endpoint behind it creates a PaymentIntent and nothing saves a mandate. Apple Pay / Google
  Pay only; no card field, no Supabase client, no auth pair. The key and account arrive as
  build-time variables set in Vercel, never in a file. **With either missing the button stays
  disabled and says so.** Nothing else in the project charges, subscribes, texts or writes to a
  merchant, and those surfaces still say so.
- Dark patterns are out of bounds — see `docs/TRUTH.md` §10 for the specific list.

## The one rule that outranks design

On the checkout, the three charge rows, the consent sentence and the Reserve button must be
**visible together without opening anything**. This is a negative-option offer taken fifteen months
ahead of delivery; Virginia's automatic-renewal statute wants the terms adjacent to the consent
control, and ROSCA wants them before billing details are taken. Full terms may sit in a drill-down
only if the rows and consent stay visible.
