import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';

import {
  useDayPlanDraftStore,
  useDayPlanStore,
  useDayPlanLayoutModeVisibilityStore,
} from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedView } from '@shared/ui/themed-view';

import { palette } from '../lib/dayPlanPalette';
import { resolveCatalogLayoutMode } from '../lib/priorityCatalogLayoutMode';
import { coerceDayPlanLayoutMode } from '@shared/lib/storage/dayPlanLayoutModeVisibility';
import { DayPlanLayoutModeTabs, type DayPlanLayoutMode } from './DayPlanLayoutModeTabs';
import { FixedRoutinePage } from './FixedRoutinePage';
import { PriorityCatalogPageTabs, type PriorityCatalogPageTab } from './PriorityCatalogPageTabs';

export function PriorityCatalogPage() {
  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);

  const {
    priorityMealSlotLayoutEnabled,
    prioritySpineLayoutEnabled,
    setPlanMode,
    setPriorityMealSlotLayoutEnabled,
    setPrioritySpineLayoutEnabled,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      priorityMealSlotLayoutEnabled: s.priorityMealSlotLayoutEnabled,
      prioritySpineLayoutEnabled: s.prioritySpineLayoutEnabled,
      setPlanMode: s.setPlanMode,
      setPriorityMealSlotLayoutEnabled: s.setPriorityMealSlotLayoutEnabled,
      setPrioritySpineLayoutEnabled: s.setPrioritySpineLayoutEnabled,
    })),
  );

  const visibility = useDayPlanLayoutModeVisibilityStore((s) => s.visibility);
  const coerceLayoutMode = useDayPlanLayoutModeVisibilityStore((s) => s.coerceMode);
  const hydrateLayoutModeVisibility = useDayPlanLayoutModeVisibilityStore((s) => s.hydrate);

  const catalogLayoutMode = useMemo(
    () =>
      resolveCatalogLayoutMode({
        priorityMealSlotLayoutEnabled,
        prioritySpineLayoutEnabled,
      }),
    [priorityMealSlotLayoutEnabled, prioritySpineLayoutEnabled],
  );

  const effectiveCatalogLayoutMode = useMemo(
    () => coerceDayPlanLayoutMode(catalogLayoutMode, visibility),
    [catalogLayoutMode, visibility],
  );

  useEffect(() => {
    hydrateLayoutModeVisibility();
  }, [hydrateLayoutModeVisibility]);

  useEffect(() => {
    if (effectiveCatalogLayoutMode === catalogLayoutMode) return;
    setPlanMode('priority');
    setPriorityMealSlotLayoutEnabled(effectiveCatalogLayoutMode === 'sections');
    setPrioritySpineLayoutEnabled(effectiveCatalogLayoutMode === 'spine');
  }, [
    catalogLayoutMode,
    effectiveCatalogLayoutMode,
    setPlanMode,
    setPriorityMealSlotLayoutEnabled,
    setPrioritySpineLayoutEnabled,
  ]);

  const visibleLayoutModes = useMemo(
    () => (['bag', 'sections', 'spine'] as const).filter((mode) => visibility[mode]),
    [visibility],
  );

  const onSelectCatalogLayoutMode = useCallback(
    (mode: DayPlanLayoutMode) => {
      const nextMode = coerceLayoutMode(mode);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPlanMode('priority');
      setPriorityMealSlotLayoutEnabled(nextMode === 'sections');
      setPrioritySpineLayoutEnabled(nextMode === 'spine');
    },
    [coerceLayoutMode, setPlanMode, setPriorityMealSlotLayoutEnabled, setPrioritySpineLayoutEnabled],
  );

  const [catalogPageTab, setCatalogPageTab] = useState<PriorityCatalogPageTab>('catalog');

  const shellBg = c.containerLow;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: shellBg }]} darkColor={shellBg} lightColor={shellBg}>
      <View style={[styles.safe, { backgroundColor: shellBg }]}>
        <View style={[styles.stickyHeader, { backgroundColor: shellBg, paddingHorizontal: 20 }]}>
          {visibleLayoutModes.length > 0 ? (
            <View style={styles.layoutModeRow}>
              <DayPlanLayoutModeTabs
                mode={effectiveCatalogLayoutMode}
                onSelectMode={onSelectCatalogLayoutMode}
                c={c}
                isDark={isDark}
                visibleModes={visibleLayoutModes}
                showLabels
              />
            </View>
          ) : null}
          <PriorityCatalogPageTabs
            tab={catalogPageTab}
            onSelectTab={setCatalogPageTab}
            c={c}
            isDark={isDark}
            compact
          />
        </View>
        {catalogPageTab === 'catalog' ? (
          <FixedRoutinePage
            embeddedCustomOnly
            controlledLayoutMode={effectiveCatalogLayoutMode}
            hideLayoutModeHeader
          />
        ) : (
          <FixedRoutinePage
            embeddedPresetOnly
            controlledLayoutMode={effectiveCatalogLayoutMode}
            hideLayoutModeHeader
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  stickyHeader: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
    zIndex: 2,
  },
  layoutModeRow: {
    marginBottom: 2,
  },
});
