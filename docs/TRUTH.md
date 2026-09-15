# TRUTH — TapIn Blacksburg

**The single reference for this build.** Written 11 Sep 2026, when the inherited code was
deleted and the project reduced to facts, images and docs.

Every price, term, consent sentence, venue and figure below was **extracted by running the old
code**, not retyped — see `docs/data/*.json`, which the extraction wrote. Where this document
quotes a string in a fenced block, that is the exact bytes the old app rendered.

> **Do not reword anything in a fenced block.** Prices, terms, the consent sentences and the
> guarantee are legally load-bearing. If one needs to change, raise it with Sam first.

---

## 1. What is being sold

A **founding preorder** for TapIn's direct-to-student membership in Blacksburg. Someone pays
today; the membership itself starts when the service opens, expected **Spring 2027**; they can
take a full refund any time before then.

This is a **negative-option offer** taken roughly fifteen months ahead of delivery. That is the
single fact that governs the checkout's design — see §4.

| | |
|---|---|
| Launch window | `Spring 2027` — a season, not a date. Sam's decision, raised and chosen 10 Sep |
| Seat cap | 100 founding seats |
| Refundable | In full, any time before launch |

---

## 2. Prices

> **Changed by Sam, 14 Sep 2026 (night).** Three facts, verbatim: *"the $6.99 today holds the seat
> and is also the first month, it stays at $6.99 for an entire year. Let's only do 30 seats at this
> price point, let's say 25 of the 30 haven't been taken just to create a sense of urgency."* So:
> (1) **the payment today IS the first period** (month / 3 months / year) and holds the seat until
> opening — it is not a hold fee plus a first charge; rows, consent, terms and receipt now all say
> this one way (`content.ts` `depositise`). (2) **The Early Bird rate is locked for the first
> year**, not "for good" — every "locked for good" string is gone. (3) Seats — revised the next morning, **15 Sep 2026**, Sam: *"actually let's keep it 100 spots
> for now, and say 45 of them are left available. Early bird will close at the end of september."*
> So the cap is the extraction's **100**, the counter opens at **45** (invented, his call) and
> falls three a day from 15 Sep to reach 0 on **30 Sep**, and `foundingCloses` is "the end of
> September" — the counter and the date now end on the same day.

> **Changed by Sam, 11 Sep 2026, superseding the extraction.** Two things moved: the founding rate
> ($7.99 → $4.99) and the trigger for the standard rate (launch → the first 100 seats selling).
> Note that **$4.99 previously sat on the retired list below**, as the early bird. It is now the
> live founding rate.

