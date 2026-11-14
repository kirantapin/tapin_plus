import { useJoinLabel } from "./WelcomeOffer";
import { handOverFocus } from "./PlusCheckout";
import { lockScroll, modalOpen } from "./scrollLock";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BAR_IDS, covers, venueCovers } from "../model/content";
import { slideAway } from "./sheetMotion";
import { litePlace } from "../model/lite";
import { LiteMark } from "./LiteMark";
import { LiveRow } from "./LiveSoon";

/* ══ ONE PLACE, WHAT PLUS DOES THERE (Sam, 4 Nov 2026: "when people click on
   these merchant cards, there should be a small merchant pop up for each that
   shows the items that are eligible and for what. Like the $5 back and 15%
   off works on all non-alcohol, but points are earned on everything which
   can be used for free food") ════════════════════════════════════════════════
   Small and simple: the place's photo and name, what it sells on Tapin (from
   content.ts venueCovers), and two rows for what Plus gives there. Join at
   the foot. A sheet from the bottom on a phone, a card in the middle on a
   computer, like the rest of the page's pop-ups. */

export type PlacePopupPlace = {
  id: string;
  name: string;
  kind: string;
  photo: string;
  /** The card's box on screen, for the photo's flight. */
  from?: { x: number; y: number; w: number; h: number };
  /** A Tapin Lite place (model/lite.ts): its own perks, not Plus's. */
  lite?: boolean;
  /** Not live on Plus yet (shell/LiveSoon.tsx): says when, with the time
   *  left. */
  liveSoon?: boolean;
};

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function PlacePopup({
  place,
  onClose,
  onJoin,
  cta,
  they = false,
}: {
  place: PlacePopupPlace;
  onClose: () => void;
  onJoin: () => void;
  /** The button's words when the page has its own (the parents page). */
  cta?: string;
  /** The parents page: a Lite perk says "their order". */
  they?: boolean;
}) {
  const plusLabel = useJoinLabel();
  const joinLabel = cta ?? plusLabel;
  const layer = useRef<HTMLDivElement | null>(null);
  const sheet = useRef<HTMLDivElement | null>(null);
  const photo = useRef<HTMLDivElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const xBtn = useRef<HTMLButtonElement | null>(null);
  const closing = useRef(false);
  /* A Lite place's pop-up lists only its perks (no "sells" chips), so
     Crumbl and Italiano's read alike. */
  const sells = place.lite ? [] : covers.filter((c) => (venueCovers[place.id] ?? []).includes(c.id));
  /* At the bars (The Burg, The Milk Parlor, Olaika) the rows say plainly that
     the $5 and 15% skip alcohol (Sam, 4 Nov 2026), and don't advertise points
     on drinks: Virginia bars ads for "anything of value conditioned on the
     purchase of alcoholic beverages" (3VAC5-20-10 C 8; research 4 Nov 2026). */
  const bar = BAR_IDS.has(place.id);
  const lite = place.lite ? litePlace(place.id) : undefined;

  const close = useCallback(
    (then?: () => void) => {
      if (closing.current) return;
      const done = () => (then ? then() : onClose());
      closing.current = true;
      /* Down and away, like every pop-up (sheetMotion.ts). */
      slideAway(sheet.current, layer.current, done);
    },
    [onClose],
  );

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const unlock = lockScroll();
    sheet.current?.focus();
    /* OPENING (Sam, 4 Nov 2026: "an /impeccable animation when clicked"):
       the card's photo lifts off the card and flies to the top of the
       pop-up, growing and rounding as it goes, while the sheet fades in
       around it and its words rise a beat behind. It's a copy of the photo
       on a fixed layer (object-fit: cover, so it never stretches); the
       pop-up's own photo shows the moment it lands. Without a card box (or
       with reduced motion) the sheet simply rises. */
    let ghost: HTMLImageElement | null = null;
    const ease = "cubic-bezier(.22,1,.36,1)";
    const ph = photo.current;
    const from = place.from;
    if (!still()) {
      layer.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
      if (from && ph && typeof ph.animate === "function") {
        const to = ph.getBoundingClientRect();
        ghost = document.createElement("img");
        ghost.src = place.photo;
        ghost.alt = "";
        ghost.className = "pp-ghost";
        document.body.appendChild(ghost);
        ph.style.opacity = "0";
        const box = (r: { x: number; y: number; w: number; h: number }, radius: number) => ({
          left: `${r.x}px`,
          top: `${r.y}px`,
          width: `${r.w}px`,
          height: `${r.h}px`,
          borderRadius: `${radius}px`,
        });
        const flight = ghost.animate(
          [box(from, 16), box({ x: to.left, y: to.top, w: to.width, h: to.height }, 22)],
          { duration: 460, easing: ease, fill: "forwards" },
        );
        const g = ghost;
        flight.onfinish = () => {
          ph.style.opacity = "";
          g.remove();
          /* The close button fades in once the photo has landed, not all at
             once with it (Sam, 4 Nov 2026: "the X button just appears so
             abruptly"). */
          xBtn.current?.animate?.([{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: ease, fill: "backwards" });
        };
        sheet.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
        body.current?.animate?.([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], {
          duration: 360,
          delay: 140,
          easing: ease,
          fill: "backwards",
        });
      } else {
        sheet.current?.animate?.([{ transform: "translateY(32px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 340, easing: ease });
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
      ghost?.remove();
      if (ph) ph.style.opacity = "";
      /* Not when the checkout has just taken over from here. */
      if (!modalOpen()) opener?.focus?.();
      else handOverFocus(opener);
    };
    // Once, when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div ref={layer} className="pp-layer" onClick={(e) => e.target === e.currentTarget && close()}>
      <div ref={sheet} className="pp-sheet" role="dialog" aria-modal="true" aria-labelledby="pp-name" tabIndex={-1}>
        <div ref={photo} className="pp-photo">
          <img src={place.photo} alt="" decoding="async" />
          <button ref={xBtn} type="button" className="pp-x" aria-label="Close" onClick={() => close()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div ref={body} className="pp-body">
          <h2 id="pp-name" className="pp-name">
            {place.name}
            <span>{place.kind}</span>
          </h2>
          {/* The day it goes live, as a row of its own with the time left
              filling a bar (12 Nov 2026). */}
          {place.liveSoon ? <LiveRow /> : null}
          {/* What the place sells on Tapin. */}
          {sells.length ? (
            <ul className="pp-sells" aria-label={`On Tapin at ${place.name}`}>
              {sells.map((c) => (
                <li key={c.id}>{c.id === "tickets" ? "Event tickets" : c.label}</li>
              ))}
            </ul>
          ) : null}
          {/* A Lite place (Sam, 12 Nov 2026): its own perks, each once a
              day, and how you get them. Nothing of Plus's is claimed here. */}
          {lite ? (
            <>
              <ul className="pp-rows">
                {lite.perks.map((k) => (
                  <li key={k.key}>
                    {k.key === "free" && lite.item ? (
                      <span className="pp-ico pp-ico-item" aria-hidden="true">
                        <img src={lite.item} alt="" decoding="async" />
                      </span>
                    ) : (
                      <span className="pp-ico pp-ico-money tnum" aria-hidden="true">
                        {k.b.match(/\d+%/)?.[0] ?? "%"}
                      </span>
                    )}
                    <span>
                      <b>{they ? k.b.replace(/\byour\b/g, "their") : k.b}</b>
                      <span>{k.when}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="pp-note">
                <LiteMark className="lite-mark" />
                <span>{lite.name} is a Tapin Lite place. Lite comes with&nbsp;Plus.</span>
              </p>
            </>
          ) : null}
          {/* What Plus gives here, and on what. */}
          {lite ? null : (
          <ul className="pp-rows">
            <li>
              <span className="pp-ico pp-ico-money tnum" aria-hidden="true">
                $5
              </span>
              <span>
                <b>$5 credit a month, then 15% off daily</b>
                <span>On anything but alcohol</span>
              </span>
            </li>
            {/* The weekly $5 back here too (Sam, 13 Nov 2026: "we need to
                show the $5 credit on $10+ weekly here too"): earned on food
                and non-alcoholic drinks only. */}
            <li>
              <span className="pp-ico pp-ico-money" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4.2h4.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                <b>$5 back every week</b>
                <span>When {they ? "they spend" : "you spend"} $10+ on food and non-alcoholic drinks</span>
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
                <span>{bar ? "Trade them for free food." : "Drinks included. Trade them for free food."}</span>
              </span>
            </li>
          </ul>
          )}
          <button type="button" className="pp-cta" onClick={onJoin}>
            {joinLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
