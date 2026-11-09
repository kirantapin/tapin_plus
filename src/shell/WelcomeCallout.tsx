import { PLACES } from "../routes/parents_kit";

/* ══ THE WELCOME OFFER IN THE HEADER (Sam, 9 Nov 2026: "this is way too busy:
   and don't love the zine either. Can you /impeccable design 5 options for
   this callout? Also wouldn't it go on the header of both?") ═══════════════
   One callout under the headline on plus.tapin.app and /parents: the $25 that
   lands the moment they join ("get $25 immediately added to your account,
   cancel anytime"). Five ways, in the app's own language (Gilroy, money green,
   white or the smoked plate; no paper): ?wc=1..5 in dev while Sam picks.
     1 · Pill: a green +$25 chip inside one white pill.
     2 · Line: no container, the students line's form with a green tick.
     3 · Split: a green $25 block joined to a white block.
     4 · Logos: the five logos small in a pill, "$25 to spend, $5 at each".
     5 · Bar: one money-green bar.
   It sits on a photo (the main page, a computer's /parents band) or on white
   (a phone's /parents); the CSS reads which. */
export type WelcomeVariant = "1" | "2" | "3" | "4" | "5";

export const welcomeVariant = (): WelcomeVariant => {
  if (!import.meta.env.DEV || typeof window === "undefined") return "1";
  const v = new URLSearchParams(window.location.search).get("wc");
  return v === "2" || v === "3" || v === "4" || v === "5" ? v : "1";
};

export function WelcomeCallout({ variant, they = false }: { variant: WelcomeVariant; they?: boolean }) {
  const your = they ? "their" : "your";
  const total = `$${PLACES.length * 5}`;
  const said = `${total} immediately added to ${your} account. Cancel anytime.`;
  if (variant === "1") {
    return (
      <p className="wc" data-wc="1" data-ph-show="">
        <b className="tnum">+{total}</b>
        <span>immediately added to {your} account</span>
      </p>
    );
  }
  if (variant === "2") {
    return (
      <p className="wc" data-wc="2" data-ph-show="">
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <circle cx="10" cy="10" r="10" fill="#0b7a53" />
          <path d="M5.8 10.3l2.7 2.6 5.7-5.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>
          <b className="tnum">{total}</b> immediately added to {your} account. Cancel anytime.
        </span>
      </p>
    );
  }
  if (variant === "3") {
    return (
      <p className="wc" data-wc="3" aria-label={said} data-ph-show="">
        <b className="tnum" aria-hidden="true">
          {total}
        </b>
        <span aria-hidden="true">
          <span>Immediately added to {your} account</span>
          <small>Cancel anytime</small>
        </span>
      </p>
    );
  }
  if (variant === "4") {
    return (
      <p className="wc" data-wc="4" aria-label={`${total} to spend, $5 at each of ${PLACES.length} spots, the moment ${they ? "they join" : "you join"}`} data-ph-show="">
        <span className="wc-logos" aria-hidden="true">
          {PLACES.map((p) => (
            <img key={p.id} src={p.logo} alt="" decoding="async" />
          ))}
        </span>
        <span aria-hidden="true">
          <b className="tnum">{total}</b> to spend, $5 at each
        </span>
      </p>
    );
  }
  return (
    <p className="wc" data-wc="5" aria-label={said} data-ph-show="">
      <span aria-hidden="true">
        <b className="tnum">{total}</b> immediately added to {your} account
      </span>
      <small aria-hidden="true">Cancel anytime</small>
    </p>
  );
}
