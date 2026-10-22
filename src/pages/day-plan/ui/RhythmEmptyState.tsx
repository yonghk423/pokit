import { memo, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { View, StyleSheet } from 'react-native';
import { getPreparedRhythmArtwork, prepareRhythmArtwork } from '../lib/rhythmArtworkCache';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

// Display the original proposal pixels, rather than redrawing the approved sketches.
const artworkRegions = {
  empty: { x: 112, y: 320, width: 320, height: 285 },
  ended: { x: 900, y: 350, width: 300, height: 255 },
};
const RhythmStateArtwork = memo(function RhythmStateArtwork({ ended }: { ended: boolean }) {
  const [source, setSource] = useState(getPreparedRhythmArtwork);
  useEffect(() => {
    let active = true;
    void prepareRhythmArtwork().then(() => { if (active) setSource(getPreparedRhythmArtwork()); });
    return () => { active = false; };
  }, []);
  const region = artworkRegions[ended ? 'ended' : 'empty'];
  const scale = 185 / region.width;
  return <View accessible={false} style={{ width: 185, height: 165, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 185, height: region.height * scale, overflow: 'hidden' }}>
      <Image source={source} accessible={false} contentFit="fill" transition={0} cachePolicy="memory" priority="high" allowDownscaling={false}
        style={{ position: 'absolute', width: 1536 * scale, height: 1024 * scale, left: -region.x * scale, top: -region.y * scale }} />
    </View>
  </View>;
});

export function RhythmEmptyState({ ended, ink, muted }: { ended: boolean; ink: string; muted: string }) {
  const { t } = useTranslation();
  return <View pointerEvents="none" style={s.content}>
    <RhythmStateArtwork ended={ended} />
    <ThemedText style={[s.title, { color: ink }]}>{t(ended ? 'dayPlan.rhythmEndedTitle' : 'dayPlan.rhythmEmptyTitle')}</ThemedText>
    <ThemedText style={[s.subtitle, { color: muted }]}>{t(ended ? 'dayPlan.rhythmEndedBody' : 'dayPlan.rhythmEmptyBody')}</ThemedText>
  </View>;
}
const s = StyleSheet.create({
  content: { alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  title: { fontSize: 19, lineHeight: 27, textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
