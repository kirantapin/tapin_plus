# Session handoff — 14 Sep 2026, late session (checkout modal, review findings)

**Read this first, then `SESSION-HANDOFF-2026-09-14.md` (the desktop redesign that this
builds on), then `docs/START-HERE.md`, then `docs/TRUTH.md`.** TRUTH.md still governs every
price, term and figure; PRODUCT.md still says what the product is. This file is the state of
the repo at the end of the late 14 Sep session and the queue Sam has set. Sam ran out of
credits mid-queue; everything he asked for in this session is built and verified locally,
nothing is committed or deployed.

## Where things stand

- **Nothing is committed.** ~70 files modified/untracked (list at the end of this file).
  Sam has not asked for a commit; do not commit or push unless he does.
- **Staging** (`staging.tapin.app/blacksburg`, Vercel project `tapin-student-blacksburg`) is
  deployment `tapin-student-blacksburg-wy8rs21p1`. Local is well ahead of it: applies-to 3×2
  grid, mobile benefits panel, footer legal links, deck `svh` height, three-row plan tiles with
  the "for everyone else" line, and everything in the next section. Deploy **only when Sam
  says "push to staging"** — procedure below.
- **Another Claude session edits this repo concurrently.** Re-read a file immediately before
  editing it; grep the current string before any exact-match replace. Several asserts failed
  this session because the other session had changed copy.
