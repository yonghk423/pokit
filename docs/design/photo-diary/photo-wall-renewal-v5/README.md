# Photo wall renewal v5

The approved letter header is `output/photo-wall-renewal/wall-mail-elegant-v3.png`.
Each of the other ten themes must have its own construction, silhouette and mounting method. Repeating a pastel pill rail and an arched suspension cord with different ornaments was explicitly rejected and those drafts are excluded from the exports.

Shared art direction: restrained pastel palettes, delicate ceramic, paper, silk and muted champagne materials; refined miniature detail with negative space. Shared functional geometry: four photo columns, existing photograph sizes, row spacing and upload fit settings.

- Bunny: sewing shelf, porcelain buttons and periwinkle ribbon.
- Daisy: open botanical stems and flowers.
- Moon: celestial mobile arcs and short charm chains.
- Bakery: shallow patisserie canopy and supporting shelf.
- Berry: strawberry runner and fine wire trellis.
- Stamp: connected botanical postage-stamp tiles.
- Ribbon: draped couture silk and pearl pins.
- Shell: coral branch and mother-of-pearl ridge.
- Chick: folded stationery organizer and porcelain chick.
- Cat: curved cocoa branch and lounging porcelain cat.

`sources.json` records selected PNG masters and generation prompts. Masters are retained under `output/photo-wall-renewal/masters/`. `manifest.json` records WebP dimensions and hashes. Full-resolution assets remain served through the existing Pro-protected calendar-store endpoint; bundled store previews are 400px WebP derivatives. Client download cache v5 refreshes installed v3 headers.

Package with `node scripts/package-photo-wall-renewal.cjs`. Publish with `python3 scripts/publish-photo-wall-renewal.py`, which backs up all current objects before replacement and verifies downloaded bytes against the manifest. Inspect `review.png` on a light background before publishing. This is a photo-wall header change, not an illustration-calendar board change.

## Applied verification

On 2026-11-19 all 11 headers were replaced through the authenticated Supabase dashboard because the CLI session lacked an access token. A dashboard ZIP download of the 11 final canonical files was checked byte-for-byte using SHA256 against `manifest.json`; all matched. See `supabase-verification.json`. Earlier production readbacks were retained and checked against their original verification hashes under `output/photo-wall-renewal/server-backup/`. Initial duplicate uploads were moved into the server's `photo-walls/renewal-v5-staging/` folder, leaving the canonical 11 filenames in place.

The running iPhone 17 app's store gallery was visually checked and showed the renewed headers. A further individual diary-screen check was stopped because the user was actively changing the device UI; no claim is made that every applied theme was individually inspected on device. The selected-header PNG/WebP contact sheet was inspected on an ivory background. TypeScript check passed; cache refresh and layout tests passed (8 tests); focused lint had no errors, with existing test import-order warnings.
