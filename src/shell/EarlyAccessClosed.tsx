import { TAPIN_HOST, tapinHref, closedLead, closedMore } from "../model/closed";

/** The announcement bar's sentence while early access is closed (Sam, 1 Nov
 *  2026). Replaces the town and the countdown; the link is the point of it.
 *  Below 1024 the bar holds one short line beside Sign in, so "You can still
 *  get TapIn at" steps out and the address stays. */
export function ClosedBar() {
  return (
    <span className="ann-place">
      <span className="ann-text">
        {closedLead} <span className="ann-closed-more">{closedMore} </span>
        <a className="ann-link" href={tapinHref()}>
          {TAPIN_HOST}
        </a>
      </span>
    </span>
  );
}

/** The home page's price block while early access is closed: the price it
 *  used to sell at is not on offer here any more, so the block says what is. */
export function ClosedHero() {
  return (
    <div className="hero-closed">
      <p className="hero-closed-lead">{closedLead}</p>
      <p className="t-compact hero-closed-more">
        {closedMore}{" "}
        <a className="hero-closed-link" href={tapinHref()}>
          {TAPIN_HOST}
        </a>
        .
      </p>
    </div>
  );
}
