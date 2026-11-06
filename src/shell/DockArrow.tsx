/** The docked button's arrow, the only thing that moves on it (dockPulse.ts):
 *  a forward nudge when the visitor has stopped. Drawn in the glyph family
 *  (1.8 line, round caps), in the button's own ink. */
export function DockArrow() {
  return (
    <svg className="tpa-dock-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
