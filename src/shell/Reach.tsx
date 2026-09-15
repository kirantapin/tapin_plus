import { covers, venues, logoField, heroIsBright, TEE_IMAGE, comingVenues } from "../model/content";
import { itemNamed } from "../model/menu";
import { CoverIcon } from "./Icons";

/**
 * What the membership reaches, and where — shown, not listed.
 *
 * Sam, 14 Sep 2026, on /reserve: "include all of the things that people can
 * use TapIn for, and the places they can use it … a strong visual of what
 * those things are, like for Food, Cover, Merch, etc."
 *
 * SIX CATEGORIES, THREE PHOTOGRAPHS. Food, drinks and cover are pictured with
 * the merchants' own photography — the same provenance as every other picture
 * in this build — from the same dishes and the same door the walkthrough
 * already shows, so the two surfaces agree about what a "cover" looks like.
 *
 * Tickets, line skips and merch have NO photograph anywhere in the frozen
 * extraction: there is no event, ticket, door or merch record, and a picture
 * of a night at a real venue is a claim about that venue (§10). Those three
 * tiles carry the category's own glyph at tile scale instead, on the same
 * proportions, so the grid stays one object. When Sam supplies a photograph —
 * a TapIn tee, a real ticket, a real door — it goes into SHOTS and the tile
 * becomes a photo tile with no other change.
 */
const SHOTS: Record<string, { venue?: string; img?: string; hero?: boolean } | undefined> = {
  /* The Burg, not Olaika — Sam, 14 Sep 2026: "show food at the burg here
     instead of olaika". A real dish from its own menu snapshot; Olaika keeps
     the Tickets tile. */
  food: { venue: "theburg", img: itemNamed("theburg", "Lomo Saltado — Peru").img },
  drinks: { venue: "coffeeholicsva", img: itemNamed("coffeeholicsva", "Cappuccino").img },
  /* The Milk Parlor's own room. Cover at The Burg is sold through LineLeap
     (Sam, 13 Sep 2026), so it is never the cover venue on any surface. */
  cover: { venue: "themilkparlor", img: venue("themilkparlor").hero, hero: true },
  /* Sam, 14 Sep 2026: "we can do olaika for tickets visualization here." The
     venue's own hero, under its own mark — the room the tickets are for. */
  tickets: { venue: "olaika", img: venue("olaika").hero, hero: true },
  /* TapIn's own shirt, the one the year includes (content.ts TEE_IMAGE). No
     collar: it is not a merchant's. */
  merch: { img: TEE_IMAGE },
};

function venue(id: string) {
  return venues.find((v) => v.id === id)!;
}

/** The merchant's own mark, seated on whatever it lands on — base.css's collar. */
function Collar({ id, className = "" }: { id: string; className?: string }) {
  const v = venue(id);
  return (
    <span
      className={`collar ${className}`}
      data-field={logoField(id)}
      style={{ ["--brand" as string]: v.brandColor }}
    >
      <img src={v.logo} alt="" decoding="async" />
    </span>
  );
}

export function CoversGrid() {
  return (
    <ul className="reach-grid">
      {covers.map((c) => {
        const s = SHOTS[c.id];
        const shot = s?.img ? s : null;
        return (
          <li
            key={c.id}
            className={`reach-tile${shot ? " has-shot" : ""}${shot && !shot.venue ? " is-object" : ""}`}
          >
            {shot ? (
              <img
                src={shot.img}
                alt=""
                decoding="async"
                /* Only a venue HERO can be the measured bright outlier the
                   flag exists for; a menu photograph never needs it. */
                data-bright={
                  shot.hero && shot.venue && heroIsBright(shot.venue) ? "true" : undefined
                }
              />
            ) : (
              <CoverIcon id={c.id} />
            )}
            {shot?.venue ? <Collar id={shot.venue} className="reach-mark" /> : null}
            <span className="reach-label">{c.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** The six places, by their own marks. Real names, real logos, no ranking. */
export function PlacesRow() {
  return (
    <ul className="reach-places">
      {venues.map((v) => (
        <li key={v.id}>
          <Collar id={v.id} className="reach-collar" />
          <span className="reach-place">
            <b>{v.name}</b>
            <span>{v.category}</span>
          </span>
        </li>
      ))}
      {/* THE MYSTERY ROW. Sam, 14 Sep 2026: "for the coming locations, it'd be
          kinda like a mystery icon that shows other spots that are coming like
          slake." One row, a question mark in the collar's frame, and the names
          of what is signed — read from `comingVenues`, never typed. */}
      <li className="reach-more">
        <span className="reach-collar reach-mystery" aria-hidden="true">?</span>
        <span className="reach-place">
          <b>More coming</b>
          <span>{comingVenues.map((v) => v.name).join(", ")} and others</span>
        </span>
      </li>
    </ul>
  );
}
