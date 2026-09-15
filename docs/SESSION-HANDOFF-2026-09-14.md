# Session handoff — 14 Sep 2026 (desktop redesign)

**Read this first, then `docs/START-HERE.md`, then `docs/TRUTH.md`.** This file is the
state of the repo at the end of the 14 Sep session and the queue Sam has set. It supersedes
nothing — TRUTH.md still governs every price, term and figure; PRODUCT.md still says what the
product is. Sam's memory notes for agents live outside the repo; the durable ones are repeated
here so this document stands alone.

## Where things stand

Nothing from today is committed or deployed. `git status` at handoff:

     M .claude/launch.json
     M .gitignore
     M PRODUCT.md
     M docs/START-HERE.md
     M docs/TRUTH.md
     M docs/data/money-and-terms.json
     M docs/data/venues.json
     M index.html
     M scripts/guards.py
     M src/App.tsx
     M src/main.tsx
     M src/model/content.ts
     M src/model/menu.ts
     M src/model/order.ts
     M src/model/savings.ts
     M src/model/spendStore.ts
     M src/routes/How.tsx
     M src/routes/Pitch.tsx
     M src/routes/Reserve.tsx
     D src/routes/SignIn.tsx
     M src/routes/app/AppDeals.tsx
     M src/routes/app/AppHome.tsx
     M src/routes/app/AppPlace.tsx
     M src/routes/app/AppShell.tsx
     M src/shell/Concentration.tsx
     M src/shell/SavingsSlider.tsx
     M src/shell/Scenes.tsx
     M src/shell/Shell.tsx
     M src/shell/SimplePayButton.tsx
     M src/shell/cardFlight.ts
     M src/styles/app.css
     M src/styles/base.css
     M src/styles/card.css
     M src/styles/how.css
     M src/styles/layout.css
     M src/styles/pitch.css
     M src/styles/reserve.css
     M src/styles/tokens.css
     M tsconfig.tsbuildinfo
     M vercel.json
     M vite.config.ts
    ?? .vercelignore
    ?? SESSION-HANDOFF-2026-09-13.md
    ?? docs/CONVERSION-RESEARCH.md
    ?? docs/CONVERSION-RESEARCH.raw.txt
    ?? src/asset.ts
    ?? src/model/seats.ts
    ?? src/routes/Membership.tsx
    ?? src/routes/SavingsLab.tsx
    ?? src/shell/AppLayer.tsx
    ?? src/shell/BenefitCards.tsx
    ?? src/shell/CheckoutSheet.tsx
    ?? src/shell/PhoneStep.tsx
    ?? src/shell/VenueTicker.tsx
    ?? src/shell/authEnv.ts
    ?? src/shell/checkoutEnv.ts
    ?? src/shell/useMedia.ts
    ?? src/styles/savings-lab.css
    ?? src/vite-env.d.ts

The dev server is `npm run dev` on **port 4500**. Typecheck with `npx tsc -b --noEmit`; run
`python3 scripts/guards.py` before any commit (it fails on §10 urgency words, Hokie Stone as
text, invented counts, terms/privacy links). Both were clean at handoff.

Staging deploys by Vercel CLI, not git — see the memory note "Staging deploy route": rsync a
snapshot, `vercel link`, `vercel deploy --prod --yes --build-env VITE_BASE_PATH=/blacksburg/`,
delete the `.env.local` that `link` creates. **Today's work has not been pushed to staging.**
Sam asked for it twice yesterday; expect to be asked again.

## What shipped today (all desktop, ≥1024px; the phone layout is byte-identical)

Sam approved the pitch with "this looks so much better" after three earlier desktop passes were
rejected as "completely out of whack". The reason those passes failed is the most important
lesson in this file: **they were verified by measuring, not by looking**. See "How to see the
desktop" below before claiming anything is done.

