import { BenefitIcon } from "./Icons";
import { venueCreditNote } from "../model/content";

/** The credit's scope as a full-width note (POLISH §70–71): the venue pop-up
 *  under its figures, the checkout and /in under the checklist. The host's
 *  class places it; figures.css draws it. */
export default function CreditNote({ className }: { className?: string }) {
  return (
    <p className={`credit-note${className ? ` ${className}` : ""}`}>
      <span className="credit-note-glyph" aria-hidden="true">
        <BenefitIcon id="credit" />
      </span>
      <span>
        {venueCreditNote.lead} <b>{venueCreditNote.scope}</b>. {venueCreditNote.hours}
      </span>
    </p>
  );
}
