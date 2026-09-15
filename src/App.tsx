import { useLayoutEffect, useState } from "react";
import { Route, Routes, useLocation, useParams, type Location } from "react-router-dom";
import Shell from "./shell/Shell";
import AppLayer from "./shell/AppLayer";
import ReserveLayer from "./shell/ReserveLayer";
import Arrival from "./shell/Arrival";
import { useMedia } from "./shell/useMedia";
import Pitch from "./routes/Pitch";
import How from "./routes/How";
import Reserve from "./routes/Reserve";
import Membership from "./routes/Membership";
import AppShell from "./routes/app/AppShell";
import AppHome from "./routes/app/AppHome";
import AppDeals from "./routes/app/AppDeals";
import AppSpot from "./routes/app/AppSpot";
import AppPoints from "./routes/app/AppPoints";
import AppPlace from "./routes/app/AppPlace";
import SavingsLab from "./routes/SavingsLab";

/**
 * NO PAGE TRANSITION IS ANIMATED. In the old build a `view-transition-name`
 * snapshot turned out to be the whole scrollable page (measured 390x1762),
 * painted above the document, which covered the fixed chrome for ~5 frames
 * (355-430ms). Naming the chrome and clipping the group were both tried and
 * both failed, measured. START-HERE.md: "Either exclude chrome properly or
 * don't animate page changes." This build does not animate them.
 */
/** See the note on the place route: the key is the whole point of this. */
function KeyedPlace() {
  const { venueId } = useParams();
  return <AppPlace key={venueId} />;
}

/** The locked app preview — what she gets, walkable before she pays anything,
 *  and still locked after, because it is not live until Spring 2027. Declared
 *  once and mounted in two places: in the page tree on a phone, and inside the
 *  desktop window (see AppLayer). */
const appRoutes = (
  <Route path="/app" element={<AppShell />}>
    <Route index element={<AppHome />} />
    <Route path="deals" element={<AppDeals />} />
    <Route path="spot" element={<AppSpot />} />
    <Route path="points" element={<AppPoints />} />
    {/* One merchant. KEYED ON THE VENUE so React remounts it when the id
        changes: the seeded basket is computed in a useState initializer, and
        React Router reuses the component instance across /app/place/a →
        /app/place/b, so the basket would still hold venue A's item ids. */}
    <Route path="place/:venueId" element={<KeyedPlace />} />
  </Route>
);

export default function App() {
  const location = useLocation();
  const desktop = useMedia("(min-width: 1024px)");
  const isApp = location.pathname === "/app" || location.pathname.startsWith("/app/");

  /* ══ THE APP IS A WINDOW ON A DESKTOP ═══════════════════════════════════════
     Sam, 14 Sep 2026. On a desktop /app renders as a layer over the page it
     was opened from; the page keeps rendering underneath at the location the
     link carried in `state.background`. On a phone nothing here applies and
     the app is the page. See AppLayer for the whole mechanism. */
  /* ══ THE CHECKOUT IS A SHEET, AT EVERY WIDTH ══════════════════════════════
     Sam, 14 Sep 2026: /reserve "should be a modal that slides up from the
     bottom of the page". Same mechanism as the app window; see ReserveLayer. */
  const isReserve = location.pathname === "/reserve";

  /* ══ THE ARRIVAL, ON THE DOOR ONLY ════════════════════════════════════════
     Decided once, from the path the browser LOADED on — never from where a
     route change lands. So it plays on every full load of / and /welcome
     (Sam, 15 Sep 2026: "on refresh or first load") and never on a tap back
     to the landing page from the deck. See shell/Arrival.tsx. */
  const [arrive] = useState(
    () => location.pathname === "/" || location.pathname === "/welcome",
  );
  const appLayered = desktop && isApp;
  const layered = appLayered || isReserve;
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
          {/* MOCKUP GALLERY, not a shipping surface. Nothing links here. */}
          <Route path="/savings" element={<SavingsLab />} />
          {appRoutes}
        </Route>
      </Routes>
      {appLayered ? (
        <AppLayer background={background}>
          <Routes>{appRoutes}</Routes>
        </AppLayer>
      ) : null}
      {isReserve ? (
        <ReserveLayer background={background}>
          <Reserve />
        </ReserveLayer>
      ) : null}
      {arrive ? <Arrival /> : null}
    </>
  );
}