### `/` — the pitch (`src/styles/pitch.css`, block "THE PAGE BELOW THE HERO")
- Hero: hard split (solid plum panel left, six photographs right on a vertical seam — Sam's
  pick from a Mobbin review on 13 Sep). Mosaic is **2 across × 3 down** on desktop so the
  landscape photographs crop landscape and The Burg's wordmark survives. Wordmark left-aligned
  (`align-self:flex-start` — it was centred by SVG preserveAspectRatio in a stretched flex item).
  Panel fill runs up under the announcement bar (`::before{top:calc(-1 * var(--clear))}`)
  and the panel repays `--clear` at its foot so the type block centres in the box the eye sees.
- Below the hero, **four movements on alternating grounds**: the statement (three benefit cards
  + scope strip, un-panelled, on the field) → the evidence (`--subtle` full-bleed band, all
  seven places in **one row from 1280px**; 1024–1279 keeps the auto-running ticker) → the
  decision (two panels, shared top and foot, plan rows not nested cards) → the close (`--subtle`
  band, guarantee at 32px, app door beside it; the page ends on it).
- Section labels become 24px/20px sentence-case headings by CSS only. All copy unchanged.
- One Reserve button size everywhere (`width:auto;min-width:300px`).
- The direction contract is an HTML comment in `index.html`.
- `VenueTicker.tsx`: `DESKTOP` query is **1280**, not 1024 — seven tiles under 1280 would drop
  below the 132px the phone rail proves legible.

### `/how` — the walkthrough deck (`src/styles/how.css`, block "THE DECK ON A DESKTOP")
- The sheet (1180×720, centred) is a **grid**: art on the LEFT on a recessed `--subtle` plate
  spanning the stage and foot rows; headline/line top-right; "Opening Spring 2027 · Skip to the
  price" and Back/Next bottom-right, anchored to the plate's edges. Sam asked for art-left
  explicitly ("carousel animations on the left").
- `.how-stage{display:contents}` at desktop so the grid places copy and art directly; swipe
  handlers still work (events bubble through box-less elements).
- Every scene is sized to its plate (2×2 spend tiles at 160px, value as 2×2 photographs at 5:3,
  offer 240/30px figure, pass 440, tickets' type stepped up, points re-hierarchised so the
  balance leads at 24 and the unbuilt Coming card no longer carries the biggest figures).
- **My Spot scene (`Scenes.tsx` `SceneMySpot`) tells Sam's story**: an hour left on this week's
  $10-for-$5 credit → she orders now → credit banked → the order is Saved for 90 days. Three
  beats on one ticket: state slot "1 hr left" → credit row lands (0.9s) → slot swaps to "Saved"
  (1.5s) → keep row + meter draw (1.7s). Every keyframe ends at rest, so reduced-motion lands on
  the finished ticket. The slide line is "An hour left on this week's $5 credit. Order now, it
  waits in My Spot." — the guard rejects "ends in"; do not reintroduce it. §10 adjacency is
  recorded in the CSS comment "THREE BEATS": this is a member's moment, not urgency on the sale.
- **DEV seam:** `/how?slide=<id>` opens the deck on that slide, paused (ids: spend value order
  myspot offers entry points redeem close). DEV-gated like `?seats=`.

