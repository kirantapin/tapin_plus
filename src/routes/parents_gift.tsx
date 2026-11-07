import { useEffect, useRef, useState } from "react";
import { SAMPLE_GIFT, SCENE_GROUPS, type SceneId } from "../model/gift";
import { getGiftDraft, giftDraftTouched, setGiftDraft, useGiftDraft } from "../model/giftDraft";

/** The seasonal background for today: Thanksgiving until it's past, the
 *  general Holiday through December, New Year's for its first week. */
export function seasonNow(d = new Date()): SceneId {
  const m = d.getMonth();
  const day = d.getDate();
  if (m === 10 && day <= 26) return "thanksgiving";
  if (m === 0 && day <= 7) return "newyear";
  return "holiday";
}
import { EnvelopeDemo, SAMPLE_PHOTO_SRC } from "./GiftPage";

/* ══ THE GIFT CALLOUT ON /parents (Sam, 6 Nov 2026; picked: 3 · Envelope) ═══
   The parents page says a parent can send Plus with a note, and that their
   student opens it like a present (routes/GiftPage.tsx). A maroon band with
   an envelope that opens as it comes into view: the seal lifts, the flap
   swings back, a letter rises with a note in it. Its button opens the
   checkout with the note already open (ParentCheckout's `note`); "See what
   they'll see" opens the sample gift page. */


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

/* The envelope's own note: Sam's sample note, cut down (6 Nov 2026: the
   whole note "might be a bit too long now" for the card in this band, then
   "i liked how we had slightly longer text here, just not too long"). The
   preview and the sample page show it whole. */
const ENVELOPE_NOTE = "Thinking of you, my love! Here’s a little treat. Proud of you!";

export function GiftEnvelope({ onSend }: { onSend: (el: HTMLElement) => void }) {
  const box = useRef<HTMLDivElement | null>(null);
  const seen = useSeenOnce(box, 0.6);
  /* Its button opens the builder (the care package, step 1), as every
     button on the page does; the builder is the preview now. */
  const send = useRef<HTMLButtonElement | null>(null);
  /* The background, tried here (Sam, 6 Nov 2026: "there should be an option
     to select the seasonal backgrounds here so that they can be previewed,
     the default would be the [band] you see here, but right under the build
     your care package button maybe we show the seasonal options and then a
     "view more" option"): the band wears the pick, and it's the gift's
     background (the draft), so the builder opens on it. */
  /* Seasonal only (Sam, 6 Nov 2026: "let's get rid of the maroon one, and
     just go with the seasonal and view more with the parent container"): the
     band opens on today's season, which the gift then starts on too (the
     draft, if they haven't picked), so the band never shows one look and the
     gift sends another. */
  const { scene } = useGiftDraft();
  const choices = SCENE_GROUPS.find((g) => g.label === "Seasonal")?.scenes ?? [];
  const season = seasonNow();
  useEffect(() => {
    if (!giftDraftTouched(getGiftDraft())) setGiftDraft({ scene: season });
    // Once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = choices.some((c) => c.id === scene) ? scene : season;
  return (
    <section className="tpg tpg-env" aria-labelledby="tpg-env-h" data-scene={shown}>
      <span className="tpg-env-bg scene-swatch" data-scene={shown} aria-hidden="true" />
      {/* The gift page's own care package and opening (GiftPage.tsx
          EnvelopeDemo), so the parent sees what their student will. */}
      <div ref={box} className="tpg-env-art">
        <EnvelopeDemo
          play={seen}
          onPick={() => send.current && onSend(send.current)}
          gift={{ to: SAMPLE_GIFT.to, from: SAMPLE_GIFT.from, note: ENVELOPE_NOTE, photo: SAMPLE_PHOTO_SRC }}
        />
      </div>
      <div className="tpg-env-copy">
        <h2 id="tpg-env-h" className="tpg-env-h">
          Send it with a note
        </h2>
        <p>
          Write them a few words and add a photo when you sign up. They get
          a text, tap it, and open their Plus like a present.
        </p>
        <button ref={send} type="button" className="tpg-env-cta" onClick={(e) => onSend(e.currentTarget)}>
          Build their care package
        </button>
        <div className="tpg-env-pick">
          <span className="tpg-env-pick-h">
            Seasonal <span className="tpg-env-tag">Limited time</span>
          </span>
          <div className="tpg-env-row" role="radiogroup" aria-label="Background">
            {choices.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={shown === c.id}
                aria-label={c.name}
                title={c.name}
                className="tpg-env-sw"
                onClick={() => setGiftDraft({ scene: c.id as SceneId })}
              >
                <span className="scene-swatch" data-scene={c.id} aria-hidden="true" />
              </button>
            ))}
            <button type="button" className="tpg-env-more" onClick={(e) => onSend(e.currentTarget)}>
              View more
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
