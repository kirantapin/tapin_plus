import { useState } from "react";
import { Link } from "react-router-dom";
import { BENEFIT, WEEKS_PER_MONTH, illustrate } from "../model/savings";
import { venues, logoField } from "../model/content";
import { sectionsFor } from "../model/menu";
import { useSpend } from "../model/spendStore";
import { wholeUsd } from "../model/order";
import { Panel } from "../shell/Panel";
import { Drill } from "../shell/Drill";
import SavingsSlider from "../shell/SavingsSlider";

/**
 * ══ MOCKUP GALLERY — NOT A SHIPPING SURFACE ════════════════════════════════
 *
 * Sam, 13 Sep 2026: "yeah cut the calculator from checkout for now, we might
 * bring it back. Can we redesign that, using mobbin and /ui-styling to create a
 * few mock up options?"
 *
 * The cut is done (see the comment where the panel used to be in Reserve.tsx).
 * This route is the redesign, built at true fidelity — the real tokens, the real
 * Gilroy, the real Panel, the real venue marks and the real menu prices — so
 * what he clicks through is what would ship, not a picture of it.
 *
 * `ui-styling` is NOT an installed skill in this session (checked, not assumed),
 * and it targets shadcn/Tailwind, which this project does not use. So these are
 * built on the house CSS instead.
 *
 * NOTHING LINKS HERE. It is reachable only by typing /savings. A mockup gallery
 * on the money path would be a fourth screen a stranger could fall into.
 *
 * THE FOUR OPTIONS DIFFER IN MECHANISM, NOT SKIN. Three of them are a different
 * answer to the same question — how does a stranger come to believe a number —
 * and picking between them is a product decision, not a taste one:
 *   A  a real tab she can check against a menu she has read     (Acorns)
 *   B  a number she sets herself                                (Commons/Chime)
 *   C  a month she can count                                    (Lugg/Uber One)
 *   D  what ships today, for comparison
 */

const cents = (d: number) => Math.round(d * 100);
const money = (n: number) => `$${n.toFixed(2)}`;

const venue = (id: string) => venues.find((v) => v.id === id)!;

/** A menu item by venue and a name prefix — the em-dashed names are not retyped. */
function item(venueId: string, startsWith: string) {
  const found = sectionsFor(venueId)
    .flatMap((s) => s.items)
    .find((i) => i.name.startsWith(startsWith));
  if (!found) throw new Error(`no menu item "${startsWith}" at ${venueId}`);
  return found;
}

/**
 * One ticket, worked through the same three rules the month model uses.
 *
 * Integer cents, for the reason savings.ts gives: a figure that disagrees with
 * itself by a penny beside a refund guarantee is worse than no figure.
 *
 * `earnsCredit` is passed in rather than derived, because the credit is once a
 * week PER PLACE — the second $12 tab at the same cafe on the same day earns
 * nothing, and a helper that could not express that would overstate every
 * multi-visit month.
 */
function ticketBack(priceUsd: number, earnsCredit = true) {
  const c = cents(priceUsd);
  const pct = Math.round(c * BENEFIT.percentOff);
  const pts = Math.round(c * BENEFIT.pointsPerDollar * BENEFIT.pointValueUsd);
  const cred = earnsCredit && priceUsd >= BENEFIT.creditMinUsd ? cents(BENEFIT.creditUsd) : 0;
  return {
    pct: pct / 100,
    pts: pts / 100,
    cred: cred / 100,
    total: (pct + pts + cred) / 100,
    rate: (pct + pts + cred) / c,
  };
}

