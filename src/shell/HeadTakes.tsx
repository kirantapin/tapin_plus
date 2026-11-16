import { Fragment, type ReactNode } from "react";
import { Strip } from "./InviteHero";

/* ══ THE MAIN PAGE'S HEADER, REDESIGNED, THREE TAKES (Sam, 16 Nov 2026:
   "it still feels a bit weird, we need to do /impeccable redesign"; "also
   need to include the auto refund thing"). Preview with ?headv=a|b|c; with
   none the header is as shipped (#392). The content is the same in all
   three: the headline, +$25 to spend every month, the five places by name
   and logo, the price, the auto refund, and Join on a computer.
   A · Tray: the collage carries only the headline; under it, in the same
     card, a white tray holds the rest, so the logos sit on white, as they
     were drawn, and nothing reads over the busy photo.
   B · Split: the words on a solid near-black panel, the collage beside them
     on a computer (above them on a phone), uncovered.
   C · Cut paper: everything stays on the collage, in its own language: the
     +$25 on a torn cream strip, the logos as die-cut stickers. */
export type HeadV = "a" | "b" | "c";

export const headVersion = (): HeadV | null => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("headv");
  return v === "a" || v === "b" || v === "c" ? v : null;
};

export interface HeadPlace {
  id: string;
  name: string;
  logo: string;
}

/* A sticker never lands straight. */
const TILT = [-4, 3, -2, 4, -3];

export function HeadTake({
  v,
  h1,
  total,
  places,
  terms,
  join,
}: {
  v: HeadV;
  h1: ReactNode;
  total: number;
  places: HeadPlace[];
  /** The price line and the auto refund. */
  terms: ReactNode;
  /** Join, on a computer only (the dock carries it on a phone). */
  join: ReactNode;
}) {
  const words = "added to your account to spend every month";
  return (
    <>
      <h1 className={`tph-h1${v === "c" ? " tpu-h1" : ""}`}>{h1}</h1>
      {v === "c" ? (
        <p className="tph-plus">
          <Strip seed={7}>
            <b className="tnum">+${total}</b> {words}
          </Strip>
        </p>
      ) : (
        <p className="tph-plus">
          <b className="tnum">+${total}</b> {words}
        </p>
      )}
      <ul className="tph-places" aria-label={`The ${places.length} Plus spots`}>
        {places.map((p, i) => (
          <li key={p.id} style={v === "c" ? { rotate: `${TILT[i % TILT.length]}deg` } : undefined}>
            <span className="tph-logo">
              <img src={p.logo} alt="" decoding="async" />
            </span>
            <span className="tph-name">{p.name}</span>
          </li>
        ))}
      </ul>
      {v === "c" ? (
        <p className="tph-names" aria-hidden="true">
          {places.map((p, i) => (
            <Fragment key={p.id}>
              <span>{p.name}</span>
              {i < places.length - 2 ? ", " : i === places.length - 2 ? " and " : ""}
            </Fragment>
          ))}
        </p>
      ) : null}
      <div className="tph-act">
        {join}
        <div className="tph-terms">{terms}</div>
      </div>
    </>
  );
}
