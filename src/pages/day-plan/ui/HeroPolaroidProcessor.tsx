import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { deleteAsync } from 'expo-file-system/legacy';
import { POLAROID_FILMS, hasProPolaroidEffects, polaroidPixelScript, type PolaroidEffects } from './HeroPolaroidEffects';

/** Local-only canvas processing: no image is uploaded. Capped to match export density. */
export function HeroPolaroidProcessor({ uri, source, effects, onThumbnails, onPreview, onResult, onError }: {
  uri?: string; source?: number; effects: PolaroidEffects; onThumbnails?: (images: Record<string, string>) => void; onPreview: (uri: string, key: string) => void; onResult: (uri: string, key: string) => void; onError: () => void;
}) {
  const web = useRef<WebView>(null);
  const thumbnailSession = useRef(0);
  const thumbnailFiles = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => { const files = thumbnailFiles.current; mounted.current = true; return () => { mounted.current = false; for (const uri of files) void deleteAsync(uri, { idempotent: true }); files.clear(); }; }, []);
  const callbacks = useRef({ onThumbnails, onPreview, onResult, onError });
  callbacks.current = { onThumbnails, onPreview, onResult, onError };
  const latest = useRef(effects);
  latest.current = effects;
  const [ready, setReady] = useState(false);
  const running = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const submit = useCallback(() => {
    if (running.current || !web.current || !hasProPolaroidEffects(latest.current)) return;
    running.current = true;
    const key = JSON.stringify(latest.current);
    web.current.injectJavaScript(`window.renderCorrection(${key},${JSON.stringify(key)});true;`);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => { running.current = false; callbacks.current.onError(); }, 20000);
  }, []);
  useEffect(() => {
    if (!ready) return;
    submit();
  }, [effects, ready, submit]);
  useEffect(() => () => clearTimeout(timeout.current), []);
  const [input, setInput] = useState<string>();
  useEffect(() => {
    let live = true;
    thumbnailSession.current++;
    setReady(false);
    timeout.current = setTimeout(() => { if (live) callbacks.current.onError(); }, 20000);
    void (async () => {
      let local = uri;
      if (!local && source != null) { const asset = Asset.fromModule(source); await asset.downloadAsync(); local = asset.localUri ?? asset.uri; }
      if (!local) throw new Error('missing_image');
      // Cap before PNG/base64 encoding and WebView transfer, rather than decoding
      // a full-resolution photo twice only to shrink it in the canvas afterward.
      const dimensions = await new Promise<{ width: number; height: number } | null>(resolve => {
        Image.getSize(local!, (width, height) => resolve({ width, height }), () => resolve(null));
      });
      if (!live) return;
      const resize = dimensions && Math.max(dimensions.width, dimensions.height) > 2048
        ? [{ resize: dimensions.width >= dimensions.height ? { width: 2048 } : { height: 2048 } }]
        : [];
      const image = await manipulateAsync(local, resize, { format: SaveFormat.PNG, base64: true });
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
 const small = document.createElement('canvas'), ratio = Math.min(1, 600 / Math.max(c.width,c.height));
 small.width = Math.max(1,Math.round(c.width*ratio)); small.height = Math.max(1,Math.round(c.height*ratio));
 const smallCtx = small.getContext('2d'); smallCtx.drawImage(img,0,0,small.width,small.height);
 const smallOriginal = smallCtx.getImageData(0,0,small.width,small.height);
 const smallPixels = smallCtx.createImageData(small.width,small.height);
 const adjust = (${polaroidPixelScript});
 window.renderCorrection = (effects,key) => { try {
   smallPixels.data.set(smallOriginal.data);
   adjust(smallPixels.data,effects);
   smallCtx.putImageData(smallPixels,0,0);
   send({preview:small.toDataURL('image/png'),key});
   pixels.data.set(original.data);
   adjust(pixels.data,effects);
   ctx.putImageData(pixels,0,0);
   send({uri:c.toDataURL('image/png'),key});
 } catch(e) { send({error:true}); } };
 send({ready:true});
 const thumb = document.createElement('canvas'); thumb.width = 96; thumb.height = 96;
 const thumbCtx = thumb.getContext('2d'), crop = Math.min(img.width,img.height);
 thumbCtx.drawImage(img,(img.width-crop)/2,(img.height-crop)/2,crop,crop,0,0,96,96);
 const thumbOriginal = thumbCtx.getImageData(0,0,96,96), thumbPixels = thumbCtx.createImageData(96,96);
 const films = ${JSON.stringify(POLAROID_FILMS.map(film => film.value))};
 let index = 0;
 const nextThumbnail = () => {
   try {
     const film = films[index++];
     thumbPixels.data.set(thumbOriginal.data); adjust(thumbPixels.data,{film});
     thumbCtx.putImageData(thumbPixels,0,0);
     send({thumbnail:film,uri:thumb.toDataURL('image/png')});
     if (index < films.length) setTimeout(nextThumbnail,30);
   } catch(e) {}
 };
 setTimeout(nextThumbnail,30);
} catch(e) {send({error:true});}};
img.src = ${JSON.stringify(input)};
</script></body></html>` : '', [input]);
  const documentSource = useMemo(() => ({ html }), [html]);
  if (!html) return null;
  return <View pointerEvents="none" accessibilityElementsHidden style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}><WebView ref={web} originWhitelist={['about:*']} source={documentSource} javaScriptEnabled onError={onError} onMessage={event => {
    try { const result = JSON.parse(event.nativeEvent.data); if (result.thumbnail) { const session = thumbnailSession.current; void manipulateAsync(result.uri, [], { format: SaveFormat.WEBP, compress: 0.78 }).then(image => { if (!mounted.current || session !== thumbnailSession.current) { void deleteAsync(image.uri, { idempotent: true }); return; } thumbnailFiles.current.add(image.uri); callbacks.current.onThumbnails?.({ [result.thumbnail]: image.uri }); }).catch(() => {}); return; } if (result.preview) { if (result.key === JSON.stringify(latest.current)) callbacks.current.onPreview(result.preview, result.key); return; } if (result.ready) { clearTimeout(timeout.current); setReady(true); return; } clearTimeout(timeout.current); running.current = false; if (typeof result.uri === 'string' && result.uri.startsWith('data:image/png;base64,')) { if (result.key === JSON.stringify(latest.current)) callbacks.current.onResult(result.uri, result.key); else submit(); } else callbacks.current.onError(); } catch { onError(); }
  }} /></View>;
}
