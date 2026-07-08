import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

export type PriorityCatalogPageTab = 'catalog' | 'fixed';

type TabDef = {
  key: PriorityCatalogPageTab;
  label: string;
};

const TABS: TabDef[] = [
  { key: 'catalog', label: '루틴 목록' },
  { key: 'fixed', label: '고정 루틴' },
];

type Props = {
  tab: PriorityCatalogPageTab;
  onSelectTab: (tab: PriorityCatalogPageTab) => void;
  c: DayPlanPalette;
  isDark: boolean;
  /** 상위 보기(목록·시간대·타임라인) 아래 하위 탭 */
  compact?: boolean;
};

/** 루틴 탭 — 담기 목록 / 고정 루틴 커스텀 */
export function PriorityCatalogPageTabs({
  tab,
  onSelectTab,
  c,
  isDark,
  compact = false,
}: Props) {
  const pill = tabPillColors(isDark);

  return (
    <View style={styles.root}>
      {TABS.map((item) => {
        const active = tab === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            onPress={() => {
              if (active) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectTab(item.key);
            }}
            style={({ pressed }) => [
              styles.tab,
              compact && styles.tabCompact,
              {
                backgroundColor: active ? pill.activeBg : pill.inactiveBg,
                borderColor: active ? c.onSurface : c.catBorderIdle,
              },
              pressed && !active && { opacity: 0.72 },
            ]}>
            <ThemedText
              style={[
                compact ? styles.tabLabelCompact : styles.tabLabel,
                { color: active ? pill.activeText : pill.inactiveText },
              ]}>
              {item.label}
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
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 2,
    borderRadius: 0,
  },
  tabCompact: {
    minHeight: 32,
    paddingVertical: 6,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  tabLabelCompact: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
});
