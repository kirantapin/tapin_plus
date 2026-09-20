import { useEffect, useLayoutEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, type Location } from "react-router-dom";
import Shell from "./shell/Shell";
import ReserveLayer from "./shell/ReserveLayer";
import Arrival from "./shell/Arrival";
import { useEventTracking } from "./context/event_tracking_context";
import Pitch from "./routes/Pitch";
import How from "./routes/How";
import Reserve from "./routes/Reserve";
import Membership from "./routes/Membership";

/**
 * NO PAGE TRANSITION IS ANIMATED. In the old build a `view-transition-name`
 * snapshot turned out to be the whole scrollable page (measured 390x1762),
 * painted above the document, which covered the fixed chrome for ~5 frames
 * (355-430ms). Naming the chrome and clipping the group were both tried and
 * both failed, measured. START-HERE.md: "Either exclude chrome properly or
 * don't animate page changes." This build does not animate them.
 */
/** See the note on the place route: the key is the whole point of this. */
export default function App() {
  const location = useLocation();

  /* ══ ONE PAGEVIEW PER ROUTE, BY HAND ═══════════════════════════════════════
     `capture_pageview` is off (see event_tracking_context). PostHog's automatic
     pageview fires once per document load, and this is one document — without
     this, `/`, `/how`, `/reserve` and `/in` would all be a single pageview and
     there would be no funnel to read.

     PATHNAME ONLY, deliberately. `/reserve` opens as a layer over the page
     beneath and carries `state.background`; keying on the whole location would
     fire a second view when nothing but that state changed. */
  const { track } = useEventTracking();
  useEffect(() => {
    track("$pageview", { $current_url: window.location.href, path: location.pathname });
  }, [location.pathname, track]);
  /* THE APP PREVIEW IS GONE (Sam, 20 Sep 2026). Tapping a merchant opens that
     merchant's benefits over the page and points at their LIVE TapIn ordering
     page instead — shell/VenuePopup.tsx. The preview mocked a product that does
     not open until Spring 2027; the six merchant pages are real today, which is
     the stronger thing to show. */
  const isReserve = location.pathname === "/reserve";

  /* ══ THE ARRIVAL, ON THE DOOR ONLY ════════════════════════════════════════
     Decided once, from the path the browser LOADED on — never from where a
     route change lands. So it plays on every full load of / and /welcome
     (Sam, 15 Sep 2026: "on refresh or first load") and never on a tap back
     to the landing page from the deck. See shell/Arrival.tsx. */
  const [arrive] = useState(
    () => location.pathname === "/" || location.pathname === "/welcome",
  );
  const layered = isReserve;
  const background = (location.state as { background?: Location } | null)?.background;
  const under: Location | string = layered ? (background ?? "/") : location;

  /* The page beneath is scenery while the window is open: no wheel-scroll
     through the scrim (`overflow:hidden` keeps the scroll offset), and no focus
     or click reaches it (`inert`). Layout effect so the first painted frame of
     the layer already has both. */
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("is-layered", layered);
    document.querySelector("main.column")?.toggleAttribute("inert", layered);
  }, [layered]);

  return (
    <>
      <Routes location={under}>
        <Route element={<Shell layered={layered} />}>
          <Route path="/" element={<Pitch />} />
          {/* The Welcome Week text's link — the pitch, as an invitation. model/invite.ts */}
          <Route path="/welcome" element={<Pitch invite="welcomeweek" />} />
          <Route path="/how" element={<How />} />
          <Route path="/reserve" element={<Reserve />} />
          {/* /in — the membership after it has been bought. PRODUCT.md names
              this route as "sign-in and the receipt". */}
          <Route path="/in" element={<Membership />} />
          {/* THE PREVIEW'S OLD ADDRESSES. /app and everything under it were
              real routes until 20 Sep 2026, so they are in browser histories,
              in shared links and in anyone's muscle memory. Left unhandled
              they render a blank page; they send you home instead. */}
          <Route path="/app/*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      {isReserve ? (
        <ReserveLayer background={background}>
          <Reserve />
        </ReserveLayer>
      ) : null}
      {arrive ? <Arrival /> : null}
    </>
  );
}
