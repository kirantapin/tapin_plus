/* The refund, said one way on every page (Sam, 18 Nov 2026: "automatically
   refunded if they don't save what you pay", and in the FAQ "your bill is
   automatically refunded if they don't save what you spend every month. Must
   make at least one purchase a month"; "you can make that the case for all
   pages"; of the whole bill or the difference: "the difference"). A parent
   pays and their student saves; a student is both. */
export type RefundReader = "parent" | "student";

const saver = (reader: RefundReader) => (reader === "parent" ? "they" : "you");

export const REFUND_LEAD = "Difference automatically refunded";
/** Where one line has to fit: the phone dock, a checkout row. */
export const REFUND_SHORT = "Difference refunded";
export const REFUND_RULE = "Must make at least one purchase a month.";
/** The same rule, said to the one paying (Sam, 25 Nov 2026: a parent's
 *  refund needs their student to use Plus once that month). */
export const refundRule = (reader: RefundReader) =>
  reader === "parent" ? "Your student needs to make at least one purchase a month to qualify." : REFUND_RULE;

/** After the lead, for the line at the top of a page. */
export const refundIf = (reader: RefundReader) => ` if ${saver(reader)} don’t save what you pay`;

/** The FAQ's answer. */
export const refundAnswer = (reader: RefundReader) =>
  reader === "parent"
    ? `If your student doesn’t save what you pay in a month, the difference is automatically refunded. ${refundRule("parent")}`
    : `The difference is automatically refunded if you don’t save what you spend every month. ${REFUND_RULE}`;
