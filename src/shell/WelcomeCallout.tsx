import { PLACES } from "../routes/parents_kit";

/* ══ THE WELCOME OFFER IN THE HEADER (Sam, 9 Nov 2026) ══════════════════════
   One callout under the headline on plus.tapin.app and /parents ("wouldn't it
   go on the header of both?"): the $25 that lands the moment they join. Sam
   picked 1 · Pill of five ("I love this"): a green +$25 chip inside one
   pill, white on a photo, a pale green on a phone's white /parents header.
   The line under it went with it ("just remove the sub text").
   The $25 is the offer itself now, not a welcome bonus (Sam, 9 Nov 2026,
   reworking the offer: "$5 monthly credit at each spot ... with no minimum
   spend"; "the idea is that it's the primary offer now not just a welcome
   bonus"): $5 at each of the five places, every month. The same words on
   both pages, so `they` is kept for the callers and changes nothing. */
export function WelcomeCallout(_: { they?: boolean }) {
  const total = `$${PLACES.length * 5}`;
  return (
    <p className="wc" data-wc="1" data-ph-show="">
      <b className="tnum">{total}</b>
      <span>in credit every month</span>
    </p>
  );
}
