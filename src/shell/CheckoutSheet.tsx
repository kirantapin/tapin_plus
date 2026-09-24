import { useState, type Ref } from "react";
import GuaranteeLine from "./GuaranteeLine";
import { Link } from "react-router-dom";
import { Page } from "./Pager";
import { Drill } from "./Drill";
import SubscriptionPayButton from "./SubscriptionPayButton";
import PhoneStep, {
  readablePhone,
  type PhoneIdentity,
  type PhoneStage,
  type PhoneStepHandle,
} from "./PhoneStep";
import { useAuth } from "../context/auth_context";
import {
  launchWindow,
  GUARANTEE_CONTACT,
  seatNoun,
  type PlanId,
} from "../model/content";

/* The noun with its article: "an Early-ish Bird Special", "a seat". */
const aSeat = `${/^[aeiou]/i.test(seatNoun) ? "an" : "a"} ${seatNoun}`;

/**
 * The charge — pages 1, 2 and 3 of the checkout.
 *
 * Sam, 13 Sep 2026: "instead of all these disclosures here, they'd exist in a
 * checkout modal flow… we only need the disclosure and terms right at checkout."
 *
 * ══ IT STOPPED BEING A SHEET OF ITS OWN ON 21 Sep 2026 ═════════════════════
 * Sam, on this arriving over the checkout: "the way this pops up is strange, I
 * think it'd be a part of the checkout modal, almost like it swipes to the next
 * screen as if this flow is a part of the same modal. We'd need a back button
 * as well probably."
 *
 * So the second scrim, the second `.cs-sheet` and its own header and X are
 * gone. What is left is what was always the point: three states, rendered as
 * three pages inside the one sheet ReserveLayer draws (shell/Pager.tsx moves
 * between them, the layer's header carries the title and the Back chevron, and
 * its X closes the whole layer from any page). The state machine below —
 * `identity`, `subscribed`, `paid` — is untouched, and every string in the
 * three states is the string it was. See docs/POLISH-2026-09-21.md §9.
 *
 * ══ §4 DID NOT MOVE. IT CAME WITH THEM, AND IT STILL GOVERNS THIS FILE ══════
 * TRUTH.md §4 is the one rule that outranks design here: the three charge rows,
 * the consent sentence and the control that takes money must be visible
 * TOGETHER, without opening anything. Virginia's automatic-renewal statute wants
 * the terms in visual proximity to the consent control; ROSCA wants them before
 * billing details are taken.
 *
 * Moving them into this sheet SATISFIES that rule rather than bending it —
 * arguably better than the page did. On the page they shared a scroll with a
 * plan picker, a seat line, a savings block and a guarantee, and were co-visible
 * with the button at some scroll positions and not others. In here there is
 * nothing else: the sheet opens, and the rows, the forfeit, the consent and the
 * wallet are the entire contents, in that order, with nothing collapsible
 * between them. The full terms may sit in a drill BECAUSE the four above it do
 * not.
 *
 * So the rule for anyone editing this file is unchanged from the page it left:
 * do not reorder, do not insert, do not move the drill above the wallet, and do
 * not put anything collapsible between the rows and the control.
 *
 * ══ THE WALLET IS THE BILLING STEP ═════════════════════════════════════════
 * There is no button of ours before it — tapping Apple Pay or Google Pay opens
 * the device sheet directly. That is why the consent sits immediately above it:
 * with a wallet, the moment billing details are taken IS the tap.
 */

export interface CheckoutPlan {
  id: PlanId;
  price: string;
  per: string;
  /** The first billed period as the receipt names it: "month", "3 months", "year". */
  period: string;
  paidTodayCents: number;
  chargeRows: { id: string; label: string; detail: string }[];
  terms: { id: string; term: string }[];
  consent: string;
}