### `/reserve` — the checkout (`src/styles/reserve.css`, block "THE CHECKOUT ON A DESKTOP")
- `.column:has(#checkout)` is the grid: **card on a rounded photo tile top-left** (the mosaic
  becomes the tile's fill; back chevron top-left of the tile), three benefit ROWS divided by
  hairlines (not the pitch's statement cards), scope strip, guarantee, the two doors as one row;
  the checkout panel spans all rows on the right and is sticky.
- `.rs-split{display:contents}` at desktop; the old `.rs-split` grid rules are overridden by
  the id's specificity. The pitch's card rules are now scoped `.column > .panel:has(.bcards)` —
  they leaked into this page once; keep them scoped.

### `/in` — the membership (`src/routes/Membership.tsx` + reserve.css block "/in ON A DESKTOP")
- Same grid as the checkout: sticky card tile left, details down a 520px track right. One new
  wrapper `<div className="ms-body">` around both branches, `display:contents` on the phone.

### The app preview as a **window** (Sam: "a pop up layered above the page someone clicked")
- `src/App.tsx`: modal routing. Links into `/app` carry `state={{ background: location }}`
  (Pitch applink, Reserve door, Membership door, VenueTicker tiles). On desktop `/app*` renders
  `background ?? "/"` in the main `<Routes>` and the app in a second `<Routes>` inside
  `src/shell/AppLayer.tsx`. Direct visits get the pitch underneath.
- `.app-window` carries `data-surface="app"` (tokens.css, base.css, card.css selectors now
  match `.app-window[data-surface="app"]` as well as `html[...]`), so the window is light and the
  page beneath stays dark. `transform:translateZ(0)` on the window makes it the containing block
  for the app's `position:fixed` banner/rail/join bar — none of app.css's own rules changed;
  `.app-scroll` twins the three `.column:has(.app)` rules.
- Close: Escape, the scrim, the banner's chevron (root screen) and a new × (`.app-close`). Closing
  navigates to the background with `state.fromLayer`, which `Shell` reads to skip its scroll
  reset. `html.is-layered{overflow:hidden}` + `inert` on `main.column` while open.
- In-app links forward `state` (AppShell tabs/back, AppHome place links) so the page behind the
  scrim never switches mid-visit. `AppPlace`'s `<Navigate to="/app" replace/>` drops it (edge).
- `src/shell/useMedia.ts` is the shared matchMedia hook. VenueTicker still has its own copy.

## How to SEE the desktop (do this before saying anything is done)

The in-app browser pane renders 1440 at postage-stamp size — three passes "passed" there.
Headless Chrome works:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --window-size=1440,900 --virtual-time-budget=7000 \
  --screenshot=out.png "http://localhost:4500/"
```
`--window-size=1440,2400` for the full page; `/how?slide=myspot` for a slide; `/app` for the
window. Then READ the PNG. Phone widths do NOT work this way (Chrome enforces a ~440px minimum
window) — use the browser pane's mobile preset for phone proof. puppeteer is not installed.

## Traps that bit this week (repeated from the code comments because they will bite again)

- **`:not()` takes its argument's specificity; `:where()` takes none.** `layout.css` caps every
  column child with `.column > :where(*:not(.sticky-cta):not(.announce))` at (0,1,0) on purpose.
  Any `.column > .thing` rule beats it. Verify widths with `getBoundingClientRect`, then look.
- `justify-content:flex-end` overflows out the TOP unreachably; the deck uses `safe flex-end`.
- Custom properties substitute textually: `calc(100% …)` re-resolves against the consumer.
- `.action{display:block;width:100%}` — a flex item needs `width:auto` as well as `flex:0 0 auto`.
- `.collar` has no `display`; in an `<li>` it stays inline and the logo renders at 537px.
- Keyframes must END at their resting state (reduced-motion parks on 100%).
- `stashCardOrigin` finishes running animations before measuring the card's rect.
- `whole()` takes cents; `wholeUsd()` takes dollars.
- Desktop rules for a surface live in that surface's own stylesheet.

## Standing rules (Sam's, not negotiable without him)

- Every price, term, seat sentence, guarantee and consent string comes from `docs/data/*.json`
  via `src/model/content.ts`. Never retype one. Headlines/lines in the deck are authored copy
  and Sam changes them freely.
- The seat counter (`src/model/seats.ts`) is **artificial on purpose** — his call, recorded there
  with the reasoning. It reaches 0 on **27 Sep 2026**, at which point every price flips to
  $14.99 / $34.99 (`FOUNDING_OPEN`). Verified with `?seats=0`. Do not re-argue it.
- Maroon is spent only on the acting or chosen thing. Hokie Stone Gray is never text. No
  countdowns/urgency on the sale (§10). Alcohol is never discounted. No university affiliation.
- Merchant photography and logos are the only colour; venue brand colours only collar the
  merchant's own mark.
- Phone layout is approved; every desktop rule is inside `@media (min-width:1024px)`.
- One page at a time: build it, screenshot it at phone and desktop, show Sam, then the next.
- Never publish an unsourced number: Clavicular @ The Burg is 313 tickets in the export
  (17 Aug), Sam says ~700 — not published either way.

## Open items, in Sam's priority as far as it is known

1. **Push to staging** (see route above) — Sam will ask.
2. **Proof block on the pitch**: Welcome Week logo (Sam has rights; file NOT on disk — needs
   `public/logos/welcomeweek.png` or a URL), live venues line (The Burg, Coffeeholics, Italiano's
   are live; only two have `liveUrl` in `venues.json` — Italiano's slug unknown), Clavicular
   ticket count (see above), Slake logo + hero (Sam sent both on 13 Sep; not on disk;
   `comingVenues` in content.ts documents the shape). `public/` is CDN-served at build time and is
   the right home for the Welcome Week mark; Slake's belong in the Supabase `restaurant-images`
   bucket when the venue is real in production.
3. **1024–1279px** is served: ticker instead of the seven-row, "View all places" opens 4-across.
   768–1023 is still the phone layout — flagged since 12 Sep, not asked for.
4. **DESIGN.md does not exist** in this repo though `tokens.css` cites it. The impeccable finish
   reviewer flagged it. Running `/impeccable document` from the built world would close it.
5. Minor pitch reviewer notes not taken: none left material. The `.monogram` size moved to 32.
6. **desktop-ui** (the merchant app, branch V3.1): the My Spot `savings` guard (money-facing) is
   still waiting on Sam; `useBrandBalances`/`useBrandRewards`/`RewardsWallet` shipped for
   cross-brand point balances. Off-limits files there: `CHANGE_REPORT.md`, `HANDOFF.md`,
   `bundle_cta.tsx`, `useRestaurantColors.tsx`, `contrastTextColor`. Never run git write
   commands in that repo.
7. Phone OTP (`src/shell/authEnv.ts`) is live only when `VITE_SUPABASE_URL`/`ANON_KEY` are set.
   Never enter a real number or complete a code.

## Files touched today (for reconciliation)

`src/styles/pitch.css`, `how.css`, `reserve.css`, `app.css`, `tokens.css`, `base.css`, `card.css`;
`src/App.tsx`, `src/shell/Shell.tsx`, `AppLayer.tsx` (new), `useMedia.ts` (new), `VenueTicker.tsx`,
`Scenes.tsx`; `src/routes/How.tsx`, `Pitch.tsx`, `Reserve.tsx`, `Membership.tsx`,
`app/AppShell.tsx`, `app/AppHome.tsx`; `index.html` (direction contract). Earlier in the same
session (uncommitted too): `model/seats.ts` (new), `content.ts`, `savings.ts`, `order.ts`,
`spendStore.ts`, `CheckoutSheet.tsx`, `PhoneStep.tsx`, `authEnv.ts`, `cardFlight.ts`,
`Membership.tsx` (replaced `SignIn.tsx`), `docs/TRUTH.md`, `docs/data/*.json`, `scripts/guards.py`.

---

## Addendum — 14 Sep 2026, second session (afternoon)

**Deployed to staging three times today** (`npx vercel deploy --prod --yes --build-env
VITE_BASE_PATH=/blacksburg/`); everything below is live at staging.tapin.app/blacksburg and
still **uncommitted** (Sam runs git). `tsc --noEmit` and `python3 scripts/guards.py` clean.

### Sam's asks, built and verified (phone via pane at 375×812, desktop via headless 1440)
1. **Deck value slide (2/9):** the four spend pills are gone. One headline sentence — "Based on
   **$150** spend a month, you'd save about $76.25 a month" — where the spend figure is a button
   that turns the deck back to the spend slide (`How.tsx` `valueHead`/`toSpend`, `.how-spend`).
   Each tile shows its own saving (15% of the real price via `money(Math.round(cents×0.15))`;
   the cover tile says "Save 15%" because no cover price exists in the data).
2. **Deck close (9/9) card:** perpetual float + drift + light pass on three layers
   (`.sc-close` / `.card-stage` / `.tcard::after`, how.css). The arrival moved off `.tcard` —
   it had `fill:both` on the card and was silently killing the pointer tilt. `cardFlight.ts`
   now *cancels* infinite animations before measuring (`finish()` throws on them).
3. **$14.99 struck:** `content.ts` builds §2's sentence from `seatCapParts` (`now`/`after`
   roles) and `seatCapLine` is those parts joined — text unchanged by construction.
   `shell/SeatCapLine.tsx` renders it on the hero, the deck close and the plans note; styles
   `.seat-now`/`.seat-after` in layout.css. Post-flip nothing is struck.
4. **My Spot slide (4/9):** the 90-day meter is gone; `CreditWindow` (Scenes.tsx) shows the
   week's $5 credit draining live from 1:58 ("· 1:58 left" — guards ban the phrase "ends in"),
   state slot swaps to "Saved for later", copy names food / drink / cover / line skip.
5. **/reserve "What you can use it on" + "Where you can use it"** (`shell/Reach.tsx`,
   reserve.css `.reach-*`): six 4:3 tiles — Food (Olaika pepperoni), Drinks (Coffeeholics
   cappuccino), Cover (Milk Parlor hero) on merchant photos; Tickets / Line skips / Merch on
   the category glyph because no photograph exists in the data (§10). Then the six venues by
   mark. The pitch keeps its glyph strip. **Sam can supply photos for the three glyph tiles.**
6. **Yearly plan** (`PLANS.year`, content.ts): 4 × the pass in cents — $47.96/yr founding,
   $139.96/yr after — with a t-shirt row/term ("We'll ask your size before we open").
   Third tile on /reserve (full-width row), third card on the pitch ("Three ways to join").
   **TRUTH §2 row added, marked awaiting Sam's sign-off**, like the pass's generated strings.
7. **Name on the card** (`model/nameStore.ts`, session-only): tapping the close-slide card
   focuses an input styled as the name line (`TapInCard` `onName`, card.css
   `.tcard-name-input`); the deck ignores keys typed there; the checkout's name field and the
   /reserve card read the same value.

### Pre-deploy adversarial review (workflow `wf_f643d1b3-643`, 52 agents) — verdict HOLD, all four blockers fixed
- `How.tsx` charge rows now come from `PLANS.monthly` (flip-aware), not `monthlyPlan`.
- `/in` renders from the reservation record (`founding`, `price`, `per`, `saving`, `locked`,
  `terms` written at purchase in `Reserve.tsx`); legacy records infer founding from cents.
- `seats.ts` no longer returns "Only N founding seats left"; guards regex widened to
  `\bonly\b[^.\n]{0,40}\b(left|remaining)\b`.
- `seatNoun` / `reserveCta` / `cardPlan` exported from content.ts and used on every button,
  sheet title/aria-label, receipt and the card's PLAN default — "Reserve a seat" / "Standard"
  after the flip. Verified with `?seats=0` on /how (close), /reserve, /in.
- Ship-with-note items NOT done (see the review output for detail): vercel.json CSP must be
  widened before any Stripe/Supabase env pair is set; `Routes location={under}` scroll-reset
  is dead; VITE_BASE_PATH only lives in the CLI flag; "Closes the end of October" is a date
  the counter beats; flip is client-clock only (backend item for Kiran); TRUTH/PRODUCT/
  START-HERE still describe the pre-sheet §4 layout; Olaika 50% offer hand-typed into the
  extraction JSON; the My Spot "window" mechanic is not in TRUTH §5; dead `standardMonthly`
  and `FOUNDING_MONTHLY_USD` exports.

### Still open from Sam
- "Tapped In" membership name (chosen, unimplemented). "fifteen months" in TRUTH.md:21 /
  PRODUCT.md:66 (real gap is 6–9 months) — flagged, Sam not asked. Proposed §2 reword to kill
  the "$4.99 then $14.99" misread at the root, e.g. "100 founding seats at $4.99 a month,
  locked · $14.99 a month after they're gone" — needs Sam's yes.

### Later the same afternoon (also on staging)
- **Deck layout:** every slide centres its art-and-copy group in the stage (`.how-stage`
  `justify-content:safe center`); the close/value top-pack overrides are gone. Sam: "same
  layout, ideally centered height wise."
- **Close simplified:** seat sentence, lock line, charge line and "First month" are OFF the
  close (Sam: "too much text… pricing info and disclosure stuff at checkout"). The close foot is
  "Opening Spring 2027" + Back/Reserve. `/reserve` still prints all of it. `.how-seat`,
  `.how-charge`, `.how-locked`, `.close-first` CSS deleted.
- **Card on the close:** no pointer tilt while editable (`TapInCard` skips the handlers when
  `onName` is set — Sam: "interfering with my ability to add my name"); float/drift pause on
  `:focus-within`; password-manager opt-out attributes on the name field.
- **T-shirt:** `TEE_IMAGE` (content.ts) hot-links Sam's public Supabase object; **vercel.json
  `img-src` now names that host** (the only CSP change today). `shell/Tee.tsx` = thumbnail +
  native `<dialog>` close-up, on the /reserve year tile (`.plan-year` wrapper — the tile is a
  button, so the thumb sits beside it) and the pitch's year card. My Spot meter drains by
  `transform: scaleX` (design hook flagged the width transition; fixed, not waived).
- **Seat visual:** `.seat-dots` on /reserve — 100 marks, open ones in `--ink-2`, taken in
  `--hair-lit`, `aria-hidden`; the sentence beneath carries the meaning. §10: no colour, no
  motion, no clock.
- **Evening round (all on staging):** guarantee panel moved into the decision column under
  the checkout inside a sticky group (`.rs-stick`; `display:contents` on phones), with a
  shield-check tile (`.guarantee-tile`); struck prices restacked as a 12px eyebrow ABOVE the
  price on /reserve tiles and pitch cards (`.plan-now` wraps price + period); shirt thumbnail
  has no hover/press motion; seat visual is a single bar (`.seat-bar`, `scaleX`); Tickets tile
  = Olaika hero, Merch tile = the tee (`.reach-tile.is-object`), Line skips still a glyph;
  `GUARANTEE_CONTACT` = sam@tapin.app (TRUTH §3 row updated); vercel.json CSP now names the
  Supabase host under `img-src` AND `connect-src` — the code-confirmation step in PhoneStep
  runs the moment `VITE_SUPABASE_URL`/`ANON_KEY` are set in Vercel (Sam wants every number
  confirmed by code; without keys the step is honestly skipped, never faked). Stripe hosts are
  still NOT in the CSP.
- **Payments (evening):** the wallet checkout (Stripe Express Checkout → `create_simple_intent`)
  is wired and gated only on Vercel env: `VITE_STRIPE_PUBLISHABLE_KEY` + `VITE_STRIPE_ACCOUNT_ID`
  (+ `VITE_STRIPE_FUNCTIONS_REF` if the function lives on a different Supabase project). A
  `pk_test_` key = real Stripe test mode ("Test mode — no money moves" prints). The CSP now
  names js.stripe.com / hooks.stripe.com / api.stripe.com / m.stripe.network / r.stripe.com and
  `*.supabase.co`, and `loadStripe().catch` routes to `onUnavailable`, so a blocked load shows a
  message instead of a gap. **Test path without keys:** `checkoutEnv.testPurchase` — true on a
  dev server, or when the build was made with `--build-env VITE_ALLOW_TEST_PURCHASE=1` (staging
  is deployed that way as of this evening; drop the flag once keys exist) — renders a ghost
  "Make a test reservation" button that mints a `test_…` id; the record carries `test:true` and
  the sheet title, receipt and /in all print it as a test with no seat held. The receipt now
  carries "See your membership" → /in (the post-purchase page).
- Covers tiles: Line skips and Merch are a flat brighter maroon (`color-mix(in oklch, maroon
  84%, white)`), Sam's call over dark and silver gradients. Year tile: shirt back on the side
  at 112px with the Included tag and the glass.

---

## Addendum — later on 14 Sep 2026 (Rob's feedback, two renames, a photo swap)

**Another Claude session worked in this repo at the same time.** It shipped: the sold-out flip
centralised in `content.ts` (`seatNoun`, `reserveCta`, `cardPlan`, `seatCapParts`,
`lockedRateLines`), test reservations in `CheckoutSheet`/`Membership`, the "What you can use it
on" photo grid on `/reserve` (`src/shell/Reach.tsx`, `CoversGrid`/`PlacesRow`), a third plan
("Three ways to join") on the pitch, and a My Spot scene reading "2 min left" → "Saved for later".
**Re-read a file immediately before editing it; do not trust this document's earlier "files
touched" list as the current state.** Everything is still uncommitted and unstaged.

### Rob's Virginia Tech feedback ("too complicated, too much text, screen is busy")

Applied (authored copy and flags only):
- Pitch hero: **"$5 back every week at places you already go."** / lead **"Restaurants and bars
  around Blacksburg. Plus 15% off and points toward rewards."** — Rob: "each of your places" was
  misleading; "2× points" became "earn points towards rewards".
- Benefit label override in `content.ts` (`BENEFIT_LABEL`): **"Points toward rewards"**, detail
  "Double points, redeemable for rewards at each place". The frozen JSON is untouched; this is the
  same override mechanism the two detail strings already used. **Sam should confirm** — it drops
  the "2×" from the label.
- Pitch labels: "What you get", "What you'd save"; notes shortened ("15% off doesn't include
  alcohol.", "Plus places carry all three. Italiano's runs its own offers."). The "What points are
  worth" drill is off behind `SHOW_POINTS_DRILL = false` (Pitch.tsx).
- Deck lines shortened in `How.tsx` (order → "Order in the app, save 15% now" / "And get $5 credit
  toward your next visit."; offers → "Special offers on top of your benefits"; entry line →
  "Everything earns points. 15% off doesn't include alcohol."; points → "Points add up to rewards";
  redeem → "How you get it" / "Show your phone at the counter, or have it sent to the kitchen.").
  The 4→1 transfer plate is off the points slide behind `SHOW_TRANSFER = false` (Scenes.tsx).
- `savings.ts`: condition "If you spend that at these places." disclaimer "An estimate." — shorter,
  but **still body size** (TRUTH §7 forbids the footnote Rob asked for; flagged to Sam).
- Redeem tiles: "Show your phone", "Scan at the counter", "Sent to the kitchen", "Saved for later".

Not done / needs Sam: Rob's "free food and drinks" framing was NOT used — "free drinks" reads as
an alcohol claim in Virginia; "rewards" is used instead. The app preview's tab still says
**My Spot** (it is the real app's name; renaming it would misrepresent the product).

### Renames (Sam, 14 Sep)
- **"Early Bird Special" replaces "founding seat"** everywhere customer-facing: CTA "Get the Early
  Bird Special", seat sentence "100 Early Bird spots at $4.99 · $14.99 after that" (TRUTH §2 updated
  with a dated note), `seatLine` "N of 100 Early Bird spots left", card PLAN "Early Bird", locked-rate
  line, checkout sheet and /in strings via `seatNoun`. Identifiers (`FOUNDING_OPEN`, `seat.founding`)
  keep the old word. Comments still say "founding seat" in places — harmless.
- **"Saved for later" replaces "My Spot"** in the deck and pitch copy (ticket caption, redeem tile,
  slide line). Not in the app preview.

### Photo swap
- `/reserve` "What you can use it on" Food tile: **The Burg's Lomo Saltado** instead of Olaika's
  pizza (Sam's ask). Olaika keeps the Tickets tile.

### Verified after these changes
`tsc` clean, `guards.py` clean; 1440 screenshots of `/`, `/reserve`, and the points/close slides.
- The year plan's t-shirt thumbnail (`.tee-thumb.is-plate`, layout.css) now sits on a **white
  plate** with dark-ink chrome (Sam's ask). The `/reserve` Merch tile in the reach grid is the
  same shirt on a maroon plate and was left as the other session built it — ask Sam if it should
  match.
