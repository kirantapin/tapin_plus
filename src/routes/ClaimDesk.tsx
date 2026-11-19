import { useEffect, useRef, useState } from "react";
import { firstFigure, usePlusPriceLoad } from "../model/plus";
import { liveSoon } from "../shell/LiveSoon";
import { LiteMark } from "../shell/LiteMark";
import type { PlacePopupPlace } from "../shell/PlacePopup";
import { FlatMark } from "./parents_kit";
import { PHOTO_POS, allRailCards } from "./PlusHome";

/* ══ /claim ON A COMPUTER (Sam, 19 Nov 2026: "the desktop version should
   look a bit different"; picked from the twenty takes, artifact
   S5GwP4ceiHZTs74cWxxDKy) ═══════════════════════════════════════════════
   Your status: D · Sonar. One big dot, yours, sending out rings, and a pulse
     of green running down the line, again and again.
   The places: A · Two rows. All eight as two rows of photo cards drifting
     opposite ways; hovering or the pause button stops them.
   What you get: D · The reels. $3.99, $25 and about $60 spin like a counter
     and land, again each time the tiles come into view and every few
     seconds while they stay.
   A phone keeps its own page (ClaimSeat.tsx). Reduced motion: everything
   still, at rest. */

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The line as sonar: your dot in the middle with rings going out, the seats
 *  either side, a wave of green running along them toward the door side.
 *  The seats are a picture of a line, not a count. */
export function DeskSonar({ up = false }: { up?: boolean }) {
  const seats = 20;
  return (
    <div className="dk-sonar" aria-hidden="true">
      <div className="dk-sonar-line">
        {Array.from({ length: seats }, (_, i) => (
          <i key={i} className={i === seats / 2 ? "dk-you-slot" : undefined} style={{ animationDelay: `${(i * 0.12).toFixed(2)}s` }} />
        ))}
      </div>
      <div className="dk-you">
        <span className="dk-ring" />
        <span className="dk-ring" />
        <span className="dk-ring" />
        <span className={`dk-you-dot${up ? " dk-you-up" : ""}`}>
          {up ? (
            <svg viewBox="0 0 24 24">
              <path d="m6.5 12.5 3.6 3.6 7.4-7.6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </span>
        <span className="dk-tag">You</span>
      </div>
    </div>
  );
}

/** All eight places in two rows drifting opposite ways, drawn twice so the
 *  drift wraps; the copies are hidden from screen readers and the keyboard. */
export function DeskRows({ onOpen }: { onOpen: (p: PlacePopupPlace) => void }) {
  const cards = allRailCards();
  const [paused, setPaused] = useState(false);
  const rows = [cards.filter((_, i) => i % 2 === 0), cards.filter((_, i) => i % 2 === 1)];
  return (
    <section className="dk-rows" aria-label="Where your seat works" data-paused={paused ? "" : undefined}>
      <div className="dk-rows-bar">
        <p>
          <b>8 Blacksburg spots.</b> Open a card to see what Plus covers&nbsp;there.
        </p>
        <button type="button" className="tpa-rail-arrow tpa-rail-pause" aria-label={paused ? "Play the places" : "Pause the places"} aria-pressed={paused} onClick={() => setPaused((v) => !v)}>
          {paused ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.5 6v12M15.5 6v12" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
      {rows.map((row, r) => (
        <div key={r} className={`dk-track${r ? " dk-track-r" : ""}`}>
          {[false, true].map((copy) =>
            row.map((v) => (
              <button
                key={`${copy ? "c-" : ""}${v.id}`}
                type="button"
                className="dk-card"
                tabIndex={copy ? -1 : undefined}
                aria-hidden={copy || undefined}
                aria-label={v.lite ? `What you get at ${v.name}` : `What Plus gets you at ${v.name}`}
                onClick={(e) => {
                  const b = e.currentTarget.getBoundingClientRect();
                  onOpen({ id: v.id, name: v.name, kind: v.kind, photo: v.photo, lite: v.lite || undefined, liveSoon: liveSoon(v.id) || undefined, from: { x: b.left, y: b.top, w: b.width, h: b.height } });
                }}
              >
                <img src={v.photo} alt="" decoding="async" loading="lazy" style={PHOTO_POS[v.id] ? { objectPosition: PHOTO_POS[v.id] } : undefined} />
                <span className="tpa-glass tpa-tag dk-tagp">
                  {v.lite ? <LiteMark className="tpa-tag-mark" /> : <FlatMark className="tpa-tag-mark" />}
                  {v.lite ? "Lite" : "Plus"}
                </span>
                <span className="dk-card-name">
                  <b>{v.name}</b>
                  <small>{v.perk}</small>
                </span>
              </button>
            )),
          )}
        </div>
      ))}
    </section>
  );
}

const DIGIT_H = 1; /* in em, the reel's line height */

/** A figure as rolling digit columns ("$3.99"): each digit spins through
 *  the numbers and lands on its own; `$` and `.` stand still. */
function Reel({ text, delay, round }: { text: string; delay: number; round: number }) {
  return (
    <span className="dk-reel" aria-hidden="true">
      {[...text].map((ch, j) => {
        if (!/\d/.test(ch)) return <span key={`${round}-${j}`} className="dk-reel-static">{ch}</span>;
        const d = Number(ch);
        const spins = 10 + d + j * 3;
        const seq = Array.from({ length: spins + 1 }, (_, k) => (k + d) % 10);
        seq[seq.length - 1] = d;
        return (
          <span key={`${round}-${j}`} className="dk-reel-col" style={{ ["--to" as string]: `${-spins * DIGIT_H}em`, animationDelay: `${(delay + j * 0.08).toFixed(2)}s` }}>
            {seq.map((x, k) => (
              <span key={k}>{x}</span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

/** You pay, you get, about $60: three tiles whose figures spin and land
 *  when they come into view, and again every few seconds while they stay. */
export function DeskReels({ note }: { note: string }) {
  const { price } = usePlusPriceLoad();
  const first = firstFigure(price);
  const monthly = price ? `$${price.monthly.toFixed(2)}` : "";
  const same = !!price && price.first === price.monthly;
  const pay = same ? monthly : first;
  const box = useRef<HTMLDivElement | null>(null);
  const [round, setRound] = useState(0);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || still()) return;
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      window.clearInterval(timer);
      if (!e.isIntersecting) return;
      setSeen(true);
      setRound((n) => n + 1);
      timer = window.setInterval(() => setRound((n) => n + 1), 7000);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, []);
  const roll = seen && !still();
  return (
    <section className="dk-reels tnum" aria-label="What you pay and what you get" ref={box}>
      <div className="dk-tile" style={price ? undefined : { visibility: "hidden" }}>
        <small>You pay</small>
        <b aria-label={pay}>{roll ? <Reel text={pay} delay={0} round={round} /> : pay}</b>
        <span>{same ? "a month" : `first month, then ${monthly}`}</span>
      </div>
      <div className="dk-tile dk-tile-get">
        <small>You get</small>
        <b aria-label="$25">{roll ? <Reel text="$25" delay={0.25} round={round} /> : "$25"}</b>
        <span>every month, $5 at each Plus spot</span>
      </div>
      <div className="dk-tile dk-tile-dark">
        <small>You save about*</small>
        <b aria-label="$60">{roll ? <Reel text="$60" delay={0.5} round={round} /> : "$60"}</b>
        <span>a month at places you already go</span>
      </div>
      <p className="dk-reels-note">{note}</p>
    </section>
  );
}
