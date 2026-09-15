/**
 * One icon family, drawn to TapIn's own idiom: a 24 box, no fill, currentColor
 * stroke at 1.7, round caps and joins (~/desktop-ui nav icons use 1.8 at 22px;
 * 1.7 holds the same optical weight at the smaller sizes used here).
 *
 * They take ink through currentColor and never maroon — maroon is a fill spent
 * exactly three times on this page (the wordmark dot, the Plus chips, the
 * Reserve button), and an icon set in it would be a fourth.
 *
 * Geometric and precise on purpose: sketch-style or hand-drawn scenes read as
 * amateur next to frozen production photography.
 */
const box = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
  focusable: "false" as const,
};

/* ---- the three standing benefits ---- */

const Percent = () => (
  <svg {...box}>
    <circle cx="7.6" cy="7.6" r="2.9" />
    <circle cx="16.4" cy="16.4" r="2.9" />
    <path d="M18.5 5.5 5.5 18.5" />
  </svg>
);

const Credit = () => (
  <svg {...box}>
    <rect x="3" y="6" width="18" height="12.5" rx="2.6" />
    <path d="M3 10.4h18" />
    <path d="M16.6 14.6h1.8" />
  </svg>
);

const Points = () => (
  <svg {...box}>
    <path d="M12 3.6 13.9 9.9 20.4 12 13.9 14.1 12 20.4 10.1 14.1 3.6 12 10.1 9.9Z" />
  </svg>
);

/* ---- the seven ways to use it ---- */

const MySpot = () => (
  <svg {...box}>
    <path d="M6.6 8.4h10.8l.9 11.2a1.2 1.2 0 0 1-1.2 1.3H6.9a1.2 1.2 0 0 1-1.2-1.3Z" />
    <path d="M9.4 8.4V6.6a2.6 2.6 0 0 1 5.2 0v1.8" />
  </svg>
);

const Entry = () => (
  <svg {...box}>
    <path d="M13.8 3.6h5.6v16.8h-5.6" />
    <path d="M4.6 12h7.6" />
    <path d="m9.4 9.2 2.8 2.8-2.8 2.8" />
  </svg>
);

const Handover = () => (
  <svg {...box}>
    <path d="M12 4.2a5 5 0 0 1 5 5c0 3.8 1.2 4.8 1.9 5.8H5.1c.7-1 1.9-2 1.9-5.8a5 5 0 0 1 5-5Z" />
    <path d="M10.2 18.6a1.9 1.9 0 0 0 3.6 0" />
    <path d="M12 4.2V2.8" />
  </svg>
);

const MoreTown = () => (
  <svg {...box}>
    <path d="M3 20.4h18" />
    <path d="M5.2 20.4V9.6l4-3 4 3v10.8" />
    <path d="M15.2 20.4v-7l3-2.1 3 2.1v7" />
  </svg>
);

const Parties = () => (
  <svg {...box}>
    <path d="M4 9.4V7.2h16v2.2a2.6 2.6 0 0 0 0 5.2v2.2H4v-2.2a2.6 2.6 0 0 0 0-5.2Z" />
    <path d="M12 8.6v1.8M12 13.6v1.8" />
  </svg>
);

const PointsGo = () => (
  <svg {...box}>
    <path d="M4.4 8.8h14" />
    <path d="m15.6 5.9 2.9 2.9-2.9 2.9" />
    <path d="M19.6 15.2H5.6" />
    <path d="m8.4 12.3-2.9 2.9 2.9 2.9" />
  </svg>
);

const Offers = () => (
  <svg {...box}>
    <path d="M3.6 11.6V5.4a1.8 1.8 0 0 1 1.8-1.8h6.2l8.8 8.8a1.8 1.8 0 0 1 0 2.6l-5.6 5.6a1.8 1.8 0 0 1-2.6 0Z" />
    <circle cx="8.1" cy="8.1" r="1.4" />
  </svg>
);

/* ---- what the membership covers ---- */

const Food = () => (
  <svg {...box}>
    <path d="M2.6 10.6h18.8" />
    <path d="M4.4 10.6a7.6 7.6 0 0 0 15.2 0" />
    <path d="M9.2 6.6c0-1 1-1.5 1-2.6" />
    <path d="M13.8 6.6c0-1 1-1.5 1-2.6" />
  </svg>
);

const Drinks = () => (
  <svg {...box}>
    <path d="M6.4 7.2h11.2" />
    <path d="M7.6 7.2h8.8l-1.1 12a1.4 1.4 0 0 1-1.4 1.2H10a1.4 1.4 0 0 1-1.4-1.2Z" />
    <path d="m13.8 7.2 1.4-3.8" />
  </svg>
);

const Tickets = () => (
  <svg {...box}>
    <path d="M4 9.4V7.2h16v2.2a2.6 2.6 0 0 0 0 5.2v2.2H4v-2.2a2.6 2.6 0 0 0 0-5.2Z" />
    <path d="M12 8.6v1.8M12 13.6v1.8" />
  </svg>
);

const Merch = () => (
  <svg {...box}>
    <path d="M9 3.8 4.2 6.4l2 3.2 1.7-1V20.2h8.2V8.6l1.7 1 2-3.2L15 3.8a3 3 0 0 1-6 0Z" />
  </svg>
);

/** Cover — a doorway, because that is what you pay to walk through. */
const Cover = () => (
  <svg {...box}>
    <path d="M5.6 20.4V10.3a6.4 6.4 0 0 1 12.8 0v10.1" />
    <path d="M3.2 20.4h17.6" />
  </svg>
);

/** A line skip — going through the barrier rather than standing at it. */
const LineSkip = () => (
  <svg {...box}>
    <path d="M4.2 12h9.2" />
    <path d="m10.6 8.6 3.4 3.4-3.4 3.4" />
    <path d="M18.2 5.8v12.4" />
  </svg>
);

/* ---- app navigation ---- */

const Home = () => (
  <svg {...box}>
    <path d="M3.4 10.4 12 3.6l8.6 6.8V19a1.4 1.4 0 0 1-1.4 1.4h-4.4v-5.8H9.2v5.8H4.8A1.4 1.4 0 0 1 3.4 19Z" />
  </svg>
);

const NAV_ICONS: Record<string, () => JSX.Element> = {
  home: Home,
  deals: Offers,
  spot: MySpot,
  points: Points,
};

export function NavIcon({ id }: { id: string }) {
  const Glyph = NAV_ICONS[id];
  return Glyph ? <Glyph /> : null;
}

const COVER_ICONS: Record<string, () => JSX.Element> = {
  food: Food,
  drinks: Drinks,
  cover: Cover,
  tickets: Tickets,
  merch: Merch,
  lineskip: LineSkip,
};

export function CoverIcon({ id }: { id: string }) {
  const Glyph = COVER_ICONS[id];
  return Glyph ? <Glyph /> : null;
}

const BENEFIT_ICONS: Record<string, () => JSX.Element> = {
  percent: Percent,
  credit: Credit,
  points: Points,
};

const SCENE_ICONS: Record<string, () => JSX.Element> = {
  myspot: MySpot,
  entry: Entry,
  handover: Handover,
  moretown: MoreTown,
  parties: Parties,
  points: PointsGo,
  offers: Offers,
};

export function BenefitIcon({ id }: { id: string }) {
  const Glyph = BENEFIT_ICONS[id];
  return Glyph ? <Glyph /> : null;
}

export function SceneIcon({ scene }: { scene: string }) {
  const Glyph = SCENE_ICONS[scene];
  return Glyph ? <Glyph /> : null;
}
