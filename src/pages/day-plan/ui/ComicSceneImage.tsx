import { Image, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  source: ImageProps['source']; fallbackSource?: ImageProps['source']; imageKey: string;
  style: StyleProp<ViewStyle>; priority?: ImageProps['priority']; contentFit?: ImageProps['contentFit']; backgroundColor?: string;
};
/** A separate load session prevents recycled cells from inheriting a previous image's error. */
export function ComicSceneImage(props: Props) {
  return <ComicImageSession key={props.imageKey} {...props} />;
}
function ComicImageSession({ source, fallbackSource, imageKey, style, priority = 'normal', contentFit = 'cover', backgroundColor = '#ECEEE9' }: Props) {
  const { t } = useTranslation();
  const [displayed, setDisplayed] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [reload, setReload] = useState(0);
  const key = `${imageKey}:${reload}:${attempt}`;
  const exhausted = attempt >= 2;
  useEffect(() => {
    if (failed !== key || exhausted) return;
    const timer = setTimeout(() => setAttempt(value => value + 1), 300 * (attempt + 1));
    return () => clearTimeout(timer);
  }, [failed, key, exhausted, attempt]);
  const retry = () => { setFailed(null); setDisplayed(null); setAttempt(0); setReload(value => value + 1); };
  return <View style={[{ overflow: 'hidden', backgroundColor }, style]}>
    <Image key={key} source={attempt >= 2 && fallbackSource ? fallbackSource : source} recyclingKey={key}
      style={StyleSheet.absoluteFill} contentFit={contentFit}
      useAppleWebpCodec={false} cachePolicy={attempt > 0 || reload > 0 ? 'none' : 'memory-disk'}
      allowDownscaling enforceEarlyResizing priority={priority} transition={0}
      onDisplay={() => { setDisplayed(key); setFailed(null); }} onError={event => {
        setFailed(key);
        if (__DEV__ && exhausted) console.warn('[ComicSceneImage] Artwork load failed', { imageKey, error: event?.error ?? 'Unknown image error' });
      }} accessible={false} />
    {displayed !== key && !(failed === key && exhausted) ? <View pointerEvents="none" testID="comic-image-skeleton" style={[StyleSheet.absoluteFill, s.skeleton]}>
      <View style={s.horizon} /><View style={s.line} /><View style={[s.line, { width: '42%' }]} />
    </View> : null}
    {failed === key && exhausted ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.retryImage')} onPress={() => { tapHaptic(); retry(); }} style={[StyleSheet.absoluteFill, s.error]}><ThemedText style={s.errorLabel}>{t('comicDay.retryImage')}</ThemedText></Pressable> : null}
  </View>;
}
const s = StyleSheet.create({
  skeleton: { backgroundColor: '#ECEEE9', justifyContent: 'flex-end', padding: '9%', gap: 6 }, horizon: { position: 'absolute', left: '8%', right: '8%', top: '12%', height: '48%', backgroundColor: '#E0E3DC', borderRadius: 3 }, line: { width: '70%', height: 5, backgroundColor: '#D9DDD5', borderRadius: 3 },
  error: { backgroundColor: '#ECEEE9', justifyContent: 'center', alignItems: 'center', padding: 4 }, errorLabel: { color: '#666', fontSize: 11, textAlign: 'center' },
});