| Field | Value |
|---|---|
| Founding monthly | **$6.99** for **50** seats, then **$14.99** ✅ **Sam, 15 Sep 2026 (later still)**: "for everyone else, we do $14.99 a month, 25% discount for 3 months, and 40% discount for a full year" → standard $14.99 / $33.99 / $107.99. Before that: then **$9.99** ✅ **Sam, 15 Sep 2026 (late)**: "50 early bird seats at $6.99 a month … 35 of the 50 are left … automatically go up to $9.99 after that." Pass $17.99 → $24.99, year $54.99 → $79.99 (same ladder shape). Earlier that night: **$9.99** ✅ **Raised again by Sam, 15 Sep 2026** ("the entry price would be $9.99 instead of $6.99, I honestly think a lot of people would still buy it at that price point"); `FOUNDING_MONTHLY` in `content.ts`, every $6.99 below renders as $9.99. ⚠ Note the pass ($16.99 / 3 = $5.66 a month) now undercuts the monthly by 43% — Sam did not mention the pass. Previously **$6.99** — the first 100 seats, locked for as long as the membership runs unbroken. ✅ **Raised by Sam, 14 Sep 2026** ("this is such a good deal that we could charge $6.99"). Lives in `content.ts` as `FOUNDING_MONTHLY`; the extraction's 4.99 is superseded, not edited, and every $4.99 in the tables below renders as $6.99. ⚠ The 3-month pass ($11.99 = $4.00/mo) and the year ($47.96 = $4.00/mo) now undercut it by 43% — unresolved. |
| Standard monthly | **$14.99** — everyone who joins after those 100 are gone. ✅ **Raised by Sam, 13 Sep 2026**, superseding both the extraction ($9.99) and the 11 Sep entry above. The extraction still says $9.99 — production has not been updated — so `src/model/content.ts` overrides it, exactly as it already does for the pass. |
| Standard pass | **$34.99** every 3 months — the post-founders rate for the 3-month plan. ✅ **Set by Sam, 13 Sep 2026.** The pass previously had NO step-up at all (it renewed at $11.99 forever), so this is a new fact rather than a changed one, and it is why the pass now states a saving of its own. |
| Pass | **$24.99** for 3 months, renewing at **$24.99** every 3 months; **$37.99** after the founding seats. ✅ **Ladder set 15 Sep 2026** — Sam: "make sure it actually makes sense, mine was just a reference point"; one shape on both rungs (three months cost 2½, a year costs 8, Early Bird a third off each), so the year is 20% under four passes and the standard year no longer costs the same per month as the standard pass. Reference was $22.99 / $34.99. Before that: **$22.99** for 3 months, renewing at **$22.99** every 3 months until cancelled. ✅ **Repriced by Sam, 15 Sep 2026** ("$9.99 for one month, $22.99 for 3 month, and $79.99 for the full year — or something like that"): $7.66 a month, 23% under the monthly. Previously **$16.99** for 3 months, renewing at **$16.99** every 3 months until cancelled. ✅ **Repriced by Sam, 14 Sep 2026** with the monthly ("reflect the new $6.99 per month deal"): the same ~80%-of-monthly ratio the $11.99 pass had against $4.99. `PASS_TODAY` in `content.ts`; every $11.99 below renders as $16.99. Previously ✅ **Repriced by Sam, 12 Sep 2026**, superseding the extraction's $19.99 → $21.99. That old pair cost more per month than paying monthly and was flagged incoherent here; $11.99/3 works out at $4.00 a month against the $4.99 monthly, so the pass is now the cheaper option rather than an unfavourable one to put in front of a student. The extraction still carries the old figures — production has not been updated — so `src/model/content.ts` overrides them and **regenerates that plan's charge rows, consent sentence and terms from the monthly plan's own clause structure**. Those generated strings need Sam's sign-off before they take a cent. |

