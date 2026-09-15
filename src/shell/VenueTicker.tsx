import PlusFlag from "./PlusFlag";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { venues, comingVenues, heroIsBright, logoField } from "../model/content";

/**
 * The places: a ticker that opens into a grid.
 *
 * Sam, 12 Sep 2026: "it should be a smooth scroll ticker not a carousel, I may
 * have been wrong" — and "when I click view all places, maybe this animates to
 * become a 2x2 grid".
 *
 * ══ WHY THIS IS A REWRITE AND NOT A TUNE ═══════════════════════════════════
 * The first version stepped: one tile every 2.8s via a smooth `scrollTo`, with
 * scroll-snap catching each landing. That is a carousel, and it had a carousel's
 * failure — between advances it was motionless, so for 2.6 of every 2.8 seconds
 * it was the static rail this page had already removed once for "showing two and
 * hiding four behind a gesture with no affordance". Continuous motion is what
 * makes a rail legible as a rail, so the mechanism had to change, not its
 * numbers.
 *
 * ══ A SEAMLESS TICKER NEEDS A DUPLICATE TRACK ══════════════════════════════
 * Constant-velocity scrolling has to wrap without a visible rewind, which means
 * the list is rendered TWICE and `scrollLeft` subtracts one track's width the
 * moment it passes it. The reader never sees an edge.
 *
 * The duplicate is exactly what the first version was avoiding, and the cost is
 * real but payable: the clone carries `aria-hidden` and every link inside it is
 * `tabIndex={-1}`, so assistive technology and the Tab order see six venues and
 * two coming, once each. Position is driven by `scrollLeft` rather than a
 * transform, so swipe, trackpad and shift-wheel keep working on a real element.
 *
 * ══ SCROLL-SNAP IS GONE ════════════════════════════════════════════════════
 * Snap and continuous motion are incompatible by construction: snap exists to
 * arrest a scroll at a boundary, which is the one thing a ticker must never do.
 * It was right for the stepped version and is a bug in this one.
 *
 * ══ THE GRID IS THE SAME TILES, NOT A SECOND COMPONENT ═════════════════════
 * "View all places" stops the motion, drops the duplicate track and reflows the
 * real eight into a grid in place. Nothing navigates: the reader asked to see
 * all of them, and sending them to another page to do that answers a different
 * question. The door into the app preview is not lost — the pitch carries a
 * whole panel for it further down.
 */
/**
 * ══ ON DESKTOP IT IS NOT A TICKER ═════════════════════════════════════════
 * Sam, 14 Sep 2026: "make the ticker a static grid on desktop."
 *
 * The rail exists because a phone cannot show eight venues at once — the motion
 * is what makes a list that must be scrolled legible as a list. At 1,280px the
 * grid shows all eight, so the motion is solving a problem that no longer
 * exists, and a row that moves while a reader is trying to read six real
 * business names is worse than one that does not.
 *
 * It reuses the OPEN state rather than adding a second rendering: "View all
 * places" already reflows exactly these tiles into exactly this grid, so
 * desktop is that state arrived at by width instead of by tapping. The toggle
 * itself goes with it — a control whose two states look identical is a control
 * that does nothing.
 *
 * `matchMedia`, not a resize listener: it fires only on the boundary crossing
 * rather than on every pixel of a drag, and it is the same query the stylesheet
 * uses, so the layout and the behaviour cannot disagree about what desktop is.
 */
/* 1280, NOT THE BUILD'S 1024 DESKTOP LINE. The grid state is one row of all
   seven places (pitch.css, "ALL SEVEN IN ONE ROW"), and below 1280 that row
   puts each tile under the 132px the phone rail proves legible — so the laptop
   band keeps the moving rail, which is the state Sam approved on the phone. */
const DESKTOP = "(min-width: 1280px)";

function useDesktop(): boolean {
  const [is, setIs] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const on = () => setIs(mq.matches);
    mq.addEventListener("change", on);
    on();
    return () => mq.removeEventListener("change", on);
  }, []);
  return is;
}

