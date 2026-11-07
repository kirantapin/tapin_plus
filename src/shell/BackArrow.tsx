/* Back a step (Sam, 6 Nov 2026: "after I continue past the first page, I
   think we should show a back arrow next to the 'continue' button at the
   bottom. It'd be its own container with the same corner radius"): the
   arrow beside Continue in the care package builder (routes/GiftPage.tsx)
   and in the checkout's steps inside it (shell/ParentCheckout.tsx). Each
   place styles it to its own Continue's corners and height. */
export function BackArrow({ className, onClick, disabled }: { className: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={className} aria-label="Back" onClick={onClick} disabled={disabled}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <path d="M19 12H6M11 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
