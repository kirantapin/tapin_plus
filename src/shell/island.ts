/* ══ THE JOIN ISLAND (Sam, 4 Nov 2026: "the 'join tapin plus' button
   literally become the modal that someone signs in with and pays with,
   almost like a dynamic island. The background should be darker when the
   join tapin plus container has morphed to its expanded state", then "can we
   make the background white? I was thinking the parent container that holds
   the 'join tapin plus' button is the one that does the expanding", then "the
   button can stay in the same place, the copy just changes") ══════════════
   The checkout is one white container, and it grows out of the white plate
   that holds the Join button: the bottom bar on a phone (marked
   data-island-origin), which every Join on the page uses while it's showing.
   With no bar on screen (a computer), the tapped Join is its own origin.
   The container sits where it will rest, and a clip that starts as exactly
   the plate's rectangle and corners opens to the whole container. A stand-in
   copy of the black button sits over the step's own button, which is in the
   same place, and they cross over as the contents fade in, so only the words
   change. Closing runs it backwards into the plate.

   Why a clip and not a resize: the contents are laid out once, at their
   final width, and never reflow or squash mid-flight; the only things that
   move are a clip and, when the origin is outside the container's footprint
   (a computer, where it sits in the middle), a translate.

   Sizes. The container is as tall as what's in it. While it opens its
   height is frozen, so the clip and the stand-in measured at the start stay
   true; anything that changed meanwhile (a price arriving, the pay step's
   cart) is eased to once it has landed. After that, a change of height
   (phone → code → pay) animates the height. A close always starts from the
   height on screen, whatever was running.

   Interrupting. A close during the opening picks up from wherever the clip,
   the stand-in and the contents are, holding that first frame (no flash of
   the full container). Nothing inside takes a tap until it has faded in, and
   nothing takes a tap once it starts closing.

   Without any origin it grows from a pill at the bottom of the screen on a
   phone and in the middle on a computer. With reduced motion it simply
   appears and goes. Review on 4 Nov 2026 (five lenses, each finding checked
   by a second agent) shaped most of the above. */

const OPEN_MS = 480;
const CLOSE_MS = 320;
const RESIZE_MS = 320;
/* A quick start that settles softly, without overshoot. */
const EASE_OPEN = "cubic-bezier(0.32, 0.72, 0, 1)";
/* The close answers at once and settles into the bar, like the open (Sam,
   4 Nov 2026: "the collapse isn't very smooth"; an ease-in-out after a 50ms
   wait made it feel like it lagged). Then "the very end of the collapse
   animation": the open's curve had it in the bar by half way, so it sat
   still while the page brightened behind it, then the bar's shadow popped
   on. This one still answers at once but keeps travelling to the end, and
   the page brightens on the same curve. */
const EASE_CLOSE = "cubic-bezier(0.2, 0, 0, 1)";
const EASE_RESIZE = "cubic-bezier(0.32, 0.72, 0, 1)";

export const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export type IslandParts = {
  island: HTMLElement;
  inner: HTMLElement;
  label: HTMLElement;
  scrim: HTMLElement;
};

/** What the island grows out of: a plate, and the button inside it. */
export type IslandOrigin = { plate: HTMLElement; button: HTMLElement | null };

type Box = { x: number; y: number; w: number; h: number; r: number };

const visible = (el: HTMLElement | null | undefined): el is HTMLElement => {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 8 || r.height < 8 || r.bottom <= 0 || r.top >= window.innerHeight) return false;
  return getComputedStyle(el).visibility !== "hidden";
};

/** Picks the origin once, when the island opens: the bottom bar while it's
 *  on screen (whichever Join was tapped), else the tapped Join itself. */
export function islandOrigin(from: HTMLElement | null | undefined): IslandOrigin | null {
  const dock = typeof document !== "undefined" ? document.querySelector<HTMLElement>("[data-island-origin]") : null;
  if (visible(dock)) return { plate: dock, button: dock.querySelector<HTMLElement>("a, button") };
  if (visible(from)) return { plate: from, button: from };
  return null;
}

/** The plate's box now, or null if it can't be grown from or back into. */
function originBox(o: IslandOrigin | null): Box | null {
  if (!o || !o.plate.isConnected) return null;
  const r = o.plate.getBoundingClientRect();
  if (r.width < 8 || r.height < 8 || r.bottom <= 0 || r.top >= window.innerHeight) return null;
  const radius = parseFloat(getComputedStyle(o.plate).borderTopLeftRadius) || 0;
  return { x: r.left, y: r.top, w: r.width, h: r.height, r: radius };
}

