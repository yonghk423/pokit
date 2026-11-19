# Diary item quality upgrade

Scope: 22 clips, 14 cameras, 42 wastebasket states (78 files). 67 existing paid remote objects; 11 bundled free states.

- `inventory.json`: item IDs, original preview paths and Supabase object paths.
- `original-manifest.json`: backed-up source dimensions.
- `generated-*.json`: built-in image_gen prompt and master PNG provenance per asset.
- `manifest.json`: exported WebP sizes and SHA256 hashes.
- `supabase-verification.json`: hashes of uploaded files downloaded from Supabase.
- `review-*.png`: visual review contact sheets.

Originals and high-resolution exports are retained under `output/diary-item-quality-v2/`. Paid full-resolution images remain download-only; app previews and free items use bundled derivatives. Existing item IDs and entitlement checks are retained.

Generation uses built-in image_gen, transparent backgrounds, and one reference original per output. Fine material texture and relief are reconstructed; outputs must be visually compared with originals before publishing. Exports preserve the original canvas proportions and a maximum edge of 1536px. WebP quality 95, alpha quality 100.
