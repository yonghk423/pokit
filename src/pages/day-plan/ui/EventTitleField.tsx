import { useEffect, useRef, useState, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAppFontSizeScale, useEffectiveAppFontId } from '@shared/lib/ui-font';
import { assetDataUri, fontSources } from './heroInlineAssets';

import { inlineNoteHtml, type InlineNoteDocument } from '../lib/inlineNoteHtml';

const source = { html: inlineNoteHtml.replace('</body>', `
  <style>html,body{height:auto}#editor{min-height:44px;padding:0}img{width:28px;height:28px;vertical-align:middle;margin-right:3px}</style>
  <script>
    new ResizeObserver(()=>post('height',{height:editor.offsetHeight})).observe(editor);
    editor.addEventListener('beforeinput',e=>{
      if(e.data && editor.innerText.length-getSelection().toString().length+e.data.length>120)e.preventDefault();
    });
  </script></body>`) };

export function EventTitleField({ webRef, initialText, ids, sources, ink, hint, label, enabled, onFocus, onText }: {
  webRef: Ref<WebView>; initialText: string; ids: string[]; sources: Record<string, number>; ink: string; hint: string;
  label: string; enabled: boolean; onFocus: () => void; onText: (text: InlineNoteDocument) => void;
}) {
  const web = useRef<WebView>(null);
  const initialDocument = useRef({text: initialText, icons: ids});
  const initialized = useRef(false);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(48);
  const fontId = useEffectiveAppFontId();
  const scale = useAppFontSizeScale();
  useEffect(() => {
    if (!ready) return;
    let active = true;
    const fontSource = fontSources[fontId as keyof typeof fontSources];
    void Promise.all([
      Promise.all(ids.filter(id => sources[id]).map(id => assetDataUri(sources[id]).catch(() => ''))),
      fontSource ? assetDataUri(fontSource).catch(() => '') : '',
    ]).then(([images, font]) => {
      if (!active) return;
      const imagesById = Object.fromEntries(ids.map((id,index) => [id,images[index]]));
      const send = (method: string, value: unknown) => web.current?.injectJavaScript('window.note.'+method+'('+JSON.stringify(value)+');true;');
      const style = {ink, size: 17 * scale, lineHeight: Math.max(28,25 * scale)};
      if (!initialized.current && enabled) {
        initialized.current = true;
        send('initialize', {...style, document:initialDocument.current, images:imagesById, fontUri:font, placeholder:hint});
      } else if (initialized.current) {
        send('style',style);
        send('images',imagesById);
      }
    });
    return () => { active = false; };
  }, [ready, ids, sources, ink, hint, label, enabled, fontId, scale]);
  return <View style={{height: Math.min(180, Math.max(48,height))}}>
    <WebView ref={node => { web.current=node; if(typeof webRef==='function') webRef(node); else if(webRef) webRef.current=node; }}
      testID="hero-event-title" source={source} originWhitelist={['*']} keyboardDisplayRequiresUserAction={false} hideKeyboardAccessoryView
      style={[StyleSheet.absoluteFill,{backgroundColor:'transparent'}]} onLoadEnd={()=>setReady(true)}
      onMessage={({nativeEvent})=>{
        const message=JSON.parse(nativeEvent.data);
        if(message.type==='height') setHeight(Math.ceil(message.height));
        else if(message.type==='change') onText(message.document);
        else if(message.type==='focus' && message.focused) onFocus();
      }} />
  </View>;
}
