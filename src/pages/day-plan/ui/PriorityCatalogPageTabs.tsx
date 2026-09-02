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

const SHADOW_SM = 2;

type Props = {
  tab: PriorityCatalogPageTab;
  onSelectTab: (tab: PriorityCatalogPageTab) => void;
  c: DayPlanPalette;
  isDark: boolean;
  /** @deprecated 부착 세그먼트로 통일 — 무시됨 */
  compact?: boolean;
};

/** 나만의 루틴 탭 — 루틴 목록과 동일 톤의 부착 세그먼트 */
export function PriorityCatalogPageTabs({
  tab,
  onSelectTab,
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
      {TABS.map((item, index) => {
        const active = tab === item.key;
        const isFirst = index === 0;
        return (
          <View key={item.key} style={styles.tabShell}>
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
              accessibilityLabel={t(item.labelKey)}
              onPress={() => {
                if (active) return;
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectTab(item.key);
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
                {t(item.labelKey)}
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
    paddingHorizontal: 6,
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
