/** Offline, reproducible UI walkthroughs. Uses approved simulator photographs; no live AI requests. */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const icons = require('./guide-app-icons.cjs');
const runtime = process.env.POKIT_RENDER_NODE_MODULES || '/Users/yonghee/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(runtime, 'playwright'));
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'assets/help-videos');
const data = (p, mime) => `data:${mime};base64,${fs.readFileSync(path.join(root, p)).toString('base64')}`;
const art = data('assets/activity-illustrations/protagonist-1/52-reading-cafe-960.webp', 'image/webp');
const secondStyle = data('assets/activity-illustrations/protagonist-2/p2-01-fly-kite-960.webp', 'image/webp');
const portrait = data('assets/help-videos/photos/portrait.jpg', 'image/jpeg');
const results = ['writing', 'photo'].map(name => data(`assets/help-videos/results/${name}.jpg`, 'image/jpeg'));
const groupPhoto = data('assets/help-videos/photos/group.jpg', 'image/jpeg');
const galleryPhotos = ['woman', 'man', 'woman-2', 'landscape'].map(name => data(`assets/help-videos/photos/${name}.jpg`, 'image/jpeg'));
const paper = data('ios/PokitLiveActivity/ComicScenes.xcassets/widget_paper.imageset/widget_paper.jpg', 'image/jpeg');
const font = data('assets/fonts/ownglyph-corncorn/Ownglyph_corncorn-Rg.ttf', 'font/ttf');
const words = {
 ko: {title:'카페에서 보낸 오후',body:'창가에서 따뜻한 차를 마시며 책을 읽었다.',placeholder:'오늘 하루 어떠셨나요?',add:'오늘의 주인공',style:'선택한 스타일',gallery:'사진 선택',choose:'사진을 선택해요',person:'주인공 선택은 자유예요',write:'이야기를 적어요',styleStep:'일러스트 스타일을 확인해요',generate:'생성 버튼을 눌러요',wait:'앱을 닫아도 계속 그려요',skip:'대기 시간 생략',done:'완성! 저장하거나 공유해요',start:'카메라 탭을 열어요'},
 en: {title:'An afternoon at a cafe',body:'I read a book by the window with warm tea.',placeholder:'How was your day?',add:'Add a person',style:'Selected style',gallery:'Choose a photo',choose:'Choose your photo',person:'A portrait is optional',write:'Write your story',styleStep:'Check the drawing style',generate:'Tap Generate',wait:'Drawing continues in the background',skip:'Waiting time shortened',done:'Ready! Save or share it',start:'Open the camera tab'},
 ja: {title:'カフェで過ごした午後',body:'窓辺で温かいお茶を飲みながら本を読んだ。',placeholder:'今日はどんな一日でしたか？',add:'主人公を追加',style:'選択した画風',gallery:'写真を選択',choose:'写真を選びます',person:'人物写真は任意です',write:'物語を書きます',styleStep:'画風を確認します',generate:'生成ボタンを押します',wait:'アプリを閉じても生成が続きます',skip:'待ち時間を省略',done:'完成！保存や共有ができます',start:'カメラタブを開きます'},
 'zh-TW': {title:'在咖啡廳度過的午後',body:'在窗邊喝著熱茶，讀了一本書。',placeholder:'今天過得如何？',add:'新增主角',style:'已選畫風',gallery:'選擇照片',choose:'選擇一張照片',person:'人物照片可自由選擇',write:'寫下你的故事',styleStep:'確認繪畫風格',generate:'按下生成按鈕',wait:'關閉應用程式也會繼續生成',skip:'已縮短等候時間',done:'完成！可以儲存或分享',start:'開啟相機分頁'},
};
const camera = icons.camera;
const photos = icons.photo;
const pen = icons.writingMode;
const generate = icons.generate;
const save = `<svg viewBox="0 0 36 36"><path d="M18 3v22m-8-8 8 8 8-8M5 25v7h26v-7" fill="none" stroke="#343933" stroke-width="1.8"/></svg>`;
const share = `<svg viewBox="0 0 36 36"><path d="M18 24V3m-7 7 7-7 7 7M9 16H5v17h26V16h-4" fill="none" stroke="#343933" stroke-width="1.8"/></svg>`;
function modeButton(source, selected) {
 const icon = source.replace(/<path\b[^>]*>.*?<\/path>/, '').replace('viewBox="0 0 500 125"', 'viewBox="175 0 165 125"');
 return `<div class="mode"><svg class="mode-frame" viewBox="0 0 200 44" preserveAspectRatio="none"><path d="M23 3C68 2 132 4 177 3C189 2 197 11 197 22C198 34 189 41 177 41C132 40 68 43 23 41C11 42 3 34 3 22C2 11 11 3 23 3Z" fill="${selected ? '#D7EADF' : 'none'}" stroke="#343933" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="mode-art">${icon}</div></div>`;
}
function html(mode, locale) {
 const photoStories = {
  ko: ['친구들과 함께', '계단에 모여 앉아 친구들과 즐겁게 웃었다.'],
  en: ['Together with friends', 'We sat on the stairs and laughed together.'],
  ja: ['友達と一緒に', '階段に座って友達と楽しく笑った。'],
  'zh-TW': ['和朋友在一起', '我們坐在階梯上，一起開心地笑著。'],
 };
 const c = mode ? {...words[locale], title: photoStories[locale][0], body: photoStories[locale][1]} : words[locale];
 return `<!doctype html><meta charset="utf-8"><style>
 @font-face{font-family:Diary;src:url('${font}')}*{box-sizing:border-box}body{margin:0;width:540px;height:960px;background:#F7F6F4;color:#343933;font-family:Diary,sans-serif}#app{position:relative;width:540px;height:960px;overflow:hidden}svg{width:100%;height:100%}.today{position:absolute;top:27px;left:0;width:100%;text-align:center;font-size:22px}.tabs{position:absolute;top:57px;left:27px;display:flex;align-items:center;gap:22px}.tab{width:44px;height:39px}.tab img{width:38px;height:38px;border-radius:50%;border:1.5px solid #69BFAE}.paper{position:absolute;left:16px;right:16px;top:112px;bottom:84px;border-radius:22px;background:#F5E8CF;background-image:linear-gradient(#F5E8CFdd,#F5E8CFdd),url('${paper}');background-size:cover;overflow:hidden}.top{position:absolute;top:18px;left:20px;right:20px;display:flex;gap:12px;align-items:center}.avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;border:1.5px solid #69BFAE}.add{width:48px;height:48px;border-radius:50%;border:1px solid #343933;text-align:center;font-size:36px;line-height:43px}.addlabel{position:absolute;left:94px;top:52px;width:100px;font-size:12px;text-align:center}.close{margin-left:auto;font-size:31px}.round{width:44px;height:44px;border:1px solid #343933;border-radius:50%;padding:7px}.preview{position:absolute;top:88px;left:20px;right:20px;height:164px;border:1.5px solid #343933;display:flex;align-items:center;justify-content:center}.preview img{height:154px;width:140px;object-fit:contain}.title{position:absolute;top:${mode?'285':'113'}px;left:22px;right:22px;height:53px;border-bottom:1px solid #8A8C7E;font-size:27px;color:#7D8176;white-space:nowrap;overflow:hidden}.story{position:absolute;top:${mode?'352':'181'}px;left:22px;right:22px;bottom:180px;font-size:21px;line-height:38px;background:repeating-linear-gradient(transparent 0 37px,#AFB1A7 37px 38px);white-space:pre-wrap}.placeholder{color:#7D8176}.style{position:absolute;bottom:88px;left:25px;width:62px;text-align:center;font-size:11px;white-space:nowrap}.style img{width:45px;height:45px;border:1px solid #343933;border-radius:50%;object-fit:cover}.gen{position:absolute;bottom:100px;right:26px;width:55px;height:55px;opacity:.4}.modes{position:absolute;left:22px;right:22px;bottom:22px;height:44px;display:flex;align-items:center;gap:14px}.keyboard{font-family:sans-serif;font-size:21px;width:30px}.mode{height:43px;flex:1;border:1px solid #343933;border-radius:30px;display:flex;justify-content:center;padding:2px}.mode svg{width:48px}.info{border-radius:50%;border:1px solid #343933;background:#9FCAD8;width:23px;height:23px;text-align:center;font:18px Georgia}.stylemenu{position:absolute;bottom:160px;left:25px;width:135px;display:none;gap:16px}.stylemenu img{width:43px;height:43px;border-radius:50%;border:2px solid #69BFAE}.gallery{position:absolute;top:156px;left:30px;right:30px;height:592px;background:#FAFAF8;border-radius:22px;box-shadow:0 0 0 1000px #17251b40;display:none;padding:25px;font-family:Diary,sans-serif}.gallery h2{font-size:25px;font-weight:400;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.grid img{width:100%;height:150px;object-fit:cover;border-radius:5px}.progress{position:absolute;inset:0;display:none;background:#F5E8CF;background-image:linear-gradient(#F5E8CFdd,#F5E8CFdd),url('${paper}');background-size:cover;align-items:center;justify-content:center;flex-direction:column;gap:20px}.progress .percent{font-size:29px}.track{width:300px;height:16px;border-radius:15px;border:1px solid #343933;padding:3px}.fill{height:8px;background:#69BFAE}.keep{font-size:18px;max-width:400px;text-align:center}.result{position:absolute;inset:0;background:#F5E8CF;background-image:linear-gradient(#F5E8CFdd,#F5E8CFdd),url('${paper}');background-size:cover;display:none;padding:20px}.result img{width:100%;height:560px;object-fit:contain}.result-title{font-size:26px;margin-top:14px}.result-body{font-size:18px;margin-top:6px}.tools{display:flex;gap:20px;justify-content:flex-end;margin-top:23px;border-top:1px solid #8A8C7E;padding-top:14px}.tool{width:30px;height:30px}.caption{position:absolute;bottom:24px;left:12px;right:12px;height:37px;display:flex;justify-content:center;align-items:center;font-size:22px;text-align:center}.tap{position:absolute;width:58px;height:58px;border-radius:50%;background:#69BFAE40;border:3px solid #55A997;transform:translate(-50%,-50%);pointer-events:none}.tap:after{content:'';position:absolute;left:20px;top:20px;width:12px;height:12px;border-radius:50%;background:#55A997}.smallnote{position:absolute;bottom:80px;left:0;right:0;text-align:center;font-size:14px;color:#667268}

 .paper{left:8px;right:8px;top:10px;bottom:77px;border-radius:25px}
 .top{top:10px;left:15px;right:20px;height:65px;gap:12px}.close{width:31px;height:31px;margin-left:12px}.top .round{width:53px;height:53px;padding:7px}.top .round:nth-child(2){margin-right:auto}
 .add-area{position:relative;margin-left:auto;width:76px;align-self:flex-start;display:flex;align-items:center;flex-direction:column}.add{width:50px;height:50px;font-size:38px;line-height:45px}.addlabel{position:static;font-size:13px;line-height:20px;width:90px}.avatar{width:55px;height:55px;border:1.5px solid #69BFAE}
 .register{position:absolute;top:100px;left:24px;right:24px;display:none}.register-actions{display:flex;gap:16px}.register-button{height:57px;flex:1;border:1.4px solid #343933;display:flex;align-items:center;justify-content:center;gap:8px;transform:rotate(-.3deg)}.register-button:nth-child(2){transform:rotate(.3deg)}.register-button svg{width:30px;height:30px}.register-button span{font-size:18px}.register-hint{margin-top:16px;text-align:center;font-size:16px;color:#7D8176}
 .preview{top:76px;left:20px;right:20px;height:166px;transform:rotate(-.2deg)}.preview img{width:100%;height:154px}
 .title{left:24px;right:24px;height:66px;font-size:28px;padding-top:10px}.story{left:24px;right:24px;bottom:200px;font-size:22px;line-height:42px;background:repeating-linear-gradient(transparent 0 41px,#AFB1A788 41px 42px)}
 .style{left:24px;bottom:102px;width:65px;font-size:12px}.style img{width:53px;height:53px}.gen{right:26px;bottom:112px;width:57px;height:57px;border:1px solid #343933;border-radius:50%;display:flex;align-items:center;justify-content:center}.gen svg{width:57px;height:57px}
 .modes{left:23px;right:23px;bottom:22px;height:46px;gap:14px}.mode{border:0;padding:0;height:45px}.mode svg{width:100%;height:100%}.keyboard{width:28px;height:28px;flex-shrink:0}.info{width:24px;height:24px;flex-shrink:0}
 .stylemenu{bottom:172px;left:25px;width:145px}.stylemenu img{width:48px;height:48px}.gallery{top:100px;height:660px}.result img{height:620px}.caption{font-size:22px;bottom:18px}.smallnote{bottom:62px}

 .top{height:70px;align-items:flex-start}.top .avatar{margin-top:0}.top .round{margin-top:0}.close{display:flex;align-items:center;justify-content:center;margin-top:10px;width:31px;height:31px;flex-shrink:0}
 .add-area{width:76px;align-self:flex-start;gap:0}.add{width:56px;height:56px;border:0;display:flex;align-items:center;justify-content:center;font-size:0;line-height:normal;position:relative}.add:before{content:'';position:absolute;inset:7px;border:1px solid #343933;border-radius:50%}.add svg{width:24px;height:24px;display:block}.addlabel{width:90px;line-height:18px;font-size:12px}
 .modes{left:24px;right:24px;height:44px;gap:12px;bottom:20px}.mode{position:relative;min-width:0;height:40px;flex:1;border:0;border-radius:0;padding:0;display:flex;align-items:center;justify-content:center}.mode .mode-frame{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.mode-art{width:49px;height:35px;position:relative}.mode .mode-art svg{display:block;width:100%;height:100%}.keyboard,.info{flex-shrink:0}
 </style><div id="app"><div class="paper"><div class="top" id="top">${mode?`<div class="round">${photos}</div><div class="round">${camera}</div>`:`<img id="chosen-person" class="avatar" src="${portrait}" style="display:none"><div class="add-area"><div class="add"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="#343933" stroke-width="1.8" stroke-linecap="round"/></svg></div><span class="addlabel">${c.add}</span></div>`}<span class="close"><svg viewBox="0 0 24 24"><path d="M5 5.4L19 18.6M18.6 5L5.4 19" fill="none" stroke="#343933" stroke-width="1.3"/></svg></span></div>${!mode?`<div class="register" id="register"><div class="register-actions"><div class="register-button">${photos}<span>${c.gallery}</span></div><div class="register-button">${camera}<span>${locale==='ko'?'촬영':locale==='ja'?'撮影':locale==='zh-TW'?'拍攝':'Camera'}</span></div></div><div class="register-hint">${locale==='ko'?'이 기기에 저장돼요. 길게 눌러 삭제할 수 있어요.':locale==='ja'?'端末に保存。長押しで削除できます。':locale==='zh-TW'?'儲存在此裝置，長按即可刪除。':'Saved on this device. Hold to delete.'}</div></div>`:''}${mode?`<div class="preview"><div id="photo-empty" style="width:46px;height:46px">${photos}</div><img id="photo" src="${groupPhoto}" style="display:none"></div>`:''}<div class="title" id="title">Title</div><div class="story" id="story"><span class="placeholder">${c.placeholder}</span></div><div class="stylemenu" id="stylemenu"><img src="${art}"><img src="${secondStyle}"></div><div class="style"><img src="${art}"><div>${c.style}</div></div><div class="gen" id="gen">${generate}</div><div class="modes"><div class="keyboard"><svg viewBox="0 0 28 28"><path d="M4 4.5q10-.5 20 0v13H4ZM7 8h1m4 0h1m4 0h1m4 0h.2M7 11.5h1m4 0h1m4 0h1m4 0h.2M9 15h10m-9 7 4 3.5 4-3.5" fill="none" stroke="#343933" stroke-width="1.25" stroke-linecap="round"/></svg></div>${modeButton(icons.writingMode,!mode)}${modeButton(icons.photoMode,!!mode)}<div class="info">i</div></div><div class="progress" id="progress"><div class="percent" id="percent"></div><div class="track"><div class="fill" id="fill"></div></div><div class="keep">${c.wait}</div></div><div class="result" id="result"><img src="${results[mode]}"><div class="result-title">${c.title}</div><div class="result-body">${c.body}</div><div class="tools"><div class="tool">${save}</div><div class="tool">${share}</div></div></div></div><div class="gallery" id="gallery"><h2>${c.gallery}</h2><div class="grid">${[mode ? groupPhoto : portrait, ...galleryPhotos, mode ? portrait : groupPhoto].map(x=>`<img src="${x}">`).join('')}</div></div><div class="smallnote" id="note"></div><div class="caption" id="caption"></div><div class="tap" id="tap"></div></div><script>
 const c=${JSON.stringify(c)},mode=${mode};
 window.draw=(t)=>{
  const title=document.getElementById('title'),story=document.getElementById('story');
  const type=(text,start,duration)=>text.slice(0,Math.max(0,Math.floor((t-start)/duration*text.length)));
  const registering=!mode && t>=.8 && t<4.3;
  const register=document.getElementById('register');if(register)register.style.display=registering?'block':'none';
  const person=document.getElementById('chosen-person');if(person)person.style.display=t>=4.3?'block':'none';
  title.style.top=(mode?280:registering?245:112)+'px';story.style.top=(mode?365:registering?330:197)+'px';
  const heading=type(c.title,5,1.5);title.textContent=heading||'Title';title.style.color=heading?'#343933':'#7D8176';
  const body=type(c.body,7,2);story.textContent=body||c.placeholder;story.style.color=body?'#343933':'#7D8176';
  document.getElementById('gallery').style.display=t>=2.6&&t<4.3?'block':'none';
  document.getElementById('stylemenu').style.display=t>=10&&t<11.5?'flex':'none';
  document.getElementById('gen').style.opacity=t>=8?1:.4;
  if(mode){document.getElementById('photo').style.display=t>=4.3?'block':'none';document.getElementById('photo-empty').style.display=t>=4.3?'none':'block'}
  document.getElementById('progress').style.display=t>=12.9&&t<15.5?'flex':'none';
  const percent=Math.min(100,Math.round(Math.max(0,(t-12.9)/2.5)*100));document.getElementById('percent').textContent=percent+'%';document.getElementById('fill').style.width=percent+'%';
  document.getElementById('result').style.display=t>=15.5?'block':'none';
  const caption=t<4.7?(mode?c.choose:c.person):t<9.5?c.write:t<11.7?c.styleStep:t<12.9?c.generate:t<15.5?c.wait:c.done;
  document.getElementById('caption').textContent=caption;
  document.getElementById('note').textContent=t>=12.9&&t<15.5?c.skip:'';
  const taps=mode?[[1.8,50,46],[3.7,105,255],[4.9,140,318],[6.8,150,400],[9.8,62,745],[11.0,60,685],[12.4,478,744],[17.0,449,790]]:[[.6,427,40],[2.1,143,137],[3.7,105,255],[4.9,140,150],[6.8,150,230],[9.8,62,745],[11.0,60,685],[12.4,478,744],[17.0,449,790]];
  const tap=taps.find(x=>t>=x[0]-.13&&t<=x[0]+.65);const el=document.getElementById('tap');el.style.display=tap?'block':'none';
  if(tap){let p=(t-tap[0]+.13)/.78;el.style.left=tap[1]+'px';el.style.top=tap[2]+'px';el.style.opacity=1-Math.max(0,(p-.55)/.45);el.style.transform='translate(-50%,-50%) scale('+(0.8+0.35*Math.sin(Math.min(1,p)*Math.PI))+')'}
 };
 </script>`;
}
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.POKIT_RENDER_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:540,height:960},deviceScaleFactor:1});
  for(const locale of (process.argv[2]?[process.argv[2]]:Object.keys(words))) for(const mode of [0,1]){
   await page.goto('about:blank');await page.setContent(html(mode,locale));await page.evaluate(()=>document.fonts.ready);
   const name=`${mode?'photo':'writing'}-${locale}`;
   if(process.env.POKIT_GUIDE_PREVIEW){
    for(const t of [0,4.5,17.5]){await page.evaluate(t=>window.draw(t),t);await page.screenshot({path:path.join(process.env.POKIT_GUIDE_PREVIEW,`${name}-${t}.png`)});}
    continue;
   }
   const child=spawn('/opt/homebrew/bin/ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate','12','-i','-','-an','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,name+'.mp4')],{stdio:['pipe','ignore','inherit']});
   const done=new Promise((resolve,reject)=>child.on('close',code=>code===0?resolve():reject(Error('Encoding failed'))));
   for(let frame=0;frame<288;frame++){
    await page.evaluate(t=>window.draw(t),frame/12);
    const png=await page.screenshot({type:'jpeg',quality:88});
    if(frame===0)fs.writeFileSync(path.join(out,name+'-poster.jpg'),png);
    if(!child.stdin.write(png))await new Promise(resolve=>child.stdin.once('drain',resolve));
   }
   child.stdin.end();await done;console.log('Rendered '+name,fs.statSync(path.join(out,name+'.mp4')).size);
  }
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
