import { Pressable } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
export function ComicDiaryMenuButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.library')} onPress={() => { tapHaptic(); onPress(); }} style={{ width: 42, height: 44, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={25} height={26} viewBox="0 0 26 26" accessible={false}>
      <Path d="M3.2 5.5Q13 4.8 22.2 5.1M3 12.5Q12.7 11.9 22.8 12.4M3.5 19.7Q13.7 20.1 22 19.1" fill="none" stroke="#353B2E" strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M4.1 6.5L19.8 6M5.2 13.4L21 13M4 20.6L18.4 20.3" fill="none" stroke="#646A5B" strokeWidth={0.45} opacity={0.55} strokeLinecap="round" />
    </Svg>
  </Pressable>;
}
