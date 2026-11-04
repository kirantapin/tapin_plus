import { useEffect, useRef } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The member's "Plus is on" light (Sam, 4 Nov 2026: "can you animate this
 *  dot"). It switches on when the card arrives, the dot springing up from
 *  nothing with its halo opening a beat behind, then stays live: a ring
 *  eases out from it, slower and softer than the social-proof dot's, since
 *  this one is a status, not a call. Reduced motion: lit and still. */
export default function MemberDot() {
  const dot = useRef<HTMLSpanElement | null>(null);
  const ring = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = dot.current;
    if (reducedMotion() || !el || typeof el.animate !== "function") return;
    /* Switched on when the card comes into view (it sits below the fold), so
       the moment is seen; until then the dot waits unlit. */
    let pulse: Animation | undefined;
    const switchOn = () => {
      el.animate(
        [
          { transform: "scale(0)", boxShadow: "0 0 0 0 rgba(11,122,83,0.14)" },
          { transform: "scale(1.2)", offset: 0.55 },
          { transform: "scale(1)", boxShadow: "0 0 0 4px rgba(11,122,83,0.14)" },
        ],
        { duration: 560, delay: 120, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" },
      );
      pulse = ring.current?.animate?.([{ transform: "scale(1)", opacity: 0.45 }, { transform: "scale(3)", opacity: 0 }], {
        duration: 2400,
        delay: 800,
        easing: "cubic-bezier(.2,.6,.3,1)",
        iterations: Infinity,
      });
    };
    if (typeof IntersectionObserver !== "function") {
      switchOn();
      return () => pulse?.cancel();
    }
    el.style.transform = "scale(0)";
    const seen = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        seen.disconnect();
        el.style.transform = "";
        switchOn();
      },
      { threshold: 1, rootMargin: "0px 0px -15% 0px" },
    );
    /* The line, not the dot: a dot at scale(0) has no area to intersect. */
    seen.observe(el.parentElement ?? el);
    return () => {
      seen.disconnect();
      pulse?.cancel();
      el.style.transform = "";
    };
  }, []);
  return (
    <span ref={dot} className="tpa-member-dot" aria-hidden="true">
      <i ref={ring} />
    </span>
  );
}
