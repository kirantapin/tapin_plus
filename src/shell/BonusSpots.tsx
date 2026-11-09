import { PLACES } from "../routes/parents_kit";

/* ══ $5 BONUS CREDIT AT EACH SPOT (Sam, 9 Nov 2026) ════════════════════════
   The small section right under the band on plus.tapin.app, and on /parents
   too ("should include this on the parent plus page too I think"): one line,
   then the five places' logos each with its $5. A computer lays it out as two
   sides, the words with the $25 total on the left, the five places named on
   the right. Styles: .tps-unlock* in plus-app.css. */
const CREDIT = 5;
export function BonusSpots({ they = false }: { they?: boolean }) {
  const who = they ? "they" : "you";
  return (
    <section className="tpa-module tps-unlock" aria-labelledby="tps-unlock-h">
      <div className="tps-unlock-say">
        <h2 id="tps-unlock-h" className="tps-unlock-h">
          <b>${CREDIT} bonus credit</b> at each spot<span className="tps-unlock-when"> when {who} join</span>
        </h2>
        <p className="tps-unlock-sub tnum">
          Ready the moment {who} join. ${PLACES.length * CREDIT} in&nbsp;all.
        </p>
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
    </section>
  );
}
