/**
 * RECONSTRUCTED on 15 Sep 2026 after the original was deleted with the
 * storefront revert — same contract, rewritten from memory, never imported.
 *
 * Picks how the storefront page carries a merchant's brand colour: "brand"
 * paints the page in it and inverts the ink ramp to white; "light" keeps the
 * app's own light ramp and spends the brand as accent, for a colour that
 * cannot carry white text (Sweetopia's pink). The cut is WCAG contrast: white
 * on the brand must reach 4.5:1, i.e. relative luminance ≤ ~0.18.
 */
export type BrandMode = "brand" | "light";

const channel = (v: number): number => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.x relative luminance of a #rrggbb colour. */
export const luminance = (hex: string): number => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** (L1 + 0.05) / (L2 + 0.05) with white on top. */
const whiteContrast = (hex: string): number => 1.05 / (luminance(hex) + 0.05);

export const brandTheme = (
  brandColor: string | undefined,
): { mode: BrandMode; style: Record<string, string> } => {
  const hex = brandColor ?? "#6B1F3A";
  const mode: BrandMode = whiteContrast(hex) >= 4.5 ? "brand" : "light";
  return { mode, style: { "--pl-brand": hex } };
};