/** Where a pill without a plate sits: bottom centre on a phone, middle on a computer. */
function pillBox(island: DOMRect): Box {
  const w = Math.min(200, island.width);
  const h = 52;
  const phone = window.innerWidth < 640;
  return {
    x: island.left + (island.width - w) / 2,
    y: phone ? island.bottom - h : island.top + (island.height - h) / 2,
    w,
    h,
    r: 26,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The island's four corners, for the clip's end (rounder at the top on a phone). */
const islandRadius = (island: HTMLElement) => {
  const cs = getComputedStyle(island);
  return [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((r) => r || "28px").join(" ");
};

/** The clip and translate that make the island look exactly like `b`. */
function startFrame(island: DOMRect, b: Box, radius: string) {
  const w = Math.min(b.w, island.width);
  const h = Math.min(b.h, island.height);
  /* The part of the island the plate maps onto: where the plate is, held
     inside the island; whatever is left over is made up by a translate. */
  const ax = clamp(b.x - island.left, 0, island.width - w);
  const ay = clamp(b.y - island.top, 0, island.height - h);
  const tx = b.x - island.left - ax;
  const ty = b.y - island.top - ay;
  return {
    clip: `inset(${ay}px ${island.width - ax - w}px ${island.height - ay - h}px ${ax}px round ${Math.min(b.r, h / 2)}px)`,
    full: `inset(0px 0px 0px 0px round ${radius})`,
    transform: `translate(${tx}px, ${ty}px)`,
    at: { left: ax, top: ay },
  };
}

/** Dresses the stand-in as the plate's button, where it sits in the plate
 *  (`at` is the plate's place in the island). Empty without a button. */
function placeLabel(label: HTMLElement, o: IslandOrigin | null, at: { left: number; top: number }) {
  const button = o?.button && o.button.isConnected ? o.button : (o?.plate.querySelector<HTMLElement>("a, button") ?? null);
  if (!o || !button) {
    label.textContent = "";
    label.style.background = "transparent";
    return false;
  }
  const p = o.plate.getBoundingClientRect();
  const b = button.getBoundingClientRect();
  const cs = getComputedStyle(button);
  Object.assign(label.style, {
    left: `${at.left + (b.left - p.left)}px`,
    top: `${at.top + (b.top - p.top)}px`,
    width: `${b.width}px`,
    height: `${b.height}px`,
    borderRadius: cs.borderTopLeftRadius,
    background: cs.backgroundColor,
    color: cs.color,
    font: cs.font,
    letterSpacing: cs.letterSpacing,
  });
  label.textContent = (button.textContent ?? "").trim();
  return true;
}

/** Stops everything the island is running and leaves it at rest. */
export function settle(p: IslandParts) {
  [p.island, p.inner, p.label, p.scrim].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
  p.inner.style.pointerEvents = "";
  p.inner.style.height = "";
}

/** Holds the island and its scroller at one height (while it opens or
 *  closes), so the step's pinned button stays on the island's bottom edge,
 *  under the stand-in, whatever the contents do meanwhile. CSS max-heights
 *  still clamp it if the keyboard or the window takes room. */
const hold = (p: IslandParts, h: number | null) => {
  p.island.style.height = h == null ? "" : `${h}px`;
  p.inner.style.height = h == null ? "" : `${h}px`;
};

/** Moves the stand-in onto the step's own button as it fades, wherever that
 *  button is (on a phone they already coincide; on a wider screen the
 *  origin's button maps somewhere else in the island). `toward`: true on the
 *  way in, false on the way out. Both rects are read in the island's own,
 *  untransformed frame. */
function flyLabel(p: IslandParts, toward: boolean, duration: number, easing: string) {
  const cta = p.inner.querySelector<HTMLElement>("form.pck-body > .pck-cta[type=submit], .pck-pay, .pck-wallet-preview");
  if (!cta || cta.getClientRects().length === 0) return;
  const L = p.label.getBoundingClientRect();
  const C = cta.getBoundingClientRect();
  if (!L.width || !L.height) return;
  const dx = C.left - L.left;
  const dy = C.top - L.top;
  const sx = C.width / L.width;
  const sy = C.height / L.height;
  if (Math.abs(dx) + Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
  const there = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  p.label.style.transformOrigin = "0 0";
  p.label.animate([{ transform: toward ? "none" : there }, { transform: toward ? there : "none" }], { duration, easing, fill: "both" });
}

/* The open in flight, so the height tracker can wait for it to land. */
const opening = new WeakMap<HTMLElement, Animation>();

/** Grows the island out of `o` (or a pill). Runs before the first paint.
 *  `over`: another pop-up's backdrop is already up, so the scrim starts dark. */
export function islandOpen(p: IslandParts, o: IslandOrigin | null, over = false) {
  settle(p);
  hold(p, null);
  /* The open sheet keeps the corners of what it grew from (Sam, 5 Nov 2026:
     "can the parent container keep the same corner radius that the
     collapsed 'join tapin plus' button has?", then "I don't like how it
     changes"): the clip opens and closes at one radius, never re-rounding. */
  const corner = o?.plate.isConnected ? parseFloat(getComputedStyle(o.plate).borderTopLeftRadius) : NaN;
  if (corner > 0) p.island.style.borderRadius = `${corner}px`;
  if (reducedMotion()) return;
  const rect = p.island.getBoundingClientRect();
  /* Frozen while it opens (islandTrackHeight eases to any change after). */
  hold(p, rect.height);
  const box = originBox(o);
  const f = startFrame(rect, box ?? pillBox(rect), islandRadius(p.island));
  const hasButton = !!box && placeLabel(p.label, o, f.at);
  if (!hasButton) placeLabel(p.label, null, f.at);

  if (!over) p.scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: "ease-out" });
  const run = p.island.animate(
    [
      { clipPath: f.clip, transform: f.transform },
      { clipPath: f.full, transform: "none" },
    ],
    { duration: OPEN_MS, easing: EASE_OPEN },
  );
  opening.set(p.island, run);
  /* A pill with no plate behind it fades up as it grows. */
  if (!box) p.island.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS * 0.3, easing: "ease-out" });
  /* The stand-in sits over the step's own button, in the same place; they
     cross over as the contents arrive, so only the words change. */
  p.label.animate([{ opacity: hasButton ? 1 : 0 }, { opacity: 0 }], { duration: OPEN_MS * 0.36, delay: OPEN_MS * 0.4, easing: "ease-in-out", fill: "both" });
  if (hasButton) flyLabel(p, true, OPEN_MS * 0.76, EASE_OPEN);
  /* Nothing inside takes a tap until it can be seen. */
  p.inner.style.pointerEvents = "none";
  const show = p.inner.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS * 0.36, delay: OPEN_MS * 0.4, easing: "ease-in-out", fill: "backwards" });
  show.onfinish = () => (p.inner.style.pointerEvents = "");
}

