import { useRef } from "react";
import { TEE_IMAGE, TEE_ROW } from "../model/content";

/**
 * The shirt the year includes — a thumbnail that opens a close-up.
 *
 * Sam, 14 Sep 2026: "here's the image for the T-shirt. We can make it a bit
 * more visible here" and "it should also be possible to expand the image for
 * the shirt if someone is interested in viewing it a bit closer."
 *
 * A native <dialog> for the close-up: it lands in the top layer whatever the
 * plan tile's overflow or transform is doing, traps focus, and closes on
 * Escape for free. A press on the backdrop closes it too. The plate behind the
 * shirt is white — a black tee on the dark field is a silhouette, and the
 * product shot Sam sent is lit against white.
 *
 * It renders NEXT TO the plan tile, never inside it: the tile is a <button>
 * and a button inside a button is not HTML. The tile's CSS leaves room.
 */
export function TeeThumb({
  className = "",
  plate = false,
}: {
  className?: string;
  /**
   * The full-width version on /reserve's year tile (Sam, 14 Sep 2026:
   * "/impeccable delight… and redesign"). The thesis: this is a real object
   * she is going to own. So the shirt stands on a lit shelf with its own
   * shadow, wears the one word the plan's charge row already says of it —
   * Included — and carries a closer-look glyph so the tap is discoverable
   * without a caption. The small thumbnail on the pitch keeps none of this;
   * at 84px a tag and a glyph would crowd the shirt.
   */
  plate?: boolean;
}) {
  const dlg = useRef<HTMLDialogElement | null>(null);
  return (
    <>
      <button
        type="button"
        className={`tee-thumb${plate ? " is-plate" : ""} ${className}`}
        onClick={() => dlg.current?.showModal()}
        aria-label="See the t-shirt up close"
      >
        <img src={TEE_IMAGE} alt="" decoding="async" loading="lazy" />
        {plate ? (
          <>
            <span className="tee-tag" aria-hidden="true">Included</span>
            <span className="tee-zoom" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="6.2" />
                <path d="m20 20-4.6-4.6M11 8.4v5.2M8.4 11h5.2" />
              </svg>
            </span>
          </>
        ) : null}
      </button>
      <dialog
        ref={dlg}
        className="tee-view"
        aria-label="The TapIn t-shirt"
        onClick={(e) => {
          if (e.target === dlg.current) dlg.current?.close();
        }}
        /* The platform closes a modal dialog on Escape by itself; this is the
           same thing said explicitly, so an Escape that reaches the dialog as
           a plain key event (some drivers, some assistive tech) also closes. */
        onKeyDown={(e) => {
          if (e.key === "Escape") dlg.current?.close();
        }}
      >
        <div className="tee-view-plate">
          <img src={TEE_IMAGE} alt="A black TapIn t-shirt, front and back" decoding="async" />
          <button
            type="button"
            className="tee-view-close"
            onClick={() => dlg.current?.close()}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"
              stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        </div>
        {/* The same string as the charge row and the tile, never retyped. */}
        <p className="tee-view-cap">{TEE_ROW.label} · {TEE_ROW.detail}</p>
      </dialog>
    </>
  );
}
