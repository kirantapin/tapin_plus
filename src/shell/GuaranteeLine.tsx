import { guarantee, GUARANTEE_CONTACT } from "../model/content";

/* The savings guarantee as one line: the shield in its grey tile, the promise
   in bold, the address to claim it at. One component, two places — the
   checkout's included panel and its details page (Sam, 23 Sep 2026: "give the
   icon here a parent container with rounded edges, it'd be a subtle gray. Also
   this should show up on the your details page"). The words are the model's;
   the claim is the server's to keep (TRUTH.md §3). */
export default function GuaranteeLine({ className = "" }: { className?: string }) {
  return (
    <p className={`rs-promise${className ? ` ${className}` : ""}`}>
      <span className="rs-promise-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.4 5.2 6v5.4c0 4.4 2.9 8.3 6.8 9.6 3.9-1.3 6.8-5.2 6.8-9.6V6L12 3.4Z" />
          <path d="m9.2 12.2 1.9 1.9 3.8-4" />
        </svg>
      </span>
      <span>
        <b>{guarantee}</b>{" "}
        <a href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>
      </span>
    </p>
  );
}
