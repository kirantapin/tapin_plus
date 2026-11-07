import { createContext } from "react";

/* ══ "IT'S ON ITS WAY" (Sam, 7 Nov 2026: "lets do A on its way for after they
   pay") ══════════════════════════════════════════════════════════════════════
   The checkout's done step lives in the gift preview's panel (GiftPreview's
   `next`), and the moment is told on both sides: the preview seals the
   envelope and sends it off, and the panel's first moment ("We texted …")
   ticks as it leaves. The checkout tells the preview through this, so the
   parents page that wires the two together needs no change. */
export type GiftSent = {
  /** The student's first name, as the done step says it. */
  who: string;
  /** Whether a gift text went out (an ask link without a note or a photo
   *  sends none: docs/parents/API.md, step 4). Nothing flies when it didn't. */
  texted: boolean;
};

export type GiftSentHost = {
  /** The checkout has gone through. Returns how long until the envelope
   *  leaves, in ms, which is when the panel's first moment fills in (0: at
   *  once, as with reduced motion). */
  sent: (s: GiftSent) => number;
};

export const GiftSentContext = createContext<GiftSentHost | null>(null);