/**
 * `rail`: always the moving rail, never the grid, no "View all" — for a place
 * where the ticker sits inside a column rather than across the page (the
 * checkout, 15 Sep 2026: Sam asked for "the carousel of places" there). The
 * grid's 7-across row is a page-width object; in a 670px column it is seven
 * 90px tiles.
 */
export default function VenueTicker({ rail: railOnly = false }: { rail?: boolean } = {}) {
  const wide = useDesktop();
  const desktop = wide && !railOnly;
  /* The tiles open the app over this page on a desktop (AppLayer). */
  const location = useLocation();
  const [open, setOpen] = useState(false);
  /** The grid is shown when the reader asked for it, or when there is room. */
  const grid = desktop || open;
  const rail = useRef<HTMLUListElement>(null);
  /** True while the reader is hovering, focused inside, or driving the rail. */
  const paused = useRef(false);
  const idle = useRef<number | undefined>(undefined);

  /* Keyed on INPUT, never on `scroll`: a scroll listener cannot tell the
     reader's scroll from the ticker's own, and keying the pause on it made the
     first version suppress itself permanently after one advance. */
  const nudge = useCallback(() => {
    paused.current = true;
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => {
      paused.current = false;
    }, 2200);
  }, []);

  useEffect(() => () => window.clearTimeout(idle.current), []);

  useEffect(() => {
    if (grid) return;
    const box = rail.current;
    if (!box) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let last = 0;
    /* Slow enough to read a venue name as it passes. Per SECOND and multiplied
       by the real frame delta, so it travels at one speed on a 120Hz display
       and a 60Hz one alike. */
    const PX_PER_SEC = 26;

    const step = (t: number) => {
      if (!last) last = t;
      /* Clamped: after a background tab wakes, the first delta can be seconds
         and would teleport the rail. */
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      if (!paused.current) {
        /* One track's width. scrollWidth spans both copies, so half of it is
           precisely where the second copy shows what the first did — subtracting
           it is invisible. */
        const track = box.scrollWidth / 2;
        const next = box.scrollLeft + PX_PER_SEC * dt;
        box.scrollLeft = next >= track ? next - track : next;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [grid]);

  const tiles = [
    ...venues.map((v) => ({
      key: v.id,
      to: `/app/place/${v.id}` as string | undefined,
      name: v.name,
      /* Category only (audit, 14 Sep 2026): the street was the wordiest line on
         seven tiles, and the venue page carries the address. */
      meta: v.category,
      hero: v.hero as string | undefined,
      logo: v.logo as string | undefined,
      brand: v.brandColor as string | undefined,
      field: logoField(v.id) as string | undefined,
      bright: heroIsBright(v.id),
      plus: v.plus,
      tag: undefined as string | undefined,
    })),
    ...comingVenues.map((v) => ({
      key: v.id,
      to: undefined,
      name: v.name,
      meta: v.category,
      /* Real assets when the record carries them (Slake does, 14 Sep 2026);
         the monogram fallback stays for a venue signed before its art lands. */
      hero: v.hero,
      logo: v.logo,
      brand: undefined,
      field: undefined,
      bright: false,
      plus: false,
      tag: "Coming" as string | undefined,
    })),
  ];

  const body = (t: (typeof tiles)[number], clone: boolean) => {
    const inner = (
      <>
        {/* THE PHOTOGRAPH IS THE CARD (Sam, 12 Sep 2026: "make the entire card
            the merchant's image for the background, then have a gradient so
            that I can still see the merchant's title and logo clearly").

            It fills the card and the content sits ON it under a measured veil,
            rather than being a thumbnail with type loose underneath. This is
            the storefront's own "photographic" card family — a flyer-led card
            with the mark in one corner and the type over the image. */}
        <span className={`vshot${t.hero ? "" : " is-empty"}`}>
          {t.hero ? (
            <img src={t.hero} alt="" decoding="async" data-bright={t.bright ? "true" : undefined} />
          ) : (
            /* Signed, no photograph yet. The veil still runs, so the foot reads
               the same way on every card whether or not there is an image
               under it — which is what stops this one looking broken beside
               six that have one. */
            <span className="monogram">{t.name.charAt(0)}</span>
          )}
        </span>

        <span className="vcard-foot">
          {t.logo ? (
            <span
              className="collar"
              data-field={t.field}
              style={{ ["--brand" as string]: t.brand }}
            >
              <img src={t.logo} alt="" decoding="async" />
            </span>
          ) : null}
          <span className="vname">
            <b>{t.name}</b>
          </span>
          <span className="vmeta">{t.meta}</span>
        </span>

        {/* THE BADGE IS A CORNER FLAG, which is the storefront's own device for
            marking a photographic card. In the foot it shared a line with the
            name, and at 143px "Coffeeholics" plus the chip measured 139px into
            119px of room — so it wrapped, dropped to its own line and shoved the
            street down with it. A flag costs the name nothing and puts the mark
            where a mark goes. Only the inner corner is rounded; the card's own
            overflow clips the other two to its radius, which stays exact at any
            card size. */}
        {/* ONE FLAG, ON THE EXCEPTION. Five maroon PLUS flags and a sentence
            explaining them read as noise to Rob's Virginia Tech readers (14 Sep
            2026). §6's rule was "absence of the badge is the signal"; for a
            stranger the signal has to be a word, so the one place that is NOT on
            the three benefits says so itself and the five that are say nothing.
            `t.plus` is still computed — the app preview keeps its PLUS chip. */}
        {/* THE FLAG IS BACK, AND IT NAMES THE TIER. Sam, 14 Sep 2026: "anywhere
            we have our Tap In Plus or Tap Plus partners, we just call it Tap In
            Plus. We should have a little bit of a flag so that people know that
            they're a Tap In Plus partner." */}
        {t.plus && !t.tag ? <PlusFlag className="vflag" /> : null}
        {!t.plus && !t.tag ? <span className="vflag is-soon">Offers only</span> : null}
        {t.tag ? <span className="vflag is-soon">{t.tag}</span> : null}
      </>
    );
    if (!t.to) {
      /* Signed, not open. There is no page behind Slake and there must not
         appear to be, so it takes none of the anchor's behaviour. */
      return <span className="vcard is-idle">{inner}</span>;
    }
    return (
      <Link className="vcard" to={t.to} state={{ background: location }} tabIndex={clone ? -1 : undefined}>
        {inner}
      </Link>
    );
  };

  return (
    <div className={`ticker${grid ? " is-open" : ""}`}>
      <ul
        className="ticker-rail no-scrollbar"
        ref={rail}
        onPointerDown={nudge}
        onTouchStart={nudge}
        onWheel={nudge}
        onKeyDown={nudge}
        onPointerEnter={() => {
          paused.current = true;
        }}
        onPointerLeave={() => {
          paused.current = false;
        }}
        onFocusCapture={() => {
          paused.current = true;
        }}
        onBlurCapture={() => {
          paused.current = false;
        }}
      >
        {tiles.map((t, i) => (
          <li
            key={t.key}
            className="ticker-tile"
            /* The entrance stagger caps at five steps — the storefront's own
               rule, because an uncapped stagger makes a long list's last row
               wait for every row above it. */
            style={grid ? { animationDelay: `${Math.min(i, 5) * 40}ms` } : undefined}
          >
            {body(t, false)}
          </li>
        ))}

        {/* The second track, present only while the ticker runs. Hidden from
            assistive technology and from the Tab order, so the page still offers
            each venue exactly once. */}
        {!grid
          ? tiles.map((t) => (
              <li key={`clone-${t.key}`} className="ticker-tile" aria-hidden="true">
                {body(t, true)}
              </li>
            ))
          : null}
      </ul>

      {/* Gone on desktop: everything it would reveal is already on screen. */}
      {desktop ? null : (
      <button
        type="button"
        className="ticker-all"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Show fewer" : "View all places"}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d={open ? "m7 14 5-5 5 5" : "m10 7 5 5-5 5"}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      )}
    </div>
  );
}
