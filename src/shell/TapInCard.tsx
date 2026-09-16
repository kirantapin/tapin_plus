import { useRef, useState } from "react";
import { useAuth } from "../context/auth_context";
import TapInLogo from "./TapInLogo";
import { launchWindow } from "../model/content";
import { cardPlan } from "../model/content";

/**
 * The card, reduced — the deck's spine.
 *
 * It rides the top edge through every explaining slide so the card is present
 * the whole way through, then hands over to the real one on the close. Two
 * rules from the old build's post-mortem are designed in here:
 *
 *   1. "A cropped card is not a card." An earlier cut hung the real card half
 *      above the viewport and it read as a rendering fault. This is WHOLE and
 *      small, never a slice of something bigger.
 *
 *   2. ONE TRANSFORM PER ELEMENT. The old build put miniBob and miniTilt on the
 *      same node; when two animations touch one property the last in the list
 *      wins outright, so the bob never happened — while the shadow breathed on
 *      the bob's period against a rise that did not exist. Bob and tilt are
 *      separate layers here, on periods that do not divide, and the shadow
 *      shares the bob's layer rather than guessing at it.
 */
export function MiniCard() {
  return (
    <div className="minicard" aria-hidden="true">
      <div className="minicard-bob">
        <div className="minicard-shadow" />
        <div className="minicard-tilt">
          <div className="minicard-face">
            <TapInLogo className="minicard-logo" />
            <svg className="minicard-mark" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3.6 13.9 9.9 20.4 12 13.9 14.1 12 20.4 10.1 14.1 3.6 12 10.1 9.9Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.7"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The TapIn membership card.
 *
 * Composition is Sam's, from the design he sent: lockup and MEMBERSHIP on the
 * top rail, the number opposite, the member's name at the optical centre, a
 * hairline, then PLAN and STARTS as two labelled columns. The points glyph
 * rides the bottom-right corner as a watermark, cropped by the card's own edge
 * — the same four-point star the benefits use, so the card is drawn from the
 * product's own vocabulary rather than a new one.
 *
 * PREMIUM WITHOUT METAL. There is no gold here and none is coming (§9, and
 * START-HERE's "take its structure and glass, not its gold"). What does the work
 * instead is material and light: a maroon field raked from one corner, a lit top
 * edge, and a specular highlight that tracks the pointer so the surface reads as
 * something with a finish rather than a rectangle with a gradient on it.
 *
 * NO NUMBER ON THE RAIL, AND THAT IS DELIBERATE. TRUTH.md §11.1: the old build
 * allocated seat numbers from an invented count of 63, so receipts read
 * "Seat 064". A serial number IS a count — "No. 064" tells a student that
 * sixty-three people got here first, which §10 forbids on every surface. There
 * are no members. So the rail's counterweight is the city, which is true and
 * counts nothing. `seat` stays as a prop with no default, for the day real
 * numbers exist; nothing in this build passes one.
 */
export default function TapInCard({
  name,
  seat,
  region = "Blacksburg",
  /* Follows the flip: "Founding" while the seats last, "Standard" after. A
     card that still said Founding beside a $14.99 checkout would be the
     contradiction the 14 Sep review found on every other control. /in passes
     the plan she actually bought instead of taking this default. */
  plan = cardPlan,
  /* THE LAUNCH WINDOW, FROM THE CONSTANT — never a literal. It was
     "Spring 2027" hardcoded here, so when the window moved the card went on
     printing the old date beside a checkout that had moved. One source, so the
     object a member holds cannot disagree with the page that sold it. */
  starts = launchWindow,
  className = "",
  innerRef,
  onName,
}: {
  /** Omit it and the card names the signed-in member, falling back to the
   *  "Your name" placeholder. Pass one to override — the deck and the
   *  checkout do, because their card follows a field as it is typed. */
  name?: string;
  seat?: string;
  region?: string;
  plan?: string;
  starts?: string;
  className?: string;
  /** Lets a caller reach the card element itself — the flight measures it. */
  innerRef?: React.MutableRefObject<HTMLDivElement | null>;
  /**
   * When given, the name line is hers to type into and a press anywhere on
   * the card puts the caret there. Sam, 14 Sep 2026: "they'd just click on
   * the membership card to add their name, it's optional though." Only the
   * deck's close passes this; everywhere else the card is a thing to look at.
   */
  onName?: (n: string) => void;
}) {
  /* ══ THE CARD NAMES THE MEMBER ═══════════════════════════════════════════
     Whoever is signed in, wherever the card is drawn — it is a membership
     card, and a membership card with "Your name" on it in front of someone
     whose name we hold reads as a mock-up of itself. Explicit wins: the deck
     and the checkout pass a value that follows a field keystroke by keystroke,
     and an editable card must show exactly what is in its own input, empty
     included. The placeholder is the last resort, not the default. */
  const { displayName } = useAuth();
  const shown = name ?? displayName ?? "Your name";

  const ref = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, lx: 50, ly: 50, on: false });

  const track = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    // Clamped, and gentle: a card that swings hard reads as a toy.
    setTilt({
      x: (0.5 - py) * 13,
      y: (px - 0.5) * 16,
      lx: px * 100,
      ly: py * 100,
      on: true,
    });
  };

  const rest = () => setTilt({ x: 0, y: 0, lx: 50, ly: 50, on: false });

  return (
    <div className={`card-stage ${className}`}>
      <div
        ref={(node) => {
          ref.current = node;
          if (innerRef) innerRef.current = node;
        }}
        className={`tcard${tilt.on ? " is-tilting" : ""}${onName ? " is-editable" : ""}`}
        /* NO TILT ON THE CARD THAT TAKES A NAME. Sam, 14 Sep 2026: "get rid of
           the hover animation for this card since it's interfering with my
           ability to add my name." A surface that swings under the pointer is
           the wrong surface to aim a caret at, so the editable card is a still
           object: no tracking, no specular. Every other card keeps both. */
        onPointerMove={onName ? undefined : track}
        onPointerLeave={onName ? undefined : rest}
        onPointerCancel={onName ? undefined : rest}
        /* Touch never fires pointerleave on lift, so without this a tapped card
           stays tilted on a phone — which is where most of them will be. */
        onPointerUp={onName ? undefined : rest}
        /* The whole card is the target, not the 34px line: "click on the
           membership card to add their name" means the card. */
        onClick={onName ? () => nameRef.current?.focus() : undefined}
        style={
          {
            "--rx": `${tilt.x}deg`,
            "--ry": `${tilt.y}deg`,
            "--lx": `${tilt.lx}%`,
            "--ly": `${tilt.ly}%`,
          } as React.CSSProperties
        }
      >
        <div className="tcard-sheen" aria-hidden="true" />

        {/* The points glyph, cropped by the card edge — a watermark, not an icon. */}
        <svg className="tcard-mark" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.6 13.9 9.9 20.4 12 13.9 14.1 12 20.4 10.1 14.1 3.6 12 10.1 9.9Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </svg>

        <div className="tcard-rail">
          <TapInLogo className="tcard-logo" />
          <span className="tcard-kind">Membership</span>
          {seat ? (
            <span className="tcard-no tnum">No. {seat}</span>
          ) : (
            <span className="tcard-no tcard-where">{region}</span>
          )}
        </div>

        {onName ? (
          /* The name line, as a field: the card's own type, no box, the
             placeholder in the card's ink so an empty card still reads "Your
             name" exactly as the static one does. Enter and Escape put the
             keyboard away; the deck's own key handling ignores this field. */
          <input
            ref={nameRef}
            className="tcard-name tcard-name-input"
            type="text"
            value={name ?? shown}
            placeholder="Your name"
            onChange={(e) => onName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
            }}
            maxLength={40}
            autoComplete="name"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="done"
            /* Password managers draw their icon into any field that looks like
               a login (Sam's screenshot showed one in the name line). These
               three attributes are the vendors' own opt-outs. */
            data-1p-ignore=""
            data-lpignore="true"
            data-bwignore=""
            aria-label="Your name, as you'd like it on the card — optional"
          />
        ) : (
          <p className="tcard-name">{shown}</p>
        )}

        <div className="tcard-rule" />

        <dl className="tcard-facts">
          <div>
            <dt>Plan</dt>
            <dd>{plan}</dd>
          </div>
          <div>
            <dt>Starts</dt>
            <dd>{starts}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
