import { percentFootnote } from "../model/content";

/** The 15%'s footnote, answering the asterisk in "off everything*" (POLISH
 *  §72). The host's class places it; figures.css draws it. */
export default function PercentFootnote({ className }: { className?: string }) {
  return <p className={`fine-print${className ? ` ${className}` : ""}`}>{percentFootnote}</p>;
}
