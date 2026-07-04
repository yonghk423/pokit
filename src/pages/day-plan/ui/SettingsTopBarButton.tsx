import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

type Props = {
  c: DayPlanPalette;
};

export function SettingsTopBarButton({ c }: Props) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const pill = tabPillColors(isDark);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="설정"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/settings');
      }}
      style={({ pressed }) => [
        styles.iconHit,
        {
          backgroundColor: c.containerLowest,
          borderColor: c.border,
        },
        pressed && styles.iconPressed,
      ]}>
      <IconSymbol name="gearshape" size={18} color={pill.inactiveIcon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconHit: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 2,
  },
  iconPressed: {
    opacity: 0.72,
  },
});
