import { benefitScopeLine } from "../model/content";

/** The credit's and the 15%'s scope and hours as one quiet line (POLISH §82):
 *  under the checkout's checklist, the pitch's cards, Coffeeholics' cards and
 *  the /how slide. The host's class places it; figures.css draws it. */
export default function ScopeLine({ className }: { className?: string }) {
  return <p className={`fine-print${className ? ` ${className}` : ""}`}>{benefitScopeLine}</p>;
}
