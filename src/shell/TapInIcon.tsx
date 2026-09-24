/**
 * The TapIn mark alone — the production icon (public/tapin_icon.svg), inlined
 * so it takes `currentColor` and sits in the PLUS badge's own ink whatever
 * the plate is (it was gold for an hour on 15 Sep 2026; it is maroon).
 */
export default function TapInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 84 85" aria-hidden="true" focusable="false">
      <path d="M69.3056 29.2633C77.3245 29.2633 83.8252 22.7125 83.8252 14.6317C83.8252 6.55082 77.3245 0 69.3056 0C61.2867 0 54.7861 6.55082 54.7861 14.6317C54.7861 22.7125 61.2867 29.2633 69.3056 29.2633Z" fill="currentColor" />
      <path d="M48.32 36.2534V11.9067H0V36.2534H48.32Z" fill="currentColor" />
      <path d="M48.32 60.6C34.9761 60.6 24.16 71.4997 24.16 84.9466H0V84.295C0.352701 57.8158 21.6323 36.4311 47.9673 36.2534H72.4212V84.9466H48.32V60.6Z" fill="currentColor" />
    </svg>
  );
}
