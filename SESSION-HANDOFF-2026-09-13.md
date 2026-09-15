# Session handoff — 13 September 2026

For the next Claude Code session on `~/tapin-blacksburg`. Written because the
previous session ran out of usage mid-flight, not because the work stopped at a
natural point.

`docs/START-HERE.md` still describes a project with **no code in it**. That is
now out of date — the build exists and is live. Read this file first, then
`docs/TRUTH.md` (authority on every figure), then `PRODUCT.md`.

---

## 0. The five things that will waste your session if you don't know them

1. **Never run a git write command.** Sam's standing instruction. Read-only git
   only: `status`, `diff`, `log`. The working tree is intentionally dirty — 22
   modified files, 6 untracked — and committing is his call.
2. **`~/desktop-ui/src` is READ-ONLY.** It is the real V3.1 storefront and the
   source of truth for design language. Read it freely; never write to it.
3. **Media queries add no specificity, and CSS file order decides.**
   `main.tsx` imports `tokens → base → layout → pitch → how → reserve → card →
   app`. A desktop rule written in `layout.css` for a selector that also exists
   in a later file **loses silently**. This cost two passes. Put a surface's
   desktop rules in that surface's own file.
4. **Verify widths and states by MEASURING, not by looking.** Two bugs shipped
   past visual review this session and were only caught by
   `getBoundingClientRect()` / `getComputedStyle()` in the browser. Screenshots
   lie about 120px.
5. **Deploy is Vercel CLI, not git.** From the repo root:
   ```
   npx vercel deploy --prod --yes --build-env VITE_BASE_PATH=/blacksburg/
   ```
   Live at **staging.tapin.app/blacksburg** (project `tapin-student-blacksburg`,
   `prj_ANP7yxyBhgWrFC92m3T6WnKZH1Ij`). `.vercelignore` excludes `.env*` — there
   IS a `.env.local` in this folder and it must never upload. Rollback = promote
   a previous Ready deployment.

---

## 1. State of the build

Everything below is **live on staging**. Nothing is committed.

| Surface | State |
|---|---|
| `/` pitch | Hero rebuilt on conversion evidence; benefit cards; venue ticker; savings panel simplified |
| `/reserve` | Two-column desktop with a sticky decision column; §4 co-visibility 33% → 67% |
| `/how` | Bounded deck at desktop (600 × min(760px, 100dvh − 64px)) |
| `/app/*` | **Light surface**; full-bleed preview banner; 248px left rail at desktop; all five screens have their own desktop layout |

Verification gates, all currently green:
```
npx tsc -b
python3 scripts/guards.py
node ~/.claude/skills/impeccable/scripts/detect.mjs --json <files>
npm run build
```

Dev server: use the **preview tool**, never Bash. `.claude/launch.json` in
`~/desktop-ui` has an entry `blacksburg-new` → this repo on port 4500.

---

## 2. Traps discovered this session

Each of these looked like it was working.

- **`display:contents` wrappers must become `display:block` at the breakpoint.**
  Left as `contents`, the wrapper generates no box, its child becomes the grid
  item, and a sticky child's containing block collapses to one row. Symptom:
  sticky travel 60px instead of 353.
- **`align-items:start` on a grid collapses a stretch wrapper to content
  height** → sticky travel **zero**, and the §4 block scrolls away exactly at
  the foot of the page. Needs `align-self:stretch` on that one item.
- **Never key an auto-scroller's pause on the `scroll` event.** It cannot
  distinguish the reader's scroll from the component's own, so each advance
  re-arms the hold and the ticker suppresses itself permanently after one step.
  Key it on input (pointer / touch / wheel / key / focus).
- **A `border` + `border-radius` + an absolutely-positioned child at `inset:0`
  produces a visible double edge** — the child clips to the padding box, a step
  inside the border box. Use an inset shadow, or no edge.
- **`--ink-1` is NOT white on the app surface.** It is `#1B1014`. Anything
  painted on a maroon fill must use `--on-maroon`, which is declared once and
  never themed. This shipped as a live 2.13:1 contrast bug on the Reserve button.
- **`1fr` grid tracks keep a min-content minimum.** The hero mosaic ran 617px of
  photographs inside a 510px band. Use `minmax(0,1fr)`.

---

## 3. A factual error to resolve — not mine to fix

`docs/TRUTH.md:21`, `PRODUCT.md:66`, `src/routes/Pitch.tsx:30` and
`src/shell/SimplePayButton.tsx:37` all say the preorder is taken **"fifteen
months ahead of delivery."**

It is **six to nine**. 13 Sep 2026 → "Spring 2027" computes to 5.6 months to
early spring, 9.3 to late. The previous session repeated the figure without
checking it, including in the brief handed to the research agents.

It does not change §4's requirement (a negative-option offer needs the same
disclosure either way), but TRUTH.md is the authority on figures and **Sam has
not yet said whether to correct it or whether the launch window moved.** Ask
before editing those four files.

