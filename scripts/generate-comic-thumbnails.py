#!/usr/bin/env python3
"""Rebuild comic thumbnails and Metro's static asset map. Requires Pillow."""
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets/activity-illustrations'
OUTPUT = ASSETS / 'optimized'
OUTPUT.mkdir(exist_ok=True)
activity = json.loads((ASSETS / 'manifest.json').read_text())
comic = json.loads((ASSETS / 'comic-day/manifest.json').read_text())['scenes']
items = [(item['id'], ASSETS / item['file']) for item in activity]
items += [(key, ASSETS / 'comic-day' / item['file']) for key, item in zip(['wake', 'breakfast', 'focus', 'walk', 'read'], comic)]
for key, source in items:
    for size in [480, 960]:
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original).convert('RGB')
            image.thumbnail((size, size), Image.Resampling.LANCZOS)
            image.save(OUTPUT / f'{key}-{size}.webp', 'WEBP', quality=80, method=6)
rows = ''.join(f"  '{key}': {{ small: require('../../../../assets/activity-illustrations/optimized/{key}-480.webp'), large: require('../../../../assets/activity-illustrations/optimized/{key}-960.webp') }},\n" for key, _ in items)
(ROOT / 'src/pages/day-plan/lib/comicSceneThumbnails.ts').write_text('/** Generated display-sized assets; original artwork remains intact. */\nexport const COMIC_SCENE_THUMBNAILS = {\n' + rows + '} as const;\n')
print(f'Generated two sizes for {len(items)} scenes.')
