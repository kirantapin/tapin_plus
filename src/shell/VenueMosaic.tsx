import type { ReactNode } from "react";
import { venues, heroIsBright } from "../model/content";

/**
 * The six venues, as one band of photography.
 *
 * Shared by the pitch and the checkout so it is literally the same banner in
 * both places, not a copy that drifts. Whatever sits on it — the glass hero
 * panel on `/`, the membership card on `/reserve` — is passed as children and
 * overlaps the band's lower edge.
 *
 * Measured, not eyeballed: five of the six heroes sit between 0.036 and 0.22
 * relative luminance, and only theburg's is a brand card on white at 0.891. That
 * one outlier is seated by `data-bright` so it sits among the photographs rather
 * than punching a hole through them.
 */
export default function VenueMosaic({
  children,
  compact = false,
}: {
  children?: ReactNode;
  /** The checkout wants a shorter band — the card is the subject there, not
   *  the photography. */
  compact?: boolean;
}) {
  return (
    <div className={`hero-band${compact ? " is-compact" : ""}`}>
      <div className="mosaic" aria-hidden="true">
        {venues.map((v) => (
          <img
            key={v.id}
            src={v.hero}
            alt=""
            decoding="async"
            data-bright={heroIsBright(v.id) ? "true" : undefined}
          />
        ))}
      </div>
      {children}
    </div>
  );
}
