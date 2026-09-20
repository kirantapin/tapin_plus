import { BENEFIT, illustrate } from "../model/savings";
import { useSpend } from "../model/spendStore";
import { Drill } from "./Drill";

const money = (n: number) => `$${n.toFixed(2)}`;

/** THE SAME FOUR BANDS THE DECK ASKS WITH, and that is the point: one question,
 *  asked once, in one shape, writing to one store. A reader who answered on
 *  /how arrives here already answered. */
const BANDS = [50, 100, 150, 300];

/**
 * The savings illustration, driven by the reader.
 *
 * At rest this shows ONE thing: a number she set herself. Sam, 12 Sep 2026:
 * "we need to simplify the savings calculator significantly. This page is
 * information overload." So the bar, the three-way split, the first month, the
 * basis AND the concentration illustration are all now behind the one tap —
 * every one of them answers "where does that come from", and none of them is
 * the figure. What is left at rest is the figure, the control that moves it,
 * and the §7 disclaimer, which may never be behind a tap.
 *
 * The one line that never moves behind the disclosure is "An illustration, not a
 * quote." §7 requires it in the same type as the figure, and a caveat a reader
 * has to open is not a caveat.
 */
export default function SavingsSlider() {
  // Session-wide, not local: the deck's closing figure and the checkout's had
  // to stop disagreeing on the way to a charge row. See spendStore.ts.
  const [spend, setSpend] = useSpend();
  const s = illustrate(spend);

  /**
   * Three values in one column read as three kinds of the same money, and they
   * are not: one comes off the bill, one is credit she has to go back to spend,
   * one is a balance worth most where it was earned. The reader who opens this
   * drill is the reader already doing the arithmetic — she finds out anyway.
   *
   * The credit count is `creditsEarned`, NOT `visits`. They are the same number
   * only below $300; above it the cap binds and `visits` would print "40 × $5"
   * beside a computed $100. A typed "4 × $5" would have been wrong everywhere
   * except between $60 and $74.
   */
  const parts = [
    { key: "pct", label: "15% off the bill", value: s.percentSavingUsd },
    {
      key: "credit",
      label: `Credit, to spend there: ${s.creditsEarned} × $${BENEFIT.creditUsd}`,
      value: s.creditSavingUsd,
    },
    { key: "points", label: "Points, worth most there", value: s.pointsSavingUsd },
  ];
  const total = s.steadyUsd || 1;

  return (
    <>
      {/* ASSUMING vs YOU SAID. The store now knows whether the number is hers
          or ours, and the difference is not cosmetic: printing "you'd save" over
          a figure computed from OUR default is laundering our own assumption as
          her answer. The sibling prototype shipped exactly that and it was the
          one finding a reviewer called deceptive rather than merely unclear. */}
      {/* NO CAPTION. Distilled 14 Sep 2026: the question and the highlighted band
          below say whose number this is, and the caption said it a third time
          in 11px caps. The "assuming vs you said" distinction survives in the
          band itself — the chosen one is maroon whether we chose it or she did,
          and the question above it is what makes changing it obvious. */}
      <p className="save-figure">
        <span className="amount tnum">{money(s.steadyUsd)}</span>
        <span className="unit">a month</span>
      </p>

      {/* ══ ONE QUESTION, NOT A SLIDER ═══════════════════════════════════════
          Sam, 13 Sep 2026: "can this be an embedded single question
          questionnaire… instead of a slider it'd be a one step question."

          It is less friction, not more: a slider is a drag plus a decision
          about precision, and it asks for a number nobody holds to the dollar.
          Four bands is one tap. They are the deck's own bands, writing to the
          deck's own store, so answering in either place answers both.

          THREE QUESTIONS WAS THE OTHER OPTION AND IT IS BLOCKED ON THE MODEL,
          not on friction. Splitting spend by category would need per-category
          savings, and the $5 credit is flat, per-visit, once a week per place,
          capped at 20 a month — it cannot be allocated across categories
          without either inventing an allocation or publishing that coffee
          returns 25% and lunch returns 67%. That is savings.ts's decision to
          make, not this component's. */}
      <div className="spendq">
        <p className="spendq-ask" id="spendq-ask">
          Your monthly spend
        </p>
        <div className="bands" role="group" aria-labelledby="spendq-ask">
          {BANDS.map((b) => (
            <button
              key={b}
              type="button"
              className={`band${spend === b ? " on" : ""}`}
              aria-pressed={spend === b}
              onClick={() => setSpend(b)}
            >
              <b className="tnum">
                ${b}
                {b === BANDS[BANDS.length - 1] ? "+" : ""}
              </b>
              {/* No "a month" under each figure: the question above says it. */}
            </button>
          ))}
        </div>
      </div>

      {/* Both generated, both at rest, both in the figure's own type. The
          condition answers "off WHAT?" — the question every student in the
          walkthrough asked and none could find the answer to. */}
      <p className="t-body basis">
        <span className="basis-if">{s.condition}</span> <b>{s.disclaimer}</b>
      </p>

      <Drill summary="Where it comes from">
        {/* The split moved here from the resting state. Three values in one
            column read as three kinds of the same money, and they are not: one
            comes off the bill, one is credit to go back and spend, one is a
            balance worth most where it was earned. The reader who opens this is
            the reader already doing the arithmetic. */}
        <div
          className="breakdown"
          role="img"
          aria-label={parts.map((p) => `${p.label} ${money(p.value)}`).join(", ")}
        >
          {parts.map((p) => (
            <i key={p.key} className={`b-${p.key}`} style={{ flexGrow: p.value / total }} />
          ))}
        </div>
        <ul className="legend">
          {parts.map((p) => (
            <li key={p.key}>
              <i className={`b-${p.key}`} aria-hidden="true" />
              <span>{p.label}</span>
              <b className="tnum">{money(p.value)}</b>
            </li>
          ))}
        </ul>
        <p className="t-compact">
          <b className="tnum">{money(s.firstMonthUsd)}</b> in month one. Credit needs a visit first.
        </p>
        <p className="t-compact">{s.basis}</p>

        {/* The mechanism behind the figure — "not more money, the same money in
            fewer places". It is a genuine second argument with its own two-row
            graphic, and at rest it was the single largest thing in a panel Sam
            called information overload: figure, bar, slider, ends, disclaimer,
            a two-row illustration and a disclosure, all at once. It answers the
            same question this disclosure exists to answer, so it belongs
            inside it. */}
        {/* The "same money, fewer places" graphic is out of the drill (audit,
            14 Sep 2026): a second argument with its own two-row chart, inside a
            disclosure that answers "where does the number come from". The
            component stays in shell/Concentration.tsx. */}
      </Drill>
    </>
  );
}
