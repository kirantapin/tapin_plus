import { plusVenues, logoField } from "../model/content";
import { wholeUsd } from "../model/order";

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * The thesis, which nothing on this page was saying out loud.
 *
 * TapIn is not asking anyone to spend more. It is asking her to point the same
 * money at fewer places. $50 of coffee money spent across four cafes returns
 * nothing; the same $50 spent at one cafe on the network comes back as 15%,
 * credit and points. That is the whole economic argument, and until now the
 * slider produced a figure without ever saying what produces it.
 *
 * TWO COLUMNS, SAME MONEY. The left is anonymous rings — places, unnamed,
 * scattered. The right is the actual Plus marks, gathered. The asymmetry is the
 * argument: you already know those logos, and there are fewer of them than
 * there are places you currently spread this money across.
 *
 * The left figure is $0.00 and that is simply true — TapIn returns nothing on
 * spend it never touches. It is not framed as a loss or a warning, and there is
 * no colour alarm on it (§10 bans urgency theatre); it is the same ink as any
 * other number that happens to be zero.
 */
export default function Concentration({
  spend,
  steadyUsd,
}: {
  spend: number;
  steadyUsd: number;
}) {
  return (
    <div className="conc">
      <p className="t-caption conc-head">Same money, fewer places</p>

      {/* The marks get the row's full width and the label and figure share the
          line beneath. Side by side, the field was squeezed to ~148px and both
          rows wrapped at 320 — one stranded ring, one stranded logo. */}
      <div className="conc-pair">
        <div className="conc-side">
          <div className="conc-field" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <p className="conc-foot-row">
            <span className="conc-where">Spread around town</span>
            <b className="conc-back tnum">{money(0)}</b>
          </p>
        </div>

        <div className="conc-side is-net">
          <div className="conc-field" aria-hidden="true">
            {plusVenues.map((v) => (
              <span
                key={v.id}
                className="collar conc-collar"
                data-field={logoField(v.id)}
                style={{ ["--brand" as string]: v.brandColor }}
              >
                <img src={v.logo} alt="" decoding="async" />
              </span>
            ))}
          </div>
          <p className="conc-foot-row">
            <span className="conc-where">Spent on the network</span>
            <b className="conc-back tnum">{money(steadyUsd)}</b>
          </p>
        </div>
      </div>

      {/* One clause. The two figures above have already made the point, and a
          sentence explaining a picture that works is a sentence to cut. */}
      <p className="t-compact conc-foot">
        <b className="tnum">{wholeUsd(spend)}</b> a month either way.
      </p>
    </div>
  );
}
