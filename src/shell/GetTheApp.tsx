import { useEffect, useRef } from "react";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";

/* ══ GET THE APP (Sam, 3 Nov 2026: "we should have a link to download the app
   on the post purchase page ... If someone is already signed in on this page,
   and they have the membership, the CTA should be to download the app") ═════
   Plus is used in the Tapin app, so once someone is a member this is the one
   thing left to do. The App Store listing is "Tapin: Food & Beverage" (Tapin
   App, LLC, app.tapin.mobile). There is no Android build, so an Android phone
   gets the web app instead. A computer gets the QR code beside the button,
   so the phone in your pocket can scan it. */

export const APP_STORE_URL = "https://apps.apple.com/us/app/tapin-food-beverage/id6757622830";
const TAPIN_WEB = "https://www.tapin.app/discovery?zone=blacksburg";
const ICON = asset("/brand/tapin-app-icon.png");
const QR = asset("/brand/tapin-app-qr.svg");

type Device = "ios" | "android" | "desktop";
export function device(): Device {
  if (typeof navigator === "undefined") return "ios";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** Where "Get the app" goes on this device. */
export function appHref(d: Device = device()) {
  return d === "android" ? TAPIN_WEB : APP_STORE_URL;
}

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.65.8-3.33.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.18-1.54 2.67-.39 6.62 1.1 8.79.74 1.06 1.61 2.25 2.75 2.2 1.11-.04 1.52-.71 2.86-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.07 2.66-2.14.85-1.23 1.19-2.43 1.21-2.49-.03-.01-2.32-.89-2.34-3.52ZM14.18 6.15c.6-.74 1.01-1.75.9-2.77-.87.04-1.94.59-2.56 1.32-.56.64-1.05 1.69-.92 2.68.97.08 1.97-.49 2.58-1.23Z"
      />
    </svg>
  );
}

/** The card: the app's icon and name, one line on what's in it, the button
 *  (and on a computer, the QR code to scan). `where` labels the tap. */
export function AppCard({ where, line, enter = false }: { where: string; line: string; enter?: boolean }) {
  const { track } = useEventTracking();
  const d = device();
  const card = useRef<HTMLDivElement | null>(null);
  /* After paying, the card follows the tick in: it rises a beat later and
     the icon settles from a touch small, so the eye goes tick, then app. */
  useEffect(() => {
    const el = card.current;
    if (!enter || !el || still() || typeof el.animate !== "function") return;
    const ease = "cubic-bezier(.22,1,.36,1)";
    el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 260, easing: ease, fill: "backwards" });
    el.querySelector(".gta-icon")?.animate([{ transform: "scale(.82)" }, { transform: "none" }], { duration: 520, delay: 300, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "backwards" });
  }, [enter]);
  return (
    <div ref={card} className="gta" data-device={d}>
      <div className="gta-main">
        <div className="gta-id">
          <img className="gta-icon" src={ICON} alt="" width="56" height="56" decoding="async" />
          <p className="gta-name">
            <b>Tapin</b>
            <span>{d === "android" ? "On the web for Android" : "Free on the App Store"}</span>
          </p>
        </div>
        <p className="gta-line">{line}</p>
        <a
          className="gta-cta"
          href={appHref(d)}
          target={d === "desktop" ? "_blank" : undefined}
          rel="noopener noreferrer"
          onClick={() => track("plus_get_app_clicked", { where, device: d })}
        >
          {d === "android" ? null : <AppleGlyph />}
          {d === "android" ? "Open Tapin" : "Get the app"}
        </a>
      </div>
      {d === "desktop" ? (
        <figure className="gta-qr">
          <img src={QR} alt="QR code for Tapin on the App Store" width="104" height="104" decoding="async" />
          <figcaption>Scan with your iPhone</figcaption>
        </figure>
      ) : null}
    </div>
  );
}