export default function CheckoutSheet({
  plan,
  step,
  onStep,
  paid,
  onPaid,
  noWallet,
  onNoWallet,
  onIdentity,
  onStage,
  phoneRef,
}: {
  plan: CheckoutPlan;
  /** Which page of the layer is up. 1, 2 and 3 are this file's. */
  step: number;
  /** Move the layer's track — the flow advances itself, the chrome follows. */
  onStep: (step: number) => void;
  /** The subscription id once the charge settled, or null. */
  paid: string | null;
  onPaid: (id: string) => void;
  noWallet: boolean;
  onNoWallet: () => void;
  /** Where the signed-in number goes — stored with the reservation. */
  onIdentity: (id: PhoneIdentity) => void;
  /** The phone step's stage, so the layer can title its header from it. */
  onStage?: (stage: PhoneStage) => void;
  /** The layer's Back chevron reaches the phone step's own way back. */
  phoneRef?: Ref<PhoneStepHandle>;
}) {
  /**
   * WHO IS BUYING, BEFORE WHAT THEY ARE BUYING.
   *
   * Sam, 13 Sep 2026: they sign in with a phone number before they can
   * purchase. Held here rather than in the page, because it is part of this
   * transaction: closing without finishing should not leave a half-signed
   * state behind for the next attempt to inherit.
   */
  const [identity, setIdentity] = useState<PhoneIdentity | null>(null);
  /* Stripe's answer, not this browser's. `null` means not known yet — only
     a hard `true` replaces the checkout, so a slow or failed check shows the
     wallet rather than telling a new buyer they have already paid. */
  const { subscribed } = useAuth();
  const forfeitTerm = plan.terms.find((t) => t.id === "forfeit")?.term;

  /* "Change", and the wallet's own "you are not signed in": both are the same
     correction, and both are one page back. Clearing the identity without
     moving would leave page 2 with nobody to hold the seat for. */
  const changeIdentity = () => {
    setIdentity(null);
    onStep(1);
  };

  return (
    <>
      {/* ══ PAGE 1 · WHO, BEFORE WHAT ═══════════════════════════════════════
          The number is collected BEFORE the charge rows, not after, and that
          ordering is the point: a reservation whose owner is unknown cannot be
          handed to anyone in Spring 2027.

          §4 IS NOT WEAKENED BY THIS. Its rule is about what must be visible at
          the moment billing details are taken — and billing details are taken
          by the wallet, one page further on. A reader cannot reach a payment
          sheet from here; they reach the rows, the consent and the wallet
          together, exactly as before. A step in front of the disclosure block
          is not a thing between the rows and the button. */}
      <Page current={step === 1}>
        <div className="rs-step">
          <PhoneStep
            ref={phoneRef}
            onStage={onStage}
            onDone={(id) => {
              setIdentity(id);
              onIdentity(id);
              onStep(2);
            }}
          />
          {/* The guarantee, under the form (Sam, 23 Sep 2026: "this should show
              up on the your details page"): the same line the included panel
              carries, so the promise is in view where the number is given. */}
          <GuaranteeLine className="rs-promise-step" />
        </div>
      </Page>

      {/* ══ PAGE 2 · THE CHARGE ═════════════════════════════════════════════
          ROWS → FORFEIT → CONSENT → CONTROL, together and in that order. Read
          this file's header before moving anything in here. */}
      <Page current={step === 2}>
        <div className="rs-step">
          {identity ? (
            <>
              {/* WHO IS BUYING, RESTATED. The number is the account and the
                  reader typed it one screen ago — printing it here is how they
                  catch a typo before money moves, not decoration. */}
              <p className="cs-who">
                <span>Holding for</span>
                <b>{identity.name}</b>
                <span className="tnum cs-phone">
                  {readablePhone(identity.phone)}
                </span>
                <button
                  type="button"
                  className="cs-change"
                  onClick={changeIdentity}
                >
                  Change
                </button>
              </p>

              {/* ROWS → FORFEIT → CONSENT → CONTROL. §4's order, unbroken. */}
              <ul className="charges">
                {plan.chargeRows.map((r) => (
                  <li key={r.id}>
                    <b>{r.label}</b>
                    <span>{r.detail}</span>
                  </li>
                ))}
              </ul>

              {/* The qualifier on the refund, out where the refund is: what it
                  costs is the seat and the locked rate. Rendered verbatim from the
                  terms list, never retyped. */}
              {forfeitTerm ? (
                <p className="t-compact forfeit">{forfeitTerm}</p>
              ) : null}

              {/* Deliberately the least decorated text here. It is consent, not
                  marketing — reading size, reading contrast, no emphasis. */}
              <p className="consent">{plan.consent}</p>

              {/* ══ THE REAL SUBSCRIPTION, ALWAYS ═══════════════════════════
                  15 Sep 2026. The fake-purchase ghost button and every "test
                  mode" line are gone: this slot renders the live wallet on every
                  build, wired to `create_simple_intent` in subscription mode.
                  The customer comes from the access token the phone step above
                  leaves behind, so there is nothing anonymous left to fake. */}
              <div className="pay-slot">
                <SubscriptionPayButton
                  onSubscribed={({ subscriptionId }) => onPaid(subscriptionId)}
                  onUnavailable={onNoWallet}
                  /* The phone step is one screen back and it is what mints the
                     session, so a missing token here means it did not take —
                     send them back to it rather than into a 401. */
                  onNeedsSignIn={changeIdentity}
                />
                {/* WALLETS ONLY — no card field. On a browser with neither
                    Apple Pay nor Google Pay the element renders nothing at all,
                    so the sheet has to say why rather than showing a gap where
                    the control should be. */}
                {noWallet ? (
                  <p className="t-compact not-live">
                    Reserving needs Apple Pay or Google Pay. Open this page on
                    your phone to hold a seat.
                  </p>
                ) : null}
              </div>

              <Drill summary="The full terms">
                <ol className="terms">
                  {plan.terms.map((t) => (
                    <li key={t.id}>{t.term}</li>
                  ))}
                </ol>
              </Drill>
            </>
          ) : null}
        </div>
      </Page>

      {/* ══ PAGE 3 · THE RECEIPT, OR THE SEAT ALREADY HELD ══════════════════
          Both end states land here: the charge that just settled, and the
          member who was already on an Early Bird seat when they opened the
          checkout. Neither has a way back — there is no decision left to take
          — so the layer draws no Back chevron on this page. */}
      <Page current={step === 3}>
        <div className="rs-step">
          {paid ? (
            <div className="receipt" role="status">
              <p className="receipt-head">{`Your ${seatNoun} is held.`}</p>
              <p className="t-compact">
                {`${plan.price} paid today, for your first ${plan.period}. It starts when we open, expected ${launchWindow}, then ${plan.price} a ${plan.period} automatically until you cancel.`}
              </p>
              {/* The subscription id. It is no longer "the only record that
                  exists" — the subscription hangs off the Supabase user and
                  `subscription_status` answers for it on any device — so it is
                  shown as a handle for support, not as something to keep safe. */}
              <p className="t-compact receipt-ref">
                Reference <span>{paid}</span>
              </p>
              <p className="t-compact">
                Email {GUARANTEE_CONTACT} to cancel, or for a full refund any time
                before we open.
              </p>
              {/* ══ THE DOOR TO THE PAGE AFTER THE PURCHASE ══════════════════
                  Sam, 14 Sep 2026: "the actual post-purchase page." /in is that
                  page — the card with her name, what she holds, the reference,
                  the terms she agreed to — and the receipt hands her to it
                  rather than leaving her under a modal with a close button. */}
              <Link className="action receipt-go" to="/in">
                See your membership
              </Link>
            </div>

          ) : subscribed ? (
            <div className="receipt" role="status">
              <p className="receipt-head">{`You already have ${aSeat}.`}</p>
              <p className="t-compact">
                {`This number is already on ${aSeat}, so there is nothing to pay now. Opening in Blacksburg, ${launchWindow}.`}
              </p>
              <Link className="action receipt-go" to="/in">
                See your membership
              </Link>
            </div>

          ) : null}
        </div>
      </Page>
    </>
  );
}
