import { useEffect, useRef } from "react";
import type { LitePlace } from "../model/lite";
import { LiteMark } from "./LiteMark";

/* ══ JUST JOINED (Sam, 12 Nov 2026: "we can show on the web page that
   Crumbl Cookies has now joined. We can have a dedicated card for them built
   using /impeccable design"; then Italiano's, "Crumbl and Italianos would
   both be on Tapin lite", one card for both) ═══════════════════════════════════
   Each place's own photograph side by side, its mark seated on the photo's
   edge like an app avatar; the news as the heading; then each place's perks
   under its name, in its own words: a percent as a figure, a free item as
   the real item cut from the place's photo. One moment of motion: when the
   card comes into view the cookie rolls in and settles. The foot says how
   you get them: Lite comes with Plus, it isn't sold on its own. Styles:
   .tpl-new*. */
const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const names = (list: LitePlace[]) =>
  list.length === 1 ? list[0].name : `${list.slice(0, -1).map((p) => p.name).join(", ")} and ${list[list.length - 1].name}`;

/* The parents page says "their order" (Sam, 12 Nov 2026: "add them to the
   parents page too"). */
const voice = (t: string, they: boolean) => (they ? t.replace(/\byour\b/g, "their") : t);

export function LiteJoined({ places, they = false }: { places: LitePlace[]; they?: boolean }) {
  const item = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const el = item.current;
    if (!el || still() || typeof IntersectionObserver !== "function" || typeof el.animate !== "function") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        el.animate(
          [
            { transform: "translateX(-56px) rotate(-200deg)", opacity: 0 },
            { opacity: 1, offset: 0.35 },
            { transform: "none", opacity: 1 },
          ],
          { duration: 900, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" },
        );
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (!places.length) return null;
  let rolled = false;
  return (
    <section className="tpa-module tpl-new" data-n={places.length} aria-labelledby="tpl-new-h">
      <div className="tpl-new-photos">
        {places.map((p) => (
          <div key={p.id} className="tpl-new-photo">
            <img src={p.photo} alt="" decoding="async" loading="lazy" />
            <img
              className="tpl-new-logo"
              data-round={p.round ? "" : undefined}
              src={p.logo}
              alt={p.name}
              width="60"
              height="60"
              decoding="async"
              loading="lazy"
            />
          </div>
        ))}
      </div>
      <div className="tpl-new-text">
        <h2 id="tpl-new-h" className="tpl-new-h">
          {names(places)} just joined&nbsp;Tapin
        </h2>
        {places.map((p) => (
          <div key={p.id} className="tpl-new-place">
            {places.length > 1 ? <h3 className="tpl-new-name">{p.name}</h3> : null}
            <ul className="tpl-new-perks">
              {p.perks.map((k) => {
                const roll = k.key === "free" && p.item && !rolled;
                if (roll) rolled = true;
                return (
                  <li key={k.key}>
                    {k.key === "free" && p.item ? (
                      <img ref={roll ? item : undefined} className="tpl-new-item" src={p.item} alt="" decoding="async" loading="lazy" />
                    ) : (
                      <span className="tpl-new-pct tnum" aria-hidden="true">
                        {k.b.match(/\d+%/)?.[0] ?? "%"}
                      </span>
                    )}
                    <p>
                      <b>{voice(k.b, they)}</b>
                      <span>{k.when}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <p className="tpl-new-foot">
          <LiteMark className="lite-mark" />
          <span>
            {places.length > 1 ? "Both come with Plus, as Tapin Lite places." : "Comes with Plus, as a Tapin Lite place."}
          </span>
        </p>
      </div>
    </section>
  );
}
