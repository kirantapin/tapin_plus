/* ══ WHAT'S JOINING NEXT (Sam, 4 Nov 2026: "for the more plus places joining,
   we should include a few categories, like a local blacksburg barbershop,
   salon, gym, convenience store, when we add these the price goes up for
   others but not for those who sub today, their rate is locked") ══════════
   Kinds of place, not names: none has signed yet, so the tiles say what
   sort of place is coming and nothing more. Used by the "?" tab's card and
   the walkthrough's slide, so both say the same thing. */

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Scissors() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6.5" cy="17.5" r="2.5" {...stroke} />
      <circle cx="17.5" cy="17.5" r="2.5" {...stroke} />
      <path d="M8.3 15.7 18 4M15.7 15.7 6 4" {...stroke} />
    </svg>
  );
}
function Dryer() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5a5.5 5.5 0 0 1 5.5-5.5H17a3 3 0 0 1 0 6H13l-1.5 4H8l.6-2.4A5.5 5.5 0 0 1 4 9.5Z" {...stroke} />
      <path d="M9 14v6M20 6.5h1.5M20 4.5l1-1M20 8.5l1 1" {...stroke} />
    </svg>
  );
}
function Dumbbell() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 12h8M5 8v8M8 6.5v11M16 6.5v11M19 8v8M3 12h2M19 12h2" {...stroke} />
    </svg>
  );
}
function Store() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 9.5V20h15V9.5M3.5 9.5 5 4h14l1.5 5.5c0 1.4-1.1 2.5-2.5 2.5S15.5 10.9 15.5 9.5c0 1.4-1.1 2.5-2.5 2.5h-2c-1.4 0-2.5-1.1-2.5-2.5C8.5 10.9 7.4 12 6 12S3.5 10.9 3.5 9.5Z" {...stroke} />
      <path d="M10 20v-4.5h4V20" {...stroke} />
    </svg>
  );
}

export const COMING = [
  { id: "barber", label: "Barbershop", Icon: Scissors },
  { id: "salon", label: "Salon", Icon: Dryer },
  { id: "gym", label: "Gym", Icon: Dumbbell },
  { id: "store", label: "Corner store", Icon: Store },
] as const;

/** Four tiles: an icon in a well and the kind of place under it. */
export function ComingTiles({ className = "" }: { className?: string }) {
  return (
    <ul className={`coming ${className}`} aria-label="Kinds of place joining next">
      {COMING.map(({ id, label, Icon }) => (
        <li key={id}>
          <span className="coming-ico">
            <Icon />
          </span>
          <span className="coming-label">{label}</span>
        </li>
      ))}
    </ul>
  );
}
