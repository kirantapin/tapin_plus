/**
 * ══ THE PHOTO CARD'S DIRECTION SWITCH — DEV ONLY, AND TEMPORARY ════════════
 * docs/POLISH-2026-09-21.md §12. Sam, 22 Sep 2026, on the credit card: "for
 * both pages I think it'd be good to make 3 design directions for this
 * container." They are built as variants of the one `PhotoCard` so he can
 * compare them live on the pitch and the splash; one is kept and this file
 * goes with the other two.
 *
 * `?card=split|line|poster`, read the way `?seats=` is (model/seats.ts):
 * guarded on `import.meta.env.DEV`, so a production build ignores the query
 * and renders the current card whatever the URL says. Absent or unknown, the
 * answer is `undefined` — the current card, whose DOM is byte-identical to
 * what shipped before the switch existed.
 */
export type CardVariant = "split" | "line" | "poster";

export const cardVariant = (): CardVariant | undefined => {
  if (!import.meta.env.DEV || typeof window === "undefined") return undefined;
  const raw = new URLSearchParams(window.location.search).get("card");
  return raw === "split" || raw === "line" || raw === "poster" ? raw : undefined;
};
