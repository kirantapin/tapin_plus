import type { PlusPrice } from "../model/plus";
import { usd } from "../model/plus";
import { TEXTS_RATE_POLICY } from "../model/textsRate";
import { TEXTS_TEASER } from "../model/priceGate";

/* ══ THE TEXTS RATE, ONE TILE (Sam, 16 Nov 2026: "maybe we clean this up a
   bit? /impeccable polish. There's a LOT going on") ══════════════════════
   The box, the ask and what it unlocks as one tappable tile: unticked it
   says what to do, ticked its second line becomes the rate against the full
   price, so nothing is added below it. The disclosure sits under the tile,
   smaller, every part of it kept (TCPA). The rate shows only when the price
   the server returned is the texts policy's, so the tile never says a price
   the checkout won't charge. */
export function TextsRateBox({ checked, price, onChange }: { checked: boolean; price: PlusPrice | null; onChange: (on: boolean) => void }) {
  const real = !!price && price.firstFor === "forever" && (price.policyId === TEXTS_RATE_POLICY || price.policyId === "textspreview");
  return (
    <div className="pck-texts">
      <label className={`pck-texts-tile${checked ? " is-on" : ""}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="pck-texts-words">
          <b>Say yes to Tapin texts</b>
          {checked && real && price ? (
            <span className="pck-texts-rate tnum">
              <s>{usd(price.monthly)}</s> <b>{usd(price.first)}/mo</b> for life
            </span>
          ) : (
            <span>Unlock {TEXTS_TEASER}</span>
          )}
        </span>
      </label>
      <p className="pck-texts-fine">
        Optional, not needed to buy. By ticking, you agree to recurring automated marketing texts from Tapin at this number. Msg &amp; data rates may apply. Reply STOP to opt out.
      </p>
    </div>
  );
}

