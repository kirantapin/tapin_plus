import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Pager, { Page, PAGE_MOVE_MS } from "./Pager";
import { phoneAuth, sendCode, verifyCode } from "./authEnv";
import { useName } from "../model/nameStore";

/**
 * Sign in with a phone number, before the charge.
 *
 * Sam, 13 Sep 2026: "before they can actually purchase they have to sign in with
 * their phone number so we can actually map the membership to their account and
 * send them text notifications when we get closer to the launch."
 *
 * ══ TWO CONSENTS, AND THEY ARE NOT THE SAME CONSENT ════════════════════════
 * This is the part worth reading before changing anything here.
 *
 * The NUMBER is required, because it is the account. Without it the reservation
 * is an anonymous PaymentIntent and there is no way to hand a membership to a
 * person in Spring 2027. Texts ABOUT THAT RESERVATION — it is held, it is
 * refunded, the service is opening — are transactional and ride the same
 * necessity.
 *
 * MARKETING TEXTS ARE A SEPARATE, OPTIONAL, UNCHECKED BOX. Under the TCPA,
 * consent to receive marketing messages may not be a condition of a purchase,
 * so bundling "send them text notifications" into a required field would have
 * made every reservation on this page a compliance problem rather than a
 * feature. Split, Sam gets exactly what he asked for and the box is a real
 * choice: unchecked by default, never pre-ticked, and the purchase completes
 * either way.
 *
 * Do not make the checkbox required. Do not default it to true. Do not remove
 * the sentence under it — express consent has to say who is texting, about
 * what, and that rates apply, at the point the number is given.
 *
 * 14 Sep 2026: the launch notification was MISFILED under the optional box
 * ("Text me when TapIn opens…"). It is transactional — it is about the seat
 * she paid for — so it now rides the number like the held/refunded texts do,
 * and is disclosed in a plain sentence under the field. The box is left with
 * only what genuinely needs consent: offers and news. Sam's ask, verbatim:
 * "make transactional texts required, but marketing texts can be an opt in."
 *
 * ══ THE TWO STAGES ARE TWO PAGES, AND THE HOST DRAWS THE CHROME ════════════
 * 21 Sep 2026. The number and the code used to be a ternary in one column, and
 * the way back was an underlined "Use a different number" at the foot. Both
 * hosts — the checkout's page 1 and the sign-in sheet — now carry a header with
 * a title and a Back chevron, so the stages are a two-page `Pager` track (the
 * same primitive the checkout's own four pages use, shell/Pager.tsx), this step
 * reports which stage is up through `onStage`, and `back()` is exposed so the
 * chevron in the host's header runs the step's OWN way back rather than a
 * second copy of it. Nothing about the OTP logic, the fields or the strings
 * changed — they moved into the pages. See docs/POLISH-2026-09-21.md §9.1.
 *
 * ══ VERIFICATION IS GATED, COLLECTION IS NOT ═══════════════════════════════
 * With `phoneAuth.live` false there is no SMS provider configured, so no code
 * is sent and none is asked for. The step still collects the number — that is
 * the half that maps the membership — and says plainly that the number is not
 * verified rather than showing a code field that cannot work. Same honesty rule
 * as the wallet: never render a control that cannot complete.
 */

/** E.164 for the US. The stored form is always +1XXXXXXXXXX, never the pretty
 *  one — a formatted string is a display concern and a terrible database key. */
const toE164 = (digits: string): string => `+1${digits}`;

/** Digits only, capped at 10. Paste of "+1 (540) 555-0123" lands correctly
 *  because the leading 1 is dropped when it would make an 11th digit. */
const digitsOf = (raw: string): string => {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.slice(0, 10);
};

/** (540) 555-0123, built as they type. Partial input stays partial — no
 *  trailing bracket waiting for a digit that has not been typed. */
