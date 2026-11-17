import { asset } from "../asset";

/* ══ BUILT BY A HOKIE, FOR HOKIES (Sam, 16 Nov 2026: "should we have a
   'built by a hokie, for hokies' at the top? with Rob's photo, class of
   2024? I think that'd be a nice way to give the brand some personality")
   ════════════════════════════════════════════════════════════════════════
   One line under the header: Rob's face on Virginia Tech maroon (the
   founders section's tile, shell/Founders.tsx), the line, and who he is.
   Rob is the blazer photo (founders-photos). */
const ROB = asset("/brand/founder-blazer.webp");

/** `dark`: in the header, on the photo (Sam, 16 Nov 2026), in place of the
 *  "+$25 added to your account" line. */
export function HokieLine({ dark = false }: { dark?: boolean } = {}) {
  return (
    <div className={dark ? "hk hk-dark" : "hk"} data-ph-show="">
      <span className="hk-face" aria-hidden="true">
        <img src={ROB} alt="" decoding="async" />
      </span>
      <p>
        <b>Built by a Hokie, for Hokies</b>
        <span>Rob, Virginia Tech class of 2024</span>
      </p>
    </div>
  );
}
