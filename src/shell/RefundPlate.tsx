import { guaranteeLead } from "../model/content";

/** The auto-refund in its own plate (Sam, 30 Sep 2026: "nest the auto refund
 *  thing in its own container and make it a bit easier to see, and we can
 *  use the same container design on the checkout"). The hero and the
 *  checkout's included panel both mount this; figures.css draws it from the
 *  tokens, so it sits on the dark glass and the light card alike. */
export default function RefundPlate({ rest, className }: { rest?: string; className?: string }) {
  return (
    <p className={`refund-plate${className ? ` ${className}` : ""}`}>
      <span className="refund-plate-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.4 5.2 6v5.4c0 4.4 2.9 8.3 6.8 9.6 3.9-1.3 6.8-5.2 6.8-9.6V6L12 3.4Z" />
          <path d="m9.2 12.2 1.9 1.9 3.8-4" />
        </svg>
      </span>
      <span className="refund-plate-text">
        <b>{guaranteeLead.lead}</b>
        {rest ? <span>{rest}</span> : null}
      </span>
    </p>
  );
}
