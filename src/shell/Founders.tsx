import { useRef, useState } from "react";
import { asset } from "../asset";
import { CREDIT, PLACES } from "../routes/parents_kit";

/* ══ WHY WE BROUGHT PLUS TO BLACKSBURG (Sam, 10 Nov 2026: "for all landing
   pages, I'd like to have a section with Rob and I's image, as the founders
   of Tapin and why we brought tapin plus to blacksburg") ═══════════════════
   Round 2, preview only (?founders&fv=b|c). Of round 1 Sam said "All of
   these are too busy, we need to simplify, maybe with read more. I like B or
   C though". So each is now the heading, one line, the two of them and the
   signature; the rest of the story waits behind Read more.

   B · The line: the founder film's line set large, the portraits by the
       signature.
   C · The letter: one line, then the two rising out of the card's foot
       beside the signature.

   The story is the founder film's, which Sam signed off (4–5 Nov 2026, "A
   Hokie and a Wahoo"). Until Sam says which photo is whom, neither photo
   carries a name on its own. */

const TEE = asset("/brand/founder-tee.webp");
const BLAZER = asset("/brand/founder-blazer.webp");

/** B is the section, on every page (Sam, 10 Nov 2026, after a look at C
 *  live: "actually let's do the other version, rob and I floating there just
 *  looks a bit weird"); ?fv=c still previews C. */
export type FounderV = "b" | "c" | "d";
const version = (): FounderV => {
  if (typeof window === "undefined") return "b";
  const v = new URLSearchParams(window.location.search).get("fv");
  return v === "c" || v === "d" ? v : "b";
};

const count = PLACES.length === 5 ? "five" : String(PLACES.length);
const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The rest of the story, opened in place. It rises in a touch as it
 *  opens (WAAPI, none with reduced motion); the button names its action. */
function More({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLDivElement | null>(null);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !still()) {
      requestAnimationFrame(() =>
        body.current?.animate?.([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], {
          duration: 260,
          easing: "cubic-bezier(.16,1,.3,1)",
        }),
      );
    }
  };
  return (
    <>
      <div ref={body} id="tpf-more" className="tpf-more" hidden={!open}>
        {children}
      </div>
      <button type="button" className="tpf-toggle" aria-expanded={open} aria-controls="tpf-more" onClick={toggle}>
        {open ? "Read less" : "Read more"}
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" data-open={open ? "" : undefined}>
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );
}

/* Sam, 10 Nov 2026: "we should mention that rob is a hokie alum, sam a uva
   alum, this is our contribution to world peace". */
const ALUMS = "Rob’s a Hokie alum, Sam’s a UVA alum. Tapin is our contribution to world peace.";

const Story = ({ line = false, they = false }: { line?: boolean; they?: boolean }) => (
  <>
    <p>
      We’re regulars all over town. Coffee here, lunch there, dinner somewhere else.
      {line ? " And a regular everywhere is a member nowhere." : ""}
    </p>
    <p>
      The places we love share the same regulars, but each one is on its own, up against chains with bigger budgets. So we put them together: one
      membership, {count} local spots, no&nbsp;chains.
    </p>
    <p className="tnum">
      {they ? `Your student gets $${CREDIT} at each of them every month. The places get new regulars.` : `You get $${CREDIT} at each of them every month. They get new regulars.`}{" "}
      That’s the whole&nbsp;idea.
    </p>
  </>
);

const Sign = () => (
  <p className="tpf-sign">
    Rob &amp; Sam
    <span>Founders, Tapin</span>
  </p>
);

/** `they`: the parents page, where it's their student who gets the $5. */
/* D · TWO PORTRAITS (Sam, 10 Nov 2026, of B live: "still don't love the
   way this looks"). The two of them are the picture: each on a portrait tile
   in his school's colour, Rob on Virginia Tech maroon, Sam on UVA navy,
   side by side, so the rivalry is the joke without saying it twice. Who is
   whom is Sam's answer (Rob is the blazer). One heading, one line, Read
   more; the founder film's line opens the story. */
function Tiles({ they }: { they: boolean }) {
  return (
    <section className="tpa-module tpf tpf-d" aria-labelledby="tpf-h" data-ph-show="">
      <ul className="tpf-d-pair" aria-label="Tapin’s founders">
        <li>
          <div className="tpf-d-tile" data-school="vt">
            <img src={BLAZER} alt="Rob" decoding="async" loading="lazy" />
          </div>
          <p>
            <b>Rob</b>
            <span>Virginia Tech alum</span>
          </p>
        </li>
        <li>
          <div className="tpf-d-tile" data-school="uva">
            <img src={TEE} alt="Sam" decoding="async" loading="lazy" />
          </div>
          <p>
            <b>Sam</b>
            <span>UVA alum</span>
          </p>
        </li>
      </ul>
      <div className="tpf-words">
        <h2 id="tpf-h" className="tpa-h2">
          Why we brought Plus to Blacksburg
        </h2>
        <p>A Hokie and a Wahoo. Tapin is our contribution to world&nbsp;peace.</p>
        <More>
          <Story line they={they} />
        </More>
      </div>
    </section>
  );
}

export function Founders({ they = false }: { they?: boolean }) {
  const v = version();
  if (v === "d") return <Tiles they={they} />;
  if (v === "b") {
    return (
      <section className="tpa-module tpf tpf-b" aria-labelledby="tpf-h" data-ph-show="">
        <h2 id="tpf-h" className="tpa-h2">
          Why we brought Plus to Blacksburg
        </h2>
        <blockquote className="tpf-b-line">
          <p>“A regular everywhere is a member nowhere.”</p>
        </blockquote>
        <p className="tpf-alums">{ALUMS}</p>
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
        <More>
          <Story they={they} />
        </More>
      </section>
    );
  }
  return (
    <section className="tpa-module tpf tpf-c" aria-labelledby="tpf-h" data-ph-show="">
      <div className="tpf-words">
        <h2 id="tpf-h" className="tpa-h2">
          Why we brought Plus to Blacksburg
        </h2>
        <p>{ALUMS}</p>
        <More>
          <Story line they={they} />
        </More>
      </div>
      <div className="tpf-c-foot">
        <Sign />
        <div className="tpf-pair" role="img" aria-label="Rob and Sam, Tapin’s founders">
          <img className="tpf-tee" src={TEE} alt="" decoding="async" loading="lazy" />
          <img className="tpf-blazer" src={BLAZER} alt="" decoding="async" loading="lazy" />
        </div>
      </div>
    </section>
  );
}
