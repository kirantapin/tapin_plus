import { useId, type ReactNode } from "react";
import type { SceneId } from "../model/gift";
import { FlatMark } from "./parents_kit";

/* ══ THE WAX SEAL, PER BACKGROUND ═════════════════════════════════════════
   Sam, 6 Nov 2026: "I think it'd be fun if we had a seal that matched the
   background theme and color a bit more." Each background's seal is a wax
   colour from its own palette, dark or bright enough to stand off the kraft,
   with a little emblem pressed into it in a colour that reads on the wax.
   Maroon keeps the flat Plus mark (the brand default). Flat shapes only: an
   uneven wax edge, a pressed disc a shade down and a lifted rim a shade up.
   Motifs are drawn on a 24-unit square. */

type Ink = { ink: string; accent: string; wax: string };
type Seal = {
  wax: string;
  ink: string;
  /** A second colour in the emblem (defaults to the ink). */
  accent?: string;
  /** The emblem's drawing, on a 24 × 24 square; null = the Plus mark. */
  motif: ((c: Ink & { id: string }) => ReactNode) | null;
};

const CREAM = "#f7f3ea";
const GOLD = "#f2b36b";
const ORANGE = "#e5751f";
const MAROON = "#861f41";
const PINK = "#f7e1e4";

/** A four-point sparkle (never a six-pointed star). */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

const HEART =
  "M12 20.8C5.2 16 2.4 12.4 2.4 8.7 2.4 5.7 4.7 3.4 7.5 3.4c1.9 0 3.5 1 4.5 2.7 1-1.7 2.6-2.7 4.5-2.7 2.8 0 5.1 2.3 5.1 5.3 0 3.7-2.8 7.3-9.6 12.1Z";

/** Points round a centre: `n` of them, each turned `step` degrees. */
const around = (n: number, f: (deg: number, i: number) => ReactNode) =>
  Array.from({ length: n }, (_, i) => f((360 / n) * i, i));

