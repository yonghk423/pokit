"""Publish the 11 renewed headers with current backups and readback verification."""
import hashlib
import json
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLI = '/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
FLAGS = ['--remote=wvvtyaxsedpqiscogrwk', '--experimental', '--yes']
DOC = ROOT / 'docs/design/photo-diary/photo-wall-renewal-v5'
BACKUP = ROOT / 'output/photo-wall-renewal/server-backup'
READBACK = ROOT / 'output/photo-wall-renewal/readback'
BACKUP.mkdir(parents=True, exist_ok=True)
READBACK.mkdir(parents=True, exist_ok=True)
manifest = json.loads((DOC / 'manifest.json').read_text())
assert len(manifest) == 11

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def run(args):
    result = subprocess.run([CLI, 'storage', *args, *FLAGS], cwd=ROOT,
        env=dict(os.environ, SUPABASE_DISABLE_TELEMETRY='1'), capture_output=True, text=True, timeout=180)
    if result.returncode or '"_tag":"Error"' in result.stdout:
        raise RuntimeError((result.stderr + result.stdout)[-1500:])

def backup(entry):
    target = BACKUP / entry['file']
    if not target.exists():
        run(['cp', 'ss:///calendar-store/photo-walls/' + entry['file'], str(target)])
    return {'file': entry['file'], 'sha256': digest(target)}

# Finish every backup before replacing any remote object.
with ThreadPoolExecutor(max_workers=3) as pool:
    old = list(pool.map(backup, manifest))
(BACKUP / 'manifest.json').write_text(json.dumps(old, indent=2) + '\n')
print('Backed up all 11 current remote headers', flush=True)

def publish(entry):
    source = ROOT / 'assets/pro-photo-walls' / entry['file']
    assert digest(source) == entry['sha256']
    remote = 'ss:///calendar-store/photo-walls/' + entry['file']
    target = READBACK / entry['file']
    run(['rm', remote])
    try:
        run(['cp', str(source), remote, '--content-type', 'image/webp', '--cache-control', 'max-age=60'])
        target.unlink(missing_ok=True)
        run(['cp', remote, str(target)])
        assert digest(target) == entry['sha256'], entry['file']
    except Exception:
        try:
            run(['rm', remote])
        except Exception:
            pass
        run(['cp', str(BACKUP / entry['file']), remote, '--content-type', 'image/webp', '--cache-control', 'max-age=60'])
        raise
    print('Verified ' + entry['file'], flush=True)
    return {'file': entry['file'], 'sha256': digest(target), 'bytes': target.stat().st_size}

with ThreadPoolExecutor(max_workers=3) as pool:
    report = list(pool.map(publish, manifest))
(DOC / 'supabase-verification.json').write_text(json.dumps({
    'project': 'wvvtyaxsedpqiscogrwk', 'bucket': 'calendar-store', 'folder': 'photo-walls', 'files': report,
}, indent=2) + '\n')
print('Published and readback-verified all 11 renewed headers', flush=True)
