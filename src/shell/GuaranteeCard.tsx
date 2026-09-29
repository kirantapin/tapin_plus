import GuaranteeLine from "./GuaranteeLine";

/** The guarantee in its own card, directly under the included panel on the
 *  checkout and /in (Sam, 30 Sep 2026: "a separate parent container right
 *  beneath where it is currently"). */
export default function GuaranteeCard() {
  return (
    <div className="rs-guarantee">
      <GuaranteeLine />
    </div>
  );
}
