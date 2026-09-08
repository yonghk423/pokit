import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { t } from '@shared/lib/i18n';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

const SHADOW = 2;

type Props = {
  c: DayPlanPalette;
};

export function SettingsTopBarButton({ c }: Props) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const pill = tabPillColors(isDark);
  const shadow = isDark ? RetroFlatColors.dark.solidShadow : '#000000';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('settings.title')}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/settings');
      }}
      style={({ pressed }) => [
        styles.shell,
        { marginRight: SHADOW, marginBottom: SHADOW },
        pressed && styles.iconPressed,
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            backgroundColor: shadow,
            transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
          },
        ]}
      />
      <View style={[styles.iconHit, { backgroundColor: c.containerLowest }]}>
        <IconSymbol name="gearshape" size={18} color={pill.inactiveIcon} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  iconHit: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 0,
    zIndex: 1,
  },
  iconPressed: {
    opacity: 0.72,
  },
});