- Dev server: `npm run dev` on **port 4500** (already running in Sam's terminal usually).
  Typecheck `npx tsc -b --noEmit`; guards `python3 scripts/guards.py` (urgency words, counts,
  stone-as-text, relative terms/privacy links). Both were clean at handoff.

## What this session built (all verified at 375/500px and 1440px)

1. **`/reserve` is a full-page modal that slides up over the page you came from**
   (`src/shell/ReserveLayer.tsx`, wired in `src/App.tsx`). Same `state.background` routing as
   the app window (`AppLayer.tsx`): the four `/reserve` links on the pitch carry
   `state={{ background: location }}`; App renders that location in the main `<Routes>` and
   the layer renders `<Reserve/>` for the real URL. Direct visits and the deck's last slide get
   the pitch beneath. `.sheet-column` **is a `.column`**, so the page inside is unchanged —
   photo band, card, sticky bar, the `.column:has(#checkout)` desktop grid all apply.
   Close = X in the header, Escape (unless the checkout sheet is open), or the app window's
   round trip (`state.fromLayer`, `.is-still` skips the re-entrance). Motion: `sheetUp`
   360ms translateY under a 180ms scrim fade; reduced-motion off. Fixed children (sticky
   bar, `.cs-scrim`) work because the scroller (`.sheet-scroll`) is a separate box from the
   animated surface — see the comment in ReserveLayer.tsx.
2. **Sticky header on the modal** (`.sheet-head`): TapIn wordmark, a "Blacksburg" chip with
   the pitch's pin glyph, the X. Glass (`--glass` + blur) over the scroller. Desktop grid gets
   `padding-top:calc(56px + 32px)` to start under it.
3. **Seat count redesigned as a tile** (`.seat-tile` in `Reserve.tsx`, styles at the end of
   `reserve.css`): under the card, same width; the number lifted to 24px; a meter drawn in
   **tens** (one continuous fill under a repeating mask, so 39 lights 3.9 cells); "CLOSES THE
   END OF OCTOBER" as a caption on the meter's line. Sam's complaint was that the full-width
   bar "looks like a scroll bar". The sentence still comes from `model/seats.ts` `seatLine()`,
   split by regex — do not re-word it here. The counter remains Sam's deliberate §10 exception
   (artificial figure; see `seats.ts` header and the ⚠ about the zero state, which reaches 0
   around 27 Sep at the current rate while "Closes the end of October" stays — **undecided**).
4. **Benefits as four chips** on the modal: `<BenefitCards compact />` → `.bcards.is-chips`
   (label only, alcohol sentence kept beneath). The pitch keeps the rows. Chip selectors are
   long on purpose — they must outrank the desktop `.rs-read .bcard` row rules.
5. **Less bottom space** in the modal: `.sheet-column:has(.sticky-cta){padding-bottom:96px}`
   (bar is 88px; the page's clearance was 120).
6. **Welcome Week invitation URL: `/welcome`** (`src/model/invite.ts`, route in `App.tsx`,
   hero branch in `Pitch.tsx`, `.invite*` styles at the end of `pitch.css`). Renders the pitch
   with a TapIn × Welcome Week lockup and one line: *"You've been invited to early access for
   coming to Welcome Week at Virginia Tech."* Remembered in `sessionStorage` (`tapin.invite`)
   so `/` keeps it after the modal/deck. **Same offer, same price, same spots** — the line must
   never imply otherwise. Logo URL is Sam's Supabase bucket (`membership_images/welcome week
   logo.jpg`, 1080² JPG, black ground with orange script). Whether VT's mark may be shown is
   Sam's to confirm.
7. Earlier in the same session (already in `SESSION-HANDOFF-2026-09-14.md`'s scope but after
   its writing): three-row plan tiles with "$X for everyone else" per tile; applies-to 3×2
   grid; footer legal links (`SiteFoot.tsx`); deck sheet `100svh`.

## Verification rig (what actually works)

- **Desktop:** headless Chrome screenshots are the only way to *see* desktop:
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new
  --window-size=1440,900 --virtual-time-budget=8000 --hide-scrollbars --screenshot=out.png
  http://localhost:4500/reserve`. Chrome's minimum width is ~500, so phone checks at 500×1000
  approximate a phone; for true 375 use the desktop app's browser pane (`preview_start` →
  `resize_window preset mobile`, then `javascript_tool` for boxes/computed styles).
- **DEV seams:** `/how?slide=<id>` opens the deck paused on a slide; `/reserve?seats=<n>`
  forces the counter.
- After CSS edits, Vite HMR needs ~1.5s before a headless shot reflects it.

## Standing constraints (Sam's, still in force)

- No urgency theatre, no alcohol-discount claims (TRUTH §10). Credit **can** be spent on
  alcohol; only the 15% skips it — that sentence stays on pitch and checkout.
- No unsourced numbers. Frozen JSON strings are overridden in `content.ts`, never edited.
  Prices flow from `FOUNDING_MONTHLY = 6.99` and `PASS_TODAY = 16.99` (year = 4 × pass).
- "Early Bird Special" / "Early Bird spots" (not "founding seat"); "Saved for later" in pitch
  and deck (app tab keeps "My Spot"); CTA "Get early access".
- Never upload `.env*`; never enter phone numbers or complete SMS OTP; never run git write
  commands in `~/desktop-ui`; deploy only on "push to staging".

## Sam's open decisions (do not act without his word)

1. **Charge-timing sentence in the checkout sheet** (`content.ts` `depositise()`): rows +
   consent + term 3 + receipt read as a hold fee *plus* a first charge of the same amount.
   Needs one true sentence used in all four places. Sam knows what is true; we do not.
2. **Wallet-only payment** (`SimplePayButton.tsx`: Apple/Google Pay `always`, no card form).
   Android without Google Pay and laptop visitors dead-end. Fix: Stripe Payment Element under
   the wallet button.
3. **"Later members pay $96.00 more a year"** vs the year tile's "Save $72.00 a year", and the
   per-tile "Save $X" lines on three different bases. Both review agents independently said:
   drop both, keep only "$X for everyone else" per tile (and consider "$5.66 a month" under
   pass and year).
4. **Refund line placement:** "Full refund any time before we open" appears only inside the
   sheet. One line under the plan tiles (and possibly under the hero price) was recommended.
5. **First screen says what TapIn is:** the strip + venue photos reads as a new bar. Put the
   word "membership" near the top. "$5 back" reads as cashback; the deck shows credit toward
   the next order.
6. **Phone step title** "Sign in to hold it" reads as account creation; no step count; button
   "Continue" doesn't say payment is next.
7. Points 1× vs 2× (multiplier is out of the copy; 1× is a two-constant change lowering the
   estimate to ~$68.75). Merch tile white vs maroon. Pass/year figures were my proportional
   read of $6.99 — accepted implicitly, never confirmed.
8. Deck "scroll on phone" complaint: 63 checks clean locally, switched to `svh`; awaiting
   Sam's device/URL.
9. Zero-state of the seat counter (item 3 above).
10. `/in` shows "this build has no accounts yet" to a paying member on another device — needs
    service wording.

## Review agents' findings (14 Sep, both read-only; originals were in session temp files)

**Five student personas** (freshman, DoorDash junior, drinks-first, skeptic, zero-context bus
rider): all got price and $5 credit; none could say what TapIn *is* from the first screen; the
skeptic left over disagreeing numbers ($76.25 vs $61.25 month one; Save $72 vs pay $96 more;
"39 of 100" on `/reserve` but only "100 spots" on `/`); two would buy if the guarantee sat under
the price; the deck's "2 min left" timer slide reads as a flash-sale gimmick to the skeptic; the
deck should open on the receipt slide (slide 3), the clearest thing in the funnel.

**Funnel best-practice audit** (sources: NN/g, Baymard, Stripe, Stanford credibility, Luguri &
Strahilevitz, Atlas & Bartels): ranked weak points are items 1–6 above, plus: sticky CTA should
open the checkout sheet directly rather than scroll (one A/B, +5.2%); pitch plan cards should
carry `state:{plan}` so `/reserve` doesn't re-ask; a "TapIn already runs ordering at The Burg
and Coffeeholics — see it live" line would add verifiable trust; set `tag:"Example"` on the
My Spot timer slide. What the funnel already does well: dollar-per-week framing, honest
anchoring in plain words, one CTA at a time, the sheet's disclosure order, the phone step's
field hygiene, time-unbounded refund, real venues and legal links, escapable deck.

## Gotchas learned this session (CSS and routing)

- **Specificity:** `:has()`/`:not()` take their argument's weight; `:where()` is 0; media
  queries add none; `.column:has(#checkout)` is id-level (1,·,·) and beats any class chain —
  match it or lose. Later same-specificity wins, and `reserve.css` loads after `pitch.css`.
- **Sized grid/flex + `min-height:0` item = zero height.** In a sized container with
  overflowing content, an auto track's base size is its items' minimum contribution; a
  `min-height:0` item contributes zero. This collapsed the photo band once.
- `display:contents` wrappers (`.rs-split`, `.rs-read`, `.rs-decide`, `.rs-stick`) mean the
  panels are grid/flex items of whatever contains them; `> *` selectors miss them.
- `position:fixed` inside a transformed ancestor is positioned to that ancestor; if the
  ancestor is also the scroller it scrolls away. Keep the scroller a separate box.
- `document.querySelector('.sticky-cta')` on `/reserve` returns the **pitch's** bar (it is
  earlier in the DOM beneath the modal). Scope to `.reserve-sheet`.
