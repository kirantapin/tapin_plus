import { useCallback, useEffect, useRef, type RefObject } from "react";

/** The frame's move: the pager's 280 plus a beat, so the box settles last. */
const FRAME_MS = 320;

/* While the width moves, the two pages keep the widths they lay out at,
   centred, so page 0's columns never reflow under the frame: it clips them. */
function pinPage(list: HTMLElement[], page: Element | null | undefined, w: number) {
  if (!(page instanceof HTMLElement) || w <= 0) return;
  page.style.width = `${w}px`;
  page.style.marginInlineStart = `calc(50% - ${w / 2}px)`;
  list.push(page);
}
function unpinPages(list: HTMLElement[]) {
  for (const page of list.splice(0)) {
    page.style.width = "";
    page.style.marginInlineStart = "";
  }
}

/**
 * The sheet's frame follows its page, from 1024 (POLISH §33). A FLIP on the
 * sheet's own box: `hold()` reads its size before a page change and pins it;
 * when the Pager swaps pages (a `.rs-page` gains `is-in`, one commit after the
 * step's own) the pin comes off, the natural size is read before paint, and
 * width and height run old to new. The sheet is centred by its own
 * translate(-50%,-50%), so the size carries the position with it.
 */
export function useSheetFrame(sheet: RefObject<HTMLElement>) {
  const flight = useRef<Animation | null>(null);
  const wait = useRef<(() => void) | null>(null);
  const pinned = useRef<HTMLElement[]>([]);

  useEffect(
    () => () => {
      wait.current?.();
      flight.current?.cancel();
    },
    [],
  );

  return useCallback(() => {
    const el = sheet.current;
    if (!el) return;
    const snaps =
      !window.matchMedia("(min-width: 1024px)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      el.closest("[data-still]") !== null;
    if (snaps) {
      flight.current?.cancel();
      return;
    }
    /* Mid-flight, "now" is the animated size: the next move starts there. */
    const now = getComputedStyle(el);
    const from = { w: parseFloat(now.width), h: parseFloat(now.height) };
    const track = el.querySelector<HTMLElement>(".sheet-scroll > .rs-pages");
    const leaving = track?.querySelector(":scope > .rs-page:not(.is-out):not(.is-off)");
    const leavingW = leaving?.getBoundingClientRect().width ?? 0;
    el.style.width = `${from.w}px`;
    el.style.height = `${from.h}px`;
    const superseded = flight.current;
    flight.current = null;
    superseded?.cancel();
    if (wait.current) return;

    const unpin = () => {
      el.style.width = "";
      el.style.height = "";
    };
    const observer = new MutationObserver((records) => {
      const arrived = records.some((r) => {
        const page = r.target as Element;
        return page.classList.contains("rs-page") && page.classList.contains("is-in");
      });
      if (!arrived) return;
      stop();
      unpin();
      unpinPages(pinned.current);
      const rest = getComputedStyle(el);
      const to = { w: parseFloat(rest.width), h: parseFloat(rest.height) };
      if (Math.abs(to.w - from.w) < 0.5 && Math.abs(to.h - from.h) < 0.5) {
        delete el.dataset.frame;
        return;
      }
      if (track && Math.abs(to.w - from.w) >= 0.5) {
        pinPage(pinned.current, track.querySelector(":scope > .rs-page.is-out"), leavingW);
        pinPage(pinned.current, track.querySelector(":scope > .rs-page.is-in"), track.clientWidth);
      }
      const move = el.animate(
        [
          { width: `${from.w}px`, height: `${from.h}px` },
          { width: `${to.w}px`, height: `${to.h}px` },
        ],
        {
          duration: FRAME_MS,
          easing: rest.getPropertyValue("--ease").trim() || "cubic-bezier(.22,1,.36,1)",
          fill: "none",
        },
      );
      flight.current = move;
      el.dataset.frame = "moving";
      const land = () => {
        if (flight.current !== move) return;
        flight.current = null;
        unpinPages(pinned.current);
        delete el.dataset.frame;
      };
      move.finished.then(land, land);
    });
    /* No page arrived (nothing changed after all): let go of every pin. */
    const timer = window.setTimeout(() => {
      stop();
      unpin();
      unpinPages(pinned.current);
      delete el.dataset.frame;
    }, FRAME_MS * 2);
    const stop = () => {
      observer.disconnect();
      window.clearTimeout(timer);
      wait.current = null;
    };
    observer.observe(el, { subtree: true, attributes: true, attributeFilter: ["class"] });
    wait.current = stop;
  }, [sheet]);
}
