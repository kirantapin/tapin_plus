/* ══ WHAT'S IN IT + THE APP, UNDER THE OPENED LETTER (Sam, 6 Nov 2026: five
   designed, "lets do D": the places) ═════════════════════════════════════════
   The facts: $5 credit every week at each place on a $10+ meal, 15% off
   instead once a day, points on everything, the five places, the Tapin app,
   the number to sign in with, a thank-you to the parent. One primary action
   per screen: on a phone the dock's "Claim my gift", so the App Store link in
   these is secondary; on a computer the inline button, with the QR for the
   phone the app goes on. Styles: styles/gift-after.css. */
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import { thanksHref, type Gift } from "../model/gift";
import { APP_STORE_URL, appHref } from "../shell/GetTheApp";
import { CREDIT, FlatMark, MIN_ORDER, PERCENT, PLACES } from "./parents_kit";
import type { DockCta } from "./GiftPage";
import "../styles/gift-after.css";

const QR = asset("/brand/tapin-app-qr.svg");
const APP_ICON = asset("/brand/tapin-app-icon.png");

type Props = { gift: Gift; sample: boolean; preview: boolean; cta?: DockCta };

function Apple() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.65.8-3.33.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.18-1.54 2.67-.39 6.62 1.1 8.79.74 1.06 1.61 2.25 2.75 2.2 1.11-.04 1.52-.71 2.86-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.07 2.66-2.14.85-1.23 1.19-2.43 1.21-2.49-.03-.01-2.32-.89-2.34-3.52ZM14.18 6.15c.6-.74 1.01-1.75.9-2.77-.87.04-1.94.59-2.56 1.32-.56.64-1.05 1.69-.92 2.68.97.08 1.97-.49 2.58-1.23Z"
      />
    </svg>
  );
}

function useLinks({ sample, preview }: Props) {
  const { track } = useEventTracking();
  const guard = (event: string, where?: string) => (e: { preventDefault: () => void }) => {
    if (preview) e.preventDefault();
    else track(event, where ? { sample, where } : { sample });
  };
  return { onStore: guard("gift_app_store"), onThanks: guard("gift_thanks"), onClaim: guard("gift_claim", "inline") };
}

function StoreLink({ className, onClick, label = "Get it on the App Store" }: { className: string; onClick: (e: { preventDefault: () => void }) => void; label?: string }) {
  return (
    <a className={className} href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={onClick} data-ph-show="">
      <Apple />
      {label}
    </a>
  );
}

/** The claim, inline, on a computer (a phone has the dock). */
function WideClaim(p: Props) {
  const { onClaim } = useLinks(p);
  return (
    <div className="gav-desk gav-claim" data-ph-show="">
      {p.cta ? (
        <button type="button" className="gft-cta-inline" onClick={(e) => p.cta?.onClick(e.currentTarget)}>
          {p.cta.label}
        </button>
      ) : (
        <a className="gft-cta-inline" href={appHref()} target="_blank" rel="noopener noreferrer" onClick={onClaim}>
          Claim my gift
        </a>
      )}
    </div>
  );
}

function Thanks(p: Props & { className?: string }) {
  const { onThanks } = useLinks(p);
  return (
    <a className={`gft-thanks ${p.className ?? ""}`} href={thanksHref(p.gift.from)} onClick={onThanks}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 11.5c0 4-3.6 7-8 7-1.1 0-2.2-.2-3.1-.5L4 19.5l1.4-3.6C4.5 14.7 4 13.2 4 11.5c0-4 3.6-7 8-7s8 3 8 7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      Text {p.gift.from === "Your parent" ? "your parent" : p.gift.from} a thank-you
    </a>
  );
}

/* ── D · The places ──────────────────────────────────────────────────────────
   Lead with where they'll eat: one sentence of what they get, set large,
   then the five places as photo cards to swipe through. */
function Places(p: Props) {
  const { onStore } = useLinks(p);
  return (
    <>
      <section className="gav-d" aria-labelledby="gav-h" data-ph-show="">
        <h2 id="gav-h" className="gav-d-lede">
          <span data-k="credit">${CREDIT} credit</span> every week at each place, on a ${MIN_ORDER}+ meal. Or{" "}
          <span data-k="pct">{PERCENT}% off</span>, once a day. Points on everything.
        </h2>
        <ul className="gav-d-rail" aria-label="Where it works">
          {PLACES.map((pl) => (
            <li key={pl.id}>
              <img className="gav-d-photo" src={pl.photo} alt="" decoding="async" loading="lazy" />
              <div>
                <img className="gav-d-logo" src={pl.logo} alt="" decoding="async" loading="lazy" />
                <b>{pl.name}</b>
                <span>{pl.what}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="gav-d-app" aria-label="The Tapin app">
        <img className="gav-icon" src={APP_ICON} alt="" width="44" height="44" />
        <p className="tnum">
          <b data-ph-show="">In the Tapin app</b>
          Sign in with {p.gift.masked}
        </p>
        <StoreLink className="gav-phone gav-d-store" onClick={onStore} label="Get it" />
        <img className="gav-desk gav-qr" src={QR} alt="QR code for the Tapin app" width="72" height="72" data-ph-show="" />
      </section>
      <WideClaim {...p} />
      <Thanks {...p} />
    </>
  );
}

export function GiftAfter(p: Props) {
  return (
    <div className="gav">
      {/* data-ph-show: fixed copy, readable in session replay (model/replayPrivacy.ts). */}
      {/* Whose this is (Sam, 6 Nov 2026: "maybe we have a section right above
          this which is 'Tapin plus blacksburg' with the tapin logo"). */}
      <div className="gav-brand" data-ph-show="">
        {/* The Plus mark, not the app icon (Sam, 7 Nov 2026). */}
        <span className="gav-brand-mark" aria-hidden="true">
          <FlatMark />
        </span>
        <p>
          <b>Tapin Plus</b>
          <span>Blacksburg</span>
        </p>
      </div>
      <Places {...p} />
    </div>
  );
}
