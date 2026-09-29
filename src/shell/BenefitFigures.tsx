/**
 * THE FIGURE STRIP — three benefits set as figures, not rows.
 *
 * `$5` / `15%` / `1×`, each over a four-word qualifier, in open columns parted
 * by one hairline each: no tile, no plate, no eyebrow. It was drawn three
 * times by hand — the splash's `.cg-figures` (§3.3), the merchant pop-up's
 * `.vp-figures` (§10.2) — and the checkout's "What you get" is the third use
 * (docs/POLISH-2026-09-21.md §15), so the construction lives here once and its
 * rules in styles/figures.css.
 *
 * TWO SIZES, NOT A SCALE. `display` is the page's one display moment and wears
 * the `.t-figure` / `.t-compact` tokens themselves (48/64 over 14); `sheet` is
 * the 30px step a sheet inside a page is allowed to spend. A third size would
 * be a third surface arguing about which number is largest.
 *
 * THE HOST PLACES IT; THIS DRAWS IT. Margins stay on the caller's class
 * (`className`), so the strip can sit 32px under a lead on the splash and 24px
 * under the photo in the pop-up without either overriding the other. The
 * pop-up also redraws its columns and hairline (venue.css, §54).
 *
 * NOTHING HERE IS TYPED. Every figure and qualifier arrives from the model —
 * `campaignBenefits`, `venuePolicyFigure` — so no surface can print a rate the
 * product does not hold. `qualifier` is a CONDITION or a CADENCE, never the
 * figure restated.
 */
export interface BenefitFigure {
  id: string;
  figure: string;
  qualifier: string;
}

export default function BenefitFigures({
  items,
  size,
  className,
  label,
}: {
  items: BenefitFigure[];
  size: "display" | "sheet";
  className?: string;
  /** The list's accessible name, where no heading already gives it one. */
  label?: string;
}) {
  if (!items.length) return null;
  const display = size === "display";
  return (
    <ul className={`figs is-${size}${className ? ` ${className}` : ""}`} aria-label={label}>
      {items.map((f) => (
        <li key={f.id}>
          <b className={display ? "figs-fig t-figure" : "figs-fig"}>{f.figure}</b>
          <span className={display ? "figs-q t-compact" : "figs-q"}>{f.qualifier}</span>
        </li>
      ))}
    </ul>
  );
}
