"""Add only the reviewed 02–100 PNGs to the existing Warm Sepia folder."""
from pathlib import Path
import hashlib
import json
import shutil

root = Path(__file__).resolve().parents[1]
review = root / 'output/warm-sepia-open-panel-v2-100-review'
destination = Path('/Users/yonghee/Documents/Codex/protagonist/x20/outputs/warm-sepia-open-panel')
manifest = json.loads((review / 'manifest.json').read_text())
verification = json.loads((review / 'verification.json').read_text())
visual = json.loads((review / 'visual-review.json').read_text())
assert len(manifest['files']) == 100
assert verification['images'] == 100 and verification['viewportChecks'] == 700
assert set(visual['reviewedNumbers']) == set(range(1, 101))
assert destination.is_dir() and not destination.is_symlink()
verified = {item['file']: item['sha256'] for item in verification['files']}
entries = []
for number, item in enumerate(manifest['files'], 1):
    source = review / item['file']
    assert source.parent == review and source.suffix == '.png'
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    assert digest == item['sha256'] == verified[item['file']]
    assert visual['sha256'][item['file']] == digest
    filename = source.stem + '-warm-sepia-open-panel.png'
    target = destination / filename
    if target.exists():
        assert target.is_file() and not target.is_symlink()
        assert hashlib.sha256(target.read_bytes()).hexdigest() == digest, filename
    else:
        assert number != 1, 'Published 01 must already exist'
        shutil.copy2(source, target)
    entries.append({**item, 'file': filename, 'visualReview': 'reviewed',
                    'publication': 'published-v2' if number == 1 else 'local-only'})
assert len(list(destination.glob('*-warm-sepia-open-panel.png'))) == 100
local_manifest = {**manifest, 'status': '100-local-verified;01-published;02-100-local-only', 'files': entries}
(destination / 'manifest.json').write_text(json.dumps(local_manifest, ensure_ascii=False, indent=2) + '\n')
(review / 'local-installation.json').write_text(json.dumps({
    'destination': str(destination), 'totalPngs': 100, 'addedPngs': 99,
    'published01Preserved': True, 'otherFoldersModified': False,
    'sha256Verified': 100,
}, indent=2) + '\n')
for name in ['verification.json', 'visual-review.json']:
    shutil.copy2(review / name, destination / name)
print('Installed 99 new PNGs; 100 total. Published 01 preserved; all hashes verified.')
