import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import Pager, { Page } from "./Pager";
import CheckoutSheet from "./CheckoutSheet";
import { flightPending } from "./cardFlight";
import { useSheetFrame } from "./useSheetFrame";
import type { PhoneIdentity, PhoneStage, PhoneStepHandle } from "./PhoneStep";
import { useAuth } from "../context/auth_context";
import { useEventTracking } from "../context/event_tracking_context";
import {
  FOUNDING_OPEN,
  PLANS,
  lockedRateLine,
  seatNoun,
} from "../model/content";

/**
 * The checkout as a FULL-PAGE MODAL that slides up over the page you came from.
 *
 * Sam, 14 Sep 2026: "this page should be a modal that slides up from the
 * bottom of the page… there should be an 'X' out button at the top" — then,
 * shown a bottom sheet: "i still want the same background we had, and the
 * sticky buttons and such. Maybe this can just be a full page modal instead."
 *
 * So the page is unchanged inside: the photo band with the card on it, the
 * sticky bar, the two-column desktop layout — all of /reserve's own CSS keys
 * off `.column`, and `.sheet-column` IS a `.column`. What the layer adds is
 * the frame: a fixed, full-viewport surface that rises from the bottom edge
 * (translateY 100% → 0, 360ms, the house curve) under a 180ms scrim fade, its
 * own scroller, and a close that puts the reader back on the pitch with their
 * scroll position intact. Exit is the layer unmounting — the page beneath is
 * already painted, so nothing is faster. Reduced motion: no animation.
 *
 * ══ ONE SHEET, FOUR PAGES (21 Sep 2026) ════════════════════════════════════
 * Sam, on the "Your details" sheet rising over this one: "the way this pops up
 * is strange, I think it'd be a part of the checkout modal, almost like it
 * swipes to the next screen as if this flow is a part of the same modal. We'd
 * need a back button as well probably."
 *
 * It does now. There is no second sheet and no second scrim:
 *
 *   0  Get early access   — everything /reserve draws (the `children` here)
 *   1  Your details       — PhoneStep, whose own two stages page the same way
 *   2  Confirm your seat  — §4's rows, consent and wallet, together
 *   3  Your seat          — the receipt, or the seat this number already holds
 *
 * Pages 1–3 are `CheckoutSheet`'s three states, rendered inline (see that
 * file); the move between them is `Pager`. THE CHECKOUT'S STATE LIVES HERE
 * because the pages are drawn here — the reservation write, the wallet's
 * "no wallet" flag and the identity that goes with the charge were /reserve's
 * while the charge was a sheet of its own, and `useReserveFlow` is how the page
 * reads the two things it still needs from them (`paid`, and the one call that
 * opens the checkout).
 *
 * ══ THE HEADER IS THE ONE HEADER ═══════════════════════════════════════════
 * Its title is the current page's, a 44px Back chevron appears at the left from
 * page 1 on, and the X stays at the right and closes THE WHOLE LAYER from every
 * page, as it always did (Sam, 14 Sep 2026: "on the checkout page can we have a
 * sticky header?"). Back never re-asks anything: page 2 → 1 keeps the identity,
 * and page 1's chevron goes to the number when the code page is showing and to
 * page 0 otherwise. Page 3 has no way back — there is no decision left to take
 * — and its X reads "Done".
 *
 * FIXED CHILDREN (the sticky bar) keep working: while the sheet is mid-slide
 * its transform makes it their containing block, and it is inset:0, so "the
 * sheet's bottom edge" and "the viewport's bottom edge" are the same line; when
 * the animation settles on `transform:none` the containing block is the
 * viewport again. The scroller is a separate inner box, so neither ever scrolls
 * away with the content.
 */

/** What /reserve reads back out of the flow its own button starts. */
interface ReserveFlow {
  /** Which page is up. 0 is the page itself. */
  step: number;
  /** The subscription id once the charge settled, or null. */
  paid: string | null;
  /** The Checkout button, and the docked bar: both mean "on to page 1". */
  openCheckout: () => void;
}

const FlowContext = createContext<ReserveFlow | null>(null);

/**
 * `/reserve` is only ever drawn inside this layer (App.tsx), so the fallback is
 * not a second code path — it is what keeps a bare render from throwing.
 */
export function useReserveFlow(): ReserveFlow {
  return (
    useContext(FlowContext) ?? { step: 0, paid: null, openCheckout: () => {} }
  );
}

