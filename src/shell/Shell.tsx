import { useLayoutEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";

/**
 * The shell for the money path: /, /reserve, /in.
 *
 * NO TAB BAR. Home / Places / You is member-app chrome, and the member app is
 * explicitly not in this build (TRUTH.md §12). Two dead tabs beside a decision
 * about a recurring charge is the kind of detail that costs trust, and
 * PRODUCT.md calls the checkout "the decision and nothing else".
 *
 * The ground is fixed behind everything and the column scrolls over it. No page
 * transition is animated — see the measured reason in src/App.tsx.
 *
 * ══ THE ONE PLACE THE SURFACE IS DECIDED ═══════════════════════════════════
 * Sam, 12 Sep 2026: the app preview goes light, the landing pages stay dark.
 *
 * ON <html>, NOT ON A WRAPPER, for two reasons that are both load-bearing:
 * `body` carries the lit field and `.ground` is fixed outside the column, so a
 * class on a div inside the tree cannot reach either — the page would keep its
 * dark field and only the panels would flip. And a fixed-position descendant
 * (the tab bar, the banner) is laid out against the viewport, so it has to read
 * the same tokens as the page it docks to.
 *
 * useLayoutEffect, not useEffect: layout effects run BEFORE the browser paints,
 * so the attribute is on the element in the same frame the new route's markup
 * is. With useEffect the first paint of /app would be the app's white panels on
 * the pitch's dark field — one frame of the wrong world on every entry.
 */
export default function Shell({ layered = false }: { layered?: boolean }) {
  const { pathname, state } = useLocation();
  const navType = useNavigationType();
  /* Prefix match, so every screen under the preview is included — Sam asked
     for this "across all pages within the app preview". `/app` exactly and
     `/app/...` both count; a future `/apply` would not. */
  /* NOT WHILE THE APP IS A WINDOW. On a desktop the app renders in a layer
     that carries its own `data-surface="app"` (AppLayer); the page under it
     must keep the dark ground, so the html-level flag stays off. */
  const isApp = !layered && (pathname === "/app" || pathname.startsWith("/app/"));

  /* ══ EVERY NEW PAGE STARTS AT ITS TOP ═════════════════════════════════════
     Sam, 13 Sep 2026: tapping through to a merchant page landed already
     scrolled into the menu. React Router does not reset scroll on navigation
     and nothing here did either — so the window simply kept the offset it had
     on the page you left. Measured: 357px down /app, tap a venue, arrive at
     360px on the venue page, below its own header.

     POP IS EXCLUDED, and that is the whole subtlety. Back and forward should
     return you to where you were in the list you came from; only a NEW
     destination starts at the top. Resetting on POP too would make "back" feel
     like a fresh page and lose the reader's place in a long venue rail.

     useLayoutEffect, not useEffect, for the same reason the surface flag below
     uses it: layout effects run BEFORE paint, so the page is never painted at
     the old offset and then yanked.

     Keyed on pathname ONLY — not search or hash. A query change is the same
     page, and a hash is an explicit request to scroll somewhere that is not
     the top. */
  useLayoutEffect(() => {
    if (navType === "POP") return;
    if (window.location.hash) return;
    /* The window opening or closing over this page is not a navigation of
       this page: the reader's place in it is the whole point of layering. */
    if (layered || (state as { fromLayer?: boolean } | null)?.fromLayer) return;
    window.scrollTo(0, 0);
  }, [pathname, navType, layered, state]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (isApp) root.dataset.surface = "app";
    else delete root.dataset.surface;
    /* No cleanup that clears the attribute: this effect IS the cleanup, and it
       runs on every route change. Removing it on unmount instead would blank
       the surface for a frame during a route swap, which is the flash the
       layout effect exists to prevent. */
  }, [isApp]);

  return (
    <>
      <div className="ground" aria-hidden="true" />
      <main className="column">
        <Outlet />
      </main>
    </>
  );
}
