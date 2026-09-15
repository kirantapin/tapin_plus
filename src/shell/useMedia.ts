import { useEffect, useState } from "react";

/**
 * One matchMedia hook for the build. `matchMedia`, not a resize listener: it
 * fires on the boundary crossing rather than on every pixel of a drag, and it
 * is the same query the stylesheet uses, so layout and behaviour cannot
 * disagree about what "desktop" is. SSR-safe by construction — there is no
 * server today, but reading `window` in a hook body is the kind of thing that
 * only breaks once.
 */
export function useMedia(query: string): boolean {
  const [is, setIs] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setIs(mq.matches);
    mq.addEventListener("change", on);
    on();
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return is;
}
