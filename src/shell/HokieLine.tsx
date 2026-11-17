import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";

/* ══ BUILT BY A HOKIE, FOR HOKIES (Sam, 16 Nov 2026: "should we have a
   'built by a hokie, for hokies' at the top? with Rob's photo, class of
   2024? I think that'd be a nice way to give the brand some personality")
   ════════════════════════════════════════════════════════════════════════
   One line under the header: Rob's face on Virginia Tech maroon (the
   founders section's tile, shell/Founders.tsx), the line, and who he is.
   Rob is the blazer photo (founders-photos). The line opens his LinkedIn in
   a new tab (Sam, 17 Nov 2026: "can we add robs linked in profile link to
   the card right below the header?"), the LinkedIn mark after his name. */
const ROB = asset("/brand/founder-blazer.webp");
const ROB_LINKEDIN = "https://www.linkedin.com/in/robert-tabet-699772230/";

/** `dark`: in the header, on the photo (Sam, 16 Nov 2026), in place of the
 *  "+$25 added to your account" line. `card`: on a computer, its own white
 *  card right above "Watch it in action" (Sam, 17 Nov 2026: "on desktop,
 *  this should also be in a parent container right above the 'watch it in
 *  action' section"). */
export function HokieLine({ dark = false, card = false }: { dark?: boolean; card?: boolean } = {}) {
  const line = <HokieLink dark={dark} />;
  return card ? <section className="tpa-module hk-card" aria-label="Who built Tapin Plus">{line}</section> : line;
}

function HokieLink({ dark }: { dark: boolean }) {
  const { track } = useEventTracking();
  return (
    <a
      className={dark ? "hk hk-dark hk-link" : "hk hk-link"}
      href={ROB_LINKEDIN}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Built by a Hokie, for Hokies: Rob, Virginia Tech class of 2025, on LinkedIn"
      onClick={() => track("plus_rob_linkedin", { dark })}
      data-ph-show=""
    >
      <span className="hk-face" aria-hidden="true">
        <img src={ROB} alt="" decoding="async" />
      </span>
      <p aria-hidden="true">
        <b>Built by a Hokie, for Hokies</b>
        <span className="hk-who">
          Rob, Virginia Tech class of 2025
          <svg className="hk-in" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="2" y="2" width="20" height="20" rx="4.5" fill="currentColor" />
            <path
              fill="var(--hk-in-ground, #ffffff)"
              d="M7.1 9.6h2.3V17H7.1zM8.25 6.1a1.33 1.33 0 1 1 0 2.66 1.33 1.33 0 0 1 0-2.66ZM10.9 9.6h2.2v1h.03c.31-.58 1.06-1.2 2.18-1.2 2.33 0 2.76 1.53 2.76 3.53V17h-2.3v-3.6c0-.86-.02-1.96-1.2-1.96-1.2 0-1.38.93-1.38 1.9V17h-2.3z"
            />
          </svg>
        </span>
      </p>
    </a>
  );
}
