import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
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

/** 루틴 탭 — 좌상단 컴팩트 포스트잇 세그먼트 */
export function FixedRoutineSectionTabs({
  section,
  onSelectSection,
  c: _c,
  isDark,
}: Props) {
  const { t } = useTranslation();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const face = tone.primaryContainer;
  const divider = isDark ? 'rgba(241,239,255,0.22)' : 'rgba(48,97,99,0.18)';
  const activeBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.72)';
  const activeText = isDark ? tone.text : tone.primary;
  const inactiveText = isDark ? tone.textMuted : tone.primary;

  return (
    <PostItCardShell
      compact
      isDark={isDark}
      faceColor={face}
      style={styles.root}
      contentStyle={styles.track}>
      {TABS.map((tab, index) => {
        const active = section === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(tab.labelKey)}
            onPress={() => {
              if (active) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectSection(tab.key);
            }}
            style={({ pressed }) => [
              styles.tab,
              index > 0 && [styles.tabJoin, { borderLeftColor: divider }],
              {
                backgroundColor: active ? activeBg : 'transparent',
              },
              pressed && { opacity: 0.88 },
            ]}>
            <ThemedText
              style={[
                styles.tabLabel,
                active && styles.tabLabelActive,
                { color: active ? activeText : inactiveText },
              ]}
              numberOfLines={1}>
              {t(tab.labelKey)}
            </ThemedText>
          </Pressable>
        );
      })}
    </PostItCardShell>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: 8,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 2,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tabJoin: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  tabLabelActive: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
