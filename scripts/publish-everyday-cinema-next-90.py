"""Publish the approved remaining 90; read back and verify all 100 pack files."""
import hashlib
import json
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'output/everyday-cinema-next-90/final'
FIRST = ROOT / 'output/everyday-cinema-fixed-layout'
CLI = '/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
FLAGS = ['--remote=wvvtyaxsedpqiscogrwk', '--experimental', '--yes']
REMOTE = 'ss:///character-illustrations/calendar-themes/everyday-cinema/20261112-v2/'
REPORT = PACK / 'supabase-verification.json'
READBACK = PACK / 'remote-readback'
READBACK.mkdir(exist_ok=True)
items = [(x, FIRST, False) for x in json.loads((FIRST / 'manifest.json').read_text())['files']]
items += [(x, PACK, True) for x in json.loads((PACK / 'manifest.json').read_text())['assets']]
assert len(items) == 100
report = {'project': 'wvvtyaxsedpqiscogrwk', 'bucket': 'character-illustrations', 'files': []}
lock = threading.Lock()

def run(args):
    result = subprocess.run([CLI, 'storage', *args, *FLAGS], cwd=ROOT, capture_output=True, text=True, timeout=180)
    if result.returncode or '"_tag":"Error"' in result.stdout:
        raise RuntimeError((result.stderr + result.stdout)[-1500:])

def publish(entry):
    item, folder, upload = entry
    local = folder / item['webpFile']
    expected = item['webpSha256']
    assert hashlib.sha256(local.read_bytes()).hexdigest() == expected
    if upload:
        run(['cp', str(local), REMOTE + local.name, '--content-type', 'image/webp', '--cache-control', 'max-age=60'])
    dest = READBACK / local.name
    if dest.exists():
        dest.unlink()
    run(['cp', REMOTE + local.name, str(dest)])
    actual = hashlib.sha256(dest.read_bytes()).hexdigest()
    if actual != expected:
        raise RuntimeError('Remote integrity mismatch: ' + local.name)
    with lock:
        report['files'].append({'file': local.name, 'bytes': local.stat().st_size, 'sha256': actual, 'uploaded': upload, 'readback': 'verified'})
        REPORT.write_text(json.dumps(report, indent=2) + '\n')
        print(f"{len(report['files'])}/100 verified {local.name}", flush=True)

with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(publish, items))
report.update(status='verified', count=len(report['files']), totalBytes=sum(x['bytes'] for x in report['files']))
REPORT.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'files'}), flush=True)
