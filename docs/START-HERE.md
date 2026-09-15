> **Latest session handoff: [`SESSION-HANDOFF-2026-09-14-late.md`](SESSION-HANDOFF-2026-09-14-late.md)** — the checkout modal, sticky header, seat tile, `/welcome`, and the two review agents' findings. Then [`SESSION-HANDOFF-2026-09-14.md`](SESSION-HANDOFF-2026-09-14.md) — the desktop redesign, the app window, what is uncommitted and the queue. Read it before this file.

# Start here — TapIn Blacksburg, fresh build

> **OUT OF DATE as of 13 Sep 2026.** The build now exists and is live at
> staging.tapin.app/blacksburg. Read **`SESSION-HANDOFF-2026-09-13.md` at the repo root
> first** — it carries the current state, the deploy route, the traps, and the open
> decisions. Everything below is still true about the project's ORIGINS and its rules,
> and the "one page at a time" instruction still governs.

Written 11 Sep 2026. Nothing has been built yet: this project holds **facts, images and docs, and
no code at all**. The inherited modules were deleted the same day, deliberately.

## Read these two, in this order

1. **`docs/TRUTH.md`** — every price, term, consent sentence, benefit, venue, figure and
   prohibition. It is the authority. Its fenced blocks are verbatim strings extracted by running
   the old code, not retyped.
2. **`PRODUCT.md`** — what the product is, who it is for, the four surfaces and the mode of each.

## What this is

TapIn's direct-to-student membership for Blacksburg, sold as a **founding preorder** before the
service opens (expected **Spring 2027**). This project replaces `~/tapin-student-blacksburg`, which
is now **reference only** — Sam: "too many bugs and we've made too many changes… I'd like to start
fresh."

## How to build this: ONE PAGE AT A TIME

Sam, 11 Sep 2026: *"I think instead of trying to create the app in one pass with this new session
I'd rather go page by page."* Build one page, verify it, show it, get his verdict, then start the
next. Do not build the pitch and the checkout together, and do not build a whole flow in one pass —
the day this project was created, every multi-surface pass ended in a redirect, and the previous
project was abandoned because too much had changed at once to untangle.

Suggested order, one page per build:

1. **The shell and the world** — tokens, glass, the animated ground, the three-item nav. Nothing
   else. Show it.
2. **The pitch page** at `/`. Show it.
3. **The checkout** at `/reserve`. Show it.
4. **Sign-in and the receipt** at `/in`. Show it.

Each page gets its own verification: contrast against composited pixels, the flow into and out of
it, and — for the checkout — the disclosure placement rule. Screenshot at phone and desktop every
time.

## Why there is no code here

Sam, 11 Sep 2026: *"we need to start cleaner than what we have currently — I think we start almost
from scratch"*, choosing **"Facts as a document, no code"** over carrying the modules forward.

So the thirteen inherited `.ts` files were deleted. Before deleting them, their exported values
were **extracted by executing them** — not transcribed — into `docs/data/*.json`, and distilled
into `docs/TRUTH.md`. The generated strings (terms, consent sentences, charge rows) are therefore
byte-exact rather than retyped, which is the part that mattered: those are legally load-bearing.

Reference copies of every deleted file remain in `~/tapin-student-blacksburg/src/` and in the three
snapshots under `~/tapin-student-blacksburg-snapshots/`. Nothing was lost.

**Write all code fresh against `docs/TRUTH.md`.** Do not copy the old implementations back in.

## What is here, and is frozen

| What | Where |
|---|---|
| Every fact, and the rules governing them | `docs/TRUTH.md` |
| Money, both plans: rows, terms, consent, guarantee | `docs/data/money-and-terms.json` |
| The savings model, anchor and illustration | `docs/data/savings.json` |
| Six venue records, policies, brand colours | `docs/data/venues.json` |
| Frozen production menus, five venues | `docs/data/menus.json` |
| The seven ways-to-use slides with status tags | `docs/data/ways-to-use.json` |
| Logos and heroes | `public/logos/`, `public/heroes/` |
| Why benefits exclude alcohol | `docs/virginia-alcohol-research.md` |
| Sam's pinned dark mockup | `docs/dark-reference.html` |

**Do not reword a price, term, consent string or the guarantee.** If one needs to change, raise it.

## Decisions that shape the build (all Sam's, 11 Sep 2026)

- **World: Chicago Maroon `#861F41` only.** No orange anywhere, including the TapIn wordmark dot.
  Dark ground, **frosted glass as the system**, one authored **animated dark background**. Text
  never sits on the bare moving ground; it sits on glass. Full palette and contrast rules:
  `TRUTH.md` §9.
- **Primitives come from TapIn**, read from the merchant-facing app in `~/desktop-ui`. Sam has
  rejected three designs for not being TapIn. `docs/dark-reference.html` is his pinned dark
  mockup — take its structure and glass, not its gold, and not its four-item nav.
- **Navigation is three: Home · Places · You.** No badges, no counts, no fourth item.
- **First build: the money path only** — pitch at `/`, checkout at `/reserve`, simulated sign-in,
  receipt at `/in`. **No Supabase, no live texts, no `.env` in this project.**
- **The pitch page is composed from its job**, not inherited: a student decides in seconds whether
  this is worth $4.99. The savings figure is **computed, never hardcoded**, and always printed with
  its basis and labelled an illustration.
- **Benefits are food and non-alcoholic drinks, not "every order."** The savings basis excludes
  alcohol — the two cannot contradict.
- **No seat count.** The invented "63 of 100" is gone for good.

## Two things that cost the old project, already paid for

1. **Disclosures are load-bearing.** On the checkout, the three charge rows, the consent sentence
   and the Reserve button must be **visible together** without opening anything. See `TRUTH.md` §4
   for the statutes and the exact strings.
2. **The view-transition flicker.** In the old app a `view-transition-name` snapshot was the
   **whole scrollable page** (measured 390×1762) painted above the document, so fixed chrome
   underneath was covered for ~5 frames (355–430ms). Naming the chrome and clipping the group both
   failed, measured. Either exclude chrome properly or don't animate page changes.

## Backlog, deliberately not in the first build

- The member app (Home populated, Places, You), desktop layouts, where Cart lives.
- "Order on TapIn" buttons for Coffeeholics and The Burg → `https://tapin.app/coffeeholicsva` and
  `/theburg` (both active in production with loyalty on). Wording: points now, member benefits from
  Spring 2027.
- The food-only pricing engine: per-item alcohol flags, benefits applied line by line, $10
  threshold on non-alcohol spend only. Sam deferred it; only the copy came forward.
- Nothing can take money yet. See the readiness page for the 9 items before a first charge.

## Links

- Readiness: https://claude.ai/code/artifact/f3a6d52d-ec05-402b-bb8c-7a4a756705c7
- Screen map (old project): https://claude.ai/code/artifact/8e3b6e2d-4ce9-48ff-a7b1-5267fc759fda
- Old project: `~/tapin-student-blacksburg` (reference only; mid-conversion, not shippable)
- Restore points: `~/tapin-student-blacksburg-snapshots/`
