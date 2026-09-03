import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import {
  useDayPlanDraftStore,
  useDayPlanStore,
  useDayPlanLayoutModeVisibilityStore,
  useFixedFlowSetsStore,
  notifyFixedFlowApplyScheduleChanged,
} from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedView } from '@shared/ui/themed-view';

import { palette } from '../lib/dayPlanPalette';
import { resolveCatalogLayoutMode } from '../lib/priorityCatalogLayoutMode';
import { coerceDayPlanLayoutMode } from '@shared/lib/storage/dayPlanLayoutModeVisibility';
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

  const setFixedRoutineApplyLayoutMode = useFixedFlowSetsStore(
    (s) => s.setFixedRoutineApplyLayoutMode,
  );

  useEffect(() => {
    if (effectiveCatalogLayoutMode === catalogLayoutMode) return;
    setPlanMode('priority');
    setPriorityMealSlotLayoutEnabled(effectiveCatalogLayoutMode === 'sections');
    setPrioritySpineLayoutEnabled(effectiveCatalogLayoutMode === 'spine');
    setFixedRoutineApplyLayoutMode(effectiveCatalogLayoutMode);
    notifyFixedFlowApplyScheduleChanged();
  }, [
    catalogLayoutMode,
    effectiveCatalogLayoutMode,
    setPlanMode,
    setPriorityMealSlotLayoutEnabled,
    setPrioritySpineLayoutEnabled,
    setFixedRoutineApplyLayoutMode,
  ]);

  const [catalogPageTab, setCatalogPageTab] = useState<PriorityCatalogPageTab>('catalog');

  const shellBg = c.containerLow;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: shellBg }]} darkColor={shellBg} lightColor={shellBg}>
      <View style={[styles.safe, { backgroundColor: shellBg }]}>
        <View style={[styles.stickyHeader, { backgroundColor: shellBg, paddingHorizontal: 20 }]}>
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
});
