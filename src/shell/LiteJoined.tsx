import { useEffect, useRef } from "react";
import type { LitePlace } from "../model/lite";
import { LiteMark } from "./LiteMark";

/* ══ CRUMBL JUST JOINED (Sam, 12 Nov 2026: "we can show on the web page that
   Crumbl Cookies has now joined. We can have a dedicated card for them built
   using /impeccable design") ══════════════════════════════════════════════════
   The place's own photograph leads, its mark seated on the photo's edge like
   an app avatar, then the news as the heading and the two perks in their own
   words: the 10% as a figure, the free cookie as the real cookie, cut from
   the same photo. One moment of motion: when the card comes into view the
   cookie rolls in from the left and settles. The foot says how you get it:
   Lite comes with Plus, it isn't sold on its own. Styles: .tpl-new*. */
const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function LiteJoined({ place }: { place: LitePlace }) {
  const cookie = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const el = cookie.current;
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
  const percent = place.perks.find((p) => p.key === "percent");
  const free = place.perks.find((p) => p.key === "free");
  return (
    <section className="tpa-module tpl-new" aria-labelledby="tpl-new-h">
      <div className="tpl-new-photo">
        <img src={place.photo} alt="" decoding="async" loading="lazy" />
        <img className="tpl-new-logo" src={place.logo} alt={place.name} width="60" height="60" decoding="async" loading="lazy" />
      </div>
      <h2 id="tpl-new-h" className="tpl-new-h">
        {place.name} just joined&nbsp;Tapin
      </h2>
      <ul className="tpl-new-perks">
        {free ? (
          <li>
            {place.item ? <img ref={cookie} className="tpl-new-item" src={place.item} alt="" decoding="async" loading="lazy" /> : null}
            <p>
              <b>{free.b}</b>
              <span>{free.when}</span>
            </p>
          </li>
        ) : null}
        {percent ? (
          <li>
            <span className="tpl-new-pct tnum" aria-hidden="true">
              {percent.b.match(/\d+%/)?.[0] ?? "%"}
            </span>
            <p>
              <b>{percent.b}</b>
              <span>{percent.when}</span>
            </p>
          </li>
        ) : null}
      </ul>
      <p className="tpl-new-foot">
        <LiteMark className="lite-mark" />
        <span>Comes with Plus, as a Tapin Lite&nbsp;place.</span>
      </p>
    </section>
  );
}
