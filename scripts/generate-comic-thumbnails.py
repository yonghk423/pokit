#!/usr/bin/env python3
"""Generate 960px artwork from external masters and rebuild the static asset map. Requires Pillow.

Full-resolution masters are no longer kept in the app bundle. Place external masters in
`outputs/activity-illustration-masters/` (same basenames as optimized `*-960.webp` keys) if you
need to regenerate assets from originals. Existing shipped files are not recompressed.
"""
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets/activity-illustrations'
OUTPUT = ASSETS / 'optimized'
OUTPUT.mkdir(exist_ok=True)
MASTERS = ROOT / 'outputs/activity-illustration-masters'
activity = json.loads((ASSETS / 'manifest.json').read_text())
keys = [item['id'] for item in activity] + ['wake', 'breakfast', 'focus', 'walk', 'read']

def resolve_source(key: str) -> Path:
    master = MASTERS / f'{key}.webp'
    if master.exists():
        return master
    shipped = OUTPUT / f'{key}-960.webp'
    if shipped.exists():
        return shipped
    raise FileNotFoundError(f'No master or 960px source for {key}')

for key in keys:
    source = resolve_source(key)
    if source == OUTPUT / f'{key}-960.webp':
        continue
    with Image.open(source) as original:
        base = ImageOps.exif_transpose(original).convert('RGB')
        for size in [960]:
            image = base.copy()
            image.thumbnail((size, size), Image.Resampling.LANCZOS)
            image.save(OUTPUT / f'{key}-{size}.webp', 'WEBP', quality=80, method=6)

rows = ''.join(
    f"  '{key}': require('../../../../assets/activity-illustrations/optimized/{key}-960.webp'),\n"
    for key in keys
)
rows += ''.join(
    f"  '{path.stem.removesuffix('-960')}': require('../../../../assets/activity-illustrations/puppy/{path.name}'),\n"
    for path in sorted((ASSETS / 'puppy').glob('*-960.webp'))
)
(ROOT / 'src/pages/day-plan/lib/heroSceneThumbnails.ts').write_text(
    "/** One 960px source for cards, galleries, and thumbnails. */\n"
    'export const COMIC_SCENE_THUMBNAILS = {\n' + rows + '} as const;\n'
)
print(f'Updated 960px assets for {len(keys)} scenes.')