/** Shrinks the island back into `o` (or a pill), then calls `done` once. */
export function islandClose(p: IslandParts, o: IslandOrigin | null, done: () => void, landing?: () => void) {
  if (reducedMotion()) {
    done();
    return;
  }
  /* Everything as it is on screen right now, before anything is stopped. */
  const now = getComputedStyle(p.island);
  const fromClip = now.clipPath && now.clipPath !== "none" ? now.clipPath : null;
  const fromTransform = now.transform && now.transform !== "none" ? now.transform : "none";
  const fromIsland = parseFloat(now.opacity);
  const fromHeight = p.island.getBoundingClientRect().height;
  const fromInner = parseFloat(getComputedStyle(p.inner).opacity);
  const fromLabel = parseFloat(getComputedStyle(p.label).opacity);
  const fromScrim = parseFloat(getComputedStyle(p.scrim).opacity);
  settle(p);
  hold(p, fromHeight);
  /* Taps during the close fall through to the scrim (which ignores them). */
  p.island.style.pointerEvents = "none";

  const rect = p.island.getBoundingClientRect();
  const box = originBox(o);
  const f = startFrame(rect, box ?? pillBox(rect), islandRadius(p.island));
  const hasButton = !!box && placeLabel(p.label, o, f.at);
  if (!hasButton) placeLabel(p.label, null, f.at);

  let called = false;
  const finish = () => {
    if (called) return;
    called = true;
    /* Unmounted meanwhile (another Join replaced it): nothing left to do,
       and calling done would close the new one. */
    if (!p.island.isConnected) return;
    done();
  };

  /* The contents go quickly, then stop being painted at all, so each frame
     of the shrink only draws a white shape and the button. */
  const hide = p.inner.animate([{ opacity: fromInner }, { opacity: 0 }], { duration: 90, easing: "ease-out", fill: "forwards" });
  hide.onfinish = () => (p.inner.style.visibility = "hidden");
  p.scrim.animate([{ opacity: fromScrim }, { opacity: 0 }], { duration: CLOSE_MS, easing: EASE_CLOSE, fill: "forwards" });
  /* fill "both" holds the first frame through the delay: no flash of the
     whole container when it closes mid-open. */
  const run = p.island.animate(
    [
      { clipPath: fromClip ?? f.full, transform: fromTransform },
      { clipPath: f.clip, transform: f.transform },
    ],
    { duration: CLOSE_MS, easing: EASE_CLOSE, fill: "both" },
  );
  if (hasButton) {
    /* Join comes back as the contents go, from wherever the stand-in was. */
    p.label.animate([{ opacity: fromLabel }, { opacity: 1 }], { duration: 90, easing: "ease-out", fill: "both" });
    flyLabel(p, false, CLOSE_MS, EASE_CLOSE);
  } else {
    p.island.animate([{ opacity: fromIsland }, { opacity: fromIsland }, { opacity: 0 }], {
      duration: CLOSE_MS,
      easing: "ease-in",
      fill: "both",
    });
  }
  run.onfinish = finish;
  /* A few pixels out, the real plate comes back underneath (the container
     still covers it) so its shadow is already fading in when they swap. */
  if (box && landing) window.setTimeout(() => p.island.isConnected && landing(), CLOSE_MS * 0.85);
  /* A hidden tab can stall the animation; a visible one ends on its own. */
  window.setTimeout(() => (document.hidden || run.playState !== "running") && finish(), CLOSE_MS + 260);
  window.setTimeout(finish, 3000);
}

