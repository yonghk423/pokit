import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

export function HeroGenerationLoading({ completed, total, images = [] }: { completed: number; total: number; images?: ImageSourcePropType[] }) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  // The service reports completed images, not generation percentages. This
  // explicitly estimated curve stays below completion while results are saved.
  const count = Math.max(1, total);
  const percent = Math.min(99, Math.floor(Math.max(
    Math.min(completed, count) / count * 95,
    90 * (1 - Math.exp(-elapsed / (60 * count))),
  )));
  return <ScrollView testID="hero-generation-loading" contentContainerStyle={s.root}>
    {images.length ? <View style={s.photos}>{images.slice(0, 3).map((source, index) => <View key={index} style={s.photo}>
      <Image testID="hero-generation-source" source={source} resizeMode="contain" style={s.image} />
    </View>)}</View> : null}
    <ThemedText style={s.title}>{t('comicDay.loading.title')}</ThemedText>
    <ThemedText accessibilityLiveRegion="polite" style={s.text}>{t('comicDay.ai.processing', { count: completed, total })}</ThemedText>
    <View accessibilityRole="progressbar" accessibilityLabel={t('comicDay.loading.estimated')} accessibilityValue={{ min: 0, max: 100, now: percent }} style={s.track}>
      <View testID="hero-generation-fill" style={[s.fill, { width: `${percent}%` }]} />
    </View>
    <ThemedText style={s.percent}>{percent}%</ThemedText>
    <ThemedText style={s.estimate}>{t('comicDay.loading.estimated')}</ThemedText>
    <ThemedText style={s.text}>{t(elapsed >= 90 ? 'comicDay.loading.longer' : 'comicDay.loading.hint')}</ThemedText>
    <ThemedText style={s.text}>{t('comicDay.loading.return')}</ThemedText>
  </ScrollView>;
}
const s = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 12 },
  photos: { width: '100%', maxWidth: 420, flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  photo: { flex: 1, maxWidth: 180, aspectRatio: 3 / 4, padding: 4, borderWidth: 0.8, borderColor: '#92928D', backgroundColor: '#F7F6F1' },
  image: { width: '100%', height: '100%' },
  title: { color: '#252822', fontSize: 22, lineHeight: 32, textAlign: 'center' },
  text: { color: '#73746E', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  track: { width: '100%', maxWidth: 420, height: 12, borderWidth: 1, borderColor: '#53594F', overflow: 'hidden', marginTop: 10 },
  fill: { height: '100%', backgroundColor: '#C5C1B5' },
  percent: { color: '#343B32', fontSize: 16, lineHeight: 22, fontVariant: ['tabular-nums'] },
  estimate: { color: '#73746E', fontSize: 12, lineHeight: 18, marginTop: -8 },
});
