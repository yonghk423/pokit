import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { ThemedText } from '@shared/ui/themed-text';

import type { HistoryPeriod } from '../lib/historyPeriodRange';

type Props = {
  period: HistoryPeriod;
  onSelectPeriod: (period: HistoryPeriod) => void;
  isDark: boolean;
};

const TABS: { id: HistoryPeriod; label: string }[] = [
  { id: 'week', label: '주간' },
  { id: 'month', label: '월간' },
];

const SHADOW_SM = 2;

/** 히스토리 — 루틴 탭과 동일 톤의 부착 세그먼트 */
export function HistoryPeriodTabs({ period, onSelectPeriod, isDark }: Props) {
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const border = tone.border;
  const shadowColor = isDark ? tone.solidShadow : tone.text;
  const activeBg = tone.primaryContainer;
  const activeText = tone.primary;
  const inactiveBg = isDark ? tone.surfaceAlt : '#FFFFFF';
  const inactiveText = tone.textMuted;

  return (
    <View style={styles.root}>
      {TABS.map((tab, index) => {
        const active = period === tab.id;
        const isFirst = index === 0;
        return (
          <View key={tab.id} style={styles.tabShell}>
            {active ? (
              <View
                pointerEvents="none"
                style={[
                  styles.tabShadow,
                  {
                    backgroundColor: shadowColor,
                    borderColor: border,
                    transform: [{ translateX: SHADOW_SM }, { translateY: SHADOW_SM }],
                  },
                ]}
              />
            ) : null}
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              onPress={() => {
                if (active) return;
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectPeriod(tab.id);
              }}
              style={({ pressed }) => [
                styles.tab,
                !isFirst && styles.tabJoin,
                {
                  backgroundColor: active ? activeBg : inactiveBg,
                  borderColor: border,
                },
                pressed && { opacity: 0.92 },
              ]}>
              <ThemedText
                style={[styles.label, { color: active ? activeText : inactiveText }]}
                numberOfLines={1}>
                {tab.label}
              </ThemedText>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginRight: SHADOW_SM,
    marginBottom: SHADOW_SM,
  },
  tabShell: {
    flex: 1,
    position: 'relative',
  },
  tabShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: 0,
  },
  tab: {
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    zIndex: 1,
  },
  tabJoin: {
    borderLeftWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
