import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { resolveAppFontFamily, useEffectiveAppFontId } from '@shared/lib/ui-font';

export function formatHeroPolaroidDate(value: string | number | Date = new Date()): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replace(/-/g, '. ');
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('invalid_export_date');
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`;
}

export type HeroPolaroidContent = { uri: string; title: string; memo?: string; date: string };

/** Mount only while exporting. The separate surface contains no app controls. */
export function HeroPolaroidExport({ content, onComplete, onError }: { content: HeroPolaroidContent; onComplete: (uri: string) => void; onError: (error: unknown) => void }) {
  const ref = useRef<View>(null);
  const fontFamily = resolveAppFontFamily(useEffectiveAppFontId());
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [height, setHeight] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    Image.getSize(content.uri, (width, height) => { if (live && width > 0 && height > 0) setImageSize({ width, height }); }, error => { if (live) onError(error); });
    const timeout = setTimeout(() => { if (live) onError(new Error('polaroid_export_timeout')); }, 15000);
    return () => { live = false; clearTimeout(timeout); };
  }, [content.uri, onError]);
  useEffect(() => {
    if (!loaded || !height || !imageSize) return;
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
            .then(uri => { if (live) onComplete(uri); else releaseCapture(uri); }).catch(error => { if (live) onError(error); });
        } catch (error) { if (live) onError(error); }
      });
    });
    return () => { live = false; cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [loaded, height, imageSize, onComplete, onError]);
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={heroPolaroidStyles.offscreen}>
    {imageSize ? <View testID="hero-polaroid-export" ref={ref} collapsable={false} style={heroPolaroidStyles.paper} onLayout={event => setHeight(event.nativeEvent.layout.height)}>
      <Image testID="hero-polaroid-image" source={{ uri: content.uri }} resizeMode="contain" fadeDuration={0} onLoad={() => setLoaded(true)} onError={onError} style={{ width: 324, height: 324 * imageSize.height / imageSize.width }} />
      <View style={heroPolaroidStyles.caption}>
        {content.title.trim() ? <Text testID="hero-polaroid-title" allowFontScaling={false} style={[heroPolaroidStyles.title, { fontFamily }]}>{content.title.trim()}</Text> : null}
        {content.memo?.trim() ? <Text testID="hero-polaroid-memo" allowFontScaling={false} style={[heroPolaroidStyles.memo, { fontFamily }]}>{content.memo.trim()}</Text> : null}
        <Text testID="hero-polaroid-date" allowFontScaling={false} style={[heroPolaroidStyles.date, { fontFamily }]}>{content.date}</Text>
      </View>
    </View> : null}
  </View>;
}

export const heroPolaroidStyles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10000, top: 0 },
  paper: { width: 360, padding: 18, paddingTop: 24, backgroundColor: '#FAF9F6' },
  caption: { paddingHorizontal: 8, paddingTop: 18, paddingBottom: 8, minHeight: 88, gap: 4 },
  title: { fontSize: 22, lineHeight: 30, color: '#292D28', fontWeight: '400' },
  memo: { fontSize: 17, lineHeight: 26, color: '#292D28', fontWeight: '400' },
  date: { fontSize: 15, lineHeight: 22, color: '#565A52', fontWeight: '400' },
});
