/* ══ WHEN THEY OPEN IT (Sam, 6 Nov 2026: "can we build 3 delight animations
   that parents can choose for when their kid opens the thing?"; then "8 total
   ... options ... (including none)") ═══════════════════════════════════════
   A small celebration as the card comes out of the envelope: confetti,
   hearts, sparkles, balloons, fireworks, streamers or petals, picked by the
   parent in the builder and played on the student's gift page. Paper pieces in the town's colours, flat (no gradients), drawn
   as plain elements on a layer over the band and moved with the Web
   Animations API (transform and opacity only, so it's all compositor work),
   then removed. Nothing plays with reduced motion, and nothing takes a tap. */

import type { Delight } from "../model/gift";

const PAPER = ["#861F41", "#E5751F", "#F2B36B", "#F7F3EA", "#2B4C9B", "#0B7A53"];
const HEART = ["#861F41", "#E8899E", "#E5751F", "#F7F3EA"];
const SPARK = ["#F2B36B", "#FFFFFF", "#F7F3EA", "#E5751F"];
const BALLOON = ["#861F41", "#E5751F", "#F2B36B", "#F7F3EA", "#2B4C9B", "#0B7A53", "#E8899E"];
const FIRE = ["#F2B36B", "#E5751F", "#F7F3EA", "#E8899E", "#FFFFFF"];
const PETAL = ["#F4C6CF", "#E8899E", "#F7F3EA", "#FBE3D2", "#F2B36B"];
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

/** A balloon on its string: the body, a knot and a curl of string under it,
 *  with a flat highlight (a lighter shape, no gradient). */
function balloon(color: string, w: number) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 40 78");
  s.setAttribute("width", String(w));
  s.setAttribute("height", String(Math.round(w * 1.95)));
  s.innerHTML =
    `<path d="M20 2C9.5 2 3 10.6 3 20.5 3 32 11.6 42 20 44.5 28.4 42 37 32 37 20.5 37 10.6 30.5 2 20 2Z" fill="${color}"/>` +
    `<path d="M16.6 44.2h6.8L20 49.2Z" fill="${color}"/>` +
    `<path d="M11 13.5c1.6-3.6 4.4-5.6 7.6-6.2" fill="none" stroke="#ffffff" stroke-opacity=".42" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M20 49.5c-3.6 5 3.6 8.4 0 13.6s3.6 8.6 0 13.4" fill="none" stroke="rgba(20,22,24,.32)" stroke-width="1.3" stroke-linecap="round"/>`;
  return s;
}

/** A curled ribbon: a strip that waves down its length. */
function ribbon(color: string, h: number) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 22 72");
  s.setAttribute("width", String(Math.round(h * 0.31)));
  s.setAttribute("height", String(h));
  s.innerHTML = `<path d="M11 3c7 5 7 10 0 15s-7 10 0 15 7 10 0 15-7 10 0 15" fill="none" stroke="${color}" stroke-width="4.2" stroke-linecap="round"/>`;
  return s;
}

const PETAL_PATH = "M12 1.5c4.6 3.4 6.2 9.6 3 15.6-1 1.9-2 3.6-3 5.4-1-1.8-2-3.5-3-5.4C5.8 11.1 7.4 4.9 12 1.5Z";

/** Plays `kind` over `host` (the band), from the card's rect. `floor` is
 *  where the visible part of the screen ends (a viewport y: the builder's
 *  phone drawer covers the rest), so what rises from below starts there.
 *  Returns a stop function that clears it at once. */
