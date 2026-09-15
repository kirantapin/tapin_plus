# What makes this page convert — the evidence

Researched 12 September 2026, five parallel angles, on Sam's ask: "research into
what makes a subscription splash page like this actually convert well?"

**This page is not a SaaS subscription page.** It is a founding preorder taken
**6–9 months** before delivery, which is closer to crowdfunding psychology than
to a paywall.

> **Correction, 13 Sep 2026.** The research was commissioned with "~15 months" in
> its brief, a figure inherited from `docs/TRUTH.md` §1 and `PRODUCT.md` (both of
> which still say "fifteen months ahead of delivery"). It is wrong: 13 Sep 2026 →
> "Spring 2027" is 5.6–9.3 months. Findings independent of the wait are
> unaffected; the Apple-ceiling comparison below is corrected. Generic CRO advice misleads here, and in one case (date precision) makes
the page measurably worse. Raw findings with full citations:
`docs/CONVERSION-RESEARCH.raw.txt`.

## The strongest single finding

**Frame the value as a recurring event, not an aggregate.**
Atlas & Bartels, *JCR* 45(2) 2018 — 8 experiments plus a field test on 15,127
visitors. Incentive-compatible subscription purchase **24.5% periodic vs 9.9%
aggregate** (F(1,134)=13.46, p<.001). Field test: first-time visitors (84% of
traffic, n=12,648) **1.3% vs 0.7%, a 77% lift** — while the periodic frame was
13% *more expensive* in aggregate. Perceived **benefits** mediated it; perceived
costs did not.

→ The headline is "$5 back every week", not "$76.25 a month". *Applied.*

**And the credit anchors, not the 15%.** Chen, Marmorstein, Tsiros & Rao, *JM*
2012, 16-week alternating-week field experiment: a bonus frame beat an
economically **superior** discount frame by 73% in volume. 48% of undergraduates
in the same paper could not convert between two equivalent percentage frames.
15% of a $12 lunch is $1.80 — a percentage on a base too small to carry it.

## Why the stranger was confused, mechanically

Moreau, Markman & Lehmann, *JMR* 38(1) 2001: for a genuinely new product the
category cued **first** dominates categorisation and preference, more than
anything encountered later. A wall of venue photography cues "local coupon app",
and no downstream copy repairs a wrong first cue.

## Three findings that contradict what was asked for

1. **The savings calculator has no supporting evidence.** No published controlled
   test of one lifting subscription conversion; none of seven incumbent pages
   uses one above the fold; the "interactive content converts 2x" figure is a
   Demand Metric **survey of 244 marketers' perceptions**, not an experiment.
2. **Do not publish the 4:1 points ratio.** Chun & Hamilton, *JMR* 2024: a
   non-1:1 exchange rate induces optimism and **reduces** redemption versus a
   fixed rate of the same average value.
3. **The venue names should not move.** BrightLocal: ~97% read local reviews, 77%
   across 2+ platforms. Students verify these businesses off-page, so the names
   must be static, selectable and screenshot-able.

## The savings figure is the riskiest thing on the page

$152.50/month requires **20 separate $10+ visits across 5 places in one month**.
DellaVigna & Malmendier, *AER* 2006 (7,752 members, 4.3 visits/month on flat
fees) is the documented reason that will not happen. The build's own walkthrough
notes already record two students reverse-engineering it, getting half, and
concluding it was invented. Urbany, Bearden & Weilbaker, *JCR* 1988 is the trap:
an exaggerated reference price produces **the same positive effects as a
plausible one, even among sceptics** — so no A/B test will catch this.

## Preorder-specific (a normal subscription page needs none of this)

- **Neither Apple nor Kickstarter takes money at commitment.** Apple charges App
  Store pre-orders on release day and caps a new app's window at 180 days;
  Kickstarter captures at the deadline. Charging today for delivery ~15 months
  out is 2.5x Apple's ceiling. If payment can be authorized now and captured at
  launch, the headline becomes "$0 today — $4.99 a month when we open."
- **Write the refund as a condition of the deal, not as policy.** Cumming,
  Leboeuf & Schwienbacher, *Financial Management* 2020: all-or-nothing campaigns
  succeed **34% vs 17%**, completion 64% vs 42% — conditionality is a costly
  commitment signal.
- **Keep the refund time-unbounded** ("any time before we open"). 84% of the 50
  most-funded Kickstarter projects missed their dates. Delay does not break
  trust; silence does. Build nothing that breaks when the date moves.
- **Do not tighten "Spring 2027" to a month.** Pena-Marin & Wu, *JCP* 2019: when
  an estimate proves wrong, the **imprecise** version preserves trustworthiness
  better — even when objectively further from the truth. This is the one place
  standard CRO advice makes the page worse.
- Budget for 10–25% refunds and do not read them as product failure.

## Do not

- **No countdown, live seat counter or member count.** Luguri & Strahilevitz,
  *Journal of Legal Analysis* 2021: aggressive dark patterns made subscription
  ~4x as likely **and** produced powerful backlash — in a town where students see
  each other daily, that backlash lands on the six venues.
- **Do not spend cycles on CTA wording, buttons, colour or trust badges.** Qubit,
  6,700+ experiments, PwC-assured: CTA wording −0.3% RPV, buttons −0.2%, colour
  0.0%, popups 0.0%. 90% of all experiments move revenue under 1.2%.
- **Do not invent a total-value anchor**, and do not expect a disclaimer to cure
  "save up to $X" (FTC-commissioned copy test, Hastak & Murphy 2012: 28.1% still
  read it as typical).
- **Do not promise a percentage lift from any of this.** GoodUI: 639 tests,
  127M visitors, ~26% significant winners. Blacksburg's traffic against a
  100-seat cap cannot statistically resolve a copy change. Justify on
  **comprehension** instead — a five-second test at n=20–40: "what do you get,
  and what does it cost?"

## Two factual defects this surfaced

- The **3-month pass is dominated**: $19.99/3mo = $6.66/mo against $4.99/mo
  monthly, renewing at $7.33/mo. `Reserve.tsx`'s own comment claims it is "the
  cheaper of the two", which `docs/data/money-and-terms.json` contradicts.
- The **§7 disclaimer breaks its own rule**: the figure renders at 32px and "An
  illustration, not a quote." at 15px. The stated rule is the same type size.
