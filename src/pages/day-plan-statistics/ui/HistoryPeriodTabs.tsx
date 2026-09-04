import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { RETRO_BORDER_WIDTH, RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import type { HistoryPeriod } from '../lib/historyPeriodRange';

type Props = {
  period: HistoryPeriod;
  onSelectPeriod: (period: HistoryPeriod) => void;
  isDark: boolean;
};

const TABS: { id: HistoryPeriod; labelKey: 'history.period.week' | 'history.period.month' }[] = [
  { id: 'week', labelKey: 'history.period.week' },
  { id: 'month', labelKey: 'history.period.month' },
];

const SHADOW = 2;

/** 히스토리 — 루틴 탭과 동일 톤의 부착 세그먼트 */
export function HistoryPeriodTabs({ period, onSelectPeriod, isDark }: Props) {
  const { t } = useTranslation();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const border = tone.border;
  const shadowColor = isDark ? tone.solidShadow : tone.primary;
  const activeBg = tone.primaryContainer;
  const activeText = tone.primary;
  const inactiveBg = isDark ? tone.surfaceAlt : '#FFFFFF';
  const inactiveText = tone.textMuted;

  return (
    <View style={[styles.root, { marginRight: SHADOW, marginBottom: SHADOW }]}>
      <View
        pointerEvents="none"
        style={[
          styles.trackShadow,
          {
            backgroundColor: shadowColor,
            borderColor: border,
            transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
          },
        ]}
      />
      <View style={[styles.track, { borderColor: border, backgroundColor: inactiveBg }]}>
        {TABS.map((tab, index) => {
          const active = period === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(tab.labelKey)}
              onPress={() => {
                if (active) return;
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectPeriod(tab.id);
              }}
              style={({ pressed }) => [
                styles.tab,
                index > 0 && styles.tabJoin,
                {
                  backgroundColor: active ? activeBg : 'transparent',
                  borderColor: border,
                },
                pressed && { opacity: 0.88 },
              ]}>
              <ThemedText
                style={[
                  styles.label,
                  active && styles.labelActive,
                  { color: active ? activeText : inactiveText },
                ]}
                numberOfLines={1}>
                {t(tab.labelKey)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    width: '100%',
  },
  trackShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 0,
  },
  tabJoin: {
    borderLeftWidth: RETRO_BORDER_WIDTH,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  labelActive: {
    fontWeight: '800',
  },
});
