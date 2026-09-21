import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { t } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

const SHADOW = 2;

type Props = {
  c: DayPlanPalette;
};

export function SettingsTopBarButton({ c: _c }: Props) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const shadow = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(24, 26, 46, 0.22)';
  const iconColor = isDark ? '#FAFAFA' : '#000000';
  const face = isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF';

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
        pressed && styles.pressed,
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
      <View style={[styles.iconHit, { backgroundColor: face, borderColor: isDark ? 'rgba(255,255,255,0.55)' : '#000000' }]}>
        <IconSymbol name="gearshape" size={18} color={iconColor} />
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
    borderWidth: 1,
    zIndex: 1,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
});