---

## 4. Open decisions — Sam's, not yours

1. **Authorize now, capture at launch.** Neither Apple nor Kickstarter takes
   money at commitment. This changes the headline, the price block and the
   guarantee together, so settle it before building more of the pitch.
2. **Cut the savings calculator, or keep it.** The evidence says cut (see §5).
3. **"Tapped In"** — chosen as the membership name, unimplemented. Touches the
   PLUS chip, `plusVenues`, the "Plus places" copy and §6's badge rule. Needs the
   chip decision too: "TAPPED IN" is ~85px at 11px tracked, so the badge becomes
   the TapIn mark or "TAPPED".
4. **The 4:1 points ratio** — publish or keep withheld.
5. **The auto-scrolling ticker** — Sam asked for it; the evidence is against it.

---

## 5. Research: read it before redesigning the pitch

`docs/CONVERSION-RESEARCH.md` (+ `.raw.txt` for full citations). Five parallel
research angles, ~80 sources. The load-bearing findings:

- **Frame value as a recurring event, not an aggregate.** Atlas & Bartels
  (JCR 2018): 24.5% vs 9.9% purchase; **+77% on first-time visitors**, who are
  100% of this page's traffic. This is why the headline is "$5 back every week".
- **The savings calculator has no supporting evidence**, and its default figure
  requires **20 separate $10+ visits a month**. An exaggerated reference price
  *tests well anyway, even on sceptics* (Urbany 1988) — so no A/B result catches
  it.
- **"Coming" items subtract.** Presenter's Paradox (JCR 2012): adding a weaker
  item dropped willingness-to-pay ~15%.
- **Do not tighten "Spring 2027" to a month.** When an estimate proves wrong the
  imprecise version preserves trust better (Pena-Marin & Wu, JCP 2019). The one
  place standard CRO advice makes this page worse.
- **Do not spend cycles on CTA wording, button styling, colour or trust badges.**
  Qubit, 6,700+ experiments: all ≈0. 90% of experiments move revenue <1.2%.

Funnel review artifact: <https://claude.ai/code/artifact/cd1ac0b9-f613-4510-a2d3-204049de4d03>

---

## 6. V3.1 design language

`~/.claude/.../memory/v31-language-map.md` has the full map. The four invariants
that make a surface read as TapIn:

1. **Flat card, floating photo.** Card `--rest` (`0 1px 2px ….06`); the photo
   inside it `--float` (`0 4px 12px ….13`) — ~6× the card's.
2. **One card recipe at every density**: 16px radius, 12px pad, 1px hairline at
   10% ink. **No card inside a card** (this is why the venue rail left its panel).
3. **Height equality.** One-line title, description clamped with line-height AND
   max-height both 1.5rem, a zero-width space rendered when there is none.
4. **Row ladder, price quieter by weight not colour:** name 16/700, description
   14/400, price 16/**500**.

Mapping trap: **do not map `cardBackgroundColor` → `--card`.** In V3.1-light the
card is *darker* than the page; here it is *lighter*. Map by relationship —
nested card → `--inner`.

---

## 7. Next work queue

In the order Sam last described it:

1. **"What you can spend it on"** — food/drink/merch at real discounted prices
   from the frozen menus, plus the line-skip and cover card shapes. **Data-
   blocked**: there is no cover or pass record anywhere, and `Scenes.tsx`
   records why — "a price beside a real business is a commercial claim about
   that business (§10)."
2. **Points explanation** — per-venue balances + the portable balance. Ratio
   pending decision 4.
3. **Stage 6 of the funnel** — a "between now and opening day" block. Nothing
   addresses the gap today. Walmart+ Student puts exactly this below its fold.
4. **The 3-month pass is dominated** — $19.99/3mo = $6.66/mo against $4.99/mo.
   `Reserve.tsx:106-112`'s comment claims it is "the cheaper of the two"; the
   frozen data contradicts it.
5. **§7 disclaimer breaks its own rule** — the figure renders 32px, "An
   illustration, not a quote." renders 15px. The rule is same type size.
6. **768–1023px is still the phone layout.** One breakpoint at 1024 is doing the
   work of three.

---

## 8. How Sam works

- **One page at a time, shown and approved.** Big multi-surface passes get
  redirected. `docs/START-HERE.md` records why.
- He will interject mid-turn with new asks; take them, but say plainly when one
  collides with a documented rule rather than quietly choosing.
- `/ui-styling` and `/ui-ux-pro-max` are **not installed skills** — he has asked
  for them by name three times. The real one is `impeccable`; "redesign" routes
  to its `new-work.md`, "refine" is a category whose quality pass is `polish`.
- He values being told when he is wrong, with evidence. Three findings this
  session contradicted his own instructions and saying so was the right call.
