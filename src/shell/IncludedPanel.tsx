import { type ReactNode } from "react";
import ScopeLine from "./ScopeLine";
import RefundPlate from "./RefundPlate";
import {
  benefits,
  logoField,
  guaranteeLead,
  plusVenues,
  venuePolicyFigure,
  venues,
} from "../model/content";

/* ══ WHAT YOU GET, AS A CHECKLIST ══════════════════════════════════════════
   A receipt lists what is included; it does not display it. `benefits` says
   WHICH lines stand; the figure in each is a held venue policy's, through
   `venuePolicyFigure` — the $5 and the 15 are BENEFIT's, and the 1× is the
   multiplier content.ts corrects on the venue records. A kind with no figure
   prints no line. */
const heldFigure = (kind: string) => {
  if (!benefits.some((b) => b.kind === kind)) return undefined;
  const held = plusVenues.flatMap((v) => v.policies).find((p) => p.kind === kind);
  return held ? venuePolicyFigure(held) : undefined;
};
const creditFig = heldFigure("credit");
const percentFig = heldFigure("percent");
const pointsFig = heldFigure("points");
const included: { id: string; line: string }[] = [
  ...(creditFig ? [{ id: "credit", line: `${creditFig.figure} credit every week` }] : []),
  ...(percentFig ? [{ id: "percent", line: `${percentFig.figure} ${percentFig.qualifier}` }] : []),
  ...(pointsFig ? [{ id: "points", line: `${pointsFig.figure} points, toward free items` }] : []),
];

/* The six names, for the marks' accessible label now the line only counts them. */
const venueNames = venues.map((v) => v.name).join(", ");

/**
 * ══ THE INCLUDED PANEL (23 Sep 2026, POLISH §18) ════════════════════════════
 * Sam, on the trial modal's call-out: "I like how you formatted this, maybe we
 * use the same on the checkout flow." One plate: the heading, what you get,
 * where it works (the six marks, their names in a sentence) and the guarantee.
 * No button and no price inside it. Moved out of Reserve.tsx so /in shows the
 * same panel (Sam, 25 Sep 2026: "can you bring the membership page up to
 * date?"); `children` is the checkout's card foot.
 */
export default function IncludedPanel({
  headId = "rs-inc-head",
  children,
}: {
  /** Unique per page: the heading labels the section. */
  headId?: string;
  children?: ReactNode;
}) {
  return (
    <section className="rs-inc" aria-labelledby={headId}>
      {/* The lead (Sam, 30 Sep): the refund, on the plate the hero shares. */}
      <RefundPlate className="rs-lead" rest={guaranteeLead.rest} />
      <h2 className="t-title rs-inc-head" id={headId}>
        Every week, at every location
      </h2>
      {/* Four lines, a check each. The glyph is ink, not a tile. */}
      {included.length ? (
        <ul className="rs-checks">
          {included.map((item) => (
            <li key={item.id}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m3.2 8.4 3 3 6.6-6.8" />
              </svg>
              <span>{item.line}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {/* The scope and hours of the credit and the 15%, as one quiet line
          (Sam, 30 Sep: "this image is quite busy"); it replaced the plate. */}
      {creditFig || percentFig ? <ScopeLine className="rs-scope" /> : null}
      {/* Where it works: the six marks stacked on the left and a count beside
          them (Sam, 30 Sep: "simplify"); the names are the marks' label. */}
      <div className="rs-inc-also">
        <span className="rs-inc-marks" role="img" aria-label={venueNames}>
          {venues.map((v) => (
            <span
              key={v.id}
              className="collar"
              data-field={logoField(v.id)}
              style={{ ["--brand" as string]: v.brandColor }}
            >
              <img src={v.logo} alt="" decoding="async" />
            </span>
          ))}
        </span>
        <p className="rs-inc-line">At {venues.length} places in Blacksburg.</p>
      </div>
      {/* The guarantee is the lead above since 30 Sep. */}
      {children}
    </section>
  );
}
