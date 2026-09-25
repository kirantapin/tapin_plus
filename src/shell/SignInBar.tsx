import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import PhoneStep, { type PhoneStage, type PhoneStepHandle } from "./PhoneStep";
import { useAuth } from "../context/auth_context";

/**
 * Sign in / sign out, on the pitch.
 *
 * ══ WHY THIS EXISTS AT ALL ═════════════════════════════════════════════════
 * Until the subscription landed, the phone number was collected inside the
 * checkout and nowhere else — there was no session to be in or out of, so
 * there was nothing to show. Now there is: a member coming back on the same
 * device is signed in, and the only evidence of it was the CTA quietly
 * changing to "View your membership". Someone on a shared laptop had no way
 * to sign out, and someone whose session had gone had no way back in short of
 * opening the checkout.
 *
 * ══ IT REUSES THE CHECKOUT'S OWN STEP ══════════════════════════════════════
 * `PhoneStep` is the signing-in surface and there must not be a second one —
 * it carries the TCPA split (required transactional number, optional and
 * unticked marketing box) that took a day to get right, and a rewritten copy
 * of it here would drift from that the first time either was edited. So this
 * opens the same component in the same sheet chrome the checkout uses.
 *
 * ══ IT CLAIMS NOTHING ABOUT A PURCHASE ═════════════════════════════════════
 * Signing in is not buying. This says who you are and no more; whether a seat
 * is held is `subscribed`, which the CTA beside it already reads.
 *
 * ══ AND IT PAGES LIKE THE CHECKOUT (21 Sep 2026) ═══════════════════════════
 * Sam: "also the same paged flow for the sign in sheet." The number and the
 * code are two pages of PhoneStep's own track now, so this sheet grew the
 * chrome that paging needs: a title that follows the stage and a Back chevron
 * on the code page. The chevron calls the step's `back()` — the existing "Use a
 * different number" path — rather than a second way back that could drift from
 * it. Everything else about the sheet is unchanged: it is still a slide-up
 * `.cs-sheet` on a scrim of its own, portalled to <body>, because this is not
 * part of the checkout flow. See docs/POLISH-2026-09-21.md §9.1.
 */
export default function SignInBar() {
  const { userSession, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  /* Which of the step's two pages is up — the title reads from it, and the
     chevron only exists on the second one. */
  const [stage, setStage] = useState<PhoneStage>("phone");
  const phone = useRef<PhoneStepHandle>(null);

  /* ══ IT LEAVES THE WAY IT ARRIVED ══════════════════════════════════════════
     Sam, 21 Sep 2026: "can these modals transition in from the bottom of the
     screen like the checkout modal?" The arrival is reserve.css's (`csUp`); the
     departure needs a beat of state, because an unmount is instant and a sheet
     that slides in and then vanishes is worse than one that never moved.

     VenuePopup's pattern exactly: a `closing` flag for the length of the exit,
     a reduced-motion short-circuit that unmounts at once, and one close at a
     time. The timeout is 280ms, not VenuePopup's 200 — its sheet leaves in
     200ms and this one leaves in 260 (`csDown`, the checkout's own duration),
     and ReserveLayer already pairs that 260 with a 280ms handoff. A 200ms
     timeout here would cut the slide short. */
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | null>(null);
  const close = () => {
    if (closing) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setOpen(false);
      return;
    }
    setClosing(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setClosing(false);
      setOpen(false);
    }, 280);
  };
  /* Re-opening inside those 280ms has to cancel the pending unmount, or the
     sheet opens and is closed again by the previous close's own timer. */
  const openSheet = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setClosing(false);
    setStage("phone");
    setOpen(true);
  };

  /* `undefined` is "not known yet" — render nothing rather than flashing
     "Sign in" at someone who is already signed in, every reload. */
  if (userSession === undefined) return null;

  return (
    <>
      {/* ══ A TEXT CONTROL IN THE ANNOUNCEMENT BAR ══════════════════════════
          It wore the CTA's own shape (`.action.action-ghost`, full width) at
          the foot of the hero, which made it the THIRD stacked pill in the
          first screenful — one filled action per view is the rule, and two
          ghosts under it is the decoy shape in a quieter colour.

          It is page chrome now, not an offer: 12px on the bar's own ink, at
          the right edge, sized by pitch.css. The classes go with it — an
          `.action` here would have to have every one of its button
          properties undone, and a control that is styled by negation is the
          next person's puzzle. Nothing about the sheet changes. */}
      <div className="signin-bar">
        {/* SIGNED IN, THE MEMBERSHIP IS ONE TAP AWAY (§61; Sam, 25 Sep 2026:
            "once im signed in it should be a different experience"). */}
        {userSession ? (
          <Link className="signin-go" to="/in" aria-label="Your membership">
            {/* "Membership" on a phone, where the sentence beside it needs the room. */}
            <span className="signin-long" aria-hidden="true">
              Your membership
            </span>
            <span className="signin-short" aria-hidden="true">
              Membership
            </span>
          </Link>
        ) : null}
        <button
          type="button"
          className={userSession ? "signin-go signin-out" : "signin-go"}
          onClick={() => (userSession ? logout() : openSheet())}
        >
          {userSession ? "Sign out" : "Sign in"}
        </button>
      </div>

      {/* ══ ON <body>, OR IT HANGS OFF THE HERO ═══════════════════════════
          Sam, 20 Sep 2026: "the position of the sign in modal is completely
          off I think." It was: the sheet sat mid-page with the pitch showing
          below it.

          `.cs-scrim` is `position:fixed; inset:0`, and this button lives
          inside `.panel.hero`, which carries `backdrop-filter: blur(22px)`.
          A filter makes its element the containing block for every fixed
          descendant, so "fixed to the viewport" silently became "fixed to
          the hero panel" — measured at top:-658, bottom:138 in an 812px
          window. Nothing about the sheet was wrong; it was anchored to the
          wrong box.

          The portal is the same answer the merchant pop-up and the checkout
          toast already use, and for the same reason. It is the third time
          this trap has been hit in this build, which is what a filtered
          ancestor costs: it is invisible until something inside it tries to
          be fixed. */}
      {open
        ? createPortal(
        <div
          className={`cs-scrim${closing ? " is-closing" : ""}`}
          onClick={close}
        >
          <div
            className="cs-sheet"
            data-lit=""
            role="dialog"
            aria-modal="true"
            aria-label="Sign in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cs-top">
              {stage === "code" ? (
                <button
                  type="button"
                  className="rs-back cs-back"
                  onClick={() => phone.current?.back()}
                  aria-label="Back"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 6.5 9 12l5.5 5.5" />
                  </svg>
                </button>
              ) : null}
              <p className="cs-title">
                {stage === "code" ? "Enter your code" : "Sign in"}
              </p>
              <button
                type="button"
                className="cs-close"
                onClick={close}
                aria-label="Close"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                >
                  <path d="m7 7 10 10M17 7 7 17" />
                </svg>
              </button>
            </div>
            {/* The session is what matters here, and `verifyCode` leaves it
                behind through `onAuthStateChange` — so the sheet just closes
                and everything reading `useAuth` re-renders itself. */}
            {/* A verified sign-in lands on the membership (§61); an unverified
                one (no SMS provider) has no session to show there. */}
            <PhoneStep
              ref={phone}
              signIn
              onStage={setStage}
              onDone={(id) => {
                close();
                if (id.verified) navigate("/in");
              }}
            />
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}
