import { useEffect, useRef, useState } from "react";
import { SAMPLE_GIFT } from "../model/gift";
import { EnvelopeDemo } from "./GiftPage";

/* ══ THE GIFT CALLOUT ON /parents (Sam, 6 Nov 2026; picked: 3 · Envelope) ═══
   The parents page says a parent can send Plus with a note, and that their
   student opens it like a present (routes/GiftPage.tsx). A maroon band with
   an envelope that opens as it comes into view: the seal lifts, the flap
   swings back, a letter rises with a note in it. Its button opens the
   checkout with the note already open (ParentCheckout's `note`); "See what
   they'll see" opens the sample gift page. */

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
  return (
    <section className="tpg tpg-env" aria-labelledby="tpg-env-h">
      {/* The gift page's own care package and opening (GiftPage.tsx
          EnvelopeDemo), so the parent sees what their student will. */}
      <div ref={box} className="tpg-env-art">
        <EnvelopeDemo
          play={seen}
          gift={{ to: SAMPLE_GIFT.to, from: SAMPLE_GIFT.from, note: "Lunch is on me this semester. So proud of you!" }}
        />
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
