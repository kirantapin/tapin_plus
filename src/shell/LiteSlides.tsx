import { useCallback, useEffect, useRef, useState } from "react";
import type { LitePlace } from "../model/lite";
import { LiteMark } from "./LiteMark";
import { liveSoon, useLiveLeft } from "./LiveSoon";

/* ══ JUST JOINED, AS TWO SLIDES (Sam, 13 Nov 2026: "Can we have crumbl and
   italianos thing show up under the 'how it works' section instead. they're
   too high up right now. Also we can have that be a two slide carousel.
   /impeccable design 3 versions of this container") ════════════════════════
   One slide a place, swiped or stepped, never moving by itself. Three takes
   at ?ljv=a|b|c:
     A · Postcards: the photo leads each slide, the next place peeks in at
         the edge, dots under.
     B · Side by side: a short slide, photo left and perks right, two arrows
         in the heading's row.
     C · Pick a place: the two logos as tabs over one large slide, each perk
         as a big figure.
   All keep the news as the heading, the Nov 20 go-live, and the foot saying
   Lite comes with Plus. Styles: .tls-*. */

export type LiteSlidesV = "a" | "b" | "c";
export const liteSlidesVersion = (): LiteSlidesV | null => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("ljv");
  return v === "a" || v === "b" || v === "c" ? v : null;
};

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const names = (list: LitePlace[]) =>
  list.length === 1 ? list[0].name : `${list.slice(0, -1).map((p) => p.name).join(", ")} and ${list[list.length - 1].name}`;

/** A scroll-snapped row: which slide is in view, and a way to go to one. */
function useSlides(count: number) {
  const row = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState(0);
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const read = () => {
      const kids = Array.from(el.children) as HTMLElement[];
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let gap = Infinity;
      kids.forEach((k, i) => {
        const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid);
        if (d < gap) {
          gap = d;
          best = i;
        }
      });
      /* The last slide counts once the row can't scroll further. */
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) best = kids.length - 1;
      if (el.scrollLeft <= 2) best = 0;
      setAt(best);
    };
    el.addEventListener("scroll", read, { passive: true });
    return () => el.removeEventListener("scroll", read);
  }, []);
  const go = useCallback((i: number) => {
    const el = row.current;
    const kid = el?.children[Math.max(0, Math.min(count - 1, i))] as HTMLElement | undefined;
    if (!el || !kid) return;
    el.scrollTo({ left: kid.offsetLeft - el.offsetLeft - (el.clientWidth - kid.offsetWidth) / 2, behavior: still() ? "auto" : "smooth" });
  }, [count]);
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

/** A perk's figure: the real item for a free one, else its percent. */
function Figure({ place, k, big }: { place: LitePlace; k: LitePlace["perks"][number]; big?: boolean }) {
  if (k.key === "free" && place.item)
    return <img className={big ? "tls-fig tls-fig-item tls-fig-big" : "tls-fig tls-fig-item"} src={place.item} alt="" decoding="async" loading="lazy" />;
  return (
    <span className={big ? "tls-fig tls-fig-pct tls-fig-big tnum" : "tls-fig tls-fig-pct tnum"} aria-hidden="true">
      {k.b.match(/\d+%/)?.[0] ?? "%"}
    </span>
  );
}

