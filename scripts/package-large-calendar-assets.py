"""Encode approved generated backgrounds without resizing or changing composition."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / 'docs/design/photo-diary/calendar-large-board-generation.json'
DEST = Path('/Users/yonghee/Documents/Codex/yourday/calendar-illustrations/large-board-v3')

def main():
    plan = json.loads(PLAN.read_text())
    packaged = []
    for item in plan['results']:
        source = Path(item['source'])
        output = DEST / item['themeId'] / 'background.webp'
        output.parent.mkdir(parents=True, exist_ok=True)
        if not output.exists() or output.stat().st_mtime < source.stat().st_mtime:
            with Image.open(source) as im:
                im.convert('RGB').save(output, 'WEBP', quality=88, method=6)
        with Image.open(output) as im:
            width, height = im.size
        packaged.append({
            'themeId': item['themeId'], 'title': item['title'],
            'path': str(output.relative_to(ROOT)), 'width': width, 'height': height,
            'bytes': output.stat().st_size,
            'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
            'status': 'generated-pending-layout-calibration',
        })
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = {'revision': '20261110-large-board-v3', 'expectedThemes': 50,
                'dynamicContent': ['year', 'month', 'weekdays', 'dates', 'photos', 'events', 'controls'],
                'runtimeEnabled': False, 'themes': packaged}
    (DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'packaged': len(packaged), 'bytes': sum(x['bytes'] for x in packaged)}))

if __name__ == '__main__':
    main()
