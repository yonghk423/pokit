import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

export type PriorityCatalogPageTab = 'catalog' | 'fixed';

type TabDef = {
  key: PriorityCatalogPageTab;
  labelKey: I18nKey;
};

const TABS: TabDef[] = [
  { key: 'catalog', labelKey: 'tabs.myRoutines' },
  { key: 'fixed', labelKey: 'fixedRoutine.tabFixed' },
];

type Props = {
  tab: PriorityCatalogPageTab;
  onSelectTab: (tab: PriorityCatalogPageTab) => void;
  c: DayPlanPalette;
  isDark: boolean;
  /** @deprecated 트랙형 세그먼트로 통일 — 무시됨 */
  compact?: boolean;
};

/**
 * 나만의 루틴 탭 — City Pop Minimalist 트랙 세그먼트.
 * 두툼한 부착형+솔리드 섀도 대신, 따뜻한 트랙 안 민트 필로 선택감을 준다.
 */
export function PriorityCatalogPageTabs({
  tab,
  onSelectTab,
  c: _c,
  isDark,
}: Props) {
  const { t } = useTranslation();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const border = tone.border;
  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(53, 102, 104, 0.08)';
  const activeBg = tone.primaryContainer;
  const activeText = isDark ? tone.primary : tone.primary;
  const inactiveText = tone.textMuted;

  return (
    <View style={[styles.track, { backgroundColor: trackBg, borderColor: border }]}>
      {TABS.map((item) => {
        const active = tab === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(item.labelKey)}
            onPress={() => {
              if (active) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectTab(item.key);
            }}
            style={({ pressed }) => [
              styles.tab,
              active && [
                styles.tabActive,
                {
                  backgroundColor: activeBg,
                  borderColor: border,
                },
              ],
              pressed && { opacity: 0.88 },
            ]}>
            <ThemedText
              style={[
                styles.tabLabel,
                active && styles.tabLabelActive,
                { color: active ? activeText : inactiveText },
              ]}
              numberOfLines={1}>
              {t(item.labelKey)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: 0,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 0,
    borderWidth: 0,
  },
  tabActive: {
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    fontWeight: '800',
    letterSpacing: -0.25,
  },
});
