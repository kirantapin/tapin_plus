import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { asset } from "../asset";

/* ══ REAL STUDENTS, ON VIDEO (preview only, ?ugc, Sam, 16 Nov 2026: "don't
   we have UGC from Tapin Content Production") ═════════════════════════════
   Two real clips from the ads folder (design-system/tapin-collage-skill/ads/
   ready-to-post): Grace at Coffeeholics (she OK'd it, 14 Nov) and two
   students at Olaika, each with the paper captions Sam approved for the ads.
   Muted, looping, and only playing while on screen; small web copies
   (480 wide, no sound) in public/ugc. With reduced motion they hold their
   first frame. */
/* On for everyone (Sam, 16 Nov 2026: "push when done"); ?nougc hides it. */
export const ugcOn = (): boolean => {
  if (typeof window === "undefined") return true;
  return !new URLSearchParams(window.location.search).has("nougc");
};

const CLIPS = [
  { key: "grace", src: "ugc/grace-coffeeholics.mp4", poster: "ugc/grace-coffeeholics.jpg", who: "Grace", where: "at Coffeeholics" },
  /* Sam, 16 Nov 2026: "can you add this one": a student walking through the
     app on Sweetopia's page (iPhone HDR, tone-mapped with avconvert). Who
     it is: to ask Sam. */
  { key: "sweetopia", src: "ugc/sweetopia-app.mp4", poster: "ugc/sweetopia-app.jpg", who: "In the app", where: "at Sweetopia" },
  { key: "olaika", src: "ugc/olaika.mp4", poster: "ugc/olaika.jpg", who: "VT students", where: "at Olaika" },
  /* Last on the main page, and not on /parents (Sam, 16 Nov 2026). */
  /* Zoe (Sam, 16 Nov 2026: "at the burg", "zoe"), Zoe P. of the student
     voices, with a friend; her own clip, no captions. */
  { key: "zoe", src: "ugc/zoe-theburg.mp4", poster: "ugc/zoe-theburg.jpg", who: "Zoe", where: "at The Burg" },
];

/* One clip at a time has sound: unmuting one mutes the rest. */
const clips = new Set<HTMLVideoElement>();

const SoundIco = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
    {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6m0-6-5 6" />}
  </svg>
);

const EASE = "cubic-bezier(.22,1,.36,1)";
const reduced = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ══ ENLARGED (Sam, 16 Nov 2026: "there needs to be a way to enlarge the
   videos too, without them completely jumping out") ════════════════════════
   Tapping a clip grows it out of its own card: the big player starts at the
   card's exact place and size and eases to the middle of the screen, and
   closing shrinks it back into the card. The page dims behind it (the smoked
   plate, no blur). It picks up where the card was, with the card's sound
   setting. Portalled to body so no filtered ancestor traps it. */
type Open = { src: string; poster: string; label: string; from: DOMRect; time: number; muted: boolean; card: HTMLVideoElement };

function Enlarged({ open, onClosed }: { open: Open; onClosed: () => void }) {
  const frame = useRef<HTMLDivElement | null>(null);
  const shade = useRef<HTMLDivElement | null>(null);
  const vid = useRef<HTMLVideoElement | null>(null);
  const closing = useRef(false);
  const [sound, setSound] = useState(!open.muted);

  /* The card's rect relative to the big frame, as a transform. */
  const fromCard = () => {
    const f = frame.current!.getBoundingClientRect();
    const r = open.card.getBoundingClientRect();
    const sx = r.width / f.width;
    const sy = r.height / f.height;
    return `translate(${r.left - f.left}px, ${r.top - f.top}px) scale(${sx}, ${sy})`;
  };

  useLayoutEffect(() => {
    const v = vid.current!;
    v.currentTime = open.time;
    v.muted = open.muted;
    v.play().catch(() => undefined);
    const still = reduced();
    frame.current!.animate(still ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: fromCard(), borderRadius: "18px" }, { transform: "none", borderRadius: "22px" }], { duration: still ? 160 : 340, easing: EASE });
    shade.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const v = vid.current!;
    /* The card carries on from here, muted like the rest of the row. */
    open.card.currentTime = v.currentTime;
    open.card.muted = true;
    const still = reduced();
    const a = frame.current!.animate(still ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: "none", borderRadius: "22px" }, { transform: fromCard(), borderRadius: "18px" }], { duration: still ? 140 : 300, easing: EASE, fill: "forwards" });
    shade.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: "ease-in", fill: "forwards" });
    a.onfinish = onClosed;
  };

  const toggle = () => {
    const v = vid.current!;
    v.muted = !v.muted;
    setSound(!v.muted);
    if (!v.muted) v.play().catch(() => undefined);
  };

  return createPortal(
    <div className="ugc-big" role="dialog" aria-modal="true" aria-label={open.label}>
      <div ref={shade} className="ugc-big-shade" onClick={close} />
      <div ref={frame} className="ugc-big-frame">
        <video ref={vid} src={asset(open.src)} poster={asset(open.poster)} loop playsInline onClick={toggle} />
        <button type="button" className="ugc-big-close" onClick={close} aria-label="Close" autoFocus>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <button type="button" className="ugc-sound ugc-big-sound" onClick={toggle} aria-pressed={sound} aria-label={sound ? "Mute" : "Unmute"}>
          <SoundIco on={sound} />
        </button>
      </div>
    </div>,
    document.body,
  );
}