- `.hero-band.is-compact > :not(.mosaic)` sets `margin:150px 0 0 calc(...)` at ≥1024 — a
  computed left margin that shoved anything on the band 264px left. Override the whole
  `margin` shorthand, not `margin-top`.
- Edge case left as is: modal → "See inside the app" → close both → the pitch is back at the
  top, not where the reader was (the pitch unmounts while the app window is over `/reserve`).

## Deploy procedure (only on "push to staging")

    SNAP=$(mktemp -d)/blacksburg
    rsync -a --exclude '.env*' --exclude node_modules --exclude dist --exclude .vercel \
      ~/tapin-blacksburg/ "$SNAP/"
    npx vercel link --cwd "$SNAP" --yes --project tapin-student-blacksburg --scope sam-tapinapps-projects
    rm -f "$SNAP/.env.local"
    npx vercel deploy --cwd "$SNAP" --prod --yes --build-env VITE_BASE_PATH=/blacksburg/

Then verify from the live URL by string checks (prices, "Early Bird", the seat sentence) and
one headless screenshot. Record the deployment id here and in memory.

## Files touched this session (beyond the earlier handoff)

New: `src/shell/ReserveLayer.tsx`, `src/model/invite.ts`, `src/shell/SiteFoot.tsx`,
`src/shell/AppLayer.tsx`, `src/shell/useMedia.ts`.
Modified: `src/App.tsx` (routes `/welcome`, modal routing, `inert`), `src/routes/Reserve.tsx`,
`src/routes/Pitch.tsx`, `src/shell/BenefitCards.tsx` (`compact`), `src/shell/AppLayer.tsx`
(close hands the nested `background` back), `src/styles/reserve.css` (modal block at the
end), `src/styles/pitch.css` (`.invite*` at the end), `src/styles/layout.css` (`.site-foot`),
`docs/TRUTH.md`, `PRODUCT.md`, `scripts/guards.py`, memory notes under
`~/.claude/projects/-Users-samuelwhite-desktop-ui/memory/`.

## git status at handoff

```
 M .claude/launch.json
 M .gitignore
 M PRODUCT.md
 M docs/START-HERE.md
 M docs/TRUTH.md
 M docs/data/money-and-terms.json
 M docs/data/venues.json
 M docs/virginia-alcohol-research.md
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
 M src/shell/TapInCard.tsx
 M src/shell/TapInLogo.tsx
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
?? docs/SESSION-HANDOFF-2026-09-14-late.md
?? docs/SESSION-HANDOFF-2026-09-14.md
?? src/asset.ts
?? src/model/invite.ts
?? src/model/nameStore.ts
?? src/model/seats.ts
?? src/routes/Membership.tsx
?? src/routes/SavingsLab.tsx
?? src/shell/AppLayer.tsx
?? src/shell/BenefitCards.tsx
?? src/shell/CheckoutSheet.tsx
?? src/shell/PhoneStep.tsx
?? src/shell/Reach.tsx
?? src/shell/ReserveLayer.tsx
?? src/shell/SeatCapLine.tsx
?? src/shell/SiteFoot.tsx
?? src/shell/Tee.tsx
?? src/shell/VenueTicker.tsx
?? src/shell/authEnv.ts
?? src/shell/checkoutEnv.ts
?? src/shell/useMedia.ts
?? src/styles/savings-lab.css
?? src/vite-env.d.ts
```