const SEALS: Record<SceneId, Seal> = {
  maroon: { wax: MAROON, ink: "#f1e7d0", motif: null },
  /* A gingham heart: the cloth's red check, cut through a cream heart. */
  picnic: {
    wax: "#c8323c",
    ink: "#fbf7ee",
    motif: ({ ink, wax, id }) => (
      <>
        <clipPath id={id}>
          <path d={HEART} />
        </clipPath>
        <path d={HEART} fill={ink} />
        <g clipPath={`url(#${id})`} fill={wax} fillOpacity={0.5}>
          {[3, 9, 15, 21].map((x) => (
            <rect key={`v${x}`} x={x - 1.5} y={0} width={3} height={24} />
          ))}
          {[3, 9, 15, 21].map((y) => (
            <rect key={`h${y}`} x={0} y={y - 1.5} width={24} height={3} />
          ))}
        </g>
      </>
    ),
  },
  /* A crescent moon and one of the sky's sparkles. */
  night: {
    wax: "#132042",
    ink: CREAM,
    accent: ORANGE,
    motif: ({ ink, accent }) => (
      <>
        <path d="M13.6 3.2A9 9 0 1 0 21 15.6 7.4 7.4 0 0 1 13.6 3.2Z" fill={ink} />
        <path d={sparkle(18.6, 6.4, 3.4)} fill={accent} />
      </>
    ),
  },
  /* A party popper, its bits flying. */
  confetti: {
    wax: "#141618",
    ink: CREAM,
    accent: ORANGE,
    motif: ({ ink, accent }) => (
      <>
        <path d="M2.6 21.4 7.6 8.8l7.6 7.6Z" fill={accent} />
        <rect x={13} y={3} width={2.2} height={4.4} rx={0.6} fill={ink} transform="rotate(28 14.1 5.2)" />
        <rect x={18.6} y={7.6} width={2.2} height={4.4} rx={0.6} fill={accent} transform="rotate(-36 19.7 9.8)" />
        <rect x={16.4} y={14.4} width={2.2} height={4.4} rx={0.6} fill={ink} transform="rotate(70 17.5 16.6)" />
        <circle cx={10.6} cy={4.2} r={1.3} fill={accent} />
        <circle cx={20.4} cy={3.6} r={1.3} fill={ink} />
      </>
    ),
  },
  /* A paper plane, a red fold under its wing (airmail's red and blue). */
  airmail: {
    wax: "#2b4c9b",
    ink: "#fbfaf6",
    accent: "#e0545c",
    motif: ({ ink, accent }) => (
      <>
        <path d="M2 11.2 22 3l-6.4 18-4-7.2Z" fill={ink} />
        <path d="M11.6 13.8 22 3l-11.2 15.4Z" fill={accent} />
      </>
    ),
  },
  /* The sun coming up over the hills. */
  sunrise: {
    wax: "#4a1024",
    ink: CREAM,
    accent: ORANGE,
    motif: ({ ink, accent }) => (
      <>
        <path d="M5.4 16.4a6.6 6.6 0 0 1 13.2 0Z" fill={accent} />
        {[-60, -30, 0, 30, 60].map((d) => (
          <rect key={d} x={11.1} y={3.6} width={1.8} height={3.2} rx={0.9} fill={ink} transform={`rotate(${d} 12 16.4)`} />
        ))}
        <rect x={2} y={17.8} width={20} height={2} rx={1} fill={ink} />
        <rect x={6} y={21} width={12} height={1.8} rx={0.9} fill={ink} />
      </>
    ),
  },
  /* The Blue Ridge, two peaks and a low sun. */
  ridge: {
    wax: "#a0485a",
    ink: "#f6d9b8",
    accent: GOLD,
    motif: ({ ink, accent }) => (
      <>
        <circle cx={17.6} cy={6} r={3} fill={accent} />
        <path d="M1 20.6 8.6 7.6l4.4 7 3.2-4.4 6.8 10.4Z" fill={ink} />
      </>
    ),
  },
  hearts: {
    wax: MAROON,
    ink: PINK,
    motif: ({ ink }) => <path d={HEART} fill={ink} />,
  },
  /* A pink-iced donut with sprinkles. */
  sprinkles: {
    wax: "#4a1024",
    ink: PINK,
    accent: ORANGE,
    motif: ({ ink, accent, wax }) => (
      <>
        <circle cx={12} cy={12} r={10} fill={ink} />
        <circle cx={12} cy={12} r={3.4} fill={wax} />
        {[
          [12, 4.6, 0, accent],
          [18.4, 8.6, 60, GOLD],
          [18, 16, -30, MAROON],
          [11.6, 19.4, 80, accent],
          [5.6, 15.4, 30, GOLD],
          [6, 8, -50, MAROON],
        ].map(([x, y, r, c], i) => (
          <rect
            key={i}
            x={(x as number) - 0.75}
            y={(y as number) - 1.8}
            width={1.5}
            height={3.6}
            rx={0.75}
            fill={c as string}
            transform={`rotate(${r} ${x} ${y})`}
          />
        ))}
      </>
    ),
  },
  /* A white daisy on sunny yellow. */
  daisies: {
    wax: "#e39a1c",
    ink: "#ffffff",
    accent: MAROON,
    motif: ({ ink, accent }) => (
      <>
        {around(8, (d) => (
          <ellipse key={d} cx={12} cy={6.2} rx={2.9} ry={5} fill={ink} transform={`rotate(${d} 12 12)`} />
        ))}
        <circle cx={12} cy={12} r={3.6} fill={accent} />
      </>
    ),
  },
  /* X and O. */
  xoxo: {
    wax: "#d4611a",
    ink: CREAM,
    motif: ({ ink }) => (
      <g fill="none" stroke={ink} strokeWidth={2.8} strokeLinecap="round">
        <path d="M2.8 7.6 9.8 16.4M9.8 7.6 2.8 16.4" />
        <circle cx={17} cy={12} r={4.4} />
      </g>
    ),
  },
  /* A smiley face (the background's little maroon ones). */
  smileys: {
    wax: MAROON,
    ink: GOLD,
    motif: ({ ink, wax }) => (
      <>
        <circle cx={12} cy={12} r={10.4} fill={ink} />
        <ellipse cx={8.6} cy={9.4} rx={1.4} ry={2} fill={wax} />
        <ellipse cx={15.4} cy={9.4} rx={1.4} ry={2} fill={wax} />
        <path d="M6.9 13.6Q12 19.2 17.1 13.6" fill="none" stroke={wax} strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  /* A shirt button, sewn on in orange thread. */
  flannel: {
    wax: "#141618",
    ink: CREAM,
    accent: ORANGE,
    motif: ({ ink, accent, wax }) => (
      <>
        <circle cx={12} cy={12} r={10} fill={ink} />
        <circle cx={12} cy={12} r={7.6} fill="none" stroke={wax} strokeOpacity={0.35} strokeWidth={1} />
        <path d="M9.4 9.4 14.6 14.6M14.6 9.4 9.4 14.6" stroke={accent} strokeWidth={1.6} strokeLinecap="round" />
        {[
          [9.4, 9.4],
          [14.6, 9.4],
          [9.4, 14.6],
          [14.6, 14.6],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={1.5} fill={wax} />
        ))}
      </>
    ),
  },
  /* A steaming cup on its saucer. */
  lunch: {
    wax: "#d4611a",
    ink: CREAM,
    motif: ({ ink }) => (
      <>
        <path d="M3.4 9h13.2v5.4a5.2 5.2 0 0 1-5.2 5.2H8.6a5.2 5.2 0 0 1-5.2-5.2Z" fill={ink} />
        <path
          d="M16.4 10.4h1.6a2.8 2.8 0 0 1 0 5.6h-2"
          fill="none"
          stroke={ink}
          strokeWidth={1.9}
        />
        <rect x={2} y={20.8} width={16} height={1.9} rx={0.95} fill={ink} />
        <path d="M7.6 6.8Q6.2 5.2 7.6 3.4M12.2 6.8Q10.8 5.2 12.2 3.4" fill="none" stroke={ink} strokeWidth={1.6} strokeLinecap="round" />
      </>
    ),
  },
  /* A sun, its rays a burst. */
  sunburst: {
    wax: "#e5751f",
    ink: "#fbf1dc",
    motif: ({ ink }) => (
      <>
        <circle cx={12} cy={12} r={5.2} fill={ink} />
        {around(10, (d) => (
          <path key={d} d="M10.6 5.2 12 0.8l1.4 4.4Z" fill={ink} transform={`rotate(${d} 12 12)`} />
        ))}
      </>
    ),
  },
  /* A fall leaf with its veins. */
  leaves: {
    wax: "#9a4416",
    ink: "#f8cf8e",
    motif: ({ ink, wax }) => (
      <g transform="rotate(40 12 12)">
        <path d="M12 0.6C19.8 5 21 13.2 12 20.4 3 13.2 4.2 5 12 0.6Z" fill={ink} />
        <path d="M12 4V23.4M12 9.4 8.2 6.6M12 9.4l3.8-2.8M12 14.2 7.6 11.2M12 14.2l4.4-3" fill="none" stroke={wax} strokeWidth={1.3} strokeLinecap="round" />
        <path d="M12 20.4V23.4" stroke={ink} strokeWidth={1.6} strokeLinecap="round" />
      </g>
    ),
  },
  /* A pumpkin, its stem in the background's acorn brown. */
  thanksgiving: {
    wax: "#c4581f",
    ink: CREAM,
    accent: "#6b3416",
    motif: ({ ink, accent, wax }) => (
      <>
        <path d="M11.2 6.6c0-1.6.6-3 2-3.8l1 1c-.8.6-1.1 1.6-1.1 2.8Z" fill={accent} />
        <ellipse cx={7.6} cy={13.8} rx={5.4} ry={6.6} fill={ink} />
        <ellipse cx={16.4} cy={13.8} rx={5.4} ry={6.6} fill={ink} />
        <ellipse cx={12} cy={13.8} rx={4.2} ry={7.2} fill={ink} stroke={wax} strokeOpacity={0.55} strokeWidth={1} />
      </>
    ),
  },
  /* A nine-branch menorah (never a Star of David), its flames gold. */
  hanukkah: {
    wax: "#22408c",
    ink: CREAM,
    accent: GOLD,
    motif: ({ ink, accent }) => (
      <>
        <g fill="none" stroke={ink} strokeWidth={1.25} strokeLinecap="round">
          {[2.4, 4.8, 7.2, 9.6].map((d) => (
            <path key={d} d={`M${12 - d} 9.6a${d} ${d * 0.82} 0 0 0 ${2 * d} 0`} />
          ))}
          <path d="M12 7.2V20.6" strokeWidth={1.6} />
        </g>
        <rect x={7.6} y={20} width={8.8} height={1.9} rx={0.95} fill={ink} />
        {[-9.6, -7.2, -4.8, -2.4, 2.4, 4.8, 7.2, 9.6].map((d) => (
          <ellipse key={d} cx={12 + d} cy={7.8} rx={0.95} ry={1.4} fill={accent} />
        ))}
        <ellipse cx={12} cy={5.2} rx={1.1} ry={1.6} fill={accent} />
      </>
    ),
  },
  /* A tree with red baubles. */
  christmas: {
    wax: "#1e5b3a",
    ink: CREAM,
    accent: "#e0545c",
    motif: ({ ink, accent }) => (
      <>
        <path d="M12 1.8 17 8.6h-2.2l4.4 5.6h-2.6l4.6 5.8H2.8l4.6-5.8H4.8l4.4-5.6H7Z" fill={ink} />
        <rect x={10.6} y={19.6} width={2.8} height={3} fill={GOLD} />
        <circle cx={10} cy={11.4} r={1.2} fill={accent} />
        <circle cx={14.4} cy={15.2} r={1.2} fill={accent} />
        <circle cx={8.6} cy={17.2} r={1.2} fill={accent} />
      </>
    ),
  },
  /* A firework burst in gold and orange. */
  newyear: {
    wax: "#14193d",
    ink: GOLD,
    accent: ORANGE,
    motif: ({ ink, accent }) => (
      <>
        <g strokeWidth={1.7} strokeLinecap="round">
          {around(12, (d, i) => (
            <path
              key={d}
              d={i % 2 ? "M12 7.6V4.2" : "M12 6.4V1.6"}
              stroke={i % 2 ? accent : ink}
              transform={`rotate(${d} 12 12)`}
            />
          ))}
        </g>
        <circle cx={12} cy={12} r={2.4} fill={ink} />
      </>
    ),
  },
  /* A gift bow in gold. */
  holiday: {
    wax: MAROON,
    ink: GOLD,
    motif: ({ ink }) => (
      <>
        <path d="M12 12C9 5.6 2.4 4.6 2.6 9.4c.2 3.6 5.6 3.6 9.4 2.6Z" fill={ink} />
        <path d="M12 12c3-6.4 9.6-7.4 9.4-2.6-.2 3.6-5.6 3.6-9.4 2.6Z" fill={ink} />
        <path d="M11 12.6 6.8 21l2.6-.6 1.4 2.2L12 13.2l1.2 9.4 1.4-2.2 2.6.6-4.2-8.4Z" fill={ink} />
        <circle cx={12} cy={12} r={2.4} fill={ink} />
      </>
    ),
  },
  /* A snowflake. */
  snow: {
    wax: "#3a5f8f",
    ink: CREAM,
    motif: ({ ink }) => (
      <g fill="none" stroke={ink} strokeWidth={1.7} strokeLinecap="round">
        {around(6, (d) => (
          <path key={d} d="M12 12V2M12 6.2 9.4 3.8M12 6.2l2.6-2.4" transform={`rotate(${d} 12 12)`} />
        ))}
      </g>
    ),
  },
};

/** A colour moved toward black (amount < 0) or white (amount > 0). */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount),
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/* The wax's uneven edge: a circle nudged in and out, smoothed (Catmull-Rom),
   made once. */
