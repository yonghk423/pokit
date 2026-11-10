import { getPolaroidPrintLayout } from '../lib/heroPolaroidFraming';
import { HeroFilmDateStamp } from './HeroFilmDateStamp';
import { HeroPolaroidSurface } from './HeroPolaroidSurface';
import { type PolaroidEffects } from './HeroPolaroidEffects';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { resolveAppFontFamily, useEffectiveAppFontId, type AppFontId } from '@shared/lib/ui-font';

export function formatHeroPolaroidDate(value: string | number | Date = new Date()): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replace(/-/g, '. ');
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('invalid_export_date');
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`;
}

export type HeroPolaroidContent = PolaroidEffects & { uri: string; photoFit?: 'cover' | 'contain'; fixedPrintRatio?: boolean; processedUri?: string; title: string; memo?: string; showText?: boolean; showDate?: boolean; date: string; paper?: string; pen?: string; fontId?: AppFontId };

/** Mount only while exporting. The separate surface contains no app controls. */
export function HeroPolaroidExport({ content, onComplete, onError }: { content: HeroPolaroidContent; onComplete: (uri: string) => void; onError: (error: unknown) => void }) {
  const imageUri = content.processedUri ?? content.uri;
  const ref = useRef<View>(null);
  const [printUri, setPrintUri] = useState<string | null>(null);
  const appFontId = useEffectiveAppFontId();
  const fontFamily = resolveAppFontFamily(content.fontId ?? appFontId);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [height, setHeight] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [textureReady, setTextureReady] = useState(false);
  const markTextureReady = useCallback(() => setTextureReady(true), []);
  useEffect(() => {
    let live = true;
    Image.getSize(imageUri, (width, height) => { if (live && width > 0 && height > 0) setImageSize({ width, height }); }, error => { if (live) onError(error); });
    const timeout = setTimeout(() => { if (live) onError(new Error('polaroid_export_timeout')); }, 15000);
    return () => { live = false; clearTimeout(timeout); };
  }, [imageUri, onError]);
  useEffect(() => {
    if (!loaded || !textureReady || !height || !imageSize) return;
    let live = true;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (!ref.current) { onError(new Error('missing_export_surface')); return; }
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { captureRef, releaseCapture } = require('react-native-view-shot') as typeof import('react-native-view-shot');
          // iOS renderInContext draws at the view's actual bounds without scaling.
          // Explicit width/height enlarge only the canvas, leaving the card tiny
          // in its corner. Native bounds already include the device pixel density.
          void captureRef(ref.current, { format: 'png', quality: 1, result: 'tmpfile', useRenderInContext: true })
            .then(uri => { if (live) setPrintUri(uri); else releaseCapture(uri); }).catch(error => { if (live) onError(error); });
        } catch (error) { if (live) onError(error); }
      });
    });
    return () => { live = false; cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [loaded, textureReady, height, imageSize, onComplete, onError]);
  useEffect(() => () => {
    if (printUri) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native-view-shot').releaseCapture(printUri);
    }
  }, [printUri]);
  const { photoHeight, captionHeight } = getPolaroidPrintLayout(content.photoFit);
  const stampWidth = 324;
  const stampHeight = photoHeight;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={heroPolaroidStyles.offscreen}>
    {printUri ? <FeedCanvas uri={printUri} onComplete={onComplete} onError={onError} /> : null}
    {imageSize ? <View testID="hero-polaroid-export" ref={ref} collapsable={false} style={heroPolaroidStyles.paper} onLayout={event => setHeight(event.nativeEvent.layout.height)}>
      <HeroPolaroidSurface onReady={markTextureReady} onError={onError} />
      <View style={{ width: 324, height: photoHeight }}>
      <Image testID="hero-polaroid-image" source={{ uri: imageUri }} resizeMode={content.photoFit ?? 'cover'} fadeDuration={0} onLoad={() => setLoaded(true)} onError={onError} style={{ width: 324, height: photoHeight }} />
      {content.showDate !== false ? <View pointerEvents="none" style={{ position: 'absolute', width: stampWidth, height: stampHeight, left: (324 - stampWidth) / 2, top: (photoHeight - stampHeight) / 2 }}><HeroFilmDateStamp testID="hero-polaroid-date" date={content.date || formatHeroPolaroidDate()} /></View> : null}
      </View>

      <View style={[heroPolaroidStyles.caption, { height: captionHeight, minHeight: captionHeight, overflow: 'hidden' }]}>
        {content.showText !== false && content.title.trim() ? <Text testID="hero-polaroid-title" numberOfLines={2} allowFontScaling={false} style={[heroPolaroidStyles.title, { fontFamily, ...(content.pen ? { color: content.pen } : {}) }]}>{content.title.trim()}</Text> : null}
      </View>
    </View> : null}
  </View>;
}

/** Capture an already flattened print: no transformed native layers can be clipped. */
function FeedCanvas({ uri, onComplete, onError }: { uri: string; onComplete: (uri: string) => void; onError: (error: unknown) => void }) {
  const ref = useRef<View>(null);
  const [loaded, setLoaded] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  useEffect(() => {
    if (!loaded || !laidOut) return;
    let live = true;
    const frame = requestAnimationFrame(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { captureRef, releaseCapture } = require('react-native-view-shot') as typeof import('react-native-view-shot');
      if (!ref.current) { onError(new Error('missing_feed_canvas')); return; }
      void captureRef(ref.current, { format: 'png', quality: 1, result: 'tmpfile', useRenderInContext: true })
        .then(result => { if (live) onComplete(result); else releaseCapture(result); })
        .catch(error => { if (live) onError(error); });
    });
    return () => { live = false; cancelAnimationFrame(frame); };
  }, [loaded, laidOut, onComplete, onError]);
  return <View ref={ref} collapsable={false} testID="hero-polaroid-canvas" onLayout={() => setLaidOut(true)} style={{ width: 360, height: 432, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
    <Image testID="hero-polaroid-fitted-print" source={{ uri }} resizeMode="contain" fadeDuration={0} onLoad={() => setLoaded(true)} onError={onError} style={{ width: 324, height: 388.8 }} />
  </View>;
}

export const heroPolaroidStyles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10000, top: 0 },
  paper: { width: 360, padding: 18, paddingTop: 24, backgroundColor: '#F9F9F6' },
  caption: { paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8, height: 88, minHeight: 88, gap: 4 },
  title: { fontSize: 22, lineHeight: 30, color: '#292D28', fontWeight: '400' },
  memo: { fontSize: 17, lineHeight: 26, color: '#292D28', fontWeight: '400' },
  date: { fontSize: 15, lineHeight: 22, color: '#565A52', fontWeight: '400' },
});