export default function ReserveLayer({
  background,
  children,
}: {
  background: Location | undefined;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  /* Still — no entrance — when coming back from a window this layer opened,
     and when the deck's card is about to fly onto this sheet: the sheet does
     not animate under the flight (POLISH §25, shell/cardFlight.ts). */
  const [flying] = useState(flightPending);
  const still =
    flying || Boolean((location.state as { fromLayer?: boolean } | null)?.fromLayer);
  const sheet = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLParagraphElement>(null);
  const phone = useRef<PhoneStepHandle>(null);

  /* ══ THE PAGE, AND WHICH WAY IT CAME ══════════════════════════════════════
     One piece of state, because the direction is only ever a property of a
     move: holding them apart let a render see the new page with the old
     direction and play the entrance mirrored. */
  const [page, setPage] = useState<{ step: number; dir: "fwd" | "back" }>({
    step: 0,
    dir: "fwd",
  });
  const step = page.step;
  /* From 1024 the frame follows the page it holds (§33): its size is read
     here, before the step changes, and run to the new page's once it lands. */
  const holdFrame = useSheetFrame(sheet);
  const shown = useRef(0);
  useLayoutEffect(() => {
    shown.current = step;
  }, [step]);
  const go = useCallback(
    (next: number) => {
      if (next !== shown.current) holdFrame();
      setPage((p) =>
        p.step === next ? p : { step: next, dir: next > p.step ? "fwd" : "back" },
      );
    },
    [holdFrame],
  );

  /* Which of PhoneStep's two stages is up on page 1 — the header titles itself
     from it, and the chevron uses it to decide what "back" means there. The
     code page is a page too, so the frame follows it the same way. */
  const [stage, setStage] = useState<PhoneStage>("phone");
  const onStage = useCallback(
    (next: PhoneStage) => {
      holdFrame();
      setStage(next);
    },
    [holdFrame],
  );

  /* ══ THE CHARGE'S OWN STATE, NOW THAT THE CHARGE IS DRAWN HERE ════════════
     Moved from routes/Reserve.tsx with the pages. `paid` is never seeded from
     storage: a previous reservation is not this visit's, and rendering a stale
     receipt over a live checkout would be the worst possible confusion on a
     surface that takes money. */
  const [paid, setPaid] = useState<string | null>(null);
  const [noWallet, setNoWallet] = useState(false);
  /**
   * The signed-in number, held in a ref so it survives the charge and can be
   * written into the reservation alongside the subscription id. Nothing here
   * renders it, so a re-render between signing in and paying would be pure
   * cost.
   */
  const identity = useRef<PhoneIdentity | null>(null);
  /* ONE PLAN. `create_simple_intent` can charge exactly one price in
     subscription mode; see the note where the picker stood in Reserve.tsx. */
  const plan = PLANS.monthly;
  /* Stripe's answer, not this browser's: a member who already holds a seat is
     sent to page 3 rather than through a sign-in and a wallet that answers 409.
     Only a hard `true` diverts, so an unknown answer buys as normal. */
  const { subscribed } = useAuth();

  const openCheckout = useCallback(() => {
    go(subscribed === true ? 3 : 1);
  }, [go, subscribed]);

  /* ══ THE SHEET OPENING IS THE MID-FUNNEL EVENT ═════════════════════════════
     One `checkout_opened` per open, not per page: it fires on leaving page 0
     and re-arms only on returning to it. It reaches Meta as InitiateCheckout
     (context/meta_pixel.ts); a /reserve pageview is not the same thing, since
     most of that traffic never opens the checkout. */
  const { track } = useEventTracking();
  const opened = useRef(false);
  useEffect(() => {
    if (step === 0) {
      opened.current = false;
      return;
    }
    if (opened.current) return;
    opened.current = true;
    track("checkout_opened");
  }, [step, track]);

  /* ══ THE WAY OUT IS ANIMATED TOO ══════════════════════════════════════════
     Sam, 15 Sep 2026: "/impeccable animate for the slide in and out animation
     for this modal." Leaving used to be the layer unmounting — instant. Now
     the sheet slides back down under the scrim's fade, quicker than it came
     (260ms, ease-in: an object leaving does not decelerate into the edge it
     is leaving through), and the route changes when the motion is done. One
     close at a time; a second tap during the exit is ignored rather than
     queued. Reduced motion: no exit animation, the route changes at once. */
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    if (closing) return;
    const to = background
      ? `${background.pathname}${background.search}${background.hash}`
      : "/";
    const go = () => navigate(to, { state: { fromLayer: true } });
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      go();
      return;
    }
    setClosing(true);
    window.setTimeout(go, 280);
  }, [background, navigate, closing]);

  useEffect(() => {
    sheet.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* NOT ONCE PAID. The receipt holds the reference the member would quote
         to claim a refund, and an accidental Escape would throw it away — the
         one dismissal on this surface that has to be deliberate. */
      if (e.key === "Escape" && !paid) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, paid]);

  /* The sheet starts each page at the top and hands the reader its title: a
     move that left the scroll where the last page had it would open the new
     page halfway down, and a move nobody is told about is a screen changing
     under a screen-reader's cursor. Not on the first paint — the sheet's own
     entrance is the announcement there. */
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) {
      moved.current = true;
      return;
    }
    scroller.current?.scrollTo({ top: 0 });
    title.current?.focus({ preventScroll: true });
  }, [step]);

  /* ── the header's three questions ──────────────────────────────────────── */
  const heading =
    step === 1
      ? stage === "code"
        ? "Enter your code"
        : "Your details"
      : step === 2
        ? "Confirm your seat"
        : step === 3
          ? `Your ${seatNoun}`
          : "Get early access";

  /* Page 1's chevron goes to the number first when the code page is showing —
     the step's own "different number" path, never a second copy of it. */
  const back =
    step === 1
      ? () => {
          if (stage === "code") {
            phone.current?.back();
            return;
          }
          go(0);
        }
      : step === 2
        ? () => go(1)
        : null;

  const flow = useMemo<ReserveFlow>(
    () => ({ step, paid, openCheckout }),
    [step, paid, openCheckout],
  );

  return (
    <div className={`reserve-layer${still ? " is-still" : ""}${closing ? " is-closing" : ""}`}>
      {/* ══ A CLICK OUTSIDE CLOSES IT (23 Sep 2026) ══════════════════════
          Sam, on the desktop checkout: "when I click outside of this pop up
          can you have it close." The scrim is the sibling UNDER the sheet,
          not its parent, so a click inside the sheet never reaches it and
          nothing has to stop propagation. It runs the X's own `close`, with
          its exit, from any page.

          NOT ONCE PAID — the guard the old second sheet's backdrop had, and
          the Escape key's above: the receipt holds the reference a member
          quotes to claim a refund, and a stray tap must not throw it away.
          The X, reading "Done" there, still closes. aria-hidden, because
          this is a pointer shortcut; the X and Escape are the named ways out.

          On a phone the sheet is 92vh, so the scrim shows as a band above it
          and a tap there closes too — a bottom sheet's usual behaviour, and
          the pop-up's (`.vp-root`). */}
      <div
        className="reserve-scrim"
        aria-hidden="true"
        onClick={() => {
          if (!paid) close();
        }}
      />
      <div
        className="reserve-sheet"
        data-lit=""
        role="dialog"
        aria-modal="true"
        aria-label={`Get the ${seatNoun}`}
        tabIndex={-1}
        ref={sheet}
      >
        {/* Sam, 15 Sep 2026: the wordmark and the Blacksburg chip doubled the
            card's own lockup and BLACKSBURG directly beneath them — "these
            should go in the footer not the header. In the header it can just
            say checkout." So: one word, centred, the way back, and the way
            out. */}
        <header className="sheet-head">
          {back ? (
            <button type="button" className="rs-back sheet-back" onClick={back} aria-label="Back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M14.5 6.5 9 12l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
          <p className="sheet-title" tabIndex={-1} ref={title}>
            {heading}
          </p>
          <button
            type="button"
            className="how-back sheet-close"
            onClick={close}
            aria-label={paid && step === 3 ? "Done" : "Close"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="sheet-scroll" ref={scroller}>
          <Pager dir={page.dir}>
            <Page current={step === 0}>
              <div className="column sheet-column">
                <FlowContext.Provider value={flow}>{children}</FlowContext.Provider>
              </div>
            </Page>
            <CheckoutSheet
              plan={plan}
              step={step}
              onStep={go}
              paid={paid}
              onPaid={(id) => {
                /* Local only — there is no order backend in this project.
                   Written before the receipt renders so a reload cannot lose
                   the reference of a charge that already settled. */
                try {
                  window.localStorage.setItem(
                    "tapin.blacksburg.reservation",
                    JSON.stringify({
                      id,
                      plan: plan.id,
                      cents: plan.paidTodayCents,
                      at: new Date().toISOString(),
                      /* ══ WHAT SHE BOUGHT, NOT WHAT IT COSTS TODAY ═════════
                         Pre-deploy review, 14 Sep 2026: /in rendered today's
                         PLANS, so from the 27 Sep flip every $4.99 founder
                         would have been told her locked rate was $14.99, lost
                         her saved row, and read a term saying the founding
                         seats were gone. The words and figures she agreed to
                         are written with the charge and read back from here;
                         the site's live prices never touch her receipt. */
                      founding: FOUNDING_OPEN,
                      price: plan.price,
                      per: plan.per,
                      saving: plan.saving,
                      locked: lockedRateLine,
                      terms: plan.terms,
                      name: identity.current?.name ?? null,
                      phone: identity.current?.phone ?? null,
                      phoneVerified: identity.current?.verified ?? false,
                      marketingOptIn: identity.current?.marketingOptIn ?? false,
                    }),
                  );
                } catch {
                  /* private mode — the reference still renders on page 3 */
                }
                setPaid(id);
                go(3);
              }}
              noWallet={noWallet}
              onNoWallet={() => setNoWallet(true)}
              /* ══ `tapin.blacksburg.identity` IS GONE (15 Sep 2026) ═════════
                 It held the number of someone who signed in and then did not
                 pay, so a launch text could still reach them. Nothing ever
                 read it — the value was entirely in it being there when a
                 server finally existed. One does now: signing in creates a
                 Supabase auth user carrying the verified number, the name and
                 the marketing opt-in, and it is created AT VERIFY, before the
                 wallet opens. A second copy in this browser could only go
                 stale. */
              onIdentity={(id) => {
                identity.current = id;
              }}
              onStage={onStage}
              phoneRef={phone}
            />
          </Pager>
        </div>
      </div>
    </div>
  );
}
