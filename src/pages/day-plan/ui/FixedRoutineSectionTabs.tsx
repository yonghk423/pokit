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

/** 투두 휴지통·액션 버튼과 동일 솔리드 음영 */
const ACTION_SHADOW = 1;
const ACTION_SOFT_SHADOW_LIGHT = 'rgba(0, 0, 0, 0.12)';
const ACTION_SOFT_SHADOW_DARK = 'rgba(255, 255, 255, 0.12)';

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
  /** 설정·템플릿 리스트와 같이 흰 면 */
  const face = isDark ? tone.surfaceAlt : '#FFFFFF';
  const divider = isDark ? 'rgba(241,239,255,0.22)' : 'rgba(24,26,46,0.12)';
  const activeBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(24,26,46,0.06)';
  const activeText = isDark ? tone.text : '#000000';
  const inactiveText = isDark ? tone.textMuted : '#000000';
  const softShadow = isDark ? ACTION_SOFT_SHADOW_DARK : ACTION_SOFT_SHADOW_LIGHT;

  return (
    <PostItCardShell
      compact
      isDark={isDark}
      faceColor={face}
      shadowColor={softShadow}
      shadowOffset={ACTION_SHADOW}
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
