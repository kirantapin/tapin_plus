import { BenefitIcon } from "./Icons";
import { benefitScopeNote } from "../model/content";

/** The credit's and the 15%'s scope as a full-width note (POLISH §70, §82):
 *  the venue pop-up, under its figures. The host's class places it;
 *  figures.css draws it. The checkout prints the same words as ScopeLine. */
export default function CreditNote({ className }: { className?: string }) {
  return (
    <p className={`credit-note${className ? ` ${className}` : ""}`}>
      <span className="credit-note-glyph" aria-hidden="true">
        <BenefitIcon id="credit" />
      </span>
      <span>
        {benefitScopeNote.lead} <b>{benefitScopeNote.scope}</b> {benefitScopeNote.rest}{" "}
        {benefitScopeNote.hours}
      </span>
    </p>
  );
}
