// Rasterize the generated coordinate-locked SVGs with one headless Chrome session.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const template = require('../docs/design/photo-diary/city-calendar-template.json');
const [W,H]=template.size;
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(fn,timeout=15000){
 const start=Date.now();
 while(Date.now()-start<timeout){try{const value=await fn();if(value)return value;}catch{}await sleep(100);}
 throw new Error('Timed out waiting for Chrome DevTools');
}
async function rasterize(dir){
 const manifestPath=path.join(dir,'manifest.json');
 const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'everyday-cinema-chrome-'));
 const chrome=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
 let ws;
 try{
  const activeFile=path.join(profile,'DevToolsActivePort');
  const port=await waitFor(async()=>{const s=await fs.readFile(activeFile,'utf8').catch(()=>null);return s?Number(s.split('\n')[0]):null;});
  const targets=await waitFor(async()=>{const r=await fetch(`http://127.0.0.1:${port}/json/list`);const a=await r.json();return a.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);});
  ws=new WebSocket(targets.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  let seq=0;const pending=new Map();
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false});
  for(let index=0;index<manifest.files.length;index++){
   const item=manifest.files[index],url='file://'+path.resolve(dir,item.svg);
   await call('Page.navigate',{url});
   await sleep(120);
   const shot=await call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
   const bytes=Buffer.from(shot.data,'base64');
   await fs.writeFile(path.join(dir,item.file),bytes);
   item.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
   console.log(`${index+1}/${manifest.files.length} ${item.file}`);
  }
  await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 }finally{
  try{ws?.close();}catch{}
  chrome.kill('SIGTERM');
  await Promise.race([once(chrome,'exit'),sleep(3000)]);
  await fs.rm(profile,{recursive:true,force:true});
 }
}
rasterize(process.argv[2]).catch(error=>{console.error(error);process.exitCode=1;});