const EDGE = (() => {
  const n = 20;
  const pts = Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const r = 29.6 + 0.8 * Math.sin(3 * t + 0.5) + 0.55 * Math.sin(5 * t + 1.3) + 0.35 * Math.sin(8 * t + 2.1);
    return [31 + r * Math.cos(t), 31 + r * Math.sin(t)];
  });
  const f = (v: number) => v.toFixed(2);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
})();

/** The seal's insides for a background: the wax and the pressed emblem.
 *  The `.gft-a-seal` span around it is what the opening lifts away. */
export function SealFace({ scene }: { scene: SceneId }) {
  const id = useId().replace(/:/g, "");
  const s = SEALS[scene] ?? SEALS.maroon;
  const c = { wax: s.wax, ink: s.ink, accent: s.accent ?? s.ink, id: `seal${id}` };
  return (
    <>
      <svg className="gft-seal-wax" viewBox="0 0 62 62" aria-hidden="true" focusable="false">
        <path d={EDGE} fill={s.wax} />
        <circle cx={31} cy={31} r={24.6} fill={shade(s.wax, -0.14)} />
        <circle cx={31} cy={31} r={24.6} fill="none" stroke={shade(s.wax, 0.16)} strokeWidth={1.4} />
      </svg>
      {s.motif ? (
        <svg className="gft-seal-motif" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {s.motif(c)}
        </svg>
      ) : (
        <FlatMark className="gft-seal-motif gft-seal-mark" />
      )}
    </>
  );
}

