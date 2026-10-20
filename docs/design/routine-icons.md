# Routine illustrations — 100-icon collection

The shared routine appearance picker offers 100 original monochrome ink illustrations. The first ten cover exercise, reading, water, meal, sleep, medicine, work, cleaning, music and journal; 90 more cover exercise, health, study, food, home, tools, rest, creativity, travel, nature and relationships. The complete expansion list and source provenance are in `routine-icon-expansion.json`.

- Stable stored IDs: `routine:` IDs (keep all existing IDs unchanged).
- Metadata and multilingual search: `src/shared/lib/routineIllustrationCatalog.ts`.
- Explicit Metro asset registry: `src/shared/ui/icon-symbol/routineIllustrationSources.ts`.
- Runtime assets: `assets/routine-icons/*.webp`, logical 32px at 1x/2x/3x density, lossless RGBA.
- `IconSymbol` renders registered IDs as original-color images. Do not tint the illustration: white object surfaces are part of the drawing. The existing accent color remains the chip/background color.
- Existing SF Symbol IDs remain readable and retain their appearance until the user selects a replacement. The picker no longer offers SF Symbols. App navigation and control symbols retain their normal renderer.
- The new routine default is `routine:journal`. Shared create/edit/inline settings persist the same `icon` field as before; no storage migration is needed.

To expand the collection, add metadata, density assets, and one static registry entry per icon. Keep existing IDs stable.

Generation direction: standalone centered everyday object, black/white hand-ink manga stationery illustration, strong outer contours, sparse hatching, simplified for 24–32px readability, transparent background, no lettering or people. Reference: the existing closed-book header illustration.

The picker opens on All, keeps the original ten in Recommended, and reveals additional rows as the user scrolls. Search matches Korean, English and Japanese labels. Pagination resets in the filter event so a previous load timer cannot leak into a different filter.

SwiftUI widgets use semantic system-symbol equivalents via `routineWidgetSymbol.ts`, because their current renderer accepts SF Symbol names. App screens retain the original illustrations.

Review sheet: `outputs/routine-icons-100-preview.webp`. Validation: `python3 scripts/verify-routine-illustrations.py`.

2026-10-19: Added `routine:abstain` (101 icons). Active preset defaults now use planning, medicine, abstain, stretching, running and weight illustrations. Old stored system symbols on builtins resolve to these defaults in both lists and appearance settings. User-selected illustration IDs remain editable.
