import { useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * THE TRY-IT-ONCE WINDOW, OPENABLE BY LINK (docs/POLISH-2026-09-21.md §66).
 * Sam, 26 Sep 2026: "can you create a link that triggers the 'try it once'
 * modal … that i can use for ads."
 *
 * `?try` on the pitch or on Coffeeholics opens it on arrival (`/try` redirects
 * to `/?try`). Closing it drops `try` from the address, so a reload or a shared
 * copy of the page does not reopen it; every other parameter an ad adds
 * (utm_*, fbclid) is left alone.
 */
export function useTrialLink(): [boolean, (open: boolean) => void] {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(() => params.has("try"));
  const set = (next: boolean) => {
    setOpen(next);
    if (!next && params.has("try")) {
      const rest = new URLSearchParams(params);
      rest.delete("try");
      setParams(rest, { replace: true, preventScrollReset: true });
    }
  };
  return [open, set];
}
