# The storefront merchant page — parked, 15 Sep 2026

The `/app/place/:venueId` rebuild of 14 Sep 2026 ("it should look basically like a modified
version of the real merchant pages": brand-coloured page, 208px hero, round mark, OPEN pill, chip
row, highlight slider, My Spot cells, menu as cards). Sam, 15 Sep: "the individual merchant page
previews look really rough — we'll need to revert changes you made there." Reverted to the page
as it stood before that pass; these are the storefront files, kept so nothing has to be rebuilt
from memory if the direction returns. Not imported by anything.

- `AppPlace.tsx` — the storefront component (with the one-benefit ticket of 15 Sep)
- `app.css` — the whole stylesheet as it was with THE STOREFRONT block at its end
- `brandTheme.ts` — WCAG-luminance pick of "brand" vs "light" mode from `venue.brandColor` (a reconstruction: the original went with the revert before it was archived)
