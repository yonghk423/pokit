"""Replace only the 50 approved calendar backgrounds, retaining local rollback files."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import subprocess
import threading

ROOT = Path(__file__).resolve().parent.parent
CLI = '/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
SOURCE = ROOT / 'assets/calendar-illustrations/upload-candidate-v8'
BACKUP = ROOT / 'output/calendar-v6-server-verification-20261110'
REPORT = ROOT / 'docs/ops/calendar-v8-upload-manifest.json'
FLAGS = ['--remote=wvvtyaxsedpqiscogrwk', '--experimental', '--yes']
lock = threading.Lock()
hash_file = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
files = sorted(SOURCE.glob('*/background.webp'))
assert len(files) == 50
assert len(list(BACKUP.glob('*/background.webp'))) == 50
items = []
for file in files:
    previous = BACKUP / file.parent.name / file.name
    assert file.stat().st_size > 0 and previous.stat().st_size > 0
    items.append({'themeId': file.parent.name, 'localPath': str(file.relative_to(ROOT)),
                  'storagePath': f'calendar-themes/city-animation/{file.parent.name}/background.webp',
                  'bytes': file.stat().st_size, 'sha256': hash_file(file),
                  'previousSha256': hash_file(previous), 'status': 'pending'})
report = {'bucket': 'character-illustrations', 'revision': 'upload-candidate-v8',
          'backgroundCount': 50, 'totalBytes': sum(x['bytes'] for x in items),
          'backup': str(BACKUP.relative_to(ROOT)), 'status': 'uploading', 'files': items}
def save():
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2))
save()

def run(args):
    result = subprocess.run([CLI, 'storage', *args, *FLAGS], cwd=ROOT, capture_output=True, text=True, timeout=120)
    if result.returncode:
        raise RuntimeError((result.stderr + result.stdout)[-1500:])

def replace(item):
    remote = 'ss:///character-illustrations/' + item['storagePath']
    run(['rm', remote])
    error = None
    for _ in range(3):
        try:
            run(['cp', str(ROOT / item['localPath']), remote, '--content-type', 'image/webp', '--cache-control', 'max-age=60'])
            error = None
            break
        except Exception as exc:
            error = str(exc)
    if error:
        try:
            run(['cp', str(BACKUP / item['themeId'] / 'background.webp'), remote, '--content-type', 'image/webp'])
            item['status'] = 'restored-after-error'
        except Exception as exc:
            item['status'] = 'failed'; error += '\nRestore: ' + str(exc)
        item['error'] = error
    else:
        item['status'] = 'uploaded'
    with lock:
        save()
        done = sum(x['status'] != 'pending' for x in items)
        print(f"{done}/50 {item['themeId']}: {item['status']}", flush=True)

with ThreadPoolExecutor(max_workers=4) as pool:
    jobs = {pool.submit(replace, item): item for item in items}
    for job in as_completed(jobs):
        try:
            job.result()
        except Exception as exc:
            item = jobs[job]; item.update(status='failed', error=str(exc))
            with lock:
                save()
                print(f"FAILED {item['themeId']}: {exc}", flush=True)
report['status'] = 'uploaded-awaiting-download-verification' if all(x['status'] == 'uploaded' for x in items) else 'partial-error'
report['uploadedAt'] = datetime.now(timezone.utc).isoformat()
save()
print(report['status'], flush=True)
if report['status'] == 'partial-error':
    raise SystemExit(1)
