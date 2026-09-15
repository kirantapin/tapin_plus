import type { Venue } from "../../model/content";
import { logoField } from "../../model/content";

export * from "../../model/preview";

/**
 * A venue's mark in its own collar — the same treatment the pitch uses, so the
 * app and the pitch are visibly one product.
 *
 * The seat hairline's polarity follows the logo's own field, measured from the
 * corner pixels of the actual files: three of the six marks are near-black and
 * three are near-white, so a single ring colour would vanish on half of them.
 */
export function logoFor(v: Venue) {
  return (
    <span
      className="collar app-collar"
      data-field={logoField(v.id)}
      style={{ ["--brand" as string]: v.brandColor }}
    >
      <img src={v.logo} alt="" decoding="async" />
    </span>
  );
}
