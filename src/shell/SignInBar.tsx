import { useState } from "react";
import PhoneStep from "./PhoneStep";
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
 */
export default function SignInBar() {
  const { userSession, logout } = useAuth();
  const [open, setOpen] = useState(false);

  /* `undefined` is "not known yet" — render nothing rather than flashing
     "Sign in" at someone who is already signed in, every reload. */
  if (userSession === undefined) return null;

  return (
    <>
      {/* The CTA's own shape and size, in the ghost variant. NOT the maroon
          one: the money CTA is directly above this, and two full-maroon
          buttons on one screen is the decoy problem /reserve solved once
          already — the nearer one wins and it is not the one that sells. */}
      <div className="signin-bar">
        <button
          type="button"
          className="action action-ghost signin-go"
          onClick={() => (userSession ? logout() : setOpen(true))}
        >
          {userSession ? "Sign out" : "Sign in"}
        </button>
      </div>

      {open ? (
        <div className="cs-scrim" onClick={() => setOpen(false)}>
          <div
            className="cs-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Sign in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cs-top">
              <p className="cs-title">Sign in</p>
              <button
                type="button"
                className="cs-close"
                onClick={() => setOpen(false)}
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
            <PhoneStep onDone={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