const pretty = (d: string): string => {
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

/**
 * E.164 back to the readable form — "+15405550123" -> "(540) 555-0123".
 *
 * Exported because three surfaces show a stored number (the checkout sheet's
 * "Holding for", the membership page, and this step's own code screen) and the
 * stored form is a KEY, not something to put in front of a reader. One
 * function, so they cannot format the same number three ways. Falls through to
 * the raw string for anything that is not a 10-digit US number rather than
 * mangling it.
 */
export const readablePhone = (e164: string): string => {
  const d = digitsOf(e164);
  return d.length === 10 ? pretty(d) : e164;
};

export interface PhoneIdentity {
  /** As she wants it on the card. Trimmed; never empty once collected. */
  name: string;
  /** E.164, the stored form. */
  phone: string;
  /** Whether an SMS code actually confirmed it. False when unconfigured. */
  verified: boolean;
  /** Express consent to launch texts. Optional, and never a purchase gate. */
  marketingOptIn: boolean;
}

/** Which of the two pages is up. The host titles its header from this. */
export type PhoneStage = "phone" | "code";

/** What a host may do to this step from its own chrome. */
export interface PhoneStepHandle {
  /** Back to the number, from the code page. The "different number" path. */
  back: () => void;
}

const PhoneStep = forwardRef<
  PhoneStepHandle,
  {
    onDone: (id: PhoneIdentity) => void;
    /** Fires on every stage change, so the host's title can follow it. */
    onStage?: (stage: PhoneStage) => void;
    /** Signing in, not signing up (§60, §65): no name, no seat lede, no texts
     *  disclosure or marketing box, one line about the code, and nothing
     *  written to the account but the session. */
    signIn?: boolean;
  }
>(function PhoneStep({ onDone, onStage, signIn = false }, ref) {
  const askName = !signIn;
  /* The session's one name — typed here, or onto the card on the deck's close
     (Sam, 14 Sep 2026). Either way it is the same value, so the field opens
     already filled if she named the card, and the /reserve card fills in as
     she types here. See nameStore.ts. */
  const [name, setName] = useName();
  const [digits, setDigits] = useState("");
  const [optIn, setOptIn] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<PhoneStage>("phone");
  /* Which way the track is moving. Forward to the code, mirrored on the way
     back — Pager reads it off the stack and the host never sets it. */
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  /* THE NAME IS REQUIRED, and it is the only thing besides the number that
     is. Sam, 14 Sep 2026: "we need to ask for a name as well when someone
     purchases." It is what the membership card carries — the card has said
     "Your name" since it was built — so a reservation without one hands over
     a card with a placeholder on it. Trimmed, non-empty; nothing stricter,
     because a name is whatever she says it is. */
  const valid = digits.length === 10 && (!askName || name.trim().length > 0);

  /* ══ THE WAY BACK, AND THERE IS ONLY ONE ═══════════════════════════════════
     The foot's "Use a different number" and the host header's Back chevron are
     the same three lines: drop the code, drop the error, show the number again.
     Exposed on the ref so the chevron cannot become a second, drifting copy. */
  const back = useCallback(() => {
    setCode("");
    setError(null);
    setDir("back");
    setStage("phone");
    onStage?.("phone");
    /* Focus follows the move back, as it follows the move forward. Without it
       the code field is parked with the page it was on and focus falls to the
       body, which is a keyboard reader losing their place mid-sign-in. The
       number is what they came back to change, so it is what takes it. */
    window.setTimeout(() => phoneRef.current?.focus(), PAGE_MOVE_MS);
  }, [onStage]);
  useImperativeHandle(ref, () => ({ back }), [back]);

  const submitPhone = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    if (!phoneAuth.live) {
      /* No provider configured. Collect and continue — the number is the half
         that matters for mapping a membership, and claiming a verification
         that did not happen would be the lie this gate exists to avoid. */
      setBusy(false);
      onDone({ name: name.trim(), phone: toE164(digits), verified: false, marketingOptIn: optIn });
      return;
    }
    const err = await sendCode(toE164(digits));
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setDir("fwd");
    setStage("code");
    onStage?.("code");
    /* Focus follows the step. Without this the code field is a control the
       reader has to go and find after the screen changed under them. The wait
       is the move's own length: focusing a field that is still sliding scrolls
       the sheet to catch it. */
    window.setTimeout(() => codeRef.current?.focus(), PAGE_MOVE_MS);
  };

  const submitCode = async () => {
    if (code.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    /* The name goes with it — it is written onto the auth user so the account
       is identifiable as a person, not just a number. See authEnv.ts. */
    /* Signing in writes neither: the account has its name, and an unticked box
       here would record "no" before the checkout could ask (§65). */
    const err = await verifyCode(
      toE164(digits),
      code,
      signIn ? undefined : name.trim(),
      signIn ? undefined : optIn,
    );
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onDone({ name: name.trim(), phone: toE164(digits), verified: true, marketingOptIn: optIn });
  };

  return (
    <div className="ph">
      {/* Sam, 25 Sep 2026, of signing in: "isn't all of this other text not
          relevant to people who have already signed up". It is not (§65). */}
      {signIn ? null : (
        <p className="ph-lede">
          Your seat is held against your number, so we can hand you the membership
          when we open.
        </p>
      )}

      {/* ══ TWO PAGES, ONE MOVE ═══════════════════════════════════════════
          The number and the code are the same track the checkout's own pages
          run on, so every step in both sheets moves identically. Both pages
          stay mounted: a number typed here is still typed when the reader
          comes back to it from the code page. */}
      <Pager dir={dir}>
        <Page current={stage === "phone"}>
          {/* The name first, then the number — the order every checkout a
              student has used puts them in. Same field chrome as the number,
              without the country-code affordance. `words` capitalisation and
              the `name` autocomplete token let the phone's own keyboard and
              autofill do the typing. 40 is the card's own line: the name
              renders nowrap with an ellipsis, so a longer one would be cut on
              the card while looking accepted here. */}
          {/* Signing in skips it (Sam, 25 Sep 2026: "sign in doesn't need a name
              because they provide that at sign up"). */}
          {askName ? (
            <>
              <label className="ph-label" htmlFor="ph-name">
                Your name
              </label>
              <div className="ph-field">
                <input
                  id="ph-name"
                  className="ph-input"
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  name="name"
                  /* Password managers draw their icon into any field that looks
                     like a login (Sam's screenshot, 14 Sep 2026). The vendors'
                     own opt-outs; same as the card's name line. */
                  data-1p-ignore=""
                  data-lpignore="true"
                  data-bwignore=""
                  maxLength={40}
                  placeholder="As you'd like it on your card"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") phoneRef.current?.focus();
                  }}
                />
              </div>
            </>
          ) : null}

          <label className={askName ? "ph-label ph-label-2" : "ph-label"} htmlFor="ph-num">
            Mobile number
          </label>
          <div className="ph-field">
            <span className="ph-cc" aria-hidden="true">
              +1
            </span>
            <input
              ref={phoneRef}
              id="ph-num"
              className="ph-input tnum"
              /* `tel` + `inputMode` gets the numeric keypad on both platforms;
                 `autoComplete="tel-national"` matches what the browser has
                 stored for the visible format, which is the national one. */
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              name="phone"
              placeholder="(540) 555-0123"
              value={pretty(digits)}
              onChange={(e) => {
                setDigits(digitsOf(e.target.value));
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitPhone();
              }}
              aria-describedby={signIn ? "ph-err ph-tx" : "ph-err ph-tx ph-consent"}
              aria-invalid={error ? true : undefined}
            />
          </div>

          {/* ══ TRANSACTIONAL, DISCLOSED, NO CONTROL ═════════════════════════
              Sam, 14 Sep 2026: "make transactional texts required, but
              marketing texts can be an opt in." That is the split the header
              already draws — the number is the account, and texts about the
              reservation ride on it. What was WRONG was the copy: the launch
              text ("when TapIn opens") had been filed under the optional box,
              so a reader who left it unticked would reasonably believe she
              would not be told when we open. She will; it is about her seat.
              This line says so, once, where the number is given, with the
              rates disclosure attached to the number rather than to the
              marketing choice. It is a sentence, not a control — there is
              nothing to decline short of not giving a number. */}
          {signIn ? (
            <p id="ph-tx" className="t-compact ph-tx">
              We&rsquo;ll text you a code to sign in. Message and data rates may apply.
            </p>
          ) : (
            <p id="ph-tx" className="t-compact ph-tx">
              We&rsquo;ll text this number when your seat is held, if it&rsquo;s
              refunded, and when we open. Message and data rates may apply.
            </p>
          )}

          {/* ══ MARKETING: OPTIONAL, UNCHECKED, AND NOT A GATE ══════════════
              See the header. Consent to marketing texts cannot be a condition
              of the purchase, so this is a real choice and the Continue button
              below does not read it. One line now, and only about the thing
              that actually needs consent. Who, what, STOP, and that it is
              optional — the TCPA's express-consent elements are all still
              here; the rates line above covers this number for both kinds of
              message.

              THE SENDER IS NAMED, AND IT IS THE COMPANY. Sam, 20 Sep 2026:
              "this would be texts from Tapin App, Inc." It read "from TapIn
              places", which names what the messages are ABOUT and leaves the
              party the reader is consenting to unnamed — and the identity of
              the sender is the one element express written consent turns on.
              The merchants do not send these; TapIn does, about them. */}
          {signIn ? null : (
            <label className="ph-opt">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
              />
              <span id="ph-consent">
                Also text me offers and news from TapIn App, Inc. Optional.
                Reply STOP anytime.
              </span>
            </label>
          )}

          <button
            type="button"
            className="action"
            onClick={submitPhone}
            disabled={!valid || busy}
          >
            {busy ? "One moment…" : phoneAuth.live ? "Send me a code" : "Continue to payment"}
          </button>

          {!phoneAuth.live ? (
            <p className="t-compact not-live">
              Codes are not switched on yet. Your number is saved with the
              reservation but not verified.
            </p>
          ) : null}
        </Page>

        <Page current={stage === "code"}>
          <label className="ph-label" htmlFor="ph-code">
            The 6-digit code we sent to {pretty(digits)}
          </label>
          <div className="ph-field">
            <input
              id="ph-code"
              ref={codeRef}
              className="ph-input ph-code tnum"
              type="text"
              inputMode="numeric"
              /* The one value browsers and iOS will autofill from an SMS. */
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCode();
              }}
              aria-describedby="ph-err"
              aria-invalid={error ? true : undefined}
            />
          </div>
          <button
            type="button"
            className="action"
            onClick={submitCode}
            disabled={code.length < 6 || busy}
          >
            {busy ? "Checking…" : "Confirm"}
          </button>
          {/* The same `back` the host's chevron calls — one path, two doors. */}
          <button type="button" className="ph-back" onClick={back}>
            Use a different number
          </button>
        </Page>
      </Pager>

      {/* Announced, not just shown. An error that only changes colour is an
          error a screen-reader user never learns about. */}
      <p className="t-compact ph-err" id="ph-err" role="status" aria-live="polite">
        {error ?? ""}
      </p>
    </div>
  );
});

export default PhoneStep;
