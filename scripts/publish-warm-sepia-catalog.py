"""Upload 02–100 only, then read back and hash-verify the complete 100-file pack."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'output/warm-sepia-open-panel-v2-100-upload'
CLI = '/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
PREFIX = 'calendar-themes/warm-sepia-open-panel/20261112-v2/'
REMOTE = 'ss:///character-illustrations/' + PREFIX
manifest = json.loads((PACK / 'manifest.json').read_text())
assert manifest['imageCount'] == len(manifest['files']) == 100
assert manifest['storagePrefix'] == PREFIX
readback = PACK / 'remote-readback'
readback.mkdir(exist_ok=True)
report_path = PACK / 'supabase-verification.json'
report = {'project': 'wvvtyaxsedpqiscogrwk', 'bucket': 'character-illustrations',
          'prefix': PREFIX, 'status': 'uploading', 'preserveExisting01': True, 'files': []}
env = dict(os.environ, SUPABASE_DISABLE_TELEMETRY='1')

def cli(*args):
    for attempt in range(3):
        result = subprocess.run([CLI, 'storage', *args, '--remote=wvvtyaxsedpqiscogrwk',
                                 '--experimental', '--yes'], cwd=ROOT, env=env,
                                capture_output=True, text=True, timeout=180)
        if result.returncode == 0 and '"_tag":"Error"' not in result.stdout:
            return
        if attempt == 2:
            raise RuntimeError((result.stderr + result.stdout)[-900:])
        time.sleep(2 ** attempt)

def save():
    temp = report_path.with_suffix('.tmp')
    temp.write_text(json.dumps(report, indent=2) + '\n')
    temp.replace(report_path)

def publish(item, upload=True):
    name = Path(item['webpFile']).name
    assert name.endswith('.webp') and '/' not in name
    source = PACK / item['webpFile']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == item['webpSha256']
    if upload:
        cli('cp', str(source), REMOTE + name, '--content-type', 'image/webp', '--cache-control', 'max-age=60')
    target = readback / name
    if target.exists():
        target.unlink()
    cli('cp', REMOTE + name, str(target))
    actual = hashlib.sha256(target.read_bytes()).hexdigest()
    assert actual == item['webpSha256'], 'Remote hash mismatch: ' + name
    return {'file': name, 'sha256': actual, 'bytes': target.stat().st_size,
            'status': 'uploaded-and-readback-verified' if upload else 'existing-01-preserved-and-readback-verified'}

# Verify the published 01 before writing any new objects; never overwrite it.
report['files'].append(publish(manifest['files'][0], upload=False))
save()
print('1/100 verified existing 01 (preserved)', flush=True)
with ThreadPoolExecutor(max_workers=3) as pool:
    futures = {pool.submit(publish, item): item for item in manifest['files'][1:]}
    for future in as_completed(futures):
        report['files'].append(future.result())
        save()
        print(f"{len(report['files'])}/100 verified {report['files'][-1]['file']}", flush=True)
report['files'].sort(key=lambda item: int(item['file'].split('-')[0]))
report['status'] = 'verified'
report['verifiedAt'] = datetime.now(timezone.utc).isoformat()
save()
manifest['status'] = 'coordinate-and-upload-readback-verified'
manifest['uploadedAt'] = report['verifiedAt']
(PACK / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('All 100 verified; uploaded 99 new objects; preserved existing 01.', flush=True)
