import { Fragment, type ReactNode } from "react";

/* ══ THE MAIN PAGE'S HEADER, THREE TAKES ON THE ORIGINAL (Sam, 16 Nov 2026:
   "I liked the original more to be honest - can we make 3 /impeccable
   redesigns based on the original"). The original's world stays: the
   collage full-bleed, the words on it, left. What changes is how the parts
   under the headline are set. Preview with ?headv=d|e|f; with none the
   header is as shipped (#392). (A · Tray, B · Split and C · Cut paper,
   #393, went: Sam preferred the original.)
   D · Lockup: the +$25 as a big green figure with its words beside it; the
     places as one line of type, each name led by its logo.
   E · Shelf: the headline and the +$25 on the photo; one smoked glass
     shelf at the foot holds the places, Join, the price and the refund.
   F · Pinned: the five logos pinned on the photo as large rimmed marks
     with their names (on a computer, across the right; on a phone, above
     the headline). */
export type HeadV = "d" | "e" | "f";

export const headVersion = (): HeadV | null => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("headv");
  return v === "d" || v === "e" || v === "f" ? v : null;
};

export interface HeadPlace {
  id: string;
  name: string;
  logo: string;
}

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
  const list = (
    <ul className="tph-places" aria-label={`The ${places.length} Plus spots`}>
      {places.map((p) => (
        <li key={p.id}>
          <span className="tph-logo">
            <img src={p.logo} alt="" decoding="async" />
          </span>
          <span className="tph-name">{p.name}</span>
        </li>
      ))}
    </ul>
  );
  const sentence = (
    <p className="tph-names" aria-hidden="true">
      {places.map((p, i) => (
        <Fragment key={p.id}>
          <span>{p.name}</span>
          {i < places.length - 2 ? ", " : i === places.length - 2 ? " and " : ""}
        </Fragment>
      ))}
    </p>
  );
  const plus = (
    <p className="tph-plus">
      <b className="tnum">+${total}</b>{" "}
      <span>added to your account to spend every&nbsp;month</span>
    </p>
  );
  const act = (
    <div className="tph-act">
      {join}
      <div className="tph-terms">{terms}</div>
    </div>
  );
  if (v === "e")
    return (
      <>
        <h1 className="tph-h1">{h1}</h1>
        {plus}
        <div className="tph-shelf">
          {list}
          {act}
        </div>
      </>
    );
  if (v === "f")
    return (
      <>
        <div className="tph-pins">
          {list}
          {sentence}
        </div>
        <h1 className="tph-h1">{h1}</h1>
        {plus}
        {act}
      </>
    );
  return (
    <>
      <h1 className="tph-h1">{h1}</h1>
      {plus}
      {list}
      {act}
    </>
  );
}
