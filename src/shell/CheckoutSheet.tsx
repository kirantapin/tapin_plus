import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Drill } from "./Drill";
import SubscriptionPayButton from "./SubscriptionPayButton";
import PhoneStep, { readablePhone, type PhoneIdentity } from "./PhoneStep";
import { useAuth } from "../context/auth_context";
import {
  launchWindow,
  GUARANTEE_CONTACT,
  seatNoun,
  type PlanId,
} from "../model/content";

/**
 * The charge, in a sheet of its own.
 *
 * Sam, 13 Sep 2026: "instead of all these disclosures here, they'd exist in a
 * checkout modal flow… we only need the disclosure and terms right at checkout."
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
  open,
  onClose,
  paid,
  onPaid,
  noWallet,
  onNoWallet,
  onIdentity,
}: {
  plan: CheckoutPlan;
  open: boolean;
  onClose: () => void;
  /** The PaymentIntent id once the charge settled, or null. */
  paid: string | null;
  onPaid: (id: string) => void;
  noWallet: boolean;
  onNoWallet: () => void;
  /** Where the signed-in number goes — stored with the reservation. */
  onIdentity: (id: PhoneIdentity) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  /**
   * WHO IS BUYING, BEFORE WHAT THEY ARE BUYING.
   *
   * Sam, 13 Sep 2026: they sign in with a phone number before they can
   * purchase. Held in the sheet rather than in the page, because it is part of
   * this transaction: closing without finishing should not leave a half-signed
   * state behind for the next attempt to inherit.
   */
  const [identity, setIdentity] = useState<PhoneIdentity | null>(null);
  /* Stripe's answer, not this browser's. `null` means not known yet — only
     a hard `true` replaces the checkout, so a slow or failed check shows the
     wallet rather than telling a new buyer they have already paid. */
  const { subscribed } = useAuth();
  const forfeitTerm = plan.terms.find((t) => t.id === "forfeit")?.term;

  /**
   * Escape closes, and the body underneath stops scrolling.
   *
   * NOT WHILE PAID. Once the charge has settled this sheet holds the only copy
   * of the reference that exists — nothing server-side writes the reservation
   * down — so an accidental Escape would throw away the one thing the member
   * needs to claim a refund. The receipt state is dismissed deliberately or not
   * at all.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !paid) onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, paid]);

  /** Focus lands inside the sheet, not on whatever was behind it. */
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="cs-scrim"
      /* The backdrop dismisses — except once paid, for the reason above. */
      onClick={() => {
        if (!paid) onClose();
      }}
    >
      <div
        className="cs-sheet"
        role="dialog"
        aria-modal="true"
        /* `seatNoun`, never the literal: after the flip the rows and consent
           beneath say "seat", and the sheet's own name must agree with them. */
        aria-label={
          paid
            ? `Your ${seatNoun}`
            : identity
              ? `Confirm your ${seatNoun}`
              : `Your details, to hold your ${seatNoun}`
        }
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cs-top">
          <p className="cs-title">
            {paid
              ? `Your ${seatNoun}`
              : identity
                ? "Confirm your seat"
                : "Your details"}
          </p>
          <button
            type="button"
            className="cs-close"
            onClick={onClose}
            aria-label={paid ? "Done" : "Close"}
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

        {paid ? (
          <div className="receipt" role="status">
            <p className="receipt-head">{`Your ${seatNoun} is held.`}</p>
            <p className="t-compact">
              {`${plan.price} paid today — your first ${plan.period}. It starts when we open, expected ${launchWindow}, then ${plan.price} a ${plan.period} automatically until you cancel.`}
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
          /* ══ ALREADY BOUGHT ═════════════════════════════════════════════
             Asked of Stripe through `subscription_status`, not of this
             browser: the localStorage record is gone on a second device and
             a real member would otherwise be walked back through a checkout
             whose wallet answers 409. No rows, no consent and no control —
             §4 governs a decision, and there is no decision left to take. */
          <div className="receipt" role="status">
            <p className="receipt-head">You already have a {seatNoun}.</p>
            <p className="t-compact">
              This number is already on an Early Bird {seatNoun}, so there is
              nothing to pay now. Opening in Blacksburg, {launchWindow}.
            </p>
            <Link className="action receipt-go" to="/in">
              See your membership
            </Link>
          </div>
        ) : !identity ? (
          /* ══ WHO, BEFORE WHAT ═══════════════════════════════════════════
             The number is collected BEFORE the charge rows, not after, and
             that ordering is the point: a reservation whose owner is unknown
             cannot be handed to anyone in Spring 2027.

             §4 IS NOT WEAKENED BY THIS. Its rule is about what must be visible
             at the moment billing details are taken — and billing details are
             taken by the wallet, one step further on. A reader cannot reach a
             payment sheet from here; they reach the rows, the consent and the
             wallet together, exactly as before. A step in front of the
             disclosure block is not a thing between the rows and the button. */
          <PhoneStep
            onDone={(id) => {
              setIdentity(id);
              onIdentity(id);
            }}
          />
        ) : (
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
                onClick={() => setIdentity(null)}
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
                onNeedsSignIn={() => setIdentity(null)}
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
        )}
      </div>
    </div>
  );
}
