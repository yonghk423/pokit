"""Compose and verify newly completed image-generation jobs."""
from pathlib import Path
import subprocess, time, json
root=Path('output/warm-sepia-open-panel-v2-review/generated')
last=-1
while True:
 count=len(list(root.glob('*.json')))
 if count!=last:
  result=subprocess.run(['node','scripts/compose-warm-sepia-batch.cjs'],capture_output=True,text=True)
  print(result.stdout.strip(),flush=True)
  verify=subprocess.run(['node','scripts/verify-city-calendar-preview.cjs','output/warm-sepia-open-panel-v2-100-review'],capture_output=True,text=True)
  print('Verification:',verify.returncode,verify.stdout.splitlines()[0] if verify.stdout else verify.stderr[:500],flush=True)
  subprocess.run(['python3','scripts/warm-sepia-contact-sheets.py'],stdout=subprocess.DEVNULL)
  last=count
  if count==99: break
 time.sleep(20)