---

## Addendum — 14 Sep 2026, night (the merged tree, pushed)

Both 14 Sep sessions' work now lives in one tree and is **on staging** (`npx vercel deploy --prod
--yes --build-env VITE_BASE_PATH=/blacksburg/ --build-env VITE_ALLOW_TEST_PURCHASE=1` — the second
flag enables the no-provider "Make a test reservation" path; drop it once Stripe keys exist).
Still nothing committed. `tsc` and `guards.py` clean.

### The app preview as the merchant's page (Sam: "a modified version of the real merchant pages")
- `src/routes/app/AppPlace.tsx` rebuilt on the storefront's anatomy, read from the live
  tapin.app/coffeeholicsva page and V3.1's `restaurant.tsx`: 208px full-bleed hero, 96px round
  mark overlapping by 24px with a 2px white ring, "● OPEN" pill (only when `venue.open`), the page
  in the merchant's `brandColor` with cards at brand+white 14%, name + **TapIn Plus** chip + pin
  line, the storefront's chips as real anchors (Menu / My Spot / Offers / the live address),
  "Your membership here" highlight slider (the three benefits + the venue's offer on the venue's
  own photos), **My Spot** (Credit · Points · Tickets — the Tickets cell carries the events line),
  the demo ticket, then **Order**: category chips (anchors), uppercase section heads, one brand
  card per dish with a 76px lifted photo and a round + that builds the ticket.
- `src/routes/app/brandTheme.ts`: WCAG luminance decides `data-mode="brand"` (white type on the
  brand) vs `"light"` (Sweetopia's pink cannot carry white → the app's light ramp with the brand
  as accent — the storefront's own fallback). The brand theme REMAPS `--ink-*`, `--card`,
  `--hair*` locally on `.pl-page[data-mode="brand"]` so every existing component renders on the
  brand; never set a custom property to `initial` (it is the guaranteed-invalid value and every
  `var()` reading it goes to nothing — that blanked Sweetopia's cards once).
- CSS: the old identity block in `app.css` is gone; the storefront block is at the end of the file.

### Also this round
- **"TapIn Plus"** is the tier's name in copy and on flags: `.plus` chips read "TapIn Plus"; the
  pitch's venue cards wear a "TapIn Plus" corner flag again (Italiano's keeps "Offers only").
- **Events**: `content.ts` `eventsNote` ("Member prices on events TapIn Plus places host on
  TapIn.") — printed on the venue page's My Spot and the app Home note. Low emphasis, by design.
- **Deck**: the saved-for-later slide is now a Burg order (Empanada + Flautas, food only — the
  15% skips alcohol), tagged "Example" (audit); the offers slide shows both offers (Italiano's
  10% is Sam-confirmed now, 14 Sep).
- **Audit items implemented at Sam's word**: no "Save $X" tile lines and no "Later members pay $96"
  line — one statement per tile ("$X for everyone else"); the refund term under the plan tiles;
  the hero leads with "One membership. $5 credit every week…" and carries a verifiable proof line
  linking the two live pages; pitch plan cards are links carrying `state.plan`, and /reserve
  preselects it; phone step title "Your details" and button "Continue to payment"; /in's
  "this build has no accounts yet" replaced with service wording.
- **Audit items NOT done (need Sam)**: the charge-timing sentence (hold fee vs first charge —
  only Sam knows which is true); a card Payment Element under the wallet button (needs Stripe
  keys to build honestly); 1× vs 2× points; the seat counter's zero state; opening the deck on
  the receipt slide.

### 15 Sep 2026, morning — the money facts, from Sam, and the modal's header
- **Charge timing, settled** (Sam, verbatim): "the $6.99 today holds the seat and is also the first
  month, it stays at $6.99 for an entire year." `content.ts` `depositise(…, period)` now says that
  one way in the rows, consent, terms and the sheet's receipt; every "locked for good" became
  "locked for your first year" (`lockedRateLines.founding`, the three `rate` terms). TRUTH §2 has
  the dated note.
- **Seats**: 100 (the extraction's cap), counter opens at **45** on 15 Sep and falls 3/day to 0 on
  30 Sep; `foundingCloses` = "the end of September". (A 30/25/end-of-October version lived for an
  hour the night before — reverted at Sam's word.)
- **/reserve modal**: header is the word "Checkout" + X; the wordmark and the Blacksburg pin chip
  moved to the footer (`<SiteFoot brand />`, `.foot-brand`). Chips grid has equal rows
  (`grid-auto-rows:1fr`, 56px), the block's head is sentence-case 17px.
- Still open for Sam: card Payment Element (needs keys); 1× vs 2× points.
- **15 Sep, later:** the Plus mark is `shell/PlusFlag.tsx` — the TapIn icon (public/tapin_icon.svg)
  + "PLUS" — on the pitch's venue cards (`.vflag`) and the venue page's chip (`.plus`); the prose
  still says "TapIn Plus places". Monthly `rate` term had a duplicated clause after the one-year
  rewrite — fixed. **Modal motion** (`ReserveLayer.tsx` + reserve.css): entrance 420ms rise on the
  house curve under the scrim fade; exit is a real animation now — `is-closing` → `sheetDown`
  260ms ease-in + scrim fade-out, route change after 280ms (reduced motion: immediate). **Header**:
  no backdrop-filter any more — WebKit did not paint the glass layer inside the animated sheet
  until a scroll (Sam: "the sticky header wouldn't show until I scroll"); it is a 94% page fill.

### 15 Sep 2026, evening — one benefit per order, and the arrival
- **One of the two** (Sam, verbatim): "you'd only be able to use one of the two benefits ($5 credit
  on $10 spend or the 15% off), but you can earn points on everything. We don't need to specify
  this on the landing page, just slight adjustments to the animation carousel." Done in
  `model/order.ts` `quote()` (`using`, `altCents`; whichever is worth more, credit only on $10+;
  no credit is earned/banked on a ticket any more), the deck (`Scenes.tsx`: slide 3 keeps the 15%
  and names the credit as the alternative; slide 4's Burg ticket is bought WITH the credit —
  $12.13 → $7.13 — "used instead of 15%"; entry docks read "15% or $5 credit" + "2× points";
  `How.tsx` lines rewritten), and the venue page (`AppPlace.tsx`: the applied benefit is a row
  above "You pay", the other is a sentence under it — `.place-alt` — and "And you earn" holds
  only points; empty ticket and the My Spot credit cell state the rule as a choice). TRUTH §5
  has the dated note. **Not touched, per Sam:** the landing page and `illustrate()` — its
  $76.25/month still sums 15% + credit + points, which over-counts under this rule. Sam's call.
  `AppSpot`'s "Paid" still strikes 15% — a saved order bought with either is legitimate.
- **The arrival** (Sam: "a page load animation on refresh or first load … with the tapin logo,
  and the blacksburg name with the location icon"): `shell/Arrival.tsx` + `styles/arrival.css`
  (imported last in main.tsx). Mounted from `App.tsx` once, from the path the browser LOADED on —
  `/` and `/welcome` only, every full load, never on a route change. Choreography (1.25s then a
  460ms lift): T mark → the dot drops with one overshoot → t·a·p·I·n in order → the pin drops onto
  "Blacksburg" as the name rises → one ring from the pin's foot → veil lifts. Any tap or key
  skips it; reduced motion mounts nothing; hidden from the accessibility tree; the page renders
  underneath from frame one so nothing shifts. DEV seam `/?hold` keeps the veil up for inspection.
- **Merchant page REVERTED** (Sam, 15 Sep, later: "the individual merchant page previews look
  really rough — we'll need to revert changes you made there"). `routes/app/AppPlace.tsx` and
  `styles/app.css` are back to the page as it stood before the 14 Sep storefront pass (identity
  block: hero shot + collar mark, name + Plus chip, points line, live-page link; the ticket; the
  menu as one list). Recovered from the session's persisted tool output, not from git — nothing
  was committed. `routes/app/brandTheme.ts` deleted. Carried onto the restored page: the
  `PlusFlag` chip (icon + PLUS), "TapIn Plus" wording, and the one-benefit ticket (row above
  "You pay" names the applied benefit, `.place-alt` sentence names the other, "And you earn"
  is points only; the identity block no longer prints a credit balance). The storefront files
  are parked in `docs/attic/storefront-2026-09-14/` with a README. Staging redeployed.
- **Entry price → $9.99** (Sam, 15 Sep, late: "the entry price would be $9.99 instead of $6.99").
  `FOUNDING_MONTHLY` in content.ts and `FOUNDING_MONTHLY_USD` in savings.ts; /in recognises 999
  cents as founding. Pass ($16.99) and year ($67.96) untouched — not mentioned; the pass now works
  out at $5.66 a month against $9.99 monthly, flagged in TRUTH §2. PRODUCT.md updated.
- **Ladder → $9.99 / $22.99 / $79.99** (Sam, 15 Sep, late: "adjust the 3 month and 1 year pricing to
  match the one month but with discount … or something like that, you can decide"). Taken as
  given: `PASS_TODAY = 22.99`, `YEAR_TODAY = 79.99` (a constant now, not 4 × pass). Standard
  ladder untouched: $14.99 / $34.99 / $139.96. /in recognises 2299 and 7999 cents. TRUTH §2 rows
  carry the dated notes.
- **PLUS icon was broken on staging**: `vercel.json`'s SPA rewrite did not exempt `.svg`, so the
  icon URL returned index.html. Fixed the rewrite, and the flag now uses the PNG Sam supplied
  (`public/tapin_icon_white.png`, 96px, from the Supabase `membership_images` bucket).
- **Arrival**: the ring under the pin is gone (Sam: "looks a bit tacky"). **Checkout**: `PlacesRow`
  is back under the benefits as "Where it works" (Sam, 15 Sep: "we should still show where this
  works so that people understand"); the covers grid stays out.
- **Mockups**: merchant page, item sheet (modifier pop-up), card states, desktop dialog + page, My
  Spot and Points (dummy items, weekly credit per place, 4:1 conversion) and a page-by-page board —
  published as an artifact for Sam; source in the session scratchpad `merchant-mockups.html`.
- **Scope sentence** (Sam, 15 Sep): "Only the 15% off skips alcohol. Credit can be used on anything." — the "alcohol included" tail is gone on the pitch and the checkout.
- **Ladder made coherent** (Sam: "make sure it actually makes sense, mine was just a reference
  point"): founding $9.99 / $24.99 / $79.99, standard $14.99 / $37.99 / $119.99 — one shape (3
  months = 2½, a year = 8, Early Bird a third off each rung). `AFTER_PASS`, `AFTER_YEAR`,
  `PASS_TODAY` in content.ts; the locked-rate line under the picker now states the chosen plan's
  own figure (`lockedRateFor`). The checkout's button and sticky CTA read **Checkout** (Sam).
- **Checkout, redesigned at Sam's word (15 Sep, late)**: the left column is one container — "Where
  it works" with the places carousel (`VenueTicker rail`, never the grid) and the benefits as a
  bold-figure sentence beneath (labels from `benefits`), then the scope line. On desktop /reserve
  is a centred pop-up (`popIn`/`popOut`, 240/180ms, scrim .78), not a sheet; the phone keeps the
  sheet. The seat tile is a strip: one line, the meter as its bottom edge. The pitch's desktop
  benefit cards share one figure size and hang from the tile.
- **Merchant page, built from the approved mockups (15 Sep, late)**: `model/options.ts` (order
  lines = dish + picks + qty + note; EXAMPLE option groups on the espresso section only, labelled
  as examples in the sheet — the extraction carries no modifiers), `routes/app/ItemSheet.tsx`
  (bottom sheet on a phone, centred dialog with the photo as its left panel from 1024px; portalled
  to <body>, carries the light ramp via `data-surface="app"` — tokens.css selector widened),
  `AppPlace.tsx` (lines replace picked ids; a row opens the sheet, shows a count and the picks
  when in the order; ticket lines carry qty + picks + Edit; sticky category chips with a
  scroll-spy; DEV seam `?sheet=<dish name>` opens a sheet on load). Styles at the end of app.css.
  Verified: add with Oat + Extra shot → $5.00 line, row shows "Oat · Extra shot", Edit reopens
  with picks checked, Remove present. My Spot and Points (mockup section 4) NOT built yet.
- **My Spot and Points, built from the mockups (15 Sep, late)**: `model/preview.ts` gains
  `weeklyCredit` (a state per place: available / used <day>) and `creditPlacesLeft`; My Spot shows
  the two figures, saved orders with dish photos (priced by quote(), so the credit prices a $10+
  basket), this week's credit per place, and an honest empty Tickets state; Points leads with the
  TapIn balance and a working Convert (4:1) with Undo on the demo figures, per place. Home's tally
  reads "credit this week · N places" instead of "credit waiting" (the old balance idea).
- **Checkout, again (Sam, 15 Sep, late)**: the seat strip sits ABOVE the card; "What you get" is
  four bullets with their glyphs (labels + details from `benefits`, plus Special offers) and the
  six applies-to marks (`AppliesTo`) — no "one per order" wording here, at Sam's word ("we just
  say $5 credit plus 15% off"). **Preview banner** is maroon with white text like the pitch's
  announce bar. **/in** has a "Bring a friend" panel (`ReferPanel` in Membership.tsx): a link of
  her own (`?ref=<code>`), Copy, Share (Web Share API, clipboard fallback), a 0-of-3 tracker.
  THE AMOUNTS ($5 each way, $10 at three) ARE A SKETCH from Sam's "if you share with X friends
  you receive X credit" — the panel says they may change; nothing records a referral. DEV seam
  `/in?demo` renders a sample test reservation.
- **Full-site pass, 15 Sep (end of night)**: every route captured on staging at 500px and 1440px
  (pitch, deck, checkout, /in, app home / deals / my spot / points, Coffeeholics, Italiano's,
  Sweetopia) after the batch above. No layout faults found; the test-reservation flow was run
  end to end on the local build (checkout → details → test reservation → /in with the referral
  panel and the name on the card). Served bundle at the end: `index-BWbwvw9K.js`.
- **PLUS badge is gold** (Sam, 15 Sep, late): `--gold-1/--gold-2/--on-gold` in tokens.css; `.plus`
  and `.vflag` are a gilt plate (gradient, top-edge light, maroon ink); the mark is inlined
  (`shell/TapInIcon.tsx`, currentColor) so it takes the ink; one sheen crosses the pitch's flag on
  hover. The white PNG stays in public/ but nothing reads it now. TRUTH §9 has the dated exception.
- **Pitch**: the "Three ways to join" panel is gone (Sam, 15 Sep, late: "save it for the checkout
  page"); the hero still states the entry price and the seat line. `scripts/guards.py` gains a
  file-scoped exemption for the two gold tokens in tokens.css (same shape as the seats one).
- **The credit, corrected (Sam, 15 Sep, late)**: earned INTO the account at full price on a $10+
  order, never taken off that order; it does not expire. `quote(venue, items, mode)` with
  `creditEarnedCents`; the venue page's ticket has a two-way switch once the basket clears $10
  ("15% off now" / "$5 credit for later") with the rows and the sentence per mode; the deck's My
  Spot slide pays full price, shows "+$5.00 credit added to your account", and the window is 30
  seconds (0:28 → 0:00); the order slide names the alternative as "added to your account on $10+,
  at full price"; the app tallies read "credit in your account" (`totalCredit`) again and My Spot's
  week list says Earned <day> / Spend $10+ to earn it. TRUTH §5 note rewritten.
- **15 Sep, late — four at once (Sam)**: (1) the PLUS badge's gold is REVERTED ("tacky … the effect
  looks weird"): maroon plate, white ink, no sheen; TapInIcon stays inlined; gold tokens and the
  guard exemption removed; TRUTH §9 note says tried-and-reverted. (2) Points are 1× —
  `POINTS_PER_DOLLAR = BENEFIT.pointsPerDollar` (10/$); venue policy labels "2× points" overridden
  to "Points" in content.ts; every "2×" string gone. (3) 50 Early Bird seats at $6.99 (35 shown
  left; `SEAT_CAP = 50` in seats.ts, JSON's 100 superseded), then $9.99; ladder $6.99 / $17.99 /
  $54.99 over $9.99 / $24.99 / $79.99 (same shape). (4) **The social passport** on the pitch —
  `shell/Passport.tsx`, right after the hero: title, perforated rule, five stamps (food, drink,
  line skip, cover, event tickets) that land when scrolled into view, and the members-only nights
  plate in maroon with the record's Coming tag; the applies-to row left the benefits panel (it is
  the passport now). `Panel` gained `innerRef`.
- **Pitch passport panel REVERTED** (Sam, 15 Sep, late: "I don't want to pitch the whole idea of
  the social passport. I just want the app preview to feel like a social passport … Revert your
  changes to the pitch side of things and the checkout flow"). `shell/Passport.tsx` and its CSS are
  gone; the applies-to row is back under the pitch's benefit cards. The checkout was not touched
  by that batch. The 50-seat / $6.99 ladder, 1× points and the gold revert stand.
- **The app preview as a social passport**: `model/tonight.ts` (EXAMPLE listings, tagged: The
  Milk Parlor live music with cover + line skip, Olaika tickets, TapIn members-only night as
  Coming), `routes/app/Tonight.tsx` on Home, "Tonight here" door items on the venue pages that
  open the sheet (door variant: no note field, "shown at the door") and land on the ticket beside
  the food — priced outside quote() (the 15%/credit are food and drink), earning points — and a
  how-you-use-it chip on every ticket line (Show at the door / To the kitchen · we ping you /
  Saves to My Spot at a closed place). My Spot gains "Tonight's passes" with a drawn code plate.
- **Layout pass across the app (Sam, 15 Sep, late: "keep going through each of these pages …
  figure out the best layout")**: Home on a phone now reads object → figures → Tonight → Always on
  → places (flex `order` under 1024; the desktop hero row is unchanged and Tonight runs full width
  under it); rows for places with a listing wear a small "Tonight" tag. My Spot is passes → waiting
  → this week's credit, and on desktop a named grid (figures across the top, passes and waiting
  down the left, credit on the right). Deals' offers are photo cards in the Tonight card's shape.
  Points unchanged.
- **15 Sep, last batch (Sam)**: (1) **/reserve is a compact conversion modal** — a 640px dialog on
  desktop, a not-full-height sheet on a phone (`ReserveLayer` + reserve.css "THE COMPACT
  CHECKOUT"): the card, one seat line ("35 of 50 … · closes the end of September"), the three
  plans, the locked-rate and refund lines, Checkout → CheckoutSheet (§4 unchanged), a five-line
  checklist of what you get, the guarantee. Gone from it: the photo band, the places carousel, the
  applies-to marks, the deck/app links, the footer — they are on the pitch beneath. Research
  (Mobbin): Notion, Todoist, Quizlet, Talabat sheets; Flodesk, Mural web dialogs — all the same
  shape. The Panel id is `plans` now, so the old `:has(#checkout)` desktop grid rules are inert.
  Title reads "Get early access". (2) **Preview header**: a PREVIEW chip + "The app opens Spring
  2027" at 14px, 56px tall, no dot. (3) **My Spot**: "Right now" (a cappuccino at the kitchen with a
  three-step progress and the ping/hand-over line), three passes (cover, line skip ×2, ticket),
  waiting orders, this week's credit; desktop named grid updated. (4) **Deck "How you get it"**:
  the QR sat 48px off because reserve.css redefined the global `popIn` keyframes for the desktop
  pop-up — renamed `rsPopIn/rsPopOut`, and the QR has its own `rdPop`.
