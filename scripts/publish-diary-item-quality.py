"""Replace upgraded paid icons with readback verification and per-file rollback."""
import hashlib,json,os,subprocess,threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CLI='/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
FLAGS=['--remote=wvvtyaxsedpqiscogrwk','--experimental','--yes']
DOC=ROOT/'docs/design/diary-item-quality-v2'
items=json.loads((DOC/'inventory.json').read_text())
manifest=json.loads((DOC/'manifest.json').read_text())
byfile={x['file']:x for x in manifest}
assert len(items)==len(manifest)==78
base=ROOT/'output/diary-item-quality-v2';report=[];lock=threading.Lock()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(args):
 r=subprocess.run([CLI,'storage',*args,*FLAGS],cwd=ROOT,env=dict(os.environ,SUPABASE_DISABLE_TELEMETRY='1'),capture_output=True,text=True,timeout=180)
 if r.returncode or '"_tag":"Error"' in r.stdout:raise RuntimeError((r.stderr+r.stdout)[-1000:])
def publish(x):
 if not x['remote']:return
 src=base/'exports'/x['file'];backup=base/'originals'/x['file'];dest=base/'readback'/x['file'];dest.parent.mkdir(exist_ok=True)
 assert backup.exists() and sha(src)==byfile[x['file']]['sha256']
 remote='ss:///calendar-store/'+x['remote']
 run(['rm',remote])
 try:
  run(['cp',str(src),remote,'--content-type','image/webp','--cache-control','max-age=60'])
  if dest.exists():dest.unlink()
  run(['cp',remote,str(dest)])
  assert sha(dest)==sha(src),x['file']
 except Exception:
  # Remove a partial replacement before restoring the original.
  try:run(['rm',remote])
  except Exception:pass
  run(['cp',str(backup),remote,'--content-type','image/webp'])
  raise
 with lock:
  report.append({'remote':x['remote'],'sha256':sha(dest),'bytes':dest.stat().st_size})
  (DOC/'supabase-verification.json').write_text(json.dumps(report,indent=2))
  print(str(len(report))+'/67 verified '+x['file'],flush=True)
with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(publish,items))
assert len(report)==67
print('All 67 paid files replaced and readback verified',flush=True)
