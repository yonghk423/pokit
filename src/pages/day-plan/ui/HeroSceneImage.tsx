import { Image, type ImageProps } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Image as NativeImage, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  onReady?: () => void;
  showSkeletonOnMount?: boolean;
  source: ImageProps['source']; fallbackSource?: ImageProps['source']; imageKey: string;
  style: StyleProp<ViewStyle>; priority?: ImageProps['priority']; contentFit?: ImageProps['contentFit']; contentPosition?: ImageProps['contentPosition']; backgroundColor?: string;
};
// Use a new native cache namespace: React imageKey/recyclingKey do not change
// SDWebImage's URI-based cache. Keep all scene views on the same full-size decode,
// including thumbnails that can be loaded concurrently with the detail image.
function fullResolutionSource(source: ImageProps['source']): ImageProps['source'] {
  if (Array.isArray(source)) return source.map(item => fullResolutionSource(item)) as ImageProps['source'];
  const resolved = typeof source === 'number' ? NativeImage.resolveAssetSource(source)
    : typeof source === 'string' ? { uri: source } : source;
  if (!resolved || !('uri' in resolved) || !resolved.uri) return source;
  return { ...resolved, cacheKey: `comic-full-v1:${resolved.uri}` };
}

/** Artwork already shown this session sits in the memory cache, so remounts skip the skeleton. */
const shownImageKeys = new Set<string>();

/** A separate load session prevents recycled cells from inheriting a previous image's error. */
export function ComicSceneImage(props: Props) {
  return <ComicImageSession key={props.imageKey} {...props} />;
}
function ComicImageSession({ source, fallbackSource, imageKey, style, priority = 'normal', contentFit = 'contain', contentPosition, backgroundColor = '#F5E8CF', onReady, showSkeletonOnMount = false }: Props) {
  const { t } = useTranslation();
  const [displayed, setDisplayed] = useState<string | null>(() => !showSkeletonOnMount && shownImageKeys.has(imageKey) ? `${imageKey}:0:0` : null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [reload, setReload] = useState(0);
  const key = `${imageKey}:${reload}:${attempt}`;
  const exhausted = attempt >= 2;
  const activeSource = attempt >= 2 && fallbackSource ? fallbackSource : source;
  const resolvedSource = useMemo(() => fullResolutionSource(activeSource), [activeSource]);
  useEffect(() => {
    if (failed !== key || exhausted) return;
    const timer = setTimeout(() => setAttempt(value => value + 1), 300 * (attempt + 1));
    return () => clearTimeout(timer);
  }, [failed, key, exhausted, attempt]);
  const retry = () => { shownImageKeys.delete(imageKey); setFailed(null); setDisplayed(null); setAttempt(0); setReload(value => value + 1); };
  return <View style={[{ overflow: 'hidden', backgroundColor }, style]}>
    <Image key={key} source={resolvedSource} recyclingKey={key}
      style={StyleSheet.absoluteFill} contentFit={contentFit} contentPosition={contentPosition}
      useAppleWebpCodec={false} cachePolicy={attempt > 0 || reload > 0 ? 'none' : 'memory-disk'}
      allowDownscaling={false} enforceEarlyResizing={false} priority={priority} transition={0}
      onDisplay={() => { shownImageKeys.add(imageKey); setDisplayed(key); setFailed(null); onReady?.(); }} onError={event => {
        shownImageKeys.delete(imageKey);
        setFailed(key);
        if (__DEV__ && exhausted) console.warn('[ComicSceneImage] Artwork load failed', { imageKey, error: event?.error ?? 'Unknown image error' });
      }} accessible={false} />
    {displayed !== key && !(failed === key && exhausted) ? <View pointerEvents="none" testID="comic-image-skeleton" style={[StyleSheet.absoluteFill, s.skeleton, { backgroundColor }]}>
      <View style={[s.horizon, { backgroundColor: 'rgba(0,0,0,0.06)' }]} /><View style={[s.line, { backgroundColor: 'rgba(0,0,0,0.07)' }]} /><View style={[s.line, { width: '42%', backgroundColor: 'rgba(0,0,0,0.07)' }]} />
    </View> : null}
    {failed === key && exhausted ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.retryImage')} onPress={() => { tapHaptic(); retry(); }} style={[StyleSheet.absoluteFill, s.error, { backgroundColor }]}><ThemedText style={s.errorLabel}>{t('comicDay.retryImage')}</ThemedText></Pressable> : null}
  </View>;
}
const s = StyleSheet.create({
  skeleton: { justifyContent: 'flex-end', padding: '9%', gap: 6 }, horizon: { position: 'absolute', left: '8%', right: '8%', top: '12%', height: '48%', borderRadius: 3 }, line: { width: '70%', height: 5, borderRadius: 3 },
  error: { justifyContent: 'center', alignItems: 'center', padding: 4 }, errorLabel: { color: '#666', fontSize: 11, textAlign: 'center' },
});
