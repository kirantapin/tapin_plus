import { createContext, useContext, useEffect, useRef } from "react";
import type { ResumeStep } from "../model/checkoutResume";

/* ══ "WE KEPT YOUR CARE PACKAGE FROM EARLIER" (Sam, 7 Nov 2026) ════════════
   The builder (routes/GiftPage.tsx GiftPreview) opened again on a save from
   earlier (model/checkoutResume.ts): one quiet line under the head's own
   line, on the step it came back to, with "Start over" beside it. It goes
   once they move on. The builder's stages and the checkout's steps
   (shell/ParentCheckout.tsx) each put one in their head; the builder says
   which step it came back to, and the checkout tells it where it is, so the
   save follows the step. */
export type Resume = {
  /** The step it came back to. */
  at: ResumeStep | null;
  /** The line is showing (until they move on, or start over). */
  on: boolean;
  startOver: () => void;
  /** They've moved on from `at`: the line goes. */
  left: () => void;
  /** The checkout's step, as it changes (the builder keeps it). */
  report: (step: ResumeStep) => void;
};
export const ResumeContext = createContext<Resume | null>(null);

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function ResumeLine({ step }: { step: string }) {
  const r = useContext(ResumeContext);
  const show = !!r?.on && r.at === step;
  useEffect(() => {
    if (r?.on && r.at !== step) r.left();
  }, [r, step]);
  const line = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => {
    if (!show || still()) return;
    const a = line.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 120, easing: "ease-out", fill: "backwards" });
    return () => a?.cancel();
  }, [show]);
  if (!show || !r) return null;
  return (
    <p ref={line} className="gft-pp-kept" role="status">
      <span>We kept your care package from earlier.</span>{" "}
      <button type="button" onClick={r.startOver}>
        Start over
      </button>
    </p>
  );
}
