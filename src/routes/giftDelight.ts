/* ══ WHEN THEY OPEN IT (Sam, 6 Nov 2026: "can we build 3 delight animations
   that parents can choose for when their kid opens the thing?") ══════════════
   A small burst as the card comes out of the envelope: confetti, hearts or
   sparkles, picked by the parent in the builder and played on the student's
   gift page. Paper pieces in the town's colours, flat (no gradients), drawn
   as plain elements on a layer over the band and moved with the Web
   Animations API (transform and opacity only, so it's all compositor work),
   then removed. Nothing plays with reduced motion, and nothing takes a tap. */

import type { Delight } from "../model/gift";

const PAPER = ["#861F41", "#E5751F", "#F2B36B", "#F7F3EA", "#2B4C9B", "#0B7A53"];
const HEART = ["#861F41", "#E8899E", "#E5751F", "#F7F3EA"];
const SPARK = ["#F2B36B", "#FFFFFF", "#F7F3EA", "#E5751F"];
const HEART_PATH = "M12 21s-7.5-4.6-9.6-9.2C.8 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.3 1.8-2.1 3.3-3.3 5.4-3.3 3.6 0 5.8 3.7 4.2 7.3C19.5 16.4 12 21 12 21Z";
const STAR_PATH = "M12 0C12.9 7.6 16.4 11.1 24 12 16.4 12.9 12.9 16.4 12 24 11.1 16.4 7.6 12.9 0 12 7.6 11.1 11.1 7.6 12 0Z";

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

function svg(path: string, color: string, size: number) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("width", String(size));
  s.setAttribute("height", String(size));
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  p.setAttribute("fill", color);
  s.appendChild(p);
  return s;
}

/** Plays `kind` over `host` (the band), from the card's rect. Returns a stop
 *  function that clears it at once. */
export function playDelight(kind: Delight, host: HTMLElement, card: DOMRect): () => void {
  if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};
  const box = host.getBoundingClientRect();
  const layer = document.createElement("div");
  layer.className = "gft-delight";
  layer.setAttribute("aria-hidden", "true");
  host.appendChild(layer);
  const cx = card.left - box.left + card.width / 2;
  const top = card.top - box.top;
  const runs: Animation[] = [];
  const add = (el: HTMLElement | SVGElement, x: number, y: number, kf: Keyframe[], o: KeyframeAnimationOptions) => {
    const wrap = document.createElement("span");
    wrap.className = "gft-delight-bit";
    wrap.style.left = `${x}px`;
    wrap.style.top = `${y}px`;
    wrap.appendChild(el);
    layer.appendChild(wrap);
    const a = wrap.animate(kf, { fill: "both", ...o });
    runs.push(a);
  };

  if (kind === "confetti") {
    /* A burst up and out of the envelope's mouth, then a drift down. */
    for (let i = 0; i < 70; i++) {
      const ang = rand(-165, -15) * (Math.PI / 180);
      const v = rand(180, 420);
      const dx = Math.cos(ang) * v;
      const dy = Math.sin(ang) * v;
      const piece = document.createElement("i");
      piece.className = Math.random() < 0.3 ? "gft-delight-dot" : "gft-delight-strip";
      piece.style.background = pick(PAPER);
      const spin = rand(-540, 540);
      add(piece, cx + rand(-card.width * 0.3, card.width * 0.3), top + 10, [
        { transform: "translate(0, 0) rotate(0deg) scale(0.6)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${spin * 0.5}deg) scale(1)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx * 1.25}px, ${dy + rand(260, 420)}px) rotate(${spin}deg) scale(1)`, opacity: 0 },
      ], { duration: rand(1700, 2600), delay: rand(0, 160), easing: "cubic-bezier(.15,.6,.35,1)" });
    }
  } else if (kind === "hearts") {
    /* Hearts lift off the card and float up, swaying. */
    for (let i = 0; i < 18; i++) {
      const size = rand(14, 30);
      const sway = rand(-60, 60);
      const rise = rand(220, 420);
      add(svg(HEART_PATH, pick(HEART), size), cx + rand(-card.width * 0.45, card.width * 0.45), top + rand(card.height * 0.2, card.height * 0.8), [
        { transform: "translate(0, 0) scale(0.3) rotate(0deg)", opacity: 0 },
        { transform: `translate(${sway * 0.3}px, ${-rise * 0.2}px) scale(1) rotate(${sway * 0.1}deg)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${-sway * 0.4}px, ${-rise * 0.6}px) scale(1) rotate(${-sway * 0.1}deg)`, opacity: 0.9, offset: 0.6 },
        { transform: `translate(${sway}px, ${-rise}px) scale(0.9) rotate(${sway * 0.15}deg)`, opacity: 0 },
      ], { duration: rand(2200, 3200), delay: rand(0, 900), easing: "cubic-bezier(.3,.2,.4,1)" });
    }
  } else {
    /* Stars twinkle around the card's edge as it comes out. */
    for (let i = 0; i < 26; i++) {
      const size = rand(10, 26);
      const side = Math.random();
      const ex = side < 0.5 ? rand(-card.width * 0.62, card.width * 0.62) : (Math.random() < 0.5 ? -1 : 1) * rand(card.width * 0.45, card.width * 0.7);
      const ey = side < 0.5 ? (Math.random() < 0.5 ? rand(-40, -10) : card.height + rand(0, 40)) : rand(0, card.height);
      add(svg(STAR_PATH, pick(SPARK), size), cx + ex, top + ey, [
        { transform: "scale(0) rotate(0deg)", opacity: 0 },
        { transform: "scale(1.15) rotate(45deg)", opacity: 1, offset: 0.45 },
        { transform: "scale(0) rotate(90deg)", opacity: 0 },
      ], { duration: rand(900, 1400), delay: rand(0, 1400), easing: "cubic-bezier(.3,.7,.3,1)" });
    }
  }

  let gone = false;
  const clear = () => {
    if (gone) return;
    gone = true;
    runs.forEach((a) => a.cancel());
    layer.remove();
  };
  Promise.all(runs.map((a) => a.finished.catch(() => undefined))).then(clear);
  return clear;
}
