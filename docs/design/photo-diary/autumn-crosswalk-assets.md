# Autumn crosswalk calendar

The approved generated composition is the reference, rather than the original commute illustration. Artwork and interactive date slots use a 1122 × 1402 design space. On tall devices the pavement section extends independently; the character, paper sprites, and diary photos retain their proportions. Dates remain real Pressables and diary images come from the existing library.

Assets: `assets/calendar-illustrations/autumn-crosswalk/` (271,594 bytes total, WebP).

Generated background prompt: Preserve the approved 1122 × 1402 framing and woman placement. Remove all typography, arrows, weekday labels, date slips, polaroids, clips, and bottom navigation, inpainting continuous sky and pavement. Preserve the illustration and lighting.

Generated paper prompt: Isolate one blank ivory date slip in oblique pavement perspective, textured fibers, deckled edges, curled corner and soft ground shadow. No text, photo or leaf. Transparent background.

Generated leaf prompt: Isolate the golden autumn leaf and thin silver paperclip decorating a polaroid. Painterly material matching the reference. No paper, photo or text. Transparent background.

Background source: exec-2513deac-c719-481f-95c2-2943d780f89a.png
Paper source: exec-fa358ab1-eceb-43c3-8b44-226aecd99283.png
Leaf source: exec-fc3d7c86-feda-4303-94e0-2997a7cd855b.png

Published to Supabase bucket `character-illustrations`, prefix `calendar-themes/city-animation/walking-with-the-wind-v1/`.
The private storage objects are downloaded using the authenticated `calendar-theme` function (signed URLs valid for one hour). The app stores the three images in Documents/calendar-themes/city-animation/walking-with-the-wind-v1 and reuses them offline. No calendar artwork is required from the app bundle.
Current full portrait background source: exec-f291339f-8483-4b3c-8ce7-58fe626f3ed2.png. The entire illustration renders as one image; it must not be split or stretched in separate sections.
All three uploaded files were downloaded again and their SHA-256 hashes matched the local assets.
