import { PERCENT, PLACES } from "../routes/parents_kit";

/* ══ $5 BONUS CREDIT AT EACH SPOT (Sam, 9 Nov 2026) ════════════════════════
   The small section right under the band on plus.tapin.app, and on /parents
   too ("should include this on the parent plus page too I think"): one line,
   then the five places' logos each with its $5. A computer lays it out as two
   sides, the words with the $25 total on the left, the five places named on
   the right. Styles: .tps-unlock* in plus-app.css. */
const CREDIT = 5;
export function BonusSpots({ they = false, only }: { they?: boolean; only?: string }) {
  /* A place's own page (/coffeeholics, Sam, 10 Nov 2026: "scoped
     specifically to the Coffeeholics brand"): that place alone, its logo
     beside its $5, the 15% under it. */
  const one = only ? PLACES.find((p) => p.id === only) : undefined;
  if (one)
    return (
      <section className="tpa-module tps-unlock tps-unlock-one" aria-labelledby="tps-unlock-h">
        <div className="tps-unlock-say">
          <img className="tps-unlock-logo" src={one.logo} alt="" decoding="async" />
          <div>
            <h2 id="tps-unlock-h" className="tps-unlock-h">
              <b>${CREDIT} credit</b> every month at {one.name}
            </h2>
            <p className="tps-unlock-sub">No minimum spend, no&nbsp;markup.</p>
          </div>
        </div>
        <p className="tps-unlock-or">
          <b>Then {PERCENT}% off</b> your other orders, once&nbsp;a&nbsp;day
        </p>
      </section>
    );
  /* GET $5 · EARN $5 · SAVE 15% (Sam, 10 Nov 2026: "THIS IS PERFECT I love
     it"). The ads still say $5 every week, the site said $5 a month; the
     ladder holds both, true as written: the free monthly $5 at each spot
     (no minimum), the weekly $5 back on a $10 order, then 15% off. The five
     places' logos with their $5 sit under Get. */
  return (
    <section className="tpa-module tps-ladder" aria-labelledby="tps-ladder-h">
      <h2 id="tps-ladder-h" className="tpp-sr">
        What you get with Tapin Plus
      </h2>
      <ol>
        <li>
          <p>
            {/* The two $5s told apart in the labels themselves (Sam, 10
                Nov 2026: "make the labels get $5 free and earn $5 back"). */}
            <b className="tnum">Get ${CREDIT} free</b>
            <span>at each spot every month, no&nbsp;minimum.</span>
          </p>
          <ul className="tps-ladder-spots">
            {PLACES.map((p) => (
              <li key={p.id}>
                <img src={p.logo} alt={p.name} decoding="async" />
                <span className="tnum" aria-hidden="true">
                  ${CREDIT}
                </span>
              </li>
            ))}
          </ul>
        </li>
        <li>
          <p>
            <b className="tnum">Earn ${CREDIT} back</b>
            <span>every week when {they ? "they spend" : "you spend"} $10.</span>
          </p>
        </li>
        <li>
          <p>
            <b className="tnum">Save {PERCENT}%</b>
            <span>on {they ? "their" : "your"} other orders, every&nbsp;day.</span>
          </p>
        </li>
      </ol>
    </section>
  );
}
