import { asset } from "../asset";
import { CREDIT, PLACES } from "../routes/parents_kit";

/* ══ WHY WE BROUGHT PLUS TO BLACKSBURG (Sam, 10 Nov 2026: "for all landing
   pages, I'd like to have a section with Rob and I's image, as the founders
   of Tapin and why we brought tapin plus to blacksburg") ═══════════════════
   Three takes, preview only (?founders&fv=a|b|c), after Sam said of the
   first: "I don't love the founder section you created so far".

   A · Pasted into town: the two cut-outs stand on a strip of the header's
       Blacksburg collage, the note under them.
   B · The line: the founder film's line set large, the two as portraits by
       the signature, the note between.
   C · The letter: the note first, signed, with the two rising out of the
       card's foot.

   The story is the founder film's, which Sam signed off (4–5 Nov 2026, "A
   Hokie and a Wahoo"). Until Sam says which photo is whom, neither photo
   carries a name on its own: they are "Rob and Sam" together. */

const TEE = asset("/brand/founder-tee.webp");
const BLAZER = asset("/brand/founder-blazer.webp");
const COLLAGE = asset("/collage/blacksburg.webp");

export type FounderV = "a" | "b" | "c";
const version = (): FounderV | null => {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  if (!q.has("founders")) return null;
  const v = q.get("fv");
  return v === "b" || v === "c" ? v : "a";
};

const count = PLACES.length === 5 ? "five" : String(PLACES.length);

function Note({ line = true }: { line?: boolean }) {
  return (
    <>
      <p>
        We’re regulars all over town. Coffee here, lunch there, dinner somewhere else.
        {line ? " And a regular everywhere is a member nowhere." : ""}
      </p>
      <p>
        The places we love share the same regulars, but each one is on its own, up against chains with bigger budgets. So we put them together:
        one membership, {count} local spots, no&nbsp;chains.
      </p>
      <p className="tnum">You get ${CREDIT} at each of them every month. They get new regulars. That’s the whole&nbsp;idea.</p>
    </>
  );
}

function Pair({ className }: { className: string }) {
  return (
    <div className={className} role="img" aria-label="Rob and Sam, Tapin’s founders">
      <img className="tpf-tee" src={TEE} alt="" decoding="async" loading="lazy" />
      <img className="tpf-blazer" src={BLAZER} alt="" decoding="async" loading="lazy" />
    </div>
  );
}

const Sign = () => (
  <p className="tpf-sign">
    Rob &amp; Sam
    <span>Founders, Tapin</span>
    <span>A Hokie and a Wahoo</span>
  </p>
);

export function Founders() {
  const v = version();
  if (!v) return null;
  if (v === "a") {
    return (
      <section className="tpa-module tpf tpf-a" aria-labelledby="tpf-h" data-ph-show="">
        <div className="tpf-a-town">
          <img className="tpf-a-art" src={COLLAGE} alt="" decoding="async" loading="lazy" />
          <Pair className="tpf-pair" />
        </div>
        <div className="tpf-words">
          <h2 id="tpf-h" className="tpa-h2">
            Why we brought Plus to Blacksburg
          </h2>
          <Note />
          <Sign />
        </div>
      </section>
    );
  }
  if (v === "b") {
    return (
      <section className="tpa-module tpf tpf-b" aria-labelledby="tpf-h" data-ph-show="">
        <h2 id="tpf-h" className="tpa-h2">
          Why we brought Plus to Blacksburg
        </h2>
        <blockquote className="tpf-b-line">
          <p>“A regular everywhere is a member nowhere.”</p>
        </blockquote>
        <div className="tpf-words">
          <Note line={false} />
        </div>
        <div className="tpf-b-foot">
          <div className="tpf-b-faces" role="img" aria-label="Rob and Sam, Tapin’s founders">
            <span>
              <img src={TEE} alt="" decoding="async" loading="lazy" />
            </span>
            <span>
              <img src={BLAZER} alt="" decoding="async" loading="lazy" />
            </span>
          </div>
          <Sign />
        </div>
      </section>
    );
  }
  return (
    <section className="tpa-module tpf tpf-c" aria-labelledby="tpf-h" data-ph-show="">
      <div className="tpf-words">
        <h2 id="tpf-h" className="tpa-h2">
          Why we brought Plus to Blacksburg
        </h2>
        <Note />
      </div>
      <div className="tpf-c-foot">
        <Sign />
        <Pair className="tpf-pair" />
      </div>
    </section>
  );
}
