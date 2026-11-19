# Existing paid accessory detail restoration v6

Scope: 32 existing small-format diary designs and the p7-01 720×960 scene. Use each production original as its sole image edit reference. Preserve silhouette, proportions, theme, palette, motifs and empty regions; reconstruct fine fabric, paper, embroidery, satin and illustration details with image_gen. Do not treat interpolated enlargement as new detail.

Keep original production snapshots under `output/paid-image-audit-20261119/remote/`. Generated masters are retained under `output/paid-item-restoration-v6/masters/`. Record source provenance, export dimensions and hashes before replacing server files. Export main assets with a 2048px long edge as WebP quality 95, alpha quality 100. Photo border masters retain their open alpha aperture; extract all eight proportional border regions at the higher pixel density using the original 400×500 layout. Keep app geometry unchanged.

Review all 33 before/after comparisons, inspect transparent centers and every border corner, then back up/replace the 81 canonical storage objects (32 main accessories, 48 frame parts, one scene). Verify readbacks using SHA256. Only after remote verification update client cache revisions and refresh 240px/180px WebP store derivatives. Do not bundle paid full-resolution originals.

## Applied result (2026-11-19)

- Reconstructed 32 accessories and one scene individually using image_gen with each original as its reference. These are detail reconstructions; final WebP dimensions do not imply native 2048px generation. Native master sizes are recorded separately in manifest.json. The scene master is 1086×1448; its final original-aspect WebP is 1536×2048.
- All 81 canonical production objects were replaced through the authenticated Supabase dashboard. Fresh folder ZIP readbacks matched every SHA-256; see supabase-verification.json. Backups and hashes are retained in output/paid-item-restoration-v6/backups and backups.json. Three initially stale readbacks were replaced again and reverified.
- Main originals have a 2048px long edge. Eight parts for each of six frames preserve the existing 400×500 extraction proportions. High-resolution files remain download-only.
- The 33 dedicated WebP store previews total 249,156 bytes; largest 18,444 bytes. Accessory bounds are 240×300, scene width 180.
- Released client cache revision v6-release. Old saved scene URIs are rebased to the current app directory; scene downloads are validated before replacing the canonical file. A failed restoration offers retry and never renders the store thumbnail fallback. Cached frames validate all nine files and recover missing edges.
- TypeScript and focused download/cache/scene regression suites are the validation scope. The broader existing HeroSceneImage suite has older layout/preview-wait assumptions and was already failing during this work; it is not reported as passing. Device appearance was not revalidated in the simulator for this restoration.

Focused Jest result: 5 suites / 25 tests passed, including missing frame-edge recovery and restoration failure without thumbnail fallback.
