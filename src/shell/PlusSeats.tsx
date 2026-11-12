import { useEffect, useState } from "react";
import { COFFEEHOLICS_SEAT_CAP, PLUS_NEXT_PRICE, PLUS_SEAT_CAP, coffeeholicsSeatsLeft, plusSeatLine, plusSeatsLeft } from "../model/seats";

/* The next-100 count (model/seats.ts), checked once a minute so a seat can
   go while the page is open. */
export function usePlusSeats(): number {
  const [left, setLeft] = useState(() => plusSeatsLeft());
  useEffect(() => {
    const t = window.setInterval(() => setLeft(plusSeatsLeft()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return left;
}

/* Coffeeholics' 50 (model/seats.ts), checked every 30 seconds: it moves
   hourly, sometimes by five. */
export function useCoffeeholicsSeats(): number {
  const [left, setLeft] = useState(() => coffeeholicsSeatsLeft());
  useEffect(() => {
    const t = window.setInterval(() => setLeft(coffeeholicsSeatsLeft()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return left;
}

/** "91 of 100 spots left at $7.99", a bar of what's left, and the next price.
 *  The bar shows the spots still open and drains as they go (Sam, 3 Nov
 *  2026: "can we invert this?"). */
export function PlusSeats({ monthly, className, then = true }: { monthly: string; className?: string; then?: boolean }) {
  const left = usePlusSeats();
  const open = left / PLUS_SEAT_CAP;
  return (
    <div className={`plus-seats ${className ?? ""}`}>
      <p className="plus-seats-line">
        <b className="tnum">{plusSeatLine(left, monthly)}</b>
        {/* After what (UX audit, 4 Nov 2026: "$9.99 after" didn't say). */}
        {then ? <span>{PLUS_NEXT_PRICE} when they’re gone</span> : null}
      </p>
      <span className="plus-seats-bar" aria-hidden="true">
        <i style={{ transform: `scaleX(${open})` }} />
      </span>
    </div>
  );
}

/** Coffeeholics' for-life offer in the checkout (Sam, 12 Nov 2026: "need to
 *  make sure this is updated too for the coffeeholics offer"): its own 50
 *  spots and its end, in the $7.99 spots box's place and look. */
export function CoffeeholicsSeats({ first, ends, className }: { first: string; ends: string; className?: string }) {
  const left = useCoffeeholicsSeats();
  return (
    <div className={`plus-seats ${className ?? ""}`}>
      <p className="plus-seats-line">
        <b className="tnum">
          {left} of {COFFEEHOLICS_SEAT_CAP} spots left at {first} for life
        </b>
        <span>Offer {ends}</span>
      </p>
      <span className="plus-seats-bar" aria-hidden="true">
        <i style={{ transform: `scaleX(${left / COFFEEHOLICS_SEAT_CAP})` }} />
      </span>
    </div>
  );
}