function Perks({ place, big }: { place: LitePlace; big?: boolean }) {
  return (
    <ul className="tls-perks">
      {place.perks.map((k) => (
        <li key={k.key}>
          <Figure place={place} k={k} big={big} />
          <p>
            <b>{k.b}</b>
            <span>{k.when}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function Logo({ place, size = 52 }: { place: LitePlace; size?: number }) {
  return (
    <img
      className="tls-logo"
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

/** "Live on Plus Fri 20 Nov · 6d 8h to go", while it's still to come. */
function GoesLive({ places }: { places: LitePlace[] }) {
  const left = useLiveLeft();
  if (!left || !places.some((p) => liveSoon(p.id))) return null;
  return (
    <p className="tls-live">
      <span className="tls-live-day" aria-hidden="true">
        <i>Nov</i>
        <b>20</b>
      </span>
      <span>
        <b>Live on Plus Fri 20 Nov</b>
        <span className="tnum"> · {left} to go</span>
      </span>
    </p>
  );
}

function Foot({ places }: { places: LitePlace[] }) {
  return (
    <p className="tls-foot">
      <LiteMark className="lite-mark" />
      <span>{places.length > 1 ? "Both come with Plus, as Tapin Lite places." : "Comes with Plus, as a Tapin Lite place."}</span>
    </p>
  );
}

function Dots({ places, at, go }: { places: LitePlace[]; at: number; go: (i: number) => void }) {
  return (
    <div className="tls-dots">
      {places.map((p, i) => (
        <button
          key={p.id}
          type="button"
          className="tls-dot"
          aria-label={`Show ${p.name}`}
          aria-current={i === at ? "true" : undefined}
          onClick={() => go(i)}
        />
      ))}
    </div>
  );
}

const Chevron = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d={back ? "M14.5 6 8.5 12l6 6" : "M9.5 6l6 6-6 6"} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function LiteSlides({ places, v }: { places: LitePlace[]; v: LiteSlidesV }) {
  const { row, at, go, onKey } = useSlides(places.length);
  if (!places.length) return null;
  const heading = (
    <h2 id="tls-h" className="tls-h">
      {names(places)} just joined&nbsp;Tapin
    </h2>
  );
  const rowProps = {
    ref: row,
    className: "tls-row",
    tabIndex: 0,
    onKeyDown: onKey,
    role: "group" as const,
    "aria-roledescription": "carousel",
    "aria-label": "Places that just joined",
  };
  const slideProps = (p: LitePlace, i: number) => ({
    key: p.id,
    className: "tls-slide",
    role: "group" as const,
    "aria-roledescription": "slide",
    "aria-label": `${p.name}, ${i + 1} of ${places.length}`,
  });

  if (v === "a")
    return (
      <section className="tpa-module tls" data-v="a" aria-labelledby="tls-h">
        {heading}
        <div {...rowProps}>
          {places.map((p, i) => (
            <article {...slideProps(p, i)}>
              <div className="tls-photo">
                <img src={p.photo} alt="" decoding="async" loading="lazy" />
                <Logo place={p} size={56} />
              </div>
              <h3 className="tls-name">
                {p.name}
                <span className="tls-kind">{p.kind}</span>
              </h3>
              <Perks place={p} />
            </article>
          ))}
        </div>
        <Dots places={places} at={at} go={go} />
        <GoesLive places={places} />
        <Foot places={places} />
      </section>
    );

  if (v === "b")
    return (
      <section className="tpa-module tls" data-v="b" aria-labelledby="tls-h">
        {heading}
        <div {...rowProps}>
          {places.map((p, i) => (
            <article {...slideProps(p, i)}>
              <div className="tls-photo">
                <img src={p.photo} alt="" decoding="async" loading="lazy" />
              </div>
              <div className="tls-side">
                <h3 className="tls-name">
                  <Logo place={p} size={32} />
                  <span>
                    {p.name}
                    <span className="tls-kind">{p.kind}</span>
                  </span>
                </h3>
                <Perks place={p} />
              </div>
            </article>
          ))}
        </div>
        <div className="tls-pager">
          <p className="tls-count tnum" aria-hidden="true">
            <b>{places[at]?.name}</b> · {at + 1} of {places.length}
          </p>
          <div className="tls-arrows">
            <button type="button" className="tls-arrow" aria-label="Previous place" disabled={at === 0} onClick={() => go(at - 1)}>
              <Chevron back />
            </button>
            <button type="button" className="tls-arrow" aria-label="Next place" disabled={at === places.length - 1} onClick={() => go(at + 1)}>
              <Chevron />
            </button>
          </div>
        </div>
        <GoesLive places={places} />
        <Foot places={places} />
      </section>
    );

  return (
    <section className="tpa-module tls" data-v="c" aria-labelledby="tls-h">
      {heading}
      <div className="tls-tabs" role="tablist" aria-label="Places">
        {places.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            className="tls-tab"
            aria-selected={i === at}
            onClick={() => go(i)}
          >
            <Logo place={p} size={28} />
            {p.name}
          </button>
        ))}
      </div>
      <div {...rowProps}>
        {places.map((p, i) => (
          <article {...slideProps(p, i)}>
            <div className="tls-photo">
              <img src={p.photo} alt="" decoding="async" loading="lazy" />
            </div>
            <div className="tls-panel">
              <Perks place={p} big />
            </div>
          </article>
        ))}
      </div>
      <GoesLive places={places} />
      <Foot places={places} />
    </section>
  );
}
