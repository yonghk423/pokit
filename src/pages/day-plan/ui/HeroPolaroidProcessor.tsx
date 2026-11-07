import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { deleteAsync } from 'expo-file-system/legacy';
import { polaroidPixelScript, type PolaroidEffects } from './HeroPolaroidEffects';

/** Local-only canvas processing: no image is uploaded. Capped to match export density. */
export function HeroPolaroidProcessor({ uri, source, effects, onResult, onError }: {
  uri?: string; source?: number; effects: PolaroidEffects; onResult: (uri: string, key: string) => void; onError: () => void;
}) {
  const web = useRef<WebView>(null);
  const callbacks = useRef({ onResult, onError });
  callbacks.current = { onResult, onError };
  const latest = useRef(effects);
  latest.current = effects;
  const [ready, setReady] = useState(false);
  const running = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const submit = useCallback(() => {
    if (running.current || !web.current) return;
    running.current = true;
    const key = JSON.stringify(latest.current);
    web.current.injectJavaScript(`window.renderCorrection(${key},${JSON.stringify(key)});true;`);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => { running.current = false; callbacks.current.onError(); }, 20000);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(submit, 50);
    return () => clearTimeout(timer);
  }, [effects, ready, submit]);
  useEffect(() => () => clearTimeout(timeout.current), []);
  const [input, setInput] = useState<string>();
  useEffect(() => {
    let live = true;
    setReady(false);
    timeout.current = setTimeout(() => { if (live) callbacks.current.onError(); }, 20000);
    void (async () => {
      let local = uri;
      if (!local && source != null) { const asset = Asset.fromModule(source); await asset.downloadAsync(); local = asset.localUri ?? asset.uri; }
      if (!local) throw new Error('missing_image');
      const image = await manipulateAsync(local, [], { format: SaveFormat.PNG, base64: true });
      try { if (live) setInput(`data:image/png;base64,${image.base64}`); }
      finally { await deleteAsync(image.uri, { idempotent: true }); }
    })().catch(() => { if (live) callbacks.current.onError(); });
    return () => { live = false; clearTimeout(timeout.current); };
  }, [uri, source]);
  const html = useMemo(() => input ? `<html><body><canvas id="c"></canvas><script>
const send = value => window.ReactNativeWebView.postMessage(JSON.stringify(value));
const img = new Image(); img.onerror = () => send({error:true});
img.onload = () => { try {
 const c = document.getElementById('c'), scale = Math.min(1, 2048 / Math.max(img.width,img.height));
 c.width = Math.max(1,Math.round(img.width*scale)); c.height = Math.max(1,Math.round(img.height*scale));
 const ctx = c.getContext('2d'); ctx.drawImage(img,0,0,c.width,c.height);
 const original = ctx.getImageData(0,0,c.width,c.height);
 const pixels = ctx.createImageData(c.width,c.height);
 window.renderCorrection = (effects,key) => { try {
   pixels.data.set(original.data);
   (${polaroidPixelScript})(pixels.data,effects);
   ctx.putImageData(pixels,0,0);
   send({uri:c.toDataURL('image/png'),key});
 } catch(e) { send({error:true}); } };
 send({ready:true});
} catch(e) {send({error:true});}};
img.src = ${JSON.stringify(input)};
</script></body></html>` : '', [input]);
  const documentSource = useMemo(() => ({ html }), [html]);
  if (!html) return null;
  return <View pointerEvents="none" accessibilityElementsHidden style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}><WebView ref={web} originWhitelist={['about:*']} source={documentSource} javaScriptEnabled onError={onError} onMessage={event => {
    try { const result = JSON.parse(event.nativeEvent.data); if (result.ready) { clearTimeout(timeout.current); setReady(true); return; } clearTimeout(timeout.current); running.current = false; if (typeof result.uri === 'string' && result.uri.startsWith('data:image/png;base64,')) { callbacks.current.onResult(result.uri, result.key); if (result.key !== JSON.stringify(latest.current)) submit(); } else callbacks.current.onError(); } catch { onError(); }
  }} /></View>;
}
