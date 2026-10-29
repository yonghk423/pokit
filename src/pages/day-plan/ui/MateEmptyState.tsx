import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { ThemedText } from '@shared/ui/themed-text';
import Svg, { Circle, Path } from 'react-native-svg';

function CardListEmptyArtwork({ ink }: { ink: string }) {
  return <Svg width={185} height={165} viewBox="0 0 185 165" accessible={false}>
    <Path d="M24 34 130 27 151 43 148 136 38 145 21 128Z" fill="#F4F0E6" stroke={ink} strokeWidth={2.5} strokeLinejoin="round" opacity={0.56} />
    <Path d="M34 23 139 18 160 35 157 128" fill="none" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" opacity={0.68} />
    <Path d="M31 31 Q31 24 40 24 L144 24 Q152 25 152 33 L149 139 Q148 147 140 147 L37 149 Q29 148 29 140Z" fill="#FFFDF7" stroke={ink} strokeWidth={2.8} strokeLinejoin="round" />
    <Path d="M34 35 Q35 29 42 29 L143 29" fill="none" stroke={ink} strokeWidth={1.1} opacity={0.48} strokeLinecap="round" />
    <Path d="M33 153 Q82 158 151 151 M39 157 l8 4 m8 -4 8 4 m8 -4 8 4 m8 -4 8 4 m8 -4 8 4 m8 -4 8 4" fill="none" stroke={ink} strokeWidth={1.5} opacity={0.38} strokeLinecap="round" />
    <Circle cx={145} cy={125} r={20} fill="#BDE8DF" stroke={ink} strokeWidth={2.2} />
    <Circle cx={146} cy={124} r={18.5} fill="none" stroke={ink} strokeWidth={0.9} opacity={0.42} />
    <Path d="M145 115 L145 135 M135 125 L155 125 M144 114 L144 136 M134 125 L156 125" fill="none" stroke={ink} strokeWidth={3.2} strokeLinecap="round" />
  </Svg>;
}

export function RhythmEmptyState({ ended, ink, muted, presentation, onAdd, testID }: { ended: boolean; ink: string; muted: string; presentation: 'circle' | 'comic' | 'cards'; onAdd?: () => void; testID?: string }) {
  const { t } = useTranslation();
  if (presentation === 'cards') {
    return <View style={s.content}>
      <ServiceTutorialTarget steps={['rhythmAdd']}><Pressable
        testID={testID}
        onPress={() => {
          tapHaptic();
          onAdd?.();
        }}
        disabled={!onAdd}
        accessibilityRole="button"
        accessibilityLabel={t('dayPlan.addRoutine')}
        hitSlop={14}
      >
        <CardListEmptyArtwork ink={ink} />
      </Pressable></ServiceTutorialTarget>
    </View>;
  }
  return <View pointerEvents="none" style={s.content}>
    <CardListEmptyArtwork ink={ink} />
    <ThemedText style={[s.title, { color: ink }]}>{t(ended ? 'dayPlan.rhythmEndedTitle' : 'dayPlan.rhythmEmptyTitle')}</ThemedText>
    <ThemedText style={[s.subtitle, { color: muted }]}>{t(ended ? 'dayPlan.rhythmEndedBody' : 'dayPlan.rhythmEmptyBody')}</ThemedText>
  </View>;
}
const s = StyleSheet.create({
  content: { alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  title: { fontSize: 19, lineHeight: 27, textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
