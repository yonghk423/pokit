import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  useDayPlanDraftStore,
  useDayPlanLayoutModeVisibilityStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedView } from '@shared/ui/themed-view';
import { useShallow } from 'zustand/react/shallow';

import { palette } from '../lib/dayPlanPalette';
import type { DayPlanLayoutMode } from './DayPlanLayoutModeTabs';
import { FixedRoutinePage } from './FixedRoutinePage';

/**
 * 하단 「나만의 루틴」탭 — 데일리·주말·직접 만든 그룹을 한 화면에서 관리.
 */
export function PriorityCatalogPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);
  void c;

  const planMode = useDayPlanDraftStore((s) => s.planMode);
  const layoutModeVisibility = useDayPlanLayoutModeVisibilityStore((s) => s.visibility);
  const {
    fixedRoutineApplyLayoutMode,
    setFixedRoutineApplyLayoutMode,
  } = useFixedFlowSetsStore(
    useShallow((s) => ({
      fixedRoutineApplyLayoutMode: s.fixedRoutineApplyLayoutMode,
      setFixedRoutineApplyLayoutMode: s.setFixedRoutineApplyLayoutMode,
    })),
  );

  const effectiveCatalogLayoutMode: DayPlanLayoutMode = useMemo(() => {
    if (planMode === 'spine' && layoutModeVisibility.spine) return 'spine';
    if (planMode === 'sections' && layoutModeVisibility.sections) return 'sections';
    return 'bag';
  }, [layoutModeVisibility.sections, layoutModeVisibility.spine, planMode]);

  useEffect(() => {
    if (fixedRoutineApplyLayoutMode === effectiveCatalogLayoutMode) return;
    setFixedRoutineApplyLayoutMode(effectiveCatalogLayoutMode);
  }, [
    effectiveCatalogLayoutMode,
    fixedRoutineApplyLayoutMode,
    setFixedRoutineApplyLayoutMode,
  ]);

  const shellBg = isDark ? RetroFlatColors.dark.bg : RetroFlatColors.light.bg;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: shellBg }]} darkColor={shellBg} lightColor={shellBg}>
      <View style={[styles.safe, { backgroundColor: shellBg }]}>
        <FixedRoutinePage
          embeddedCustomOnly
          controlledLayoutMode={effectiveCatalogLayoutMode}
          hideLayoutModeHeader
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
});
