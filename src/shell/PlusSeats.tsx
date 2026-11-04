import { useEffect, useState } from "react";
import { PLUS_NEXT_PRICE, PLUS_SEAT_CAP, plusSeatLine, plusSeatsLeft } from "../model/seats";

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

/** "91 of 100 spots left at $7.99", a bar of what's gone, and the next price. */
export function PlusSeats({ monthly, className, then = true }: { monthly: string; className?: string; then?: boolean }) {
  const left = usePlusSeats();
  const taken = (PLUS_SEAT_CAP - left) / PLUS_SEAT_CAP;
  return (
    <div className={`plus-seats ${className ?? ""}`}>
      <p className="plus-seats-line">
        <b className="tnum">{plusSeatLine(left, monthly)}</b>
        {then ? <span>{PLUS_NEXT_PRICE} after</span> : null}
      </p>
      <span className="plus-seats-bar" aria-hidden="true">
        <i style={{ transform: `scaleX(${taken})` }} />
      </span>
    </div>
  );
}
