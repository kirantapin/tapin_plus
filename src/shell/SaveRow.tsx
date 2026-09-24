import { useReserveFlow } from "./ReserveLayer";
import { useMedia } from "./useMedia";
import { campaignShots } from "../model/campaign";
import { benefitFragments, benefitShots, benefits, venues } from "../model/content";

/**
 * WHAT YOU'D SAVE, AT THE TOP OF THE PHONE'S CHECKOUT (docs/POLISH-2026-09-21.md
 * §44). Sam, 23 Sep 2026, with the Coffeeholics page's three photo cards: "can
 * we have this show up at the top of mobile checkout". So the page's own cards,
 * compact, as a row that snaps card by card, first on page 0 below 1024.
 *
 * WHICH CARDS IS WHICH PAGE THE LAYER SITS OVER. Over /coffeeholics they are
 * `campaignShots`, exactly as that page's section has them; over anything else
 * they are the pitch's "What you get" cards from the records BenefitCards
 * reads — the credit, then the rest in the record's order — without the fourth,
 * offers card (§44 refuses a fourth). Titles, lines, figures and photographs
 * are all the model's; nothing here is typed but the row's name.
 *
 * Content, not a control: no button and no link. The list is focusable only so
 * a keyboard can scroll it. From 1024 it does not render — the desktop sheet
 * keeps its two columns and the included panel.
 */
interface Save {
  id: string;
  img?: string;
  title: string;
  thumb?: string;
  chip: { line: string; figure: string };
}

const pitchSaves: Save[] = [
  ...benefits.filter((b) => b.id === "credit"),
  ...benefits.filter((b) => b.id !== "credit"),
].flatMap((b) => {
  const chip = benefitFragments[b.id];
  return chip
    ? [
        {
          id: b.id,
          img: venues.find((v) => v.id === benefitShots[b.id])?.hero,
          title: b.label,
          chip,
        },
      ]
    : [];
});

/* PhotoCard's two splits, for the same strings: the order line into item and
   price, and a saving into its label and figure. */
const ORDER = /^(.+) · (\$[\d.,]+)$/;
const SAVES = /^You save /;

export default function SaveRow() {
  const desk = useMedia("(min-width: 1024px)");
  const { over } = useReserveFlow();
  if (desk) return null;
  const saves: Save[] = over === "/coffeeholics" ? campaignShots : pitchSaves;
  if (!saves.length) return null;
  return (
    /* role="list": Safari drops a list's semantics under `list-style:none`. */
    <ul className="rs-saves" role="list" aria-label="What you'd save" tabIndex={0}>
      {saves.map((s) => {
        const order = ORDER.exec(s.chip.line);
        const saving = SAVES.test(s.chip.figure);
        /* The title already says "Points", so the figure keeps the model's
           words after it: "Points toward a free one" → "Toward a free one". */
        const figure = saving ? s.chip.figure : s.chip.figure.replace(/^Points t/, "T");
        return (
          <li className="rs-sv" key={s.id}>
            {s.img ? <img className="rs-sv-img" src={s.img} alt="" decoding="async" /> : null}
            <div className="rs-sv-plate">
              <p className="rs-sv-title">{s.title}</p>
              <p className="rs-sv-line">
                {s.thumb ? (
                  <img
                    className="rs-sv-thumb"
                    src={s.thumb}
                    alt=""
                    width={32}
                    height={32}
                    decoding="async"
                  />
                ) : null}
                <span className="rs-sv-words">
                  {order ? (
                    <>
                      <span>{order[1]}</span>
                      <span className="rs-sv-tail">
                        <span className="rs-sv-sep"> · </span>
                        {order[2]}
                      </span>
                    </>
                  ) : (
                    s.chip.line
                  )}
                </span>
                <b className={`rs-sv-fig${saving ? " is-save" : ""}`}>{figure}</b>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
