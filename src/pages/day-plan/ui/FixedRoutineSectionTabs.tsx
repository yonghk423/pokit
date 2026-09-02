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

/** 시안 `.brutal-shadow-sm` — 2px 2px 0 #181A2E */
const SHADOW_SM = 2;

type Props = {
  section: FixedRoutineSection;
  onSelectSection: (section: FixedRoutineSection) => void;
  c: DayPlanPalette;
  isDark: boolean;
};

/** 루틴 탭 — 시안형 부착 세그먼트 (색·보더·shadow 동일) */
export function FixedRoutineSectionTabs({
  section,
  onSelectSection,
  c: _c,
  isDark,
}: Props) {
  const { t } = useTranslation();
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
        const active = section === tab.key;
        const isFirst = index === 0;
        return (
          <View key={tab.key} style={styles.tabShell}>
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
              accessibilityLabel={t(tab.labelKey)}
              onPress={() => {
                if (active) return;
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectSection(tab.key);
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
                style={[styles.tabLabel, { color: active ? activeText : inactiveText }]}
                numberOfLines={1}>
                {t(tab.labelKey)}
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
    /** shadow 여유만 — 탭 전환 시 큰 mb-lg(48)는 콘텐츠 점프처럼 보임 */
    marginBottom: 12 + SHADOW_SM,
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
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