export function playDelight(kind: Delight, host: HTMLElement, card: DOMRect, floor?: number): () => void {
  if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};
  const box = host.getBoundingClientRect();
  const layer = document.createElement("div");
  layer.className = "gft-delight";
  layer.setAttribute("aria-hidden", "true");
  host.appendChild(layer);
  const cx = card.left - box.left + card.width / 2;
  const top = card.top - box.top;
  /* The band's lowest visible line, in its own coordinates. */
  const bottom = Math.max(top + 60, Math.min(box.height, (floor ?? window.innerHeight) - box.top));
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
  } else if (kind === "balloons") {
    /* A bunch let go from below: each rises past the card at its own pace,
       bobbing side to side and leaning into the sway, and floats off the top. */
    const n = 11;
    for (let i = 0; i < n; i++) {
      const w = rand(30, 46);
      const h = w * 1.95;
      const lane = (i + 0.5) / n;
      const x = cx + (lane - 0.5) * Math.min(box.width * 0.9, card.width * 2.1) + rand(-14, 14);
      /* From just under what's visible to just over the band's top: out of
         sight at both ends, so nothing pops in or out. */
      const fly = bottom + h + 40;
      const sway = rand(14, 30) * (Math.random() < 0.5 ? -1 : 1);
      const kf: Keyframe[] = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const sx = Math.sin(t * Math.PI * 2.2 + i) * sway;
        kf.push({ transform: `translate(${sx.toFixed(1)}px, ${(-fly * t).toFixed(1)}px) rotate(${((sx / sway) * 7).toFixed(2)}deg)`, offset: t });
      }
      add(balloon(pick(BALLOON), w), x, bottom + h / 2 + 4, kf, {
        duration: Math.min(5200, Math.max(2600, fly / rand(0.2, 0.26))),
        delay: rand(0, 900) + i * 40,
        easing: "cubic-bezier(.33,.08,.55,1)",
      });
    }
  } else if (kind === "fireworks") {
    /* Five shells in the sky above the card, all in the second or so the
       card is coming out (so none blooms over the letter once it settles
       into the page): a spark climbs,
       flashes, and blooms into two rings of rays that fly out, droop a
       little as they slow, and fade, with a twinkle at each long ray's tip. */
    const spread = Math.min(box.width - 96, card.width * 2.1);
    const skyTop = 56;
    const sky = Math.max(110, Math.min(bottom - 120, top - 24) - skyTop);
    const shells = [
      { x: 0.22, y: 0.55 },
      { x: 0.8, y: 0.25 },
      { x: 0.5, y: 0 },
      { x: 0.06, y: 1 },
      { x: 0.94, y: 0.8 },
    ];
    shells.forEach((sh, si) => {
      const bx = Math.min(box.width - 48, Math.max(48, cx + (sh.x - 0.5) * spread + rand(-10, 10)));
      const by = skyTop + sh.y * sky + rand(-8, 8);
      const t0 = si * 230 + rand(0, 80);
      const color = FIRE[si % FIRE.length];
      const accent = FIRE[(si + 2) % FIRE.length];
      const climb = rand(100, 150);
      const trail = document.createElement("i");
      trail.className = "gft-delight-dot gft-delight-spark";
      trail.style.background = color;
      add(trail, bx, by + climb, [
        { transform: "translate(-50%, 0) scale(0.8)", opacity: 0 },
        { transform: "translate(-50%, 0) scale(1)", opacity: 1, offset: 0.15 },
        { transform: `translate(-50%, ${-climb}px) scale(0.7)`, opacity: 1, offset: 0.92 },
        { transform: `translate(-50%, ${-climb}px) scale(0)`, opacity: 0 },
      ], { duration: 460, delay: t0, easing: "cubic-bezier(.2,.6,.4,1)" });
      const flash = document.createElement("i");
      flash.className = "gft-delight-flash";
      flash.style.background = color;
      add(flash, bx, by, [
        { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1)", opacity: 0.55, offset: 0.25 },
        { transform: "translate(-50%, -50%) scale(1.5)", opacity: 0 },
      ], { duration: 520, delay: t0 + 420, easing: "cubic-bezier(.2,.7,.3,1)" });
      const r = rand(62, 88);
      const rays = 16;
      for (let k = 0; k < rays; k++) {
        const inner = k % 2 === 1;
        const a = (360 / rays) * k + rand(-4, 4);
        const len = inner ? r * 0.6 : r;
        const ray = document.createElement("i");
        ray.className = "gft-delight-ray";
        ray.style.background = inner ? accent : color;
        add(ray, bx, by, [
          { transform: `translate(0px, 0px) rotate(${a}deg) translateY(-6px) scaleY(0.3)`, opacity: 0 },
          { transform: `translate(0px, 2px) rotate(${a}deg) translateY(${-len * 0.78}px) scaleY(1)`, opacity: 1, offset: 0.32 },
          { transform: `translate(0px, 16px) rotate(${a}deg) translateY(${-len}px) scaleY(0.3)`, opacity: 0 },
        ], { duration: rand(1050, 1300), delay: t0 + 430, easing: "cubic-bezier(.1,.75,.25,1)" });
        if (!inner) {
          const tip = document.createElement("i");
          tip.className = "gft-delight-dot gft-delight-spark";
          tip.style.background = "#FFFFFF";
          const rad = (a - 90) * (Math.PI / 180);
          const tx = Math.cos(rad) * r * 1.12;
          const ty = Math.sin(rad) * r * 1.12;
          add(tip, bx, by, [
            { transform: "translate(-50%, -50%) scale(0)", opacity: 0 },
            { transform: `translate(calc(-50% + ${tx.toFixed(1)}px), calc(-50% + ${(ty + 8).toFixed(1)}px)) scale(1)`, opacity: 1, offset: 0.5 },
            { transform: `translate(calc(-50% + ${tx.toFixed(1)}px), calc(-50% + ${(ty + 24).toFixed(1)}px)) scale(0.2)`, opacity: 0 },
          ], { duration: rand(1150, 1450), delay: t0 + 560, easing: "cubic-bezier(.2,.7,.3,1)" });
        }
      }
    });
  } else if (kind === "streamers") {
    /* Party streamers dropped from above: curled ribbons that fall past the
       card, swinging, turning edge-on and back as they twist. */
    for (let i = 0; i < 18; i++) {
      const h = rand(54, 84);
      const x = cx + rand(-0.5, 0.5) * Math.min(box.width * 0.95, card.width * 2.2);
      const fall = top + card.height + rand(80, 200) + h;
      const swing = rand(20, 46) * (Math.random() < 0.5 ? -1 : 1);
      const spin = rand(-70, 70);
      const kf: Keyframe[] = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        kf.push({
          transform: `translate(${Math.sin(t * Math.PI * 1.6) * swing}px, ${fall * t}px) rotate(${spin * t}deg) scaleX(${Math.cos(t * Math.PI * 3 + i).toFixed(3)})`,
          opacity: k === 0 ? 0 : k >= 7 ? (k === 8 ? 0 : 0.85) : 1,
          offset: t,
        });
      }
      add(ribbon(pick(PAPER), h), x, -h - 10, kf, {
        duration: rand(2400, 3300),
        delay: rand(0, 700),
        easing: "cubic-bezier(.35,.15,.55,1)",
      });
    }
  } else if (kind === "petals") {
    /* Soft petals drift down across the card, slowly, each one turning over
       as it goes (a flattening and a spin), swaying wide like a leaf. */
    for (let i = 0; i < 24; i++) {
      const size = rand(14, 24);
      const x = cx + rand(-0.55, 0.55) * Math.min(box.width, card.width * 2.4);
      const fall = top + card.height + rand(60, 180);
      const sway = rand(30, 70) * (Math.random() < 0.5 ? -1 : 1);
      const turn = rand(160, 360) * (Math.random() < 0.5 ? -1 : 1);
      const kf: Keyframe[] = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        kf.push({
          transform: `translate(${Math.sin(t * Math.PI * 2 + i * 0.7) * sway}px, ${fall * t}px) rotate(${turn * t}deg) scaleY(${(0.45 + 0.55 * Math.abs(Math.cos(t * Math.PI * 2.5 + i))).toFixed(3)})`,
          opacity: k === 0 ? 0 : k === 8 ? 0 : k === 7 ? 0.8 : 1,
          offset: t,
        });
      }
      add(svg(PETAL_PATH, pick(PETAL), size), x, rand(-40, top * 0.6), kf, {
        duration: rand(3200, 4600),
        delay: rand(0, 900),
        easing: "linear",
      });
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
