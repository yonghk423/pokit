import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors, cityPopFont } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  onUpdatePress: () => void;
  onDismiss: () => void;
};

/**
 * 스토어에 새 버전이 있을 때 — 「오늘의 한 줄」 슬롯과 같은 레이아웃의 사전 안내.
 */
export function AppUpdateAvailablePostItNudge({ onUpdatePress, onDismiss }: Props) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.headerRow}>
        <ThemedText
          style={[styles.kicker, { color: tone.textMuted }, cityPopFont('700')]}
          lightColor={tone.textMuted}
          darkColor={tone.textMuted}>
          {t('appUpdate.nudgeKicker')}
        </ThemedText>
      </View>
      <ThemedText
        style={[styles.body, { color: tone.text }, cityPopFont('600')]}
        lightColor={tone.text}
        darkColor={tone.text}
        numberOfLines={3}>
        {t('appUpdate.nudgeMessage')}
      </ThemedText>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('appUpdate.laterA11y')}
          onPress={() => {
            void Haptics.selectionAsync();
            onDismiss();
          }}
          style={({ pressed }) => [
            styles.laterBtn,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
            pressed && styles.pressed,
          ]}>
          <ThemedText
            style={[styles.laterLabel, { color: tone.textMuted }, cityPopFont('600')]}
            lightColor={tone.textMuted}
            darkColor={tone.textMuted}>
            {t('appUpdate.laterBtn')}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('appUpdate.nudgeA11y')}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onUpdatePress();
          }}
          style={({ pressed }) => [
            styles.updateBtn,
            {
              backgroundColor: tone.bgMint,
              borderColor: isDark ? tone.primary : '#000000',
            },
            pressed && styles.pressed,
          ]}>
          <ThemedText
            style={[styles.updateLabel, { color: tone.primary }, cityPopFont('700')]}
            lightColor={tone.primary}
            darkColor={tone.primary}>
            {t('appUpdate.updateBtn')}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingRight: 2,
    paddingVertical: 4,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kicker: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 2,
  },
  laterBtn: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  laterLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  updateBtn: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  updateLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
});
