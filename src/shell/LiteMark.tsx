import { useId } from "react";

/* ══ THE TAPIN LITE MARK (Sam, 12 Nov 2026: "I like the leaf let's do that
   for now") ═══════════════════════════════════════════════════════════════════
   A single leaf: "lite" as fresh and light, and not built from the Plus mark
   (Sam: "it doesn't have to be an iteration of the plus icon"). One solid
   shape with its vein cut out through a mask, so the vein shows whatever the
   mark sits on (the glass tag, a white chip, the black pressed chip).
   currentColor, like FlatMark. It replaced "B · Outline", the Plus mark's
   pieces drawn as a line (#338). */
export function LiteMark({ className }: { className?: string }) {
  const id = `lite-vein-${useId().replace(/:/g, "")}`;
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="#fff" />
        <path d="M5.6 19.4C8.6 14.8 11.8 11.4 16 8.4" fill="none" stroke="#000" strokeWidth="1.6" strokeLinecap="round" />
      </mask>
      <path
        mask={`url(#${id})`}
        fill="currentColor"
        d="M20.2 3.8C10.6 3.6 4.4 8.6 4.4 15.4c0 1.9.5 3.4 1.1 4.1.7-.6 2.1-1.1 4-1.1 6.6 0 10.9-5.6 10.7-14.6Z"
      />
    </svg>
  );
}
