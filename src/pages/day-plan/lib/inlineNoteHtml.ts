export type InlineNoteDocument = { text: string; icons: string[] };

/** Local-only editor. Documents contain plain text and ordered image IDs, never stored HTML. */
export const inlineNoteHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>
html,body{margin:0;padding:0;background:transparent;height:100%;}body{font:17px/25px diary,sans-serif;}#editor{outline:none;white-space:pre-wrap;overflow-wrap:anywhere;min-height:100%;box-sizing:border-box;padding:0 0 24px;}img{width:1em;height:1em;object-fit:contain;vertical-align:-.12em;}*{-webkit-tap-highlight-color:transparent;}
#editor[data-empty="true"]:not(:focus)::before{content:attr(data-placeholder);opacity:.55;pointer-events:none;display:block;transition:opacity 220ms ease-out;}
#editor[data-dice="true"][data-empty="true"]:not(:focus)::before{padding-right:56px;min-height:44px;}
#editor[data-empty="true"][data-prompt-fading="true"]:not(:focus)::before{opacity:0;transition-duration:120ms;}
@media(prefers-reduced-motion:reduce){#editor[data-empty="true"]:not(:focus)::before{transition:none;}}
</style></head><body><div id="editor" role="textbox" aria-multiline="true"></div><style id="font"></style><script>
const editor=document.getElementById('editor');let savedRange=null,promptTimer=null;
const post=(type,extra={})=>window.ReactNativeWebView.postMessage(JSON.stringify({type,...extra}));
// WebKit leaves <br> or empty blocks after editing; CSS :empty misses those.
function syncEmpty(){editor.dataset.empty=String(!editor.textContent.trim()&&!editor.querySelectorAll('img').length);}
function serialize(){
 syncEmpty();
 const clone=editor.cloneNode(true),icons=[];
 clone.querySelectorAll('img').forEach(image=>{icons.push(image.dataset.id);image.replaceWith(document.createTextNode('\\uFFFC'));});
 clone.removeAttribute('id');clone.contentEditable='false';clone.style.cssText='position:absolute;left:-10000px;white-space:pre-wrap;';document.body.appendChild(clone);
 const text=clone.innerText;clone.remove();post('change',{document:{text,icons}});
}
document.addEventListener('selectionchange',()=>{const selection=window.getSelection();if(selection.rangeCount&&editor.contains(selection.anchorNode))savedRange=selection.getRangeAt(0).cloneRange();});
function reportFocus(){post('focus',{focused:document.activeElement===editor});}
editor.addEventListener('focus',reportFocus);
editor.addEventListener('blur',()=>{syncEmpty();post('focus',{focused:false});});
// A tap on blank space (including the placeholder row) must focus the editor
// in the same WebKit user gesture, just like a tap directly on its text.
function focusFromTap(event){
 if(editor.contentEditable==='true'&&document.activeElement!==editor){
  // Opening the native editing layout moves this element during touchend.
  // Do not let WebKit's default tap handling replace the focus/selection after it moves.
  event.preventDefault();
  editor.focus();
  const selection=window.getSelection(),range=document.createRange();
  range.selectNodeContents(editor);range.collapse(false);
  selection.removeAllRanges();selection.addRange(range);
 }
 reportFocus();
}
editor.addEventListener('touchend',focusFromTap,{passive:false});
editor.addEventListener('click',focusFromTap);
editor.addEventListener('input',serialize);
editor.addEventListener('paste',event=>{event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));});
function image(id,uri){const img=document.createElement('img');img.dataset.id=id;img.alt='';if(uri)img.src=uri;img.draggable=false;return img;}
window.note={
 reportFocus,
 placeholder(value){
  clearTimeout(promptTimer);
  const apply=()=>{editor.dataset.placeholder=value.text;editor.dataset.dice=String(!!value.dice);editor.setAttribute('aria-label',value.text);editor.dataset.promptFading='false';};
  const reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(value.animate&&!reduceMotion&&editor.dataset.empty==='true'&&document.activeElement!==editor){
   editor.dataset.promptFading='true';promptTimer=setTimeout(apply,120);
  }else apply();
 },
 focus(){
  editor.focus();
  const selection=window.getSelection();
  if(!selection.rangeCount||!editor.contains(selection.anchorNode)){
   const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);
   selection.removeAllRanges();selection.addRange(range);
  }
  reportFocus();
 },
 style(value){editor.style.color=value.ink;editor.style.fontSize=value.size+'px';editor.style.lineHeight=value.lineHeight+'px';},
 font(uri){document.getElementById('font').textContent='@font-face{font-family:diary;src:url('+uri+');}';},
 images(values){editor.querySelectorAll('img').forEach(img=>{const uri=values[img.dataset.id];if(uri&&img.getAttribute('src')!==uri)img.src=uri;});},
 async initialize(value){
  this.style(value);this.placeholder({text:value.placeholder,dice:value.dice});
  const fragment=document.createDocumentFragment();
  let index=0;value.document.text.split('\\uFFFC').forEach((part,i)=>{if(i){const id=value.document.icons[index++];if(id)fragment.appendChild(image(id,value.images[id]));}fragment.appendChild(document.createTextNode(part));});
  editor.replaceChildren(fragment);syncEmpty();editor.contentEditable='true';
  if(value.fontUri){this.font(value.fontUri);try{await document.fonts.load('17px diary');}catch(e){}}
  requestAnimationFrame(()=>requestAnimationFrame(()=>post('initialized')));
 },
 insert(value){
  const selection=window.getSelection();
  let range=selection.rangeCount && editor.contains(selection.anchorNode) ? selection.getRangeAt(0).cloneRange() : savedRange;
  editor.focus();
  if(!range||!editor.contains(range.startContainer)){range=document.createRange();range.selectNodeContents(editor);range.collapse(false);}
  range.deleteContents();const img=image(value.id,value.uri);range.insertNode(img);range.setStartAfter(img);range.collapse(true);selection.removeAllRanges();selection.addRange(range);savedRange=range.cloneRange();img.scrollIntoView({block:'nearest'});serialize();post('inserted',{id:value.id});
 },
 blur(){editor.blur();}
};post('ready');
</script></body></html>`;
