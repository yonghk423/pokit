"""Upload and read back the versioned Warm Sepia Open Panel WebP pack."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'output/warm-sepia-open-panel-v2'
CLI = '/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
FLAGS = ['--remote=wvvtyaxsedpqiscogrwk', '--experimental', '--yes']
REMOTE = 'ss:///character-illustrations/calendar-themes/warm-sepia-open-panel/20261112-v2/'
manifest_path = PACK / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
assert manifest['imageCount'] == 1 and len(manifest['files']) == 1
assert manifest['status'] == 'coordinate-verified-ready-to-upload'
report_path = PACK / 'supabase-verification.json'
readback = PACK / 'remote-readback'
readback.mkdir(exist_ok=True)
report = {'bucket': 'character-illustrations', 'project': 'wvvtyaxsedpqiscogrwk',
          'revision': 'warm-sepia-open-panel-v2', 'status': 'uploading', 'files': []}
env = dict(os.environ, SUPABASE_DISABLE_TELEMETRY='1')

def run(args):
    result = subprocess.run([CLI, 'storage', *args, *FLAGS], cwd=ROOT, env=env,
                            capture_output=True, text=True, timeout=180)
    if result.returncode or '"_tag":"Error"' in result.stdout:
        raise RuntimeError((result.stderr + result.stdout)[-2000:])
    return result

def save():
    report_path.write_text(json.dumps(report, indent=2) + '\n')

for index, item in enumerate(manifest['files'], 1):
    source = PACK / item['webpFile']
    if hashlib.sha256(source.read_bytes()).hexdigest() != item['webpSha256']:
        raise RuntimeError(f"Local WebP hash mismatch: {item['webpFile']}")
    remote = REMOTE + Path(item['webpFile']).name
    run(['cp', str(source), remote, '--content-type', 'image/webp', '--cache-control', 'max-age=60'])
    dest = readback / Path(item['webpFile']).name
    if dest.exists(): dest.unlink()
    run(['cp', remote, str(dest)])
    actual = hashlib.sha256(dest.read_bytes()).hexdigest()
    if actual != item['webpSha256']:
        raise RuntimeError(f"Supabase read-back hash mismatch: {item['webpFile']}")
    report['files'].append({'file': Path(item['webpFile']).name, 'bytes': item['webpBytes'],
                            'sha256': actual, 'status': 'uploaded-and-readback-verified'})
    save()
    print(f'{index}/1 verified {Path(item["webpFile"]).name}', flush=True)
    time.sleep(.12)

report['status'] = 'verified'
report['verifiedAt'] = datetime.now(timezone.utc).isoformat()
save()
manifest['status'] = 'coordinate-and-upload-readback-verified'
manifest['uploadedAt'] = report['verifiedAt']
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print(f"verified: {len(report['files'])} files, {manifest['totalWebpBytes']} bytes", flush=True)
