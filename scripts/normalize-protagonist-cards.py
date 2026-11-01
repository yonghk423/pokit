#!/usr/bin/env python3
"""Export full-bleed 4:5 protagonist masters as app-ready card assets.

Generated masters live in outputs/protagonist-N-fullbleed and are never modified.
The export step only downsamples the exact 3:4 scene to 720x960; it does not crop,
letterbox, blur, or add padding. Original non-full-bleed concept panels remain in
outputs/protagonist-N.
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SIZE = (768, 960)

for number in (3, 4):
    master_dir = ROOT / 'outputs' / f'protagonist-{number}-fullbleed'
    card_dir = ROOT / 'outputs' / f'protagonist-{number}-card-sized'
    asset_dir = ROOT / 'assets' / 'activity-illustrations' / f'protagonist-{number}'
    card_dir.mkdir(parents=True, exist_ok=True)
    asset_dir.mkdir(parents=True, exist_ok=True)

    masters = sorted(path for path in master_dir.glob('*.png') if path.name != 'contact-sheet.png')
    if len(masters) != 10:
        raise SystemExit(f'Expected 10 full-bleed masters in {master_dir}, found {len(masters)}')

    for master in masters:
        with Image.open(master) as opened:
            image = ImageOps.exif_transpose(opened).convert('RGB')
            ratio = image.width / image.height
            if abs(ratio - 0.8) > 0.002:
                raise SystemExit(f'{master.name} is not 4:5 ({image.width}x{image.height})')
            card = image.resize(SIZE, Image.Resampling.LANCZOS)
        card.save(card_dir / master.name, format='PNG', optimize=True)
        card.save(asset_dir / f'p{number}-{master.stem}-960.webp', format='WEBP', quality=88, method=6)

    (card_dir / 'README.md').write_text(
        f'# Protagonist {number} — full-bleed card images\n\n'
        'Ten scenes composed edge-to-edge for the app card at 4:5. Each complete scene is proportionally downsampled to 768×960; no blurred sidebars, margins, or cropping are added. High-resolution generated masters are in the sibling `protagonist-'
        f'{number}-fullbleed` folder; the original concept panels remain in `protagonist-{number}`.\n', encoding='utf-8')
    print(f'Protagonist {number}: exported {len(masters)} full-bleed images to {SIZE[0]}x{SIZE[1]}')
