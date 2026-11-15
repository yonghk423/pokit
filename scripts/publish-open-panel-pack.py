"""Publish only prepared open-panel assets; read back and verify every uploaded byte."""
import hashlib, json, os, subprocess, threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'output/everyday-cinema-open-panel'
CLI = '/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
FLAGS = ['--remote=wvvtyaxsedpqiscogrwk', '--experimental', '--yes']
REMOTE = 'ss:///character-illustrations/calendar-themes/everyday-cinema/20261112-v2/'
manifest = json.loads((PACK/'manifest.json').read_text())
report_path = PACK/'supabase-verification.json'
report = json.loads(report_path.read_text()) if report_path.exists() else {'files': []}
env = dict(os.environ, SUPABASE_DISABLE_TELEMETRY='1')
def run(args):
    result = subprocess.run([CLI,'storage',*args,*FLAGS], env=env, cwd=ROOT, capture_output=True, text=True, timeout=180)
    if result.returncode or '"_tag":"Error"' in result.stdout:
        raise RuntimeError((result.stderr+result.stdout)[-2000:])
    return result
readback = PACK/'remote-readback'
readback.mkdir(exist_ok=True)
lock = threading.Lock()
def publish(item):
    if any(x['file']==item['file'] and x['sha256']==item['webpSha256'] for x in report['files']):
        return
    name = Path(item['webpFile']).name
    run(['cp',str(PACK/item['webpFile']),REMOTE+name,'--content-type','image/webp','--cache-control','max-age=60'])
    dest=readback/name
    if dest.exists(): dest.unlink()
    run(['cp',REMOTE+name,str(dest)])
    actual=hashlib.sha256(dest.read_bytes()).hexdigest()
    if actual != item['webpSha256']: raise RuntimeError('Remote hash mismatch: '+name)
    with lock:
        report['files']=[x for x in report['files'] if x['file']!=item['file']]+[{'file':item['file'],'sha256':actual,'status':'uploaded-and-readback-verified'}]
        report_path.write_text(json.dumps(report,indent=2)+'\n')
    print('Verified '+name,flush=True)
with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(publish, manifest['files']))
print(str(len(report['files']))+' uploaded files verified',flush=True)
