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
  /* The original ladder, back (Sam, 11 Nov 2026, after the wells: "honestly
     this version was great, let's just do this one like what we had
     originally"). ?ladv=a|b|c still preview the three versions. */
  const lv = ladderVersion();
  if (lv) return <LadderVersion v={lv} they={they} />;
  return (
    <section className="tpa-module tps-ladder" aria-labelledby="tps-ladder-h">
      <h2 id="tps-ladder-h" className="tpp-sr">
        What you get with Tapin Plus
      </h2>
      <ol>
        <li>
          <p>
            {/* The two $5s told apart in the labels themselves (Sam, 10
                Nov 2026: "make the labels get $5 free and earn $5 back"),
                then "$5 to spend" instead of "$5 free" (11 Nov). */}
            <b className="tnum">
              Get ${CREDIT}
              <br className="tps-ladder-br" /> to spend
            </b>
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

/* ══ THREE PREVIEWS OF THE LADDER (Sam, 10 Nov 2026: "can I get 3 versions
   of this section actually? It's not quite there yet"). Sam picked B ·
   Wells, the default; ?ladv=a and ?ladv=c still preview the other two.
   Styles: .tps-lv*. */
type LadderV = "a" | "b" | "c";
const ladderVersion = (): LadderV | null => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("ladv");
  return v === "a" || v === "b" || v === "c" ? v : null;
};

const Gift = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 11h16v9H4zM3 7.5h18V11H3zM12 7.5V20M12 7.5C10.8 4.8 7.5 4.2 7.5 6.2c0 1.3 2.6 1.3 4.5 1.3Zm0 0c1.2-2.7 4.5-3.3 4.5-1.3 0 1.3-2.6 1.3-4.5 1.3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);
const Back = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v4h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 9.6c-.4-.6-1.1-.9-2-.9-1.1 0-1.9.6-1.9 1.4 0 1.9 4 1 4 3 0 .8-.9 1.5-2.1 1.5-.9 0-1.6-.4-2-1M12 7.6v1.1m0 6v1.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const Pct = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 6 6 18M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const rungs = (they: boolean) => [
  { key: "get", verb: "Get", amt: `$${CREDIT}`, tail: "to spend", rest: "at each spot every month, no\u00a0minimum.", Glyph: Gift },
  { key: "earn", verb: "Earn", amt: `$${CREDIT}`, tail: "back", rest: `every week when ${they ? "they spend" : "you spend"} $10.`, Glyph: Back },
  { key: "save", verb: "Save", amt: `${PERCENT}%`, tail: "", rest: `on ${they ? "their" : "your"} other orders, every\u00a0day.`, Glyph: Pct },
];

const Spots = () => (
  <ul className="tps-lv-spots" aria-label="The five places, $5 at each">
    {PLACES.map((p) => (
      <li key={p.id}>
        <img src={p.logo} alt={p.name} decoding="async" />
      </li>
    ))}
  </ul>
);

function LadderVersion({ v, they }: { v: LadderV; they: boolean }) {
  const list = rungs(they);
  return (
    <section className={`tpa-module tps-lv tps-lv-${v}`} aria-labelledby="tps-ladder-h">
      <h2 id="tps-ladder-h" className="tpp-sr">
        What you get with Tapin Plus
      </h2>
      {v !== "b" && <Spots />}
      <ol>
        {list.map(({ key, verb, amt, tail, rest, Glyph }) => (
          <li key={key}>
            {v === "a" ? (
              /* A · FIGURES: the amount is the picture. "$5" and "15%" set
                 big in money green, the verb and its word either side at
                 half size, so the three read as Get $5 free / Earn $5 back
                 / Save 15% at a glance and the line under says when. */
              <>
                <p className="tps-lv-fig tnum">
                  {verb} <strong>{amt}</strong> {tail}
                </p>
                <p className="tps-lv-rest">{rest}</p>
              </>
            ) : v === "b" ? (
              /* B · THREE WELLS: each benefit on its own grey well with a
                 glyph (a gift, money coming back, a percent), the way a
                 wallet lists what's on the card. The five logos sit in the
                 first well, under "at each spot", the thing they show (Sam:
                 the logos above "still feel out of place"). */
              <>
                <span className="tps-lv-glyph">
                  <Glyph />
                </span>
                <p className="tps-lv-label tnum">
                  {verb} {amt} {tail}
                </p>
                <p className="tps-lv-rest">{rest}</p>
                {key === "get" && <Spots />}
              </>
            ) : (
              /* C · THE SENTENCE: no table at all, three plain sentences in
                 big type, the verb and amount in green. Reads like someone
                 telling you what you get. */
              <p className="tps-lv-say tnum">
                <b>
                  {verb} {amt}
                  {tail ? ` ${tail}` : ""}
                </b>{" "}
                {rest}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ══ WHAT CAN I USE IT ON (Sam, 11 Nov 2026: "A question I imagine people
   have is what can I use these benefits on... so that needs to be
   answered") ═══════════════════════════════════════════════════════════════
   Straight after the ladder, on both pages: each place with what it sells,
   then what else the $5 and the 15% cover, and the one thing they don't.
   The rules are the FAQ's own ("What does it work on?", 3 Nov and 9 Nov
   2026): food, non-alcoholic drinks and event tickets at every Plus place,
   cover and line skips at select places, not alcohol; points on everything.
   Styles: .tps-use* in plus-app.css. */
/* QUIETER (Sam, 11 Nov 2026, of the first cut: "it's much too busy right
   now"). The ladder just above already shows every logo, so this is type
   only: one row per place, name and what it sells, on hairlines; then one
   plain sentence for tickets, cover and line skips, and alcohol. No logos,
   no icons, no second colour. */
export function UseItOn({ they = false }: { they?: boolean }) {
  return (
    <section className="tpa-module tps-use" aria-labelledby="tps-use-h">
      <h2 id="tps-use-h" className="tpa-h2">
        What can {they ? "they" : "I"} use it on?
      </h2>
      <dl className="tps-use-list">
        {PLACES.map((p) => (
          <div key={p.id}>
            <dt>{p.name}</dt>
            <dd>{p.what}</dd>
          </div>
        ))}
      </dl>
      <p className="tps-use-foot">
        {they ? "Their" : "Your"} ${CREDIT} and the {PERCENT}% also cover event tickets at every Plus place, and
        cover and line skips at select places. Not alcohol, but points still earn on&nbsp;everything.
      </p>
    </section>
  );
}
