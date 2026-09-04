import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { RETRO_BORDER_WIDTH, RetroFlatColors } from '@shared/config/retroFlat';
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

const SHADOW = 2;

type Props = {
  section: FixedRoutineSection;
  onSelectSection: (section: FixedRoutineSection) => void;
  c: DayPlanPalette;
  isDark: boolean;
};

/** 루틴 탭 — City Pop 부착형 세그먼트 (솔리드 섀도 + 민트 활성) */
export function FixedRoutineSectionTabs({
  section,
  onSelectSection,
  c: _c,
  isDark,
}: Props) {
  const { t } = useTranslation();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const border = tone.border;
  const shadowColor = isDark ? tone.solidShadow : tone.primary;
  const activeBg = tone.primaryContainer;
  const activeText = tone.primary;
  const inactiveBg = isDark ? tone.surfaceAlt : '#FFFFFF';
  const inactiveText = tone.textMuted;

  return (
    <View style={[styles.root, { marginRight: SHADOW, marginBottom: SHADOW + 10 }]}>
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
                index > 0 && styles.tabJoin,
                {
                  backgroundColor: active ? activeBg : 'transparent',
                  borderColor: border,
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
    borderRadius: 0,
  },
  tabJoin: {
    borderLeftWidth: RETRO_BORDER_WIDTH,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    fontWeight: '800',
    letterSpacing: -0.25,
  },
});
