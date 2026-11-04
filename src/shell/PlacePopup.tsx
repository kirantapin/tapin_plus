import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { covers, venueCovers } from "../model/content";

/* ══ ONE PLACE, WHAT PLUS DOES THERE (Sam, 4 Nov 2026: "when people click on
   these merchant cards, there should be a small merchant pop up for each that
   shows the items that are eligible and for what. Like the $5 back and 15%
   off works on all non-alcohol, but points are earned on everything which
   can be used for free food") ════════════════════════════════════════════════
   Small and simple: the place's photo and name, what it sells on Tapin (from
   content.ts venueCovers), and two rows for what Plus gives there. Join at
   the foot. A sheet from the bottom on a phone, a card in the middle on a
   computer, like the rest of the page's pop-ups. */

export type PlacePopupPlace = { id: string; name: string; kind: string; photo: string };

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function PlacePopup({ place, onClose, onJoin }: { place: PlacePopupPlace; onClose: () => void; onJoin: () => void }) {
  const layer = useRef<HTMLDivElement | null>(null);
  const sheet = useRef<HTMLDivElement | null>(null);
  const closing = useRef(false);
  const sells = covers.filter((c) => (venueCovers[place.id] ?? []).includes(c.id));

  const close = useCallback(
    (then?: () => void) => {
      if (closing.current) return;
      const done = () => (then ? then() : onClose());
      const el = sheet.current;
      if (!el || still() || typeof el.animate !== "function") return done();
      closing.current = true;
      layer.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-in", fill: "forwards" });
      const run = el.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(20px)", opacity: 0 }], { duration: 190, easing: "ease-in", fill: "forwards" });
      run.onfinish = done;
    },
    [onClose],
  );

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.focus();
    if (!still()) {
      layer.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
      sheet.current?.animate?.([{ transform: "translateY(32px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 340, easing: "cubic-bezier(.22,1,.36,1)" });
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [close]);

  return createPortal(
    <div ref={layer} className="pp-layer" onClick={(e) => e.target === e.currentTarget && close()}>
      <div ref={sheet} className="pp-sheet" role="dialog" aria-modal="true" aria-labelledby="pp-name" tabIndex={-1}>
        <div className="pp-photo">
          <img src={place.photo} alt="" decoding="async" />
          <button type="button" className="pp-x" aria-label="Close" onClick={() => close()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="pp-body">
          <h2 id="pp-name" className="pp-name">
            {place.name}
            <span>{place.kind}</span>
          </h2>
          {/* What the place sells on Tapin. */}
          <ul className="pp-sells" aria-label={`On Tapin at ${place.name}`}>
            {sells.map((c) => (
              <li key={c.id}>{c.id === "tickets" ? "Event tickets" : c.label}</li>
            ))}
          </ul>
          {/* What Plus gives here, and on what. */}
          <ul className="pp-rows">
            <li>
              <span className="pp-ico pp-ico-money tnum" aria-hidden="true">
                $5
              </span>
              <span>
                <b>$5 back a week, or 15% off a day</b>
                <span>On anything but alcohol</span>
              </span>
            </li>
            <li>
              <span className="pp-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                <b>Points on everything</b>
                <span>Drinks included. Trade them for free food.</span>
              </span>
            </li>
          </ul>
          <button type="button" className="pp-cta" onClick={() => close(onJoin)}>
            Join Tapin Plus
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