/* ══ A ═══════════════════════════════════════════════════════════════════════
   ONE REAL TAB.  Acorns' Round-Ups screen: a discrete control, and under it a
   worked example in plain language — "Ex: if you buy lunch for $10, we will
   automatically invest $0.50." Concrete, small, and checkable by a reader who
   has stood at that counter.

   No slider at rest, and no aggregate at rest. A stranger is not asked to
   estimate her own monthly spend before the page will tell her anything — she
   picks one of three tabs she recognises and reads the arithmetic on it.

   THE RATE CHIP IS THE POINT, and it is uncomfortable on purpose: the same
   three benefits return 25% on a $3.25 coffee and 67% on a $12 sandwich,
   because the $5 credit is flat and lands the moment a tab clears $10. That is
   what the model in savings.ts actually says. The aggregate figure the pitch
   prints today hides it; this layout cannot.
   ══════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { key: "coffee", label: "A coffee", venue: "coffeeholicsva", item: "Americano" },
  { key: "lunch", label: "Lunch", venue: "coffeeholicsva", item: "California Club" },
  { key: "dinner", label: "Dinner", venue: "theburg", item: "Lomo Saltado" },
] as const;

function OptionA() {
  const [pick, setPick] = useState<string>("lunch");
  const tab = TABS.find((t) => t.key === pick)!;
  const v = venue(tab.venue);
  const it = item(tab.venue, tab.item);
  const b = ticketBack(it.price);

  const rows = [
    { key: "pct", label: "15% off the bill", value: b.pct },
    { key: "credit", label: `$${BENEFIT.creditUsd} credit, to spend there`, value: b.cred },
    { key: "points", label: `${BENEFIT.pointsPerDollar} points a dollar`, value: b.pts },
  ].filter((r) => r.value > 0);

  return (
    <>
      <div className="sv-bands" role="group" aria-label="A tab you recognise">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`band${t.key === pick ? " on" : ""}`}
            aria-pressed={t.key === pick}
            onClick={() => setPick(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* The tab itself, with the merchant's own mark on it. A named venue and a
          real price is the whole reason this option exists — an unnamed
          "$12.00 lunch" is the same abstraction the slider already is. */}
      <div className="sv-tab">
        <span className="collar sv-tab-mark" data-field={logoField(v.id)} style={{ ["--brand" as string]: v.brandColor }}>
          <img src={v.logo} alt="" decoding="async" />
        </span>
        <span className="sv-tab-what">
          <b>{it.name}</b>
          <span className="t-compact">{v.name}</span>
        </span>
        <b className="sv-tab-price tnum">{money(it.price)}</b>
      </div>

      <p className="sv-figure">
        <span className="amount tnum">{money(b.total)}</span>
        <span className="unit">back</span>
        <span className="sv-rate tnum">{Math.round(b.rate * 100)}%</span>
      </p>

      <ul className="sv-rows">
        {rows.map((r) => (
          <li key={r.key}>
            <span>{r.label}</span>
            <b className="tnum">{money(r.value)}</b>
          </li>
        ))}
      </ul>

      <p className="t-body basis">
        <span className="basis-if">Every time, at any Plus place.</span>{" "}
        <b>An illustration, not a quote.</b>
      </p>

      <Drill summary="Over a month">
        <SavingsSlider />
      </Drill>
    </>
  );
}

/* ══ B ═══════════════════════════════════════════════════════════════════════
   SET IT AND SEE IT.  Commons' offset screen and Chime's safe-limit sheet: the
   control IS the layout, and the value rides the thumb on a pin so the number
   and the hand that moves it are never in two places.

   This is the tightest possible version of what ships today — same model, same
   single input, but the bar, the legend, the three-way split and the first-month
   line are all gone from rest. What is left is a figure, a control, and the two
   sentences §7 will not let behind a tap.

   The pin sits at `calc(pct * (100% - thumb) + thumb/2)`, not at `pct * 100%`:
   a range input's thumb travels the track inset by its own width, so a naive
   percentage drifts ~11px at each end and the pin detaches from the handle
   exactly where a reader is looking hardest.
   ══════════════════════════════════════════════════════════════════════════ */
const MIN = 50;
const MAX = 600;
const STEP = 10;

