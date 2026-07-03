import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { ThemedText } from '@shared/ui/themed-text';

import type { HistoryPeriod } from '../lib/historyPeriodRange';

type Props = {
  period: HistoryPeriod;
  onSelectPeriod: (period: HistoryPeriod) => void;
  ink: string;
  muted: string;
  isDark: boolean;
};

const TABS: { id: HistoryPeriod; label: string }[] = [
  { id: 'week', label: '주간' },
  { id: 'month', label: '월간' },
];

export function HistoryPeriodTabs({ period, onSelectPeriod, ink, muted, isDark }: Props) {
  const pill = tabPillColors(isDark);

  return (
    <View style={styles.root}>
      {TABS.map((tab) => {
        const active = period === tab.id;
        return (
          <Pressable
            key={tab.id}
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
              {
                backgroundColor: active ? pill.activeBg : pill.inactiveBg,
                borderColor: active ? pill.activeBorder : pill.inactiveBorder,
              },
              pressed && !active && styles.pressed,
            ]}>
            <ThemedText
              style={[styles.label, { color: active ? ink : muted }]}
              lightColor={active ? ink : muted}
              darkColor={active ? ink : muted}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.88,
  },
});
