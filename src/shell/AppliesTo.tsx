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
export default function AppliesTo() {
  return (
    <>
      <p className="t-caption covers-head">Applies to</p>
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
