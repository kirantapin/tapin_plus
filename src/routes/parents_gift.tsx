import { useEffect, useRef, useState } from "react";
import { SAMPLE_GIFT } from "../model/gift";
import { FlatMark, reducedMotion } from "./parents_kit";

/* ══ THE GIFT CALLOUT ON /parents (Sam, 6 Nov 2026; picked: 3 · Envelope) ═══
   The parents page says a parent can send Plus with a note, and that their
   student opens it like a present (routes/GiftPage.tsx). A maroon band with
   an envelope that opens as it comes into view: the seal lifts, the flap
   swings back, a letter rises with a note in it. Its button opens the
   checkout with the note already open (ParentCheckout's `note`); "See what
   they'll see" opens the sample gift page. */

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SAMPLE = "/gift/sample";

/** Once, the first time `el` is mostly on screen. */
function useSeenOnce(el: React.RefObject<HTMLElement | null>, threshold = 0.45) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = el.current;
    if (!node || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [el, seen, threshold]);
  return seen;
}

export function GiftEnvelope({ onSend }: { onSend: (el: HTMLElement) => void }) {
  const box = useRef<HTMLDivElement | null>(null);
  const seen = useSeenOnce(box, 0.6);
  const flap = useRef<HTMLSpanElement | null>(null);
  const seal = useRef<HTMLSpanElement | null>(null);
  const letter = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!seen) return;
    const still = reducedMotion();
    const o = (delay: number, duration: number): KeyframeAnimationOptions => ({
      delay: still ? 0 : delay,
      duration: still ? 0 : duration,
      easing: EASE,
      fill: "forwards",
    });
    const runs = [
      seal.current?.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.15)", opacity: 1, offset: 0.35 }, { transform: "scale(.3)", opacity: 0 }], o(250, 320)),
      flap.current?.animate(
        [
          { transform: "rotateX(0deg)", zIndex: 4 },
          { transform: "rotateX(90deg)", zIndex: 4, offset: 0.5 },
          { transform: "rotateX(90deg)", zIndex: 1, offset: 0.501 },
          { transform: "rotateX(180deg)", zIndex: 1 },
        ],
        { ...o(420, 560), easing: "cubic-bezier(.45,0,.25,1)" },
      ),
      letter.current?.animate([{ transform: "translateY(0)" }, { transform: "translateY(-46%)" }], o(860, 760)),
    ];
    return () => runs.forEach((r) => r?.cancel());
  }, [seen]);
  return (
    <section className="tpg tpg-env" aria-labelledby="tpg-env-h">
      <div ref={box} className="tpg-env-art" aria-hidden="true">
        <span className="tpg-env-stage">
          <i className="tpg-env-back" />
          <span ref={letter} className="tpg-env-letter">
            <b>For {SAMPLE_GIFT.to}</b>
            <span>Lunch is on me this semester. So proud of you.</span>
            <em>{SAMPLE_GIFT.from}</em>
          </span>
          <i className="tpg-env-pocket" />
          <span ref={flap} className="tpg-env-flap" />
          <span ref={seal} className="tpg-env-seal">
            <FlatMark />
          </span>
        </span>
      </div>
      <div className="tpg-env-copy">
        <h2 id="tpg-env-h" className="tpg-env-h">
          Send it with a note
        </h2>
        <p>
          Write them a few words when you sign up. They get a text, tap it,
          and open their Plus like a present.
        </p>
        <button type="button" className="tpg-env-cta" onClick={(e) => onSend(e.currentTarget)}>
          Send Tapin Plus
        </button>
        <a className="tpg-env-link" href={SAMPLE} target="_blank" rel="noreferrer">
          See what they’ll see
        </a>
      </div>
    </section>
  );
}