- **Refund card back in the modal** (Sam: "i liked the original refund card"): the `.closing` panel with the shield tile replaces the plain guarantee sentence at the foot of the compact checkout.
- **Standard ladder** (Sam, 15 Sep, later still): $14.99 a month, $33.99 for 3 months (25% off, at the .99), $107.99 a year (40% off). `AFTER_MONTHLY/AFTER_PASS/AFTER_YEAR`. Early Bird $6.99 / $17.99 / $54.99 unchanged.
- **Ticker rail** allows vertical panning again (`touch-action:pan-x pan-y pinch-zoom`) — a swipe down that started on a tile could not scroll the page (Sam).
- **Pitch**: a "How it works" ghost button under the savings panel's drill (Sam).
- **Credit detail** now ends "Spends like cash, on anything" (Sam) — `BENEFIT_DETAIL.credit`, so the pitch card, the checkout checklist and Deals all carry it.
- **Checkout modal on desktop is two columns** (Sam: "more of a horizontal layout"): argument left (card, count, checklist, guarantee), decision right (plans + Checkout); dialog 1000px.
- **Checkout modal polish (desktop)**: the plans panel stretches to the row as a flex column with the button at its foot, so both columns end on one line; the left column's rhythm tightened (count close under the card, checklist at 15px).
- **Checkout modal surface** is `--subtle` (one rung above the page) with a lighter scrim (.64 desktop / .6 phone) — Sam: the pop-up's background was too dark to read the content on.
- **Referral = the shirt at 10 friends** (Sam): `REFER = { goal: 10 }` in Membership.tsx; lede + TeeThumb, 0-of-10 tracker, share text without amounts. TRUTH §11 note replaced.
- **Checkout modal lighter again** (Sam): the surface ramp is remapped one rung up inside `.reserve-sheet` (ground #2A0F1C, panel #341425, card #3E1A2E), so panels and plan cards keep their steps.
- **Docked Checkout in the phone sheet** (`.rs-dock`, sticky to the sheet's foot, hidden while the real button is 60% in view; scrolls the pay slot into view, never charges). Desktop: none.
- **Checkout modal**: the benefits are a "What you get" panel with the home page's glyph tiles (BenefitIcon / NavIcon deals), the card is capped at 380px and centred over its count on desktop (Sam).
- **Seat count is a card above the membership card** in the modal, with the original ten-cell meter (`.rs-seat-card`, `.rs-meter`), Sam's ask.
- **Pitch hero**: a PLUS chip beside the wordmark (`.hero-brand` + `.plus.hero-plus`), Sam's ask.
- **Seat card**: one continuous bar and the close date as a caption beneath it (Sam).
- **Docked Checkout**: `bottom:0` (a negative offset had clipped its lower half on a phone), no negative bottom margin.
- **App screens open at the top**: `useLayoutEffect` on pathname in AppShell scrolls the window and `.app-scroll` to 0 (Sam: venue pages opened mid-scroll).
- **App ground is one flat colour** (`--page`): the body gradient and the `.ground` glow are off the light surface (Sam: venue pages were not uniform).
