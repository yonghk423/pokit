import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

/** Fixed-size paper skeleton stays visible until native decoding/display completes. */
export function ComicSceneImage({ source, imageKey, style, priority = 'normal', contentFit = 'cover', backgroundColor = '#ECEEE9' }: {
  source: ImageProps['source']; imageKey: string; style: StyleProp<ViewStyle>; priority?: ImageProps['priority']; contentFit?: ImageProps['contentFit']; backgroundColor?: string;
}) {
  const { t } = useTranslation();
  const [displayed, setDisplayed] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${imageKey}:${attempt}`;
  return <View style={[{ overflow: 'hidden', backgroundColor }, style]}>
    <Image key={key} source={source} recyclingKey={key} style={StyleSheet.absoluteFill} contentFit={contentFit} cachePolicy="memory-disk" allowDownscaling enforceEarlyResizing priority={priority} transition={0} onDisplay={() => setDisplayed(key)} onError={() => setFailed(key)} accessible={false} />
    {displayed !== key && failed !== key ? <View pointerEvents="none" testID="comic-image-skeleton" style={[StyleSheet.absoluteFill, s.skeleton]}>
      <View style={s.horizon} /><View style={s.line} /><View style={[s.line, { width: '42%' }]} />
    </View> : null}
    {failed === key ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.retryImage')} onPress={() => setAttempt(value => value + 1)} style={[StyleSheet.absoluteFill, s.error]}><ThemedText style={s.errorLabel}>{t('comicDay.retryImage')}</ThemedText></Pressable> : null}
  </View>;
}
const s = StyleSheet.create({
  skeleton: { backgroundColor: '#ECEEE9', justifyContent: 'flex-end', padding: '9%', gap: 6 }, horizon: { position: 'absolute', left: '8%', right: '8%', top: '12%', height: '48%', backgroundColor: '#E0E3DC', borderRadius: 3 }, line: { width: '70%', height: 5, backgroundColor: '#D9DDD5', borderRadius: 3 },
  error: { backgroundColor: '#ECEEE9', justifyContent: 'center', alignItems: 'center', padding: 4 }, errorLabel: { color: '#666', fontSize: 11, textAlign: 'center' },
});
