"""Read back every newly uploaded Everyday Cinema asset and compare SHA-256."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import hashlib
import json
import subprocess
import threading

ROOT = Path(__file__).resolve().parents[1]
CLI = '/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
PACK = ROOT / 'output/everyday-cinema-20261112-v3'
REPORT = PACK / 'storage-verification.json'
READBACK = PACK / 'readback'
FLAGS = ['--remote=wvvtyaxsedpqiscogrwk', '--experimental', '--yes']
data = json.loads(REPORT.read_text())
items = data['files']
READBACK.mkdir(exist_ok=True)
lock = threading.Lock()

def verify(item):
    dest = READBACK / item['file']
    remote = 'ss:///character-illustrations/' + item['storagePath']
    result = subprocess.run([CLI, 'storage', 'cp', remote, str(dest), *FLAGS],
                            cwd=ROOT, capture_output=True, text=True, timeout=120)
    if result.returncode:
        item['readbackStatus'] = 'failed'
        item['readbackError'] = (result.stderr + result.stdout)[-1200:]
    else:
        digest = hashlib.sha256(dest.read_bytes()).hexdigest()
        item['readbackSha256'] = digest
        item['readbackStatus'] = 'verified' if digest == item['sha256'] else 'mismatch'
    with lock:
        REPORT.write_text(json.dumps(data, indent=2) + '\n')
        print(f"{sum(x.get('readbackStatus') in {'verified','failed','mismatch'} for x in items)}/90 {item['file']}: {item['readbackStatus']}", flush=True)

with ThreadPoolExecutor(max_workers=4) as pool:
    futures = [pool.submit(verify, item) for item in items]
    for future in as_completed(futures):
        future.result()
data['status'] = 'verified' if all(x.get('readbackStatus') == 'verified' for x in items) else 'readback-error'
REPORT.write_text(json.dumps(data, indent=2) + '\n')
print(data['status'], flush=True)
if data['status'] != 'verified':
    raise SystemExit(1)
