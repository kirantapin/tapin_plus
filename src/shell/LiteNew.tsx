import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { LitePlace } from "../model/lite";
import { LiteMark } from "./LiteMark";
import { useLiveLeft } from "./LiveSoon";

/* ══ JUST JOINED, FIVE FRESH TAKES (Sam, 13 Nov 2026: "Don't really like
   either of these, we might need to do a fresh /impeccable design instead of
   a redesign. 5 variations pls") ═════════════════════════════════════════════
   Under How it works, one slide a place, at ?ljv=1..5:
     1 · Story: an Instagram story frame that plays itself, two segments,
         tap the right half to skip, the left to go back.
     2 · Lock screen: the place's photo as the wallpaper, the go-live day as
         the clock, the perks as Tapin notifications.
     3 · Wallet: two passes in a stack; swipe or tap and the other comes to
         the front.
     4 · Cut-up: Tapin's collage look; a torn photo, the logo stuck on, the
         perks on paper label strips.
     5 · Big type: the perk is the headline, the real cookie set in the line.
   Each place's own colour only where its brand is (the pass's band, the
   strip under its name). Styles: .tln-*. */

export type LiteNewV = "1" | "2" | "3" | "4" | "5";
export const liteNewVersion = (): LiteNewV | null => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("ljv");
  return v === "1" || v === "2" || v === "3" || v === "4" || v === "5" ? v : null;
};

/** Each place's own colour, from its mark: Crumbl's pink with black type,
 *  Italiano's red with white. */
const BRAND: Record<string, { ground: string; ink: string }> = {
  crumbl: { ground: "#feb9ce", ink: "#141618" },
  italianospizza: { ground: "#ba150f", ink: "#ffffff" },
};
const brand = (p: LitePlace) => BRAND[p.id] ?? { ground: "#141618", ink: "#ffffff" };

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const names = (list: LitePlace[]) =>
  list.length === 1 ? list[0].name : `${list.slice(0, -1).map((p) => p.name).join(", ")} and ${list[list.length - 1].name}`;

/** A perk's figure: "10%", or null for a free item. */
const pct = (b: string) => b.match(/\d+%/)?.[0] ?? null;

/** A scroll-snapped row: which slide is in view, and a way to go to one. */
function useSlides(count: number) {
  const row = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState(0);
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const read = () => {
      const w = el.clientWidth || 1;
      setAt(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / w))));
    };
    el.addEventListener("scroll", read, { passive: true });
    return () => el.removeEventListener("scroll", read);
  }, [count]);
  const go = useCallback(
    (i: number) => {
      const el = row.current;
      if (!el) return;
      const to = ((i % count) + count) % count;
      el.scrollTo({ left: to * el.clientWidth, behavior: still() ? "auto" : "smooth" });
      setAt(to);
    },
    [count],
  );
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(at + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(at - 1);
    }
  };
  return { row, at, go, onKey };
}

const rowA11y = (label: string) => ({
  tabIndex: 0,
  role: "group" as const,
  "aria-roledescription": "carousel",
  "aria-label": label,
});
const slideA11y = (p: LitePlace, i: number, n: number) => ({
  role: "group" as const,
  "aria-roledescription": "slide",
  "aria-label": `${p.name}, ${i + 1} of ${n}`,
});

function Logo({ place, size, className = "tln-logo" }: { place: LitePlace; size: number; className?: string }) {
  return (
    <img
      className={className}
      data-round={place.round ? "" : undefined}
      src={place.logo}
      alt=""
      width={size}
      height={size}
      decoding="async"
      loading="lazy"
    />
  );
}

function Foot({ places }: { places: LitePlace[] }) {
  return (
    <p className="tln-foot">
      <LiteMark className="lite-mark" />
      <span>{places.length > 1 ? "Both come with Plus, as Tapin Lite places." : "Comes with Plus, as a Tapin Lite place."}</span>
    </p>
  );
}

function Heading({ places }: { places: LitePlace[] }) {
  return (
    <h2 id="tln-h" className="tln-h">
      {names(places)} just joined&nbsp;Tapin
    </h2>
  );
}

/* ── 1 · STORY ─────────────────────────────────────────────────────────── */
const STORY_MS = 5200;

