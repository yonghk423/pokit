"""Back up current paid icons before material restoration."""
import json,os,subprocess,shutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
CLI='/Users/yonghee/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase'
items=json.loads((ROOT/'docs/design/diary-item-quality-v2/inventory.json').read_text())
folder=ROOT/'output/diary-item-quality-v2/originals';folder.mkdir(parents=True,exist_ok=True)
def backup(x):
 dest=folder/x['file']
 if dest.exists():return
 if not x['remote']:shutil.copy2(x['preview'],dest)
 else:
  r=subprocess.run([CLI,'storage','cp','ss:///calendar-store/'+x['remote'],str(dest),'--remote=wvvtyaxsedpqiscogrwk','--experimental','--yes'],env=dict(os.environ,SUPABASE_DISABLE_TELEMETRY='1'),cwd=ROOT,capture_output=True,text=True,timeout=180)
  if r.returncode or '"_tag":"Error"' in r.stdout:raise RuntimeError(x['file']+': '+(r.stderr+r.stdout)[-500:])
 print('Backed up '+x['file'],flush=True)
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(backup,items))
print('Ready: '+str(len(items)),flush=True)
