import { PERCENT, PLACES } from "../routes/parents_kit";

/* ══ $5 BONUS CREDIT AT EACH SPOT (Sam, 9 Nov 2026) ════════════════════════
   The small section right under the band on plus.tapin.app, and on /parents
   too ("should include this on the parent plus page too I think"): one line,
   then the five places' logos each with its $5. A computer lays it out as two
   sides, the words with the $25 total on the left, the five places named on
   the right. Styles: .tps-unlock* in plus-app.css. */
const CREDIT = 5;
export function BonusSpots(_: { they?: boolean }) {
  return (
    <section className="tpa-module tps-unlock" aria-labelledby="tps-unlock-h">
      <div className="tps-unlock-say">
        {/* The offer itself now (Sam, 9 Nov 2026: "$5 monthly credit at
            each spot on tapin plus with no minimum spend ... Credit doesn't
            roll over, so you have to use it"). */}
        <h2 id="tps-unlock-h" className="tps-unlock-h">
          <b>${CREDIT} credit</b> every month at each spot<span className="tps-unlock-when">, no minimum, no&nbsp;markup</span>
        </h2>
        {/* A computer's heading drops ", no minimum, no markup" (Sam, 9 Nov
            2026); it's said here instead. "Use it twice and the month's paid
            for" was here and went ("sounds weird and I don't like it"). */}
        <p className="tps-unlock-sub">No minimum spend, no&nbsp;markup.</p>
      </div>
      <ul className="tps-unlock-row">
        {PLACES.map((p) => (
          <li key={p.id}>
            <img src={p.logo} alt={p.name} decoding="async" />
            <small className="tps-unlock-name">{p.name}</small>
            <span className="tnum" aria-hidden="true">
              ${CREDIT}
            </span>
          </li>
        ))}
      </ul>
      {/* The other half of the offer (Sam, 10 Nov 2026: "can we also add
          15% off daily here too"), across the card's foot. */}
      <p className="tps-unlock-or">
        <b>Or {PERCENT}% off</b> once a day
      </p>
    </section>
  );
}
