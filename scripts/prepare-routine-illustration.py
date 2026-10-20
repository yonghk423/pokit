"""Optimize one generated routine illustration and record its source outside the bundle."""
import json
import sys
from pathlib import Path
from PIL import Image

name, source = sys.argv[1:]
root = Path(__file__).resolve().parents[1]
entries = json.loads((root / 'docs/design/routine-icon-expansion.json').read_text())
assert name in {entry['id'] for entry in entries}
image = Image.open(source).convert('RGBA')
assert image.getchannel('A').getextrema()[0] == 0, 'Missing transparency'
out = root / 'assets/routine-icons'
for scale in (1, 2, 3):
    resized = image.resize((32 * scale, 32 * scale), Image.Resampling.LANCZOS)
    suffix = '' if scale == 1 else f'@{scale}x'
    target = out / f'{name}{suffix}.webp'
    resized.save(target, 'WEBP', lossless=True, method=6, exact=True)
    assert Image.open(target).convert('RGBA').tobytes() == resized.tobytes()
# Each worker writes its own small provenance record, avoiding concurrent writes.
records = root / 'outputs/routine-icon-sources'
records.mkdir(exist_ok=True)
(records / f'{name}.json').write_text(json.dumps({'id': name, 'source': source}) + '\n')
print(name)
