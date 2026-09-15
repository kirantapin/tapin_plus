import { Link, useLocation } from "react-router-dom";
import { CoverIcon } from "../../shell/Icons";
import TapInIcon from "../../shell/TapInIcon";
import { venueById, logoFor } from "./appBits";
import { tonight, DOOR } from "../../model/tonight";
import { money } from "../../model/order";
import { heroIsBright } from "../../model/content";

/**
 * Tonight, on the home screen: what is on at the places, as cards a member
 * would actually tap. See model/tonight.ts for why every card says Example.
 * A card is the door to the venue page, where the cover or the ticket is
 * bought; TapIn's own night has no page yet and is not a link.
 */
export default function Tonight() {
  const { state } = useLocation();
  return (
    <section className="app-sec tonight">
      <h2 className="t-caption">
        Tonight <span className="tag tag-sm">Example</span>
      </h2>
      <ul className="tn-rail no-scrollbar">
        {tonight.map((t) => {
          const v = t.venueId ? venueById(t.venueId) : undefined;
          const inner = (
            <>
              <span className={`tn-shot${v ? "" : " is-tapin"}`}>
                {v ? (
                  <img src={v.hero} alt="" decoding="async" data-bright={heroIsBright(v.id) ? "true" : undefined} />
                ) : (
                  <TapInIcon className="tn-mark" />
                )}
                <em className={`tag tn-tag${t.tag === "Coming" ? " is-soon" : ""}`}>{t.tag}</em>
              </span>
              <span className="tn-body">
                <span className="tn-where">
                  {v ? logoFor(v) : null}
                  <b>{v ? v.name : "TapIn"}</b>
                </span>
                <span className="tn-title">{t.title}</span>
                <span className="tn-when">{t.when}</span>
                {t.door.length ? (
                  <span className="tn-chips">
                    {t.door.map((id) => {
                      const d = DOOR[id];
                      return (
                        <span className="tn-chip" key={id}>
                          <CoverIcon id={d.kind} />
                          {d.kind === "cover" ? "Cover" : d.kind === "lineskip" ? "Line skip" : "Ticket"}{" "}
                          <b className="tnum">{money(Math.round(d.price * 100))}</b>
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  <span className="tn-line">{t.line}</span>
                )}
              </span>
            </>
          );
          return (
            <li key={t.id}>
              {v ? (
                <Link className="tn-card" to={`/app/place/${v.id}`} state={state}>
                  {inner}
                </Link>
              ) : (
                <span className="tn-card is-idle">{inner}</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="t-compact app-note">
        Example listings. Real ones come from the places, in the app.
      </p>
    </section>
  );
}
