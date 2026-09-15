import { createContext, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useNavigate, type Location } from "react-router-dom";

/**
 * The app preview as a WINDOW over the page you came from — desktop only.
 *
 * Sam, 14 Sep 2026: "on desktop the app preview should be more of a pop up
 * layered above the page someone clicked to get through to them instead of a
 * full width and height app."
 *
 * ══ HOW THE PAGE STAYS UNDERNEATH ═══════════════════════════════════════════
 * Modal routing. A link into /app carries `state.background` — the location
 * it was clicked from — and App.tsx renders THAT location in the main
 * `<Routes>` while a second `<Routes>` inside this layer renders the app for
 * the real URL. So the pitch (or the checkout, or /in) keeps rendering behind
 * the scrim at the scroll position it had, and closing the window puts the
 * reader back exactly where they were. A direct visit to /app has no
 * background and gets the pitch underneath, which is the right default.
 *
 * ══ WHY THE WINDOW IS THE APP'S DESKTOP LAYOUT, NOT A PHONE FRAME ═══════════
 * The app already has a desktop layout — a 248px rail, per-screen measures —
 * that Sam asked for and approved. The window is that layout given edges:
 * `transform:translateZ(0)` on `.app-window` makes it the containing block for
 * the app's `position:fixed` chrome (banner, rail, join bar), so all of it
 * docks to the window instead of the viewport, with no changes to app.css's
 * own rules. The light surface travels the same way: `data-surface="app"`
 * sits on the window, not on <html>, so the page beneath stays dark.
 *
 * Escape, the scrim, and the banner's controls all close it. Below 1024px this
 * component never mounts — the phone gets the full-screen app it shipped with.
 */
export const LayerContext = createContext<{ close: () => void } | null>(null);

export default function AppLayer({
  background,
  children,
}: {
  background: Location | undefined;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const win = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    const to = background
      ? `${background.pathname}${background.search}${background.hash}`
      : "/";
    /* `fromLayer` tells Shell not to scroll to the top: the page beneath never
       moved, and closing a window over it must not either. */
    /* The page beneath may itself be a layer (the checkout modal opened the
       app window). Hand its own `background` back, so closing the modal later
       still lands on the pitch where the reader left it. */
    const under = (background?.state as { background?: Location } | null)?.background;
    navigate(to, { state: { fromLayer: true, background: under } });
  }, [background, navigate]);

  useEffect(() => {
    win.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <LayerContext.Provider value={{ close }}>
      <div className="app-layer">
        <div className="app-layer-scrim" onClick={close} aria-hidden="true" />
        <div
          className="app-window"
          data-surface="app"
          role="dialog"
          aria-modal="true"
          aria-label="A preview of the TapIn app"
          tabIndex={-1}
          ref={win}
        >
          <div className="app-scroll">{children}</div>
        </div>
      </div>
    </LayerContext.Provider>
  );
}