function Clip({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [sound, setSound] = useState(false);
  const [open, setOpen] = useState<Open | null>(null);
  const enlarge = () => {
    const v = ref.current;
    if (!v) return;
    /* Enlarged means listening (Sam, 16 Nov 2026: "when I enlarge a video
       it should unmute please"); the tap is the gesture that allows it. */
    clips.forEach((c) => (c.muted = true));
    /* From the top (Sam, 16 Nov 2026: "when I enlarge a video it should
       reset"): the card's loop is somewhere in the middle; enlarged, they
       hear it from the start. */
    setOpen({ src, poster, label, from: v.getBoundingClientRect(), time: 0, muted: false, card: v });
  };
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    clips.add(v);
    const onVol = () => setSound(!v.muted);
    v.addEventListener("volumechange", onVol);
    const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const io = still
      ? null
      : new IntersectionObserver(
          ([e]) => {
            if (e.isIntersecting) v.play().catch(() => undefined);
            else {
              v.pause();
              v.muted = true;
            }
          },
          { threshold: 0.4 },
        );
    io?.observe(v);
    return () => {
      clips.delete(v);
      v.removeEventListener("volumechange", onVol);
      io?.disconnect();
    };
  }, []);
  /* The tap is the gesture iOS needs to let a video make sound; it also
     plays a clip that reduced motion held still. */
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    const on = v.muted;
    clips.forEach((c) => {
      if (c !== v) c.muted = true;
    });
    v.muted = !on;
    if (on) v.play().catch(() => undefined);
  };
  return (
    <div className="ugc-clip">
      <video ref={ref} src={asset(src)} poster={asset(poster)} muted loop playsInline preload="none" aria-hidden="true" onClick={enlarge} style={open ? { visibility: "hidden" } : undefined} />
      {/* The whole clip is the way in; this names it for a screen reader. */}
      <button type="button" className="ugc-open" onClick={enlarge} aria-label={`Watch ${label} larger`} />
      <button type="button" className="ugc-sound" onClick={toggle} aria-pressed={sound} aria-label={sound ? `Mute ${label}` : `Unmute ${label}`}>
        <SoundIco on={sound} />
      </button>
      {open ? <Enlarged open={open} onClosed={() => setOpen(null)} /> : null}
    </div>
  );
}

/** `title`: the parents page says whose students (Sam, 16 Nov 2026: "let's
 *  also add this to the parent's page please"). */
export function UgcRow({ title = "Students using it", without = [] }: { title?: string; without?: string[] } = {}) {
  return (
    <section className="ugc" aria-labelledby="ugc-h">
      <h2 id="ugc-h" className="tpa-h2 tpa-h2-out">
        {title}
      </h2>
      <ul className="ugc-row">
        {CLIPS.filter((c) => !without.includes(c.key)).map((c) => (
          <li key={c.key}>
            <Clip src={c.src} poster={c.poster} label={`${c.who} ${c.where}`} />
            <p>
              <b>{c.who}</b>
              <span>{c.where}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