function OptionB() {
  const [spend, setSpend] = useSpend();
  const s = illustrate(spend);
  const pct = (spend - MIN) / (MAX - MIN);

  return (
    <>
      <p className="sv-figure is-lead">
        <span className="amount tnum">{money(s.steadyUsd)}</span>
        <span className="unit">a month</span>
      </p>

      <div className="sv-set">
        <div className="sv-pinwrap" style={{ ["--at" as string]: pct }}>
          <output className="sv-pin tnum" aria-hidden="true">
            {wholeUsd(spend)}
          </output>
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
            aria-label="What you already spend in a month around Blacksburg"
            aria-valuetext={`${wholeUsd(spend)} a month, saving ${money(s.steadyUsd)}`}
          />
          <div className="sv-ends" aria-hidden="true">
            <span>{wholeUsd(MIN)}</span>
            <span>{wholeUsd(MAX)}</span>
          </div>
        </div>
        <p className="sv-set-label">
          What you <b>already</b> spend in a month around Blacksburg
        </p>
      </div>

      {/* Three chips, not a stacked bar with a legend. The bar was one quantity
          drawn twice — once as width, once as a number — and the reader only
          ever read the number. */}
      <ul className="sv-chips">
        <li>
          <b className="tnum">{money(s.percentSavingUsd)}</b>
          <span>15% off</span>
        </li>
        <li>
          <b className="tnum">{money(s.creditSavingUsd)}</b>
          <span>credit</span>
        </li>
        <li>
          <b className="tnum">{money(s.pointsSavingUsd)}</b>
          <span>points</span>
        </li>
      </ul>

      <p className="t-body basis">
        <span className="basis-if">{s.condition}</span> <b>{s.disclaimer}</b>
      </p>
    </>
  );
}

/* ══ C ═══════════════════════════════════════════════════════════════════════
   A MONTH YOU CAN COUNT.  Lugg's "Understand your estimate" and Uber One's
   money-saved ledger: no model exposed, no control at all, just a short list of
   real things at real prices that adds up.

   This is the only option that answers "$152.50 off WHAT?" structurally rather
   than with a sentence. Every line names a business on Draper Road and a price
   from its own menu, so the figure is not a claim about a stranger's spending —
   it is a sum, and a reader who disagrees with it disagrees with a line rather
   than with an assumption she cannot see.

   WHAT IT GIVES UP is the reader's own number. A month that is not hers is a
   month she can dismiss, and the fix — letting her edit it — is the slider
   again. B and C are genuinely opposed here; that is the decision.

   The credit is capped per place per month, which is where the naive version of
   this would have overstated: eight americanos do not earn eight credits, and
   nothing under $10 earns one at all.
   ══════════════════════════════════════════════════════════════════════════ */
const MONTH = [
  { venue: "coffeeholicsva", item: "Americano", n: 8 },
  { venue: "coffeeholicsva", item: "California Club", n: 2 },
  { venue: "themilkparlor", item: "Chicken Tender Basket", n: 2 },
  { venue: "olaika", item: "Classic Burger", n: 2 },
  { venue: "theburg", item: "Ceviche", n: 1 },
  { venue: "sweetopia", item: "Brookie", n: 3 },
];

function sampleMonth() {
  const lines = MONTH.map((l) => {
    const it = item(l.venue, l.item);
    return { ...l, name: it.name, price: it.price, spend: it.price * l.n };
  });

  const spendCents = lines.reduce((a, l) => a + cents(l.price) * l.n, 0);

  // Once a week per place, so a month cannot yield more than WEEKS_PER_MONTH of
  // them however many qualifying tabs land there.
  const byVenue = new Map<string, number>();
  for (const l of lines) {
    if (l.price < BENEFIT.creditMinUsd) continue;
    byVenue.set(l.venue, (byVenue.get(l.venue) ?? 0) + l.n);
  }
  const credits = [...byVenue.values()].reduce((a, n) => a + Math.min(n, WEEKS_PER_MONTH), 0);

  const pct = Math.round(spendCents * BENEFIT.percentOff);
  const pts = Math.round(spendCents * BENEFIT.pointsPerDollar * BENEFIT.pointValueUsd);
  const cred = credits * cents(BENEFIT.creditUsd);

  return {
    lines,
    spend: spendCents / 100,
    credits,
    pct: pct / 100,
    pts: pts / 100,
    cred: cred / 100,
    total: (pct + pts + cred) / 100,
  };
}

