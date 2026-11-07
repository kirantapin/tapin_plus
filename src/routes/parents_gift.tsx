import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SAMPLE_GIFT, SCENE_GROUPS, type SceneId } from "../model/gift";
import { getGiftDraft, giftDraftTouched, setGiftDraft, useGiftDraft } from "../model/giftDraft";
import { EnvelopeDemo, SAMPLE_PHOTO_SRC } from "./GiftPage";

/** The band's swatches: the seasons, not the religious holidays. */
const BAND_SCENES: readonly SceneId[] = ["leaves", "thanksgiving", "newyear", "snow"];

/** The seasonal background for today: Thanksgiving until it's past, the
 *  general Holiday through December, New Year's for its first week, Snow
 *  for the rest of winter, Fall leaves from September. */
export function seasonNow(d = new Date()): SceneId {
  const m = d.getMonth();
  const day = d.getDate();
  if (m === 10 && day <= 26) return "thanksgiving";
  if (m === 0 && day <= 7) return "newyear";
  if (m === 11 || m === 10) return "holiday";
  if (m >= 8) return "leaves";
  return "snow";
}

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
  /* The band shows the seasons, not the religious holidays (Sam, 6 Nov
     2026: "the religious one's wouldn't be the first in the preview on the
     main page, maybe we just show snow, thanksgiving, new years, fall
     leaves"); Hanukkah, Christmas and Holiday are in View more (the
     builder). In December, when today's season is a holiday, the band and
     the gift start on Snow. */
  const choices = (SCENE_GROUPS.find((g) => g.label === "Seasonal")?.scenes ?? []).filter((c) => BAND_SCENES.includes(c.id));
  const today = seasonNow();
  const season: SceneId = BAND_SCENES.includes(today) ? today : "snow";
  useEffect(() => {
    /* Quiet: the page's pick, not theirs, so it isn't kept for later
       (model/checkoutResume.ts). */
    if (!giftDraftTouched(getGiftDraft())) setGiftDraft({ scene: season }, { quiet: true });
    // Once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = choices.some((c) => c.id === scene) ? scene : season;
  /* One row (Sam, 6 Nov 2026: "we can just show one row of options here"):
     as many swatches as fit beside View more, in the calendar's order from
     the season before today's; the one showing is always among them. */
  const row = useRef<HTMLDivElement | null>(null);
  const [fits, setFits] = useState(choices.length);
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const measure = () => {
      const more = el.querySelector<HTMLElement>(".tpg-env-more");
      const sw = el.querySelector<HTMLElement>(".tpg-env-sw");
      if (!more || !sw) return;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 8;
      const n = Math.floor((el.clientWidth - more.offsetWidth) / (sw.offsetWidth + gap));
      setFits(Math.max(1, Math.min(choices.length, n)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [choices.length]);
  const start = Math.max(0, Math.min(choices.findIndex((c) => c.id === season) - 1, choices.length - fits));
  let visible = choices.slice(start, start + fits);
  if (!visible.some((c) => c.id === shown)) {
    const pick = choices.find((c) => c.id === shown);
    if (pick) visible = [...visible.slice(0, -1), pick];
  }
  return (
    <section className="tpg tpg-env" aria-labelledby="tpg-env-h" data-scene={shown}>
      <span className="tpg-env-bg scene-swatch" data-scene={shown} aria-hidden="true" />
      {/* The gift page's own care package and opening (GiftPage.tsx
          EnvelopeDemo), so the parent sees what their student will. */}
      <div ref={box} className="tpg-env-art">
        <EnvelopeDemo
          play={seen}
          scene={shown}
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
        <button ref={send} type="button" className="tpg-env-cta" data-page-cta="" onClick={(e) => onSend(e.currentTarget)}>
          Build their care package
        </button>
        <div className="tpg-env-pick">
          <span className="tpg-env-pick-h">
            Seasonal <span className="tpg-env-tag">Limited time</span>
          </span>
          <div ref={row} className="tpg-env-row" role="radiogroup" aria-label="Background">
            {visible.map((c) => (
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