function Story({ places }: { places: LitePlace[] }) {
  const { row, at, go, onKey } = useSlides(places.length);
  const fills = useRef<(HTMLElement | null)[]>([]);
  const wrap = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [seen, setSeen] = useState(false);
  const left = useLiveLeft();
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver !== "function") return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    /* Segments before this one full, after it empty. */
    fills.current.forEach((f, i) => {
      if (!f) return;
      f.getAnimations?.().forEach((a) => a.cancel());
      f.style.transform = `scaleX(${i < at ? 1 : 0})`;
    });
    const f = fills.current[at];
    if (!f) return;
    if (still() || typeof f.animate !== "function") {
      f.style.transform = "scaleX(1)";
      return;
    }
    if (!seen || paused || document.hidden) return;
    const run = f.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: STORY_MS, easing: "linear", fill: "forwards" });
    run.onfinish = () => go(at + 1);
    return () => run.cancel();
  }, [at, seen, paused, go]);
  return (
    <div
      ref={wrap}
      className="tln-story"
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="tln-story-bars" aria-hidden="true">
        {places.map((p, i) => (
          <span key={p.id}>
            <i ref={(el) => (fills.current[i] = el)} />
          </span>
        ))}
      </div>
      <div ref={row} className="tln-row" onKeyDown={onKey} {...rowA11y("Places that just joined")}>
        {places.map((p, i) => (
          <article key={p.id} className="tln-slide tln-story-frame" {...slideA11y(p, i, places.length)}>
            <img className="tln-story-photo" src={p.photo} alt="" decoding="async" loading="lazy" />
            <span className="tln-story-shade" aria-hidden="true" />
            <div className="tln-story-who">
              <Logo place={p} size={36} />
              <span>
                <b>{p.name}</b>
                {left ? <span>Live on Plus Fri 20 Nov</span> : <span>On Tapin Lite</span>}
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
            {/* Tap the left third to go back, the rest to go on. */}
            <button type="button" className="tln-story-tap" data-side="back" aria-label="Previous place" onClick={() => go(i - 1)} />
            <button type="button" className="tln-story-tap" data-side="next" aria-label="Next place" onClick={() => go(i + 1)} />
          </article>
        ))}
      </div>
    </div>
  );
}