/** Animates the island between heights when its contents change size. Waits
 *  for the open to land first. Returns a function that stops watching and
 *  leaves the island at the height on screen. */
export function islandTrackHeight(p: IslandParts): () => void {
  let last = p.inner.getBoundingClientRect().height;
  let running: Animation | null = null;
  let stopped = false;

  const ease = (from: number, to: number) => {
    running?.cancel();
    running = null;
    if (Math.abs(to - from) < 1 || reducedMotion()) return;
    running = p.island.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: RESIZE_MS, easing: EASE_RESIZE });
    running.onfinish = () => (running = null);
  };

  /* After the open: let go of the frozen height and ease to the real one. */
  const open = opening.get(p.island);
  const landing = !!open && open.playState === "running";
  const release = () => {
    if (stopped) return;
    const frozen = p.island.getBoundingClientRect().height;
    hold(p, null);
    last = p.inner.getBoundingClientRect().height;
    ease(frozen, last);
  };
  if (landing && open) open.finished.then(release, () => {});
  else hold(p, null);

  const ro = new ResizeObserver(() => {
    if (stopped) return;
    if (open && open.playState === "running") return; // picked up on landing
    const next = p.inner.getBoundingClientRect().height;
    if (Math.abs(next - last) < 1) return;
    /* Where it is on screen now, held to what it can still hold (the
       window may have shrunk). */
    const cap = parseFloat(getComputedStyle(p.inner).maxHeight);
    const was = Math.min(running ? p.island.getBoundingClientRect().height : last, Number.isFinite(cap) ? cap : Infinity);
    last = next;
    ease(was, next);
  });
  ro.observe(p.inner);
  return () => {
    stopped = true;
    ro.disconnect();
    if (running) {
      hold(p, p.island.getBoundingClientRect().height);
      running.cancel();
      running = null;
    }
  };
}

/** Keeps the island inside the part of the screen the keyboard leaves. iOS
 *  shrinks the visual viewport and often pans it (offsetTop) rather than the
 *  layout viewport, so the layer is pinned to the visual viewport while the
 *  keyboard is up: its top and height follow it, --pck-vvh carries the
 *  height for the max-heights, and data-kb drops the home-indicator gap the
 *  keyboard covers. After each change, the focused field is scrolled clear
 *  of the pinned button (scroll-padding-bottom). Returns a stop function
 *  that leaves the layer as it is (so a close in flight keeps one frame of
 *  reference) and one that clears it. */
export function islandAvoidKeyboard(layer: HTMLElement): { stop: () => void; clear: () => void } {
  const vv = window.visualViewport;
  const clear = () => {
    layer.style.top = "";
    layer.style.height = "";
    layer.style.bottom = "";
    layer.style.removeProperty("--pck-vvh");
    delete layer.dataset.kb;
  };
  if (!vv) return { stop: () => {}, clear };
  let last = "";
  const update = () => {
    const lifted = vv.height < window.innerHeight - 80;
    const key = lifted ? `${Math.round(vv.offsetTop)}:${Math.round(vv.height)}` : "";
    if (key === last) return;
    last = key;
    if (lifted) {
      layer.style.top = `${vv.offsetTop}px`;
      layer.style.height = `${vv.height}px`;
      layer.style.bottom = "auto";
      layer.style.setProperty("--pck-vvh", `${vv.height}px`);
      layer.dataset.kb = "";
    } else clear();
    requestAnimationFrame(() => {
      const a = document.activeElement as HTMLElement | null;
      if (a && layer.contains(a) && a.matches("input, textarea")) (a.closest<HTMLElement>(".pck-otp, .pck-field") ?? a).scrollIntoView({ block: "nearest" });
    });
  };
  vv.addEventListener("resize", update);
  vv.addEventListener("scroll", update);
  update();
  const stop = () => {
    vv.removeEventListener("resize", update);
    vv.removeEventListener("scroll", update);
  };
  return { stop, clear };
}
