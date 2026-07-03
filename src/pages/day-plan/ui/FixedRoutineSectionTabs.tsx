import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

export type FixedRoutineSection = 'scheduled' | 'custom';

type TabDef = {
  key: FixedRoutineSection;
  label: string;
};

const TABS: TabDef[] = [
  { key: 'scheduled', label: '고정 루틴' },
  { key: 'custom', label: '나만의 루틴' },
];

type Props = {
  section: FixedRoutineSection;
  onSelectSection: (section: FixedRoutineSection) => void;
  c: DayPlanPalette;
  isDark: boolean;
};

export function FixedRoutineSectionTabs({ section, onSelectSection, c, isDark }: Props) {
  const pill = tabPillColors(isDark);

  return (
    <View style={styles.root}>
      {TABS.map((tab) => {
        const active = section === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (active) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectSection(tab.key);
            }}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: active ? pill.activeBg : pill.inactiveBg,
                borderColor: active ? pill.activeBorder : pill.inactiveBorder,
              },
              pressed && !active && { opacity: 0.88 },
            ]}>
            <ThemedText
              style={[
                styles.tabLabel,
                { color: active ? c.onSurface : c.onVariant },
              ]}
              numberOfLines={1}>
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
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
