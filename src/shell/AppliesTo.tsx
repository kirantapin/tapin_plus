import { CoverIcon } from "./Icons";
import { covers } from "../model/content";

/**
 * What the membership reaches — shown, not described.
 *
 * Shared by the pitch and the checkout from one list, so the two surfaces
 * cannot drift apart. The label is doing real work: without it the icon row
 * reads as a second, unrelated grid rather than as the scope of the benefits
 * above it.
 */
/* A SECTION HEAD, NOT A CAPTION. It was `.t-caption` — 11px tracked caps —
   which is the list-label role, and a label standing above a section is the
   eyebrow tic the 21 Sep 2026 pass removed page-wide. Same string, set as the
   heading it always was (docs/POLISH-2026-09-21.md §2). */
export default function AppliesTo() {
  return (
    <>
      <h2 className="t-section covers-head">Applies to</h2>
      <div className="covers">
        {covers.map((c) => (
          <div className="cover" key={c.id}>
            <CoverIcon id={c.id} />
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
