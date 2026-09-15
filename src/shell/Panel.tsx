import type { ReactNode, Ref } from "react";

/**
 * The one surface primitive.
 *
 * TRUTH.md §9: "Text never sits on the bare moving ground — it sits on glass."
 * That is why a section's LABEL lives inside its panel rather than floating
 * above it: a caption on the bare ground breaks the same rule the panels exist
 * to satisfy, and it is the exact rule the first pass broke without noticing.
 */
export function Panel({
  label,
  children,
  className = "",
  id,
  innerRef,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
  /** Lets a surface anchor-link to a panel — the checkout uses it. */
  id?: string;
  /** For an observer or a measurement — the section itself. */
  innerRef?: Ref<HTMLElement>;
}) {
  return (
    <section className={`panel ${className}`} id={id} ref={innerRef}>
      {label ? <p className="t-caption panel-label">{label}</p> : null}
      {children}
    </section>
  );
}
