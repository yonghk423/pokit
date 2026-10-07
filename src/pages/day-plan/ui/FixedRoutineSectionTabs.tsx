import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

export type FixedRoutineSection = 'catalog' | 'templates';

type TabDef = {
  key: FixedRoutineSection;
  labelKey: I18nKey;
};

const TABS: TabDef[] = [
  { key: 'catalog', labelKey: 'catalog.routineListTab' },
  { key: 'templates', labelKey: 'catalog.routineTemplatesTab' },
];

type Props = {
  section: FixedRoutineSection;
  onSelectSection: (section: FixedRoutineSection) => void;
  c: DayPlanPalette;
  isDark: boolean;
};

/**
 * 루틴 탭 — 목록 / 템플릿 전환.
 * 오늘 탭 행 아코디언 「컬러 관리」탭 스트립과 동일한 버튼 칩 형식.
 */
export function FixedRoutineSectionTabs({
  section,
  onSelectSection,
  c,
  isDark,
}: Props) {
  const { t } = useTranslation();
  const ink = c.onSurface;
  const selectedBg = isDark ? RetroFlatColors.dark.bgMint : RetroFlatColors.light.bgMint;
  const selectedInk = isDark ? RetroFlatColors.dark.primary : RetroFlatColors.light.primary;

  return (
    <View style={styles.tabRow} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const active = section === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(tab.labelKey)}
            hitSlop={4}
            onPress={() => {
              if (active) return;
              void Haptics.selectionAsync();
              onSelectSection(tab.key);
            }}
            style={({ pressed }) => [
              styles.tabChip,
              {
                borderColor: ink,
                backgroundColor: active ? selectedBg : 'transparent',
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText
              style={[styles.tabLabel, { color: active ? selectedInk : ink }]}
              numberOfLines={1}>
              {t(tab.labelKey)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 8,
  },
  tabChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 13,
  },
  pressed: {
    transform: [{ translateX: 0.5 }, { translateY: 0.5 }],
  },
});
