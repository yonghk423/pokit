"""Store source-based calendar edits and their generation provenance."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
item = json.loads(sys.argv[1])
dest = root / 'output/calendar-source-edits-v5'
dest.mkdir(parents=True, exist_ok=True)
out = dest / (item['themeId'] + '.webp')
with Image.open(item['generatedSource']) as im:
    im.convert('RGB').save(out, 'WEBP', quality=88, method=6)
    item['size'] = list(im.size)
item['path'] = str(out.relative_to(root))
item['bytes'] = out.stat().st_size
item['sha256'] = hashlib.sha256(out.read_bytes()).hexdigest()
item['status'] = 'pending-visual-review-and-layout'
(dest / (item['themeId'] + '.json')).write_text(json.dumps(item, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'themeId': item['themeId'], 'bytes': item['bytes']}))
