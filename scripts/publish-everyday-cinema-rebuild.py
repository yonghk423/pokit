"""Sequentially publish and read back the rebuilt Everyday Cinema WebP pack."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'output/everyday-cinema-rebuild/final-100'
WEBP = PACK / 'webp'
REPORT = PACK / 'supabase-verification.json'
READBACK = PACK / 'remote-readback'
CLI = '/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
FLAGS = ['--remote=wvvtyaxsedpqiscogrwk', '--experimental', '--yes']
REMOTE_ROOT = 'ss:///character-illustrations/calendar-themes/everyday-cinema/20261112-v2/'

manifest = json.loads((PACK / 'manifest.json').read_text())
items = []
for source in manifest['files']:
    file = source['webpFile'].split('/')[-1]
    items.append({'file': file, 'localPath': 'webp/' + file,
                  'storagePath': 'calendar-themes/everyday-cinema/20261112-v2/' + file,
                  'bytes': source['webpBytes'], 'sha256': source['webpSha256'],
                  'uploadStatus': 'pending', 'readbackStatus': 'pending'})
assert len(items) == 100 and len({item['file'] for item in items}) == 100
items.sort(key=lambda item: int(item['file'].split('-', 1)[0]))
report = {'bucket': 'character-illustrations', 'project': 'wvvtyaxsedpqiscogrwk',
          'revision': '20261112-v2-rebuild', 'imageCount': len(items),
          'totalBytes': sum(item['bytes'] for item in items), 'files': items,
          'status': 'uploading'}

def save():
    REPORT.write_text(json.dumps(report, indent=2) + '\n')

def run(command):
    return subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)

save()
for index, item in enumerate(items, 1):
    result = run([CLI, 'storage', 'cp', str(WEBP / item['file']), REMOTE_ROOT + item['file'],
                  '--content-type', 'image/webp', '--cache-control', 'max-age=60', *FLAGS])
    if result.returncode == 0:
        item['uploadStatus'] = 'uploaded'
    else:
        item['uploadStatus'] = 'failed'
        item['error'] = (result.stderr + result.stdout)[-1400:]
    if index % 10 == 0 or result.returncode:
        save()
        print(f'{index}/100 upload {item["file"]}: {item["uploadStatus"]}', flush=True)
    if result.returncode:
        time.sleep(.5)
    else:
        time.sleep(.12)

report['status'] = 'readback' if all(item['uploadStatus'] == 'uploaded' for item in items) else 'upload-error'
save()
if report['status'] == 'upload-error':
    raise SystemExit(1)

READBACK.mkdir(exist_ok=True)
for index, item in enumerate(items, 1):
    dest = READBACK / item['file']
    result = run([CLI, 'storage', 'cp', REMOTE_ROOT + item['file'], str(dest), *FLAGS])
    if result.returncode == 0 and dest.exists():
        actual = hashlib.sha256(dest.read_bytes()).hexdigest()
        item['readbackSha256'] = actual
        item['readbackStatus'] = 'verified' if actual == item['sha256'] else 'mismatch'
    else:
        item['readbackStatus'] = 'failed'
        item['readbackError'] = (result.stderr + result.stdout)[-1400:]
    if index % 10 == 0 or item['readbackStatus'] != 'verified':
        save()
        print(f'{index}/100 readback {item["file"]}: {item["readbackStatus"]}', flush=True)
    time.sleep(.12)

report['verifiedAt'] = datetime.now(timezone.utc).isoformat()
report['status'] = 'verified' if all(item['readbackStatus'] == 'verified' for item in items) else 'readback-error'
save()
print(f'{report["status"]}: {len(items)} files, {report["totalBytes"]} bytes', flush=True)
if report['status'] != 'verified':
    raise SystemExit(1)