| Year | **$79.99**, **$119.99** after the founding seats (eight months' worth; was 4 × pass = $139.96, which cost the same per month as the pass). ✅ **Ladder set 15 Sep 2026**, see the Pass row. Before: **$79.99** ✅ **Repriced by Sam, 15 Sep 2026** (same message) — a figure of its own, $6.67 a month, 33% under the monthly; no longer four passes (that would be $91.96). Previously **$67.96** (4 × $16.99 since 14 Sep 2026; was $47.96) for 12 months — four passes in one charge — renewing at **$67.96** a year until cancelled, and **includes a TapIn t-shirt**. **$139.96** a year after the founding seats (four standard passes). ⏳ **Asked for by Sam, 14 Sep 2026** ("a yearly prepay option at the founder rate which would be 4 times the 3 month rate but also includes a tshirt"). Derived in `src/model/content.ts` from the pass's own figures in cents; its charge rows, consent sentence and terms are generated from the pass's clause structure and, like the pass's, **need Sam's sign-off before they take a cent**. Open: the shirt's size and hand-over are collected nowhere yet — the term says we will ask before opening. Production sells no yearly plan; nothing here is from the extraction. |

The only seat sentence any surface may print:

> **Renamed by Sam, 14 Sep 2026** after Rob's Virginia Tech readers found the site too complicated:
> **"Early Bird Special" replaces "founding seat"** in every customer-facing string, and the seat
> sentence says "Early Bird spots". Code identifiers (`FOUNDING_OPEN`, `seat.founding`) keep the old
> word because they name the state, not the copy. The CTA is "Get the Early Bird Special".

> Re-fenced again the same day: the sentence sits under the $4.99 price on every surface, so it
> no longer repeats it.

> And once more, later on 14 Sep (Sam): no strike-through, plain words.

```
100 Early Bird spots · Price for everyone else is $14.99
```

**Retired, do not reintroduce:** the $6.99 promotional rate and the questionnaire that earned it;
the $6.99 retention offer; "$6.99 for one month, then $9.99"; and the **$7.99** founding rate with
its "after launch" trigger.

---

## 3. The guarantee

```
Save at least what you pay, or we refund the difference.
```

The **difference**, not the whole fee. Checked each billing period (a month, or the pass's three
months) against what the member's TapIn orders actually saved: the 15%, credit spent, and the
membership's extra points at 1¢ each. It is a promise the **server** keeps — no client computes it,
and no surface may imply one does.

---

## 4. The checkout's disclosure rule — the thing that must not be broken

Three charge rows, the consent sentence, and the Reserve button must be **visible together,
without opening anything**. Virginia's automatic-renewal statute wants the terms in visual
proximity to the consent control; ROSCA wants them before billing details are taken. The full
terms list may live in a drill-down **only if** the rows and the consent sentence stay visible.

### Charge rows — monthly

> ⚠️ **OVERRIDDEN 13 Sep 2026 — THE DEPOSIT MODEL.** Sam chose "deposit now, bill at launch" over
> three recurring mechanics. The rows and consent below are what `/reserve` renders; the
> extraction's recurring versions are kept underneath because production still sells that offer.
>
> The reason is mechanical, not editorial: the checkout charges through `create_simple_intent`,
> which builds a **PaymentIntent** — one charge, no mandate saved, no schedule. Recurring needs
> `setup_future_usage` plus a launch-time Subscription, or a Subscription with a billing anchor,
> and neither `create_intent` nor `payment_provider_proxy` has either (checked 13 Sep). Wiring a
> wallet to the recurring sentence would have made it false at the moment of consent. The
> override lives in `src/model/content.ts`; when the recurring path exists, delete it and the
> extraction speaks again.

| Label | Detail |
|---|---|
| `$4.99 today` | `Holds your founding seat` |
| `Nothing further until we open` | `Expected Spring 2027` |
| `Full refund before we open` | `No reason needed` |

**Consent:** By reserving, you authorize TapIn to charge $4.99 today to hold your founding seat.
Nothing else is charged now — we will ask you before your first membership charge when we open
(expected Spring 2027). Full refund any time before then.

<details><summary>The extraction's recurring rows, still true of production</summary>

| Label | Detail |
|---|---|
| `$4.99 today` | `Your first month` |
| `Then $4.99 a month` | `From when we open, Spring 2027 · until you cancel` |
| `Full refund before we open` | `No reason needed` |

</details>

### Charge rows — 3-month pass

> ⚠️ **GENERATED, NOT EXTRACTED — the only block on this page that is.** Sam repriced the pass on
> 12 Sep 2026 and production has not caught up, so these were rebuilt in `src/model/content.ts`
> from the monthly plan's own clause structure with the figures moved and nothing else touched.
> They are the sentences the monthly's were, at the pass's prices. **They still need Sam's
> sign-off before they take a cent**, and when production is repriced a fresh extraction replaces
> them and the override should be deleted.

| Label | Detail |
|---|---|
| `$11.99 today` | `Your first 3 months` |
| `Then $11.99 every 3 months` | `From when we open, Spring 2027 · until you cancel` |
| `Full refund before we open` | `No reason needed` |

### Consent sentence — monthly

```
By reserving, you authorize TapIn to charge $4.99 today for your first month, which starts when we
open (expected Spring 2027), then $4.99 a month automatically until you cancel. Cancel any time.
Full refund before we open.
```

### Consent sentence — 3-month pass

```
By reserving, you authorize TapIn to charge $11.99 today for your first 3 months, which start when
we open (expected Spring 2027), then $11.99 every 3 months automatically until you cancel. Cancel
any time. Full refund before we open.
```

Clause for clause this is the monthly sentence with three figures changed. That is deliberate: the
monthly consent is the wording Virginia's automatic-renewal statute and ROSCA were satisfied
against, so the pass's differs from it in numbers and in nothing else.

This is deliberately the **least decorated text on the page**. It is consent, not marketing.

### Full terms — monthly

1. `You pay $4.99 today for your first month. Every month after that is $4.99, the founding rate.`
2. `Reserving enrolls you now. The membership starts when we open.`
3. `Your first month starts when we open, expected Spring 2027. Your next charge is a month after that. Nothing more is charged before then.`
4. `$4.99 a month is locked for good — it never goes up while you keep the membership. After the first 100 seats, new members pay $14.99 a month.`
5. `Save at least what you pay, or we refund the difference. Checked every month against your TapIn orders.`
6. `Full refund any time before we open, no reason needed.`
7. `A refund gives up your seat and your locked rate. Joining later means whatever the price is then.`

### Full terms — 3-month pass

1. `You pay $11.99 today for your first 3 months — $4.00 a month. After that it renews at $11.99 every 3 months, at the same price.`
2. `Reserving enrolls you now. The membership starts when we open.`
3. `Your 3 months start when we open, expected Spring 2027. Your first renewal is 3 months after that. Nothing more is charged before then.`
4. `$11.99 every 3 months is locked for good — it never goes up while you keep the pass. After the first 100 seats, new members pay $34.99 every 3 months.`
5. `Save at least what you pay, or we refund the difference. Checked every 3 months against your TapIn orders.`
6. `Full refund any time before we open, no reason needed.`
7. `A refund gives up your seat and your locked rate. Joining later means whatever the price is then.`

**The rule that produced these:** the first payment is never stated without what follows it, in the
same sentence.

### Legal links

There is **no terms document and no privacy policy**. Render no link to one. A dead "Terms" link on
a page taking a recurring payment is worse than none — it implies a document that was agreed to and
does not exist. When real URLs exist, the links appear.

---

## 5. The benefits

Three standing benefits, identical at every Plus venue, automatic — nothing to add, nothing to show.

| Benefit | Label | Detail |
|---|---|---|
| Percent | `15% off` | `Food and non-alcoholic drinks` |
| Credit | `$5 credit` | `Earned on a $10+ order, once a week` |
| Points | `Points` (1×, Sam 15 Sep 2026 — was `2× points`) | `Food and non-alcoholic drinks` |

How they actually work:

- **They combine.** The 15% and the credit apply to the same order (Sam, 11 Sep).
- **The credit is a balance, not a discount.** A single order of $10+ **earns** $5 into the member's
  credit balance *at that venue*, at most once a week, per venue. Later orders spend it.
- **The credit is per order, not cumulative spend** — deliberately, to raise average ticket size.
- **Credit spent does not count toward the $10.** The 15% does. So a $10 order spending last week's
  $5 earns nothing; $15 keeps the credit coming weekly.
- **Benefits do not keep opening hours.** A closed venue still prices at member rates, still earns
  the credit, still applies an offer — it just cannot send to the kitchen, so orders there are
  *Save to My Spot*. Closed is a fulfilment fact, never a gate.
- **Merchants absorb every benefit in full.** TapIn keeps the membership fee and passes none of it
  through. There is no reimbursement ledger.

> **15 Sep 2026, Sam — one of the two, and the credit is EARNED, not spent.** First: "you'd only
> be able to use one of the two benefits ($5 credit on $10 spend or the 15% off), but you can earn
> points on everything." Then, later the same night, what the credit is: "spend $10, get $5 credit
> … it's a credit added to your account, so you're still paying the full price. The credit doesn't
> expire, at least not yet … it will just be added to someone's account after they spend at least
> $10 within that week or on a single order with that merchant." So an order takes ONE of two:
> 15% off now, or full price with $5 added to the account (on $10+, once a week per place). The
> credit is a balance again — "They combine" above is superseded, "the credit is a balance" stands.
> `src/model/order.ts` `quote(venue, items, mode)`; the venue page offers the switch once the
> basket clears $10; the deck's My Spot slide pays full price and shows the $5 landing, on a
> 30-second window (Sam). Not restated on the landing page, per Sam; `illustrate()` untouched.

**"Every order" was retired on 11 Sep and must not come back** — not for tone. The savings figure's
basis excludes alcohol (§7), so a benefit row reading "Every order" contradicts the number printed
above it. See `docs/virginia-alcohol-research.md` for why alcohol is excluded.

### Offers (a different thing from benefits)

A one-time merchant promotion the member **adds** first, which applies at checkout once and then
reads *used*. Members-only by default. A merchant who will not commit to a standing benefit can
still run one.

| Venue | Label | Detail |
|---|---|---|
| Italiano's Pizza | `10% off` | `One order, one time` |

No expiry date was ever agreed — the row says "one time", never a date.

---

## 6. The venues

Six in the app. **Five are Plus** (they carry all three standing benefits); Italiano's is
offers-only and wears no Plus badge — absence of the badge is the signal.

| Venue | id | Category | Street | Open | Plus | Brand colour |
|---|---|---|---|---|---|---|
| Coffeeholics | `coffeeholicsva` | Coffee | Draper Road | yes | ✓ | `#6b319e` |
| The Burg | `theburg` | Drinks | Draper Road | yes | ✓ | `#0f0f0f` |
| The Milk Parlor | `themilkparlor` | Drinks | Draper Road | **no** | ✓ | `#130f11` |
| Olaika | `olaika` | Food | Jackson Street | yes | ✓ | `#14414a` |
| Sweetopia | `sweetopia` | Food | College Avenue | yes | ✓ | `#f77186` |
| Italiano's Pizza | `italianospizza` | Food | North Main | yes | — | `#133427` |

Full records: `docs/data/venues.json`. Logos in `public/logos/`, heroes in `public/heroes/`.

- **Every name, menu, price and photo is a frozen production snapshot.** No invented venues, items,
  balances or savings figures.
- **Brand colours are merchant property, not tokens.** The one place a venue's colour may show is as
  a **collar ringing the merchant's own mark** — never as a skin on a TapIn surface. Two brands are
  near-black (`#0f0f0f`, `#130f11`) and measure ~1.02:1 against a dark canvas, so a collar needs its
  own gap ring in a colour that clears both the brand and the page.
- **Sweetopia has no menu yet** — its production `menu` column holds only passes and bundles. Its
  page shows the joined-but-not-orderable state. That is a real state the product will meet again.
- Menus for the other five: `docs/data/menus.json` (`{venue, sections}` per venue).

---

## 7. The savings illustration

The pitch prints a savings figure at display size, beside a real price, to students. **The figure
and the sentence justifying it must be produced together and never typed by hand.**

The anchor (Sam, 11 Sep): about **$300/month** goes out on food and drink, **half of it alcohol and
therefore excluded**, spent in ~$15 visits at the Plus places.

| Step | Value |
|---|---|
| Monthly spend (anchor) | $300 |
| Alcohol share | 50% |
| Non-alcohol portion — all the **15%** can act on | $150 |
| Visit size | $15 |
| Visits a month | 20, landing on 5 places |
| Credits earned | 20 — **capped** at 5 Plus places × 4 weeks |
| **Steady-state saving** | **$152.50** |
| **First month** | **$127.50** |
| Price it is set against | $4.99 |
| Steady saving, net of price | $147.51 |

**Both months are stated, not just the steady one.** Month one is lighter by one credit at each
place first visited (5 × $5 = $25), because the first visit has nothing to spend. A stranger is
deciding about *month one*, and a steady-state number printed alone next to a refund guarantee
would be the same class of overstatement as the invented seat count this product removed.

> **Corrected 11 Sep 2026 (evening).** This paragraph read "3 × $5 = $15" while the table two rows
> above it said $127.50, which is $152.50 − $25. The code was right and the prose was wrong; at the
> $300 anchor the visits land on **5** places, not 3. Anyone rebuilding the model from the prose
> would have shipped a month-one figure $10 too high.

The model, for rebuilding it:

> **Corrected by Sam, 11 Sep 2026.** The three benefits do **not** share one base, and this model
> previously applied the alcohol exclusion to all three — understating the saving by about a third.

- **15% off applies to everything EXCEPT alcohol** — food, non-alcoholic drinks, line skips, cover,
  event tickets, merch. Virginia does not permit discounting alcohol, and that is the only reason
  for the exclusion.
- **Points earn on everything**, alcohol included.
- **Credit is EARNED on any $10+ ticket**, alcohol included. It may not be *spent* on alcohol,
  which does not change what a member accrues.
- **The credit is capped**: once a week per place, so a month cannot yield more than
  `plusPlaces × weeks` = 20 of them however often a member goes. Without the cap the model invented
  $100 of credit at $600 of spend — 40 visits reporting 40 credits against a real ceiling of 20.
- Points: 10 per dollar at 1¢ = 10% back. **Only the extra 1× is the membership's** — anyone
  ordering through TapIn earns the first — so points add 10%, not 20%.
- The alcohol share now moves only the 15%, so it matters far less than it did: at $300 of spend,
  40% yields $157.75 and 60% $147.25, against $152.50 at half. Keep it a named constant anyway.
- **The figure is no longer a single anchor.** The pitch carries a slider, so the reader supplies
  her own spend and the basis sentence regenerates with it. $300 is only the default.

**It is an estimate, not a promise**, and the page must say so wherever the figure appears — in
reading type at full contrast, never smaller than that surface's own body size, and never behind a
tap.

> Reworded 13 Sep 2026. The rule used to read "an illustration, not a quote… in the same type as the
> figure", and both halves had gone wrong in practice. The phrase was trade language that read as
> wordplay beside a dollar figure (Sam: "too cheeky"). And "the same type as the figure" was being
> implemented as *literally identical* type — on `/how`'s value and close slides the qualification
> rendered at 22px/400 in `--ink-1` against a 22px/700 headline, so the caveat was the same size and
> the same white as the claim and neither read as primary. The intent was always a FLOOR — never
> fine print — which is what the wording above now states.
Full derivation and per-band figures: `docs/data/savings.json`.

---

## 8. The ways to use TapIn

Seven things the pitch can show. **Each carries its status, and the page must draw it** — four of
these describe things the app does not do yet, and presenting all seven in one voice sells four
features that do not exist, to students, next to a price.

| # | Headline | Line | Status |
|---|---|---|---|
| 1 | Buy now, pick up whenever | Save it to My Spot at the member price. It waits there for you. | **live** |
| 2 | Get in without the queue | Buy entry or a line skip, then show it at the door. Some places scan instead. | **live** |
| 3 | Two ways to collect | The kitchen pings you when it is ready. Or show your phone and they hand it over. | **live** |
| 4 | More of your week | The barber, the corner store, and the rest of where you already go. | soon → tag `Coming` |
| 5 | Members-only nights | TapIn throws them, from local bands to touring headliners. You bring someone. | soon → tag `Coming` |
| 6 | Points that go somewhere | Earn at each place, spend as one balance: gift cards, airline miles, credit. | soon → tag `Coming` |
| 7 | Offers only members see | Partners run their own, on top of the three standing benefits. | example → tag `Example` |

The tags are **not fine print** — they sit on the slide, in the slide's own type. The difference
between "your card does this" and "your card will do this" is the difference between a promise and
a claim. Source: `docs/data/ways-to-use.json`.

---

## 9. The world

- **Chicago Maroon `#861F41` only.** No orange anywhere, including the TapIn wordmark dot (✅ 14 Sep 2026: the dot is now TapIn's badge red `#D14245` — Sam, "the brighter red color"; red, not orange)
  (Sam, 11 Sep: "let's not use the orange, just the maroon"). VT's unpublished "Impact Orange" is
  moot.
- Neutrals: **Hokie Stone Gray `#75787B`**, **Yardline White `#FFFFFF`**, on a dark field
  (`#120A0E` in the old build).
- **Three contrast rules with real consequences:** maroon is a FILL and carries white (9.19:1),
  never dark ink (2.13:1). Hokie Stone Gray is **non-text only** — it measures 4.40:1 and fails AA
  for body text.
- **Frosted glass is the material:** tint + backdrop blur + a lit hairline, with an opaque
  fallback. One authored animated dark ground. **Text never sits on the bare moving ground** — it
  sits on glass.
- **Primitives come from TapIn**, read from the merchant-facing app in `~/desktop-ui`
  (`src/pages/restaurant.tsx`, `restaurant_desktop.tsx`, `src/components/desktop/*`,
  `menu_items.tsx`). Sam rejected three designs for not looking like TapIn.
  `docs/dark-reference.html` is his pinned mockup — take its structure and glass, not its gold, and
  not its four-item nav.
- **Navigation is three: Home · Places · You.** No badges, no counts, no fourth item. Cart lives
  inside a place; deals and credit fold into Home; My Spot and account become You.
- Merchant identity appears as logos and photography, never as a page skin.

---

> **15 Sep 2026 — gold tried and reverted.** Sam asked for the TapIn gold gradient on the PLUS
> badge, saw it, and called it back the same night ("looks kind of tacky … we can just revert").
> The badge is maroon with white ink; §9's no-gold rule stands with no exception.

## 10. Never ship these

- **An invented seat count.** "63 of 100 taken" was a placeholder chosen to make a bar look full.
  There are no members. A fabricated count beside a price, to students, is textbook deceptive
  scarcity. The cap is real; the count is not. **No surface states a count.**
- **A real limit dressed as urgency** — no countdowns, no "hurry", no colour alarms.
- **Artist names.** "Local bands to touring headliners" is the true part. Naming a working DJ on a
  page selling a membership asserts an endorsement nobody gave.
- **Brands as named points destinations.** "Gift cards and credit at local spots" is the category;
  naming a company asserts a relationship.
- **A link to terms or a privacy policy that does not exist** (§4). (14 Sep 2026: they exist now — go.tapin.app/terms-and-conditions, /privacy-policy, /cookie-policy — and the footer links them; the ban keeps its sense for any *relative* link.)
- **Any claim that alcohol is discounted.** See `docs/virginia-alcohol-research.md`. (14 Sep 2026: stating that *credit* may be spent on alcohol is a scope fact, not a discount claim — Sam's decision; the 15% still never touches alcohol, and the research file's marketing cautions stand.)
- **Anything implying university affiliation.** VT's palette is used; VT is not a partner.

---

## 10a. Answered by Sam, 12 Sep 2026

These were open in §11 and are now settled. Left here rather than deleted, so
the reasoning behind each surface is traceable.

| Was open | Sam's answer | Where it landed |
|---|---|---|
| The product's frame | **"This isn't a membership for going out, it's a membership for your day to day in Blacksburg."** | Every "going out" string is gone. ⚠️ `ALCOHOL_SHARE` (0.5) and `VISIT_SIZE_USD` (15) in `savings.ts` were both set for the old frame and are **unchanged** — they move the headline figure, so they are Sam's. The alcohol share being too high *understates* the saving; the visit size being too high probably *overstates* it. |
| Nobody answers for the guarantee | **sam@tapin.app** (was robert@tapin.app until Sam changed it, 14 Sep 2026) | Printed under the guarantee on `/`, `/reserve` and `/in`. Not a support desk and must not be dressed as one. |
| "Full refund before we open" on the hero | **Keep it** | Its qualifier (a refund forfeits the seat and the locked rate) is visible at rest on `/reserve`, so the promise no longer outruns its condition by two routes. |
| Slake's "$2 OFF first drink" | **Remove it** | Was never rendered — Virginia bars discounting alcohol. Now recorded as withdrawn. Slake's benefit set is still unsettled, but without a standing alcohol offer in it. |
| Slake's street, logo, hero | *"I'll provide those soon"* | Still a monogram tile until they arrive. |
| Sweetopia has no menu | **Production has it** — supplied via https://www.tapin.app/sweetopia | Read from that page: one section, 22 rolled ice creams, all $7.20, no descriptions, no alcohol, plus 22 item photographs from TapIn's own storage bucket. Its `_provenance` in `menus.json` records that it came from the live page, not the extraction run. |
| The 3-month pass | **$11.99, renewing at $11.99 every 3 months** | See §2. |
| Should venue tiles be tappable | **Yes, through to the page preview** | The six pitch tiles link to `/app/place/:id`. |

---

## 11. Open questions — Sam's, unanswered

> **15 Sep 2026 — referral: the shirt at ten.** Sam: "they should just unlock a free tshirt if they
> refer 10 friends who purchase the membership." The post-purchase page says exactly that, with a
> 0-of-10 tracker and the shirt beside the sentence; nothing records a referral yet, and the panel
> says the rewards are still being finalised. (An earlier $5/$5/$10 sketch lived for an hour.)


1. **What seat number does a buyer get?** The old build allocated from the invented 63, so receipts
   read "Seat 064". With no count shown, the numbering needs a real answer — or seat numbers go
   away entirely and the receipt names the person instead.
2. **Is the prepaid month consumed at launch, or credited?**
3. **"Spring 2027" is a season.** A named month, or an explicit "refunded in full if we have not
   launched by *date*", removes most of the risk in taking money fifteen months early. Raised
   10 Sep; Sam chose the season.
4. **The cancel flow's four defaults** — retention amount, access to period end, whether earned
   credit survives, rejoin price — were never confirmed. Not needed before launch.
5. **The merchant economics.** At the threshold the checkout nudges toward, a $10 ticket gives up
   65%; ~$28/month of merchant cost per member per venue against **$4.99** collected by TapIn.
   Levers exist (raise the threshold, cap the credit, make it a percentage); none pulled.
   **The drop from $7.99 to $4.99 widened this gap by 37% and nothing was changed on the merchant
   side to absorb it** — merchants already absorb every benefit in full, with no reimbursement
   ledger (§5). This is now the largest unexamined number in the product.

---

## 12. What was deliberately not carried forward

These existed in the old code and are **not** part of this build. They are recorded so nobody
rebuilds them by accident, and they remain readable in `~/tapin-student-blacksburg`.

- **The research questionnaire** (three neutral questions on frequency, places, monthly spend) and
  the 16-venue checklist with its randomised order. It earned the retired $6.99 rate.
- **TapIn events** — three illustrative members-only nights with capacity-limited RSVP.
- **The member app** (Home, Places, You, My Spot, Account, Cancel).
- **The local pricing engine** (`quote()`), the localStorage seat stub, and the member store.

---

## 13. Where the extracted data lives

| File | Holds |
|---|---|
| `docs/data/money-and-terms.json` | Both plans: charge rows, full terms, consent, renewal, guarantee, seat line, pricing, benefits, offers |
| `docs/data/savings.json` | The model, the anchor, the illustration, per-band estimates |
| `docs/data/venues.json` | Six venue records with policies and brand colours |
| `docs/data/menus.json` | Frozen production menus for five venues |
| `docs/data/ways-to-use.json` | The seven slides with their status tags |
| `docs/virginia-alcohol-research.md` | Why benefits are food and non-alcoholic drinks |
| `docs/dark-reference.html` | Sam's pinned dark mockup |

**Reference copies of the deleted code:** `~/tapin-student-blacksburg/src/` and the three snapshots
in `~/tapin-student-blacksburg-snapshots/`. Nothing was lost in the reduction.
