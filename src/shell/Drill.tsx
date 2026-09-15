import type { ReactNode } from "react";

/**
 * A disclosure, styled to the world.
 *
 * The default on this project is now one idea visible per section with the
 * supporting detail behind a tap — not a section that writes everything down at
 * once. Built on <details>, so it is keyboard-operable, findable by in-page
 * search, and open by default when a reader prints the page.
 *
 * What never goes in here: anything legally load-bearing. TRUTH.md §7's "an
 * illustration, not a quote" and §4's charge rows and consent sentence stay
 * visible at rest.
 */
export function Drill({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="drill">
      <summary>
        <span>{summary}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="m8 10.5 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="drill-body">{children}</div>
    </details>
  );
}
