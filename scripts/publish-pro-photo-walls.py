"""Back up and replace the 11 paid photo walls, verifying remote bytes."""
import hashlib, json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
CLI = '/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
FLAGS = ['--remote=wvvtyaxsedpqiscogrwk', '--experimental', '--yes']
PACK = ROOT / 'assets/pro-photo-walls'
BACKUP = ROOT / 'output/pro-photo-walls-supabase-backup'
BACKUP.mkdir(parents=True, exist_ok=True)
def run(args):
    r = subprocess.run([CLI, 'storage', *args, *FLAGS], cwd=ROOT, env=dict(os.environ, SUPABASE_DISABLE_TELEMETRY='1'), capture_output=True, text=True, timeout=180)
    if r.returncode or '"_tag":"Error"' in r.stdout: raise RuntimeError((r.stderr+r.stdout)[-1500:])
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def backup(p):
    dest = BACKUP / p.name
    if not dest.exists(): run(['cp', 'ss:///calendar-store/photo-walls/'+p.name, str(dest)])
    return {'file':p.name,'sha256':digest(dest)}
files = sorted(PACK.glob('wall-*.webp'))
assert len(files) == 11
with ThreadPoolExecutor(max_workers=3) as pool: old=list(pool.map(backup, files))
(BACKUP/'manifest.json').write_text(json.dumps(old,indent=2))
print('Backed up all 11 old files',flush=True)
def publish(p):
    remote='ss:///calendar-store/photo-walls/'+p.name
    run(['rm',remote])
    try:
        run(['cp',str(p),remote,'--content-type','image/webp','--cache-control','max-age=60'])
    except Exception:
        run(['cp',str(BACKUP/p.name),remote,'--content-type','image/webp'])
        raise
    dest=BACKUP/('verified-'+p.name)
    if dest.exists(): dest.unlink()
    run(['cp',remote,str(dest)])
    assert digest(dest)==digest(p), p.name
    print('Verified '+p.name,flush=True)
    return {'file':p.name,'sha256':digest(p),'bytes':p.stat().st_size}
with ThreadPoolExecutor(max_workers=3) as pool: report=list(pool.map(publish,files))
(ROOT/'docs/design/photo-diary/pro-photo-walls/supabase-verification.json').write_text(json.dumps({'project':'wvvtyaxsedpqiscogrwk','bucket':'calendar-store','folder':'photo-walls','files':report},indent=2))
print('Replaced and verified all 11 files',flush=True)
