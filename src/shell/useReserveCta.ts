import { useLocation } from "react-router-dom";
import { reserveCta } from "../model/content";
import { useAuth } from "../context/auth_context";

/**
 * THE ONE CTA, AND WHERE IT GOES FOR SOMEONE WHO HAS ALREADY BOUGHT.
 *
 * Every "Get early access" on the site pointed at `/reserve` unconditionally,
 * so a member who came back — new device, cleared cache, or just the next
 * morning — was invited to buy a membership they already hold, and the wallet
 * answered their tap with a 409. The checkout sheet catches that case now, but
 * only AFTER they have opened it: the page still read as though nothing had
 * happened. This is the same fact said one step earlier, on the button.
 *
 * A hook rather than a component on purpose. The call sites differ in class,
 * in ref (the pitch observes its hero CTA) and in the state they carry, and
 * wrapping them in one component would have meant forwarding all three.
 *
 * `subscribed` is three-state and only a hard `true` changes anything here —
 * unknown reads as not subscribed, so the ordinary buyer never waits on a
 * network call to be told what the button does.
 */
export function useReserveCta(): {
  to: string;
  label: string;
  /** `/reserve` opens as a sheet over the page beneath and needs the
   *  background location; `/in` is an ordinary page and takes none. */
  state: { background: ReturnType<typeof useLocation> } | undefined;
  subscribed: boolean;
} {
  const location = useLocation();
  const { subscribed } = useAuth();
  const held = subscribed === true;

  return {
    to: held ? "/in" : "/reserve",
    label: held ? "View your membership" : reserveCta,
    state: held ? undefined : { background: location },
    subscribed: held,
  };
}
