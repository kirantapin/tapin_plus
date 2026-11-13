import { useCallback, useEffect, useRef, useState } from "react";
import type { LitePlace } from "../model/lite";
import { LiteMark } from "./LiteMark";
import { useLiveLeft } from "./LiveSoon";

/* ══ JUST JOINED, AS A STORY (Sam, 13 Nov 2026, of take 1 of five: "this is
   perfect, just /impeccable polish now") ═══════════════════════════════════════
   Under How it works, the way the students who come from Instagram already
   read news: one frame a place, full-bleed photo, two segments up top that
   fill and move on by themselves. Tap the right of the frame for the next,
   the left for the one before, press and hold to pause, or swipe. It waits
   while off screen, hovered, focused or the tab is hidden, and under reduced
   motion it holds still with both segments shown. The only other motion is
   the photo's slow push in while its segment fills. Replaces the one-card
   LiteJoined and the four other takes. Styles: .tln-*. */

const STORY_MS = 5200;
/** A press held this long pauses instead of tapping through. */
const HOLD_MS = 260;

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const names = (list: LitePlace[]) =>
  list.length === 1 ? list[0].name : `${list.slice(0, -1).map((p) => p.name).join(", ")} and ${list[list.length - 1].name}`;

const pct = (b: string) => b.match(/\d+%/)?.[0] ?? null;

export function LiteStory({ places }: { places: LitePlace[] }) {
  const row = useRef<HTMLDivElement | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);
  const fills = useRef<(HTMLElement | null)[]>([]);
  const photos = useRef<(HTMLImageElement | null)[]>([]);
  const pressed = useRef<number | null>(null);
  const [at, setAt] = useState(0);
  const [seen, setSeen] = useState(false);
  const [hover, setHover] = useState(false);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const left = useLiveLeft();
  const n = places.length;

  /* Which frame is in view, as the row is swiped. */
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const read = () => setAt(Math.max(0, Math.min(n - 1, Math.round(el.scrollLeft / (el.clientWidth || 1)))));
    el.addEventListener("scroll", read, { passive: true });
    return () => el.removeEventListener("scroll", read);
  }, [n]);
  const go = useCallback(
    (i: number) => {
      const el = row.current;
      if (!el) return;
      const to = ((i % n) + n) % n;
      el.scrollTo({ left: to * el.clientWidth, behavior: still() ? "auto" : "smooth" });
      setAt(to);
    },
    [n],
  );

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver !== "function") return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    const vis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  /* The current segment fills and the story moves on; the earlier ones stay
     full, the later ones empty. Paused, it keeps its place. */
  const runs = useRef<Animation[]>([]);
  useEffect(() => {
    runs.current.forEach((r) => r.cancel());
    runs.current = [];
    fills.current.forEach((f, i) => {
      if (f) f.style.transform = `scaleX(${i < at ? 1 : 0})`;
    });
    const f = fills.current[at];
    const photo = photos.current[at];
    if (!f) return;
    if (still() || typeof f.animate !== "function") {
      fills.current.forEach((g) => g && (g.style.transform = "scaleX(1)"));
      return;
    }
    const bar = f.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: STORY_MS, easing: "linear", fill: "forwards" });
    bar.onfinish = () => go(at + 1);
    runs.current.push(bar);
    if (photo?.animate) runs.current.push(photo.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }], { duration: STORY_MS, easing: "linear", fill: "forwards" }));
    return () => runs.current.forEach((r) => r.cancel());
  }, [at, go]);
  const playing = seen && !hover && !held && !hidden;
  useEffect(() => {
    runs.current.forEach((r) => (playing ? r.play() : r.pause()));
  }, [playing, at]);

  const tap = (dir: 1 | -1) => () => {
    /* A long press paused; letting go doesn't also skip. */
    const long = pressed.current !== null && Date.now() - pressed.current >= HOLD_MS;
    pressed.current = null;
    if (!long) go(at + dir);
  };

  if (!n) return null;
  return (
    <section className="tpa-module tln" aria-labelledby="tln-h">
      <h2 id="tln-h" className="tln-h">
        {names(places)} just joined&nbsp;Tapin
      </h2>
      <div
        ref={wrap}
        className="tln-story"
        data-paused={!playing || undefined}
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => {
          setHover(false);
          setHeld(false);
        }}
        onPointerDown={() => {
          pressed.current = Date.now();
          setHeld(true);
        }}
        onPointerUp={() => setHeld(false)}
        onPointerCancel={() => setHeld(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        <div className="tln-story-bars" aria-hidden="true">
          {places.map((p, i) => (
            <span key={p.id}>
              <i ref={(el) => (fills.current[i] = el)} />
            </span>
          ))}
        </div>
        <div
          ref={row}
          className="tln-row"
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label="Places that just joined"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              go(at + (e.key === "ArrowRight" ? 1 : -1));
            }
          }}
        >
          {places.map((p, i) => (
            <article
              key={p.id}
              className="tln-slide tln-story-frame"
              role="group"
              aria-roledescription="slide"
              aria-label={`${p.name}, ${i + 1} of ${n}`}
            >
              <img
                ref={(el) => (photos.current[i] = el)}
                className="tln-story-photo"
                src={p.photo}
                alt=""
                decoding="async"
                loading="lazy"
              />
              <span className="tln-story-shade" aria-hidden="true" />
              <div className="tln-story-who">
                <img className="tln-logo" data-round={p.round ? "" : undefined} src={p.logo} alt="" width="38" height="38" decoding="async" loading="lazy" />
                <span>
                  <b>{p.name}</b>
                  <span className="tnum">{left ? `Live on Plus Fri 20 Nov · ${left} to go` : p.kind}</span>
                </span>
              </div>
              <div className="tln-story-say">
                <p className="tln-story-big">Just joined Tapin</p>
                <ul>
                  {p.perks.map((k) => (
                    <li key={k.key}>
                      {k.key === "free" && p.item ? <img src={p.item} alt="" /> : <span className="tnum">{pct(k.b)}</span>}
                      <p>
                        <b>{k.b}</b>
                        <span>{k.when}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <button type="button" className="tln-story-tap" data-side="back" tabIndex={-1} aria-label="Previous place" onClick={tap(-1)} />
              <button type="button" className="tln-story-tap" data-side="next" tabIndex={-1} aria-label="Next place" onClick={tap(1)} />
            </article>
          ))}
        </div>
      </div>
      <p className="tln-foot">
        <LiteMark className="lite-mark" />
        <span>{n > 1 ? "Both come with Plus, as Tapin Lite places." : "Comes with Plus, as a Tapin Lite place."}</span>
      </p>
    </section>
  );
}
