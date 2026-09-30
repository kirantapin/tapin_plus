/**
 * WHEN A FREE TRY IS BELIEVABLE (docs/POLISH-2026-09-21.md §57). Sam, 25 Sep
 * 2026: "during normal hours like 10am and 7pm EST, show 'try it once'
 * notifications for coffeeholics (every day), and after 9pm EST
 * (thurs,friday,sat) you can show the try it once at the burg."
 *
 * Blacksburg time. A place with no hours here never shows a try.
 *
 * The Burg moved off its nights on 30 Sep 2026 (Sam: "add that", after the
 * Virginia compliance check): the credit keeps to food and soft drinks from
 * 9 p.m. to 2 a.m. (docs/CREDIT-HOURS-2026-09-30.md), so a "tried it for
 * free" card at a bar in that window advertised the one thing the credit
 * does not do then. Its tries now sit in the evening before 9, the hours
 * where a drink discount is lawful. The days are still Sam's: Thursday,
 * Friday, Saturday.
 */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Day (0 = Sunday) and hour (0–23) in Blacksburg at an instant. */
export const blacksburgClock = (ms: number): { day: number; hour: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const day = WEEKDAYS.indexOf(parts.find((p) => p.type === "weekday")?.value ?? "");
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  return { day, hour };
};

const TRY_HOURS: Record<string, (day: number, hour: number) => boolean> = {
  /* Every day, 10am to 7pm. */
  coffeeholicsva: (_day, hour) => hour >= 10 && hour < 19,
  /* Thursday, Friday and Saturday, 5pm to 9pm: before the credit's quiet
     hours begin (BENEFIT.creditQuietFrom). */
  theburg: (day, hour) => hour >= 17 && hour < 21 && (day === 4 || day === 5 || day === 6),
};

/** Whether a try at this place fits the moment `at` (epoch ms). */
export const tryable = (venueId: string, at: number): boolean => {
  const rule = TRY_HOURS[venueId];
  if (!rule) return false;
  const { day, hour } = blacksburgClock(at);
  return rule(day, hour);
};