/* ── 2 · LOCK SCREEN ───────────────────────────────────────────────────── */
function LockScreen({ places }: { places: LitePlace[] }) {
  const { row, at, go, onKey } = useSlides(places.length);
  const left = useLiveLeft();
  return (
    <div className="tln-lock">
      <div ref={row} className="tln-row" onKeyDown={onKey} {...rowA11y("Places that just joined")}>
        {places.map((p, i) => (
          <article key={p.id} className="tln-slide tln-lock-screen" {...slideA11y(p, i, places.length)}>
            <img className="tln-lock-photo" src={p.photo} alt="" decoding="async" loading="lazy" />
            <span className="tln-lock-shade" aria-hidden="true" />
            <div className="tln-lock-time">
              <span>{left ? "Live on Plus" : "Now on Plus"}</span>
              <b className="tnum">{left ? "Fri 20" : "Live"}</b>
              {left ? <span className="tnum">{left} to go</span> : null}
            </div>
            <ul className="tln-lock-notes">
              {[{ key: "news", b: `${p.name} just joined Tapin`, when: p.kind }, ...p.perks].map((k, n) => (
                <li key={k.key} className="tln-note" style={{ "--n": n } as CSSProperties}>
                  {k.key === "free" && p.item ? (
                    <img className="tln-note-ico" src={p.item} alt="" />
                  ) : k.key === "news" ? (
                    <Logo place={p} size={36} className="tln-note-ico" />
                  ) : (
                    <span className="tln-note-ico tln-note-pct tnum">{pct(k.b)}</span>
                  )}
                  <p>
                    <span className="tln-note-app">
                      <span>Tapin</span>
                      <span>{k.key === "news" ? "now" : p.name}</span>
                    </span>
                    <b>{k.b}</b>
                    <span>{k.when}</span>
                  </p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="tln-pagedots">
        {places.map((p, i) => (
          <button key={p.id} type="button" aria-label={`Show ${p.name}`} aria-current={i === at ? "true" : undefined} onClick={() => go(i)} />
        ))}
      </div>
    </div>
  );
}

/* ── 3 · WALLET ────────────────────────────────────────────────────────── */
function Wallet({ places }: { places: LitePlace[] }) {
  const [front, setFront] = useState(0);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const start = useRef<number | null>(null);
  const left = useLiveLeft();
  const next = (dir = 1) => {
    const leaving = cards.current[front];
    if (leaving && !still() && typeof leaving.animate === "function") {
      leaving.animate(
        [
          { transform: "none" },
          { transform: `translate(${dir * -46}%, 6%) rotate(${dir * -7}deg)`, offset: 0.45 },
          { transform: "translateY(-16px) scale(0.93)" },
        ],
        { duration: 560, easing: "cubic-bezier(.3,.7,.2,1)" },
      );
    }
    setFront((f) => (f + 1) % places.length);
  };
  return (
    <div className="tln-wallet">
      <div
        className="tln-deck"
        {...rowA11y("Places that just joined")}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            next(e.key === "ArrowLeft" ? -1 : 1);
          }
        }}
        onPointerDown={(e) => (start.current = e.clientX)}
        onPointerUp={(e) => {
          if (start.current === null) return;
          const dx = e.clientX - start.current;
          start.current = null;
          next(dx > 0 ? -1 : 1);
        }}
      >
        {places.map((p, i) => {
          const b = brand(p);
          const pos = (i - front + places.length) % places.length;
          return (
            <article
              key={p.id}
              ref={(el) => (cards.current[i] = el)}
              className="tln-pass"
              data-pos={pos}
              aria-hidden={pos !== 0}
              {...slideA11y(p, i, places.length)}
              style={{ "--g": b.ground, "--k": b.ink } as CSSProperties}
            >
              <header className="tln-pass-band">
                <Logo place={p} size={40} />
                <span>
                  <b>{p.name}</b>
                  <span>{p.kind}</span>
                </span>
                <span className="tln-pass-tier">
                  <LiteMark className="lite-mark" />
                  Lite
                </span>
              </header>
              <ul className="tln-pass-perks">
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
              <footer className="tln-pass-foot">
                <span>{left ? "Live on Plus" : "On Plus"}</span>
                <b className="tnum">{left ? "Fri 20 Nov" : "Now"}</b>
              </footer>
            </article>
          );
        })}
      </div>
      <p className="tln-wallet-hint tnum" aria-live="polite">
        <b>{places[front]?.name}</b> · {front + 1} of {places.length}
        <span> · tap or swipe for the next</span>
      </p>
    </div>
  );
}

/* ── 4 · CUT-UP ────────────────────────────────────────────────────────── */
/** A torn paper edge along the photo's foot: a fixed ragged line. */
const TORN = (() => {
  const pts: string[] = ["0% 0%", "100% 0%"];
  const steps = 26;
  for (let s = steps; s >= 0; s--) {
    const x = (s / steps) * 100;
    const y = 100 - [3.5, 1, 4.5, 2, 5, 0.5, 3, 1.5, 4, 2.5][s % 10];
    pts.push(`${x.toFixed(2)}% ${y}%`);
  }
  return `polygon(${pts.join(", ")})`;
})();

function CutUp({ places }: { places: LitePlace[] }) {
  const { row, at, go, onKey } = useSlides(places.length);
  return (
    <div className="tln-cut">
      <div ref={row} className="tln-row" onKeyDown={onKey} {...rowA11y("Places that just joined")}>
        {places.map((p, i) => {
          const b = brand(p);
          return (
            <article key={p.id} className="tln-slide tln-cut-slide" {...slideA11y(p, i, places.length)}>
              <div className="tln-cut-photo" style={{ clipPath: TORN }}>
                <img src={p.photo} alt="" decoding="async" loading="lazy" />
              </div>
              <Logo place={p} size={64} className="tln-cut-sticker" />
              <p className="tln-cut-name" style={{ background: b.ground, color: b.ink }}>
                {p.name}
              </p>
              <ul className="tln-cut-strips">
                {p.perks.map((k, n) => (
                  <li key={k.key} style={{ "--n": n } as CSSProperties}>
                    {k.key === "free" && p.item ? <img src={p.item} alt="" /> : null}
                    <span>
                      <b>{k.b}</b> {k.when.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      <div className="tln-cut-tabs">
        {places.map((p, i) => (
          <button key={p.id} type="button" aria-current={i === at ? "true" : undefined} onClick={() => go(i)}>
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 5 · BIG TYPE ──────────────────────────────────────────────────────── */
function BigType({ places }: { places: LitePlace[] }) {
  const { row, at, go, onKey } = useSlides(places.length);
  return (
    <div className="tln-type">
      <div className="tln-type-tabs" role="tablist" aria-label="Places">
        {places.map((p, i) => (
          <button key={p.id} type="button" role="tab" aria-selected={i === at} onClick={() => go(i)}>
            <Logo place={p} size={24} />
            {p.name}
          </button>
        ))}
      </div>
      <div ref={row} className="tln-row" onKeyDown={onKey} {...rowA11y("Places that just joined")}>
        {places.map((p, i) => {
          const off = p.perks.find((k) => k.key === "percent");
          const free = p.perks.find((k) => k.key === "free");
          return (
            <article key={p.id} className="tln-slide tln-type-slide" {...slideA11y(p, i, places.length)}>
              {off ? (
                <p className="tln-type-line">
                  <b className="tnum">{pct(off.b)} off</b>
                  <span>
                    {off.b.replace(/^\d+%\s*off\s*/, "")}, {off.when.toLowerCase()}
                  </span>
                </p>
              ) : null}
              {free ? (
                <p className="tln-type-plus">
                  <span className="tln-type-and">+</span> a free {p.item ? <img src={p.item} alt="" /> : null}{" "}
                  {free.b.replace(/^A free\s*/i, "")}, {free.when.charAt(0).toLowerCase() + free.when.slice(1)}
                </p>
              ) : null}
              <div className="tln-type-photo">
                <img src={p.photo} alt="" decoding="async" loading="lazy" />
                <span>{p.kind}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function LiveLine() {
  const left = useLiveLeft();
  if (!left) return null;
  return (
    <p className="tln-live">
      <b>Live on Plus Fri 20 Nov</b>
      <span className="tnum"> · {left} to go</span>
    </p>
  );
}

export function LiteNew({ places, v }: { places: LitePlace[]; v: LiteNewV }) {
  if (!places.length) return null;
  const body =
    v === "1" ? <Story places={places} /> : v === "2" ? <LockScreen places={places} /> : v === "3" ? <Wallet places={places} /> : v === "4" ? <CutUp places={places} /> : <BigType places={places} />;
  return (
    <section className="tpa-module tln" data-v={v} aria-labelledby="tln-h">
      <Heading places={places} />
      {body}
      {v === "4" || v === "5" ? <LiveLine /> : null}
      <Foot places={places} />
    </section>
  );
}