function OptionC() {
  const m = sampleMonth();

  return (
    <>
      <ul className="sv-month">
        {m.lines.map((l, i) => {
          const v = venue(l.venue);
          return (
            <li key={i}>
              <span
                className="collar sv-month-mark"
                data-field={logoField(v.id)}
                style={{ ["--brand" as string]: v.brandColor }}
              >
                <img src={v.logo} alt="" decoding="async" />
              </span>
              <span className="sv-month-what">
                <b>
                  {l.n}× {l.name}
                </b>
                <span className="t-compact">{v.name}</span>
              </span>
              <b className="sv-month-sum tnum">{money(l.spend)}</b>
            </li>
          );
        })}
      </ul>

      <p className="sv-month-spend is-in">
        <span>A month, as you spend it now</span>
        <b className="tnum">{money(m.spend)}</b>
      </p>

      <ul className="sv-rows is-tot">
        <li>
          <span>15% off everything but alcohol</span>
          <b className="tnum">{money(m.pct)}</b>
        </li>
        <li>
          <span>
            {m.credits} × ${BENEFIT.creditUsd} credit — one a week per place
          </span>
          <b className="tnum">{money(m.cred)}</b>
        </li>
        <li>
          <span>{BENEFIT.pointsPerDollar} points a dollar</span>
          <b className="tnum">{money(m.pts)}</b>
        </li>
      </ul>

      <p className="sv-figure is-foot">
        <span className="amount tnum">{money(m.total)}</span>
        <span className="unit">back on that month</span>
      </p>

      <p className="t-body basis">
        <span className="basis-if">A month like this one, at these places.</span>{" "}
        <b>An illustration, not a quote.</b>
      </p>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

const OPTIONS = [
  {
    id: "a",
    name: "One real tab",
    ref: "Acorns Round-Ups · Zopa",
    trade:
      "Asks her for nothing and every figure is checkable against a menu she has read. Gives up the monthly total at rest, and exposes that the rate swings 25% → 67% with the tab.",
    render: () => <OptionA />,
  },
  {
    id: "b",
    name: "Set it and see it",
    ref: "Commons · Chime · Plum",
    trade:
      "Her number, one control, nothing else. The tightest edit of what ships. Still asks a stranger to estimate her own spending before the page says anything.",
    render: () => <OptionB />,
  },
  {
    id: "c",
    name: "A month you can count",
    ref: "Lugg estimate · Uber One ledger",
    trade:
      "Answers “off what?” structurally — every line is a real place at a real price. Gives up her own number, so it is a month she can dismiss as not hers.",
    render: () => <OptionC />,
  },
  {
    id: "d",
    name: "What ships today",
    ref: "on the pitch, at Pitch.tsx:225",
    trade: "Here for comparison only. Figure, slider, condition, and everything else behind one tap.",
    render: () => <SavingsSlider />,
  },
];

export default function SavingsLab() {
  return (
    <>
      <header className="lab-head">
        <h1 className="t-headline">Savings, four ways</h1>
        <p className="t-body">
          Built on the real tokens, the real Gilroy and the real menu prices, so this is the
          thing and not a picture of it. Cut from checkout; still live on the pitch.
        </p>
        <p className="t-compact">
          <Link to="/">← the pitch</Link> · <Link to="/reserve">checkout</Link>
        </p>
      </header>

      {OPTIONS.map((o) => (
        <section className="lab-opt" key={o.id}>
          <p className="lab-tag">
            <b>{o.name}</b>
            <span>{o.ref}</span>
          </p>
          <Panel label="What it saves">{o.render()}</Panel>
          <p className="lab-trade t-compact">{o.trade}</p>
        </section>
      ))}
    </>
  );
}
