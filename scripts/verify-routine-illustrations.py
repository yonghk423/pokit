"""Validate routine illustration density assets and build a review contact sheet."""
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
metadata = (root / 'src/shared/lib/routineIllustrationCatalog.ts').read_text()
ids = re.findall(r"id: 'routine:([^']+)'", metadata)
registry = (root / 'src/shared/ui/icon-symbol/routineIllustrationSources.ts').read_text()
registered = re.findall(r"'routine:([^']+)': require", registry)
assert len(ids) == len(set(ids)) == 101, f'Expected 101 unique IDs, got {len(ids)}'
assert set(ids) == set(registered), 'Registry and metadata differ'
assets = root / 'assets/routine-icons'
expected = set()
for name in ids:
    for scale in (1, 2, 3):
        suffix = '' if scale == 1 else f'@{scale}x'
        filename = f'{name}{suffix}.webp'
        expected.add(filename)
        image = Image.open(assets / filename).convert('RGBA')
        assert image.size == (32 * scale, 32 * scale), filename
        assert image.getchannel('A').getextrema() == (0, 255), filename
assert {p.name for p in assets.glob('*.webp')} == expected, 'Missing or unused assets'
# Compare decoded pixels to catch duplicate exports accidentally assigned two IDs.
pixels = [Image.open(assets / f'{name}@3x.webp').convert('RGBA').tobytes() for name in ids]
assert len(set(pixels)) == 101, 'Duplicate image pixels'

labels = {e['id']: e['labels']['ko'] for e in json.loads((root / 'docs/design/routine-icon-expansion.json').read_text())}
labels.update(zip(ids[:10], ['운동', '독서', '물 마시기', '식사', '수면', '약·영양제', '업무', '청소', '음악', '기록']))
font = ImageFont.truetype('/System/Library/Fonts/AppleSDGothicNeo.ttc', 15)
canvas = Image.new('RGB', (1200, 1430), '#FEFEFF')
draw = ImageDraw.Draw(canvas)
for index, name in enumerate(ids):
    x, y = (index % 10) * 120, (index // 10) * 130
    image = Image.open(assets / f'{name}@3x.webp').convert('RGBA')
    canvas.paste(image, (x + 12, y + 4), image)
    draw.text((x + 60, y + 108), labels[name], font=font, fill='#222222', anchor='mt')
canvas.save(root / 'outputs/routine-icons-101-preview.webp', 'WEBP', lossless=True, method=6)
print(json.dumps({'icons': len(ids), 'density_files': len(expected), 'asset_bytes': sum(p.stat().st_size for p in assets.glob('*.webp'))}))
