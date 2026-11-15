"""Append Everyday Cinema themes 11–100 to the verified v2 Supabase pack."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import subprocess
import threading

ROOT = Path(__file__).resolve().parents[1]
CLI = '/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
SOURCE = ROOT / 'output/everyday-cinema-20261112-v3'
BACKUP = ROOT / 'output/everyday-cinema-20261112-v3-old-revision'
REPORT = ROOT / 'output/everyday-cinema-20261112-v3/storage-verification.json'
FLAGS = ['--remote=wvvtyaxsedpqiscogrwk', '--experimental', '--yes']
lock = threading.Lock()
hash_file = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
files = sorted((p for p in SOURCE.glob('*.webp') if int(p.stem.split('-', 1)[0]) >= 11),
               key=lambda p: int(p.stem.split('-', 1)[0]))
assert len(files) == 90, f'Expected 90 new images, found {len(files)}'
items = [{'file': file.name, 'storagePath': f'calendar-themes/everyday-cinema/20261112-v2/{file.name}',
          'bytes': file.stat().st_size, 'sha256': hash_file(file), 'status': 'pending'} for file in files]
report = {'bucket': 'character-illustrations', 'revision': '20261112-v2', 'imageCount': len(items),
          'totalBytes': sum(item['bytes'] for item in items), 'status': 'uploading', 'files': items}

def save():
    REPORT.write_text(json.dumps(report, indent=2) + '\n')

def upload(item):
    remote = 'ss:///character-illustrations/' + item['storagePath']
    removed = subprocess.run([CLI, 'storage', 'rm', remote, *FLAGS],
                             cwd=ROOT, capture_output=True, text=True, timeout=120)
    result = subprocess.run([CLI, 'storage', 'cp', str(SOURCE / item['file']), remote,
                             '--content-type', 'image/webp', '--cache-control', 'max-age=60', *FLAGS],
                            cwd=ROOT, capture_output=True, text=True, timeout=120) if removed.returncode == 0 else removed
    if result.returncode:
        item['status'] = 'failed'
        item['error'] = (result.stderr + result.stdout)[-1200:]
        prior = subprocess.run([CLI, 'storage', 'cp', str(BACKUP / item['file']), remote,
                                '--content-type', 'image/webp', '--cache-control', 'max-age=60', *FLAGS],
                               cwd=ROOT, capture_output=True, text=True, timeout=120)
        if prior.returncode == 0: item['status'] = 'restored-after-error'
        else: item['error'] += '\nRollback: ' + (prior.stderr + prior.stdout)[-800:]
    else:
        item['status'] = 'replaced'
    with lock:
        save()
        print(f"{sum(x['status'] != 'pending' for x in items)}/90 {item['file']}: {item['status']}", flush=True)

save()
with ThreadPoolExecutor(max_workers=4) as pool:
    futures = [pool.submit(upload, item) for item in items]
    for future in as_completed(futures):
        future.result()
report['status'] = 'uploaded-awaiting-readback' if all(item['status'] == 'replaced' for item in items) else 'partial-error'
report['uploadedAt'] = datetime.now(timezone.utc).isoformat()
save()
print(report['status'], flush=True)
if report['status'] != 'uploaded-awaiting-readback':
    raise SystemExit(1)
