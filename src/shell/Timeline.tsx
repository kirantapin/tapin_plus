import { AppIcon } from "./Icons";
import { appLinkLine } from "../model/content";

/* ══ A TIMELINE, NOT A TABLE (23 Sep 2026, POLISH §26) ══════════════════════
   The order card's schedule: each stop is a moment with its figure on one line
   and a clause under it, on a rail, and one sentence under the rail. Shared by
   the checkout and /in so there is one timeline (reserve.css `.rs-time`). */
export interface Stop {
  id: string;
  when: string;
  /** Omitted when the stop states no figure of its own. */
  figure?: string;
  clause: string;
}

export default function Timeline({ stops, foot }: { stops: Stop[]; foot?: string | null }) {
  return (
    <>
      <ol className="rs-time">
        {stops.map((stop) => (
          <li className="rs-stop" key={stop.id}>
            <p className="rs-stop-head">
              <span className="rs-when">{stop.when}</span>
              {stop.figure ? <span className="rs-fig tnum">{stop.figure}</span> : null}
            </p>
            <p className="rs-clause">{stop.clause}</p>
          </li>
        ))}
      </ol>
      {/* How the benefits reach them: the app, by link (Sam, 30 Sep). */}
      <p className="rs-app">
        <span className="rs-app-glyph" aria-hidden="true">
          <AppIcon />
        </span>
        <span>{appLinkLine}</span>
      </p>
      {foot ? <p className="rs-refund">{foot}</p> : null}
    </>
  );
}
