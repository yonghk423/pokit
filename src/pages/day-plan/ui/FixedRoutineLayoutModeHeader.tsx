import { StyleSheet, View } from 'react-native';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { DayPlanLayoutModeTabs, type DayPlanLayoutMode } from './DayPlanLayoutModeTabs';

type Props = {
  layoutMode: DayPlanLayoutMode;
  onSelectLayoutMode: (mode: DayPlanLayoutMode) => void;
  visibleLayoutModes: readonly DayPlanLayoutMode[];
  c: DayPlanPalette;
  isDark: boolean;
};

/** 나만의 루틴 — 오늘 탭 보기(목록·시간대·타임라인)별 설정 전환 */
export function FixedRoutineLayoutModeHeader({
  layoutMode,
  onSelectLayoutMode,
  visibleLayoutModes,
  c,
  isDark,
}: Props) {
  return (
    <View style={styles.root}>
      <DayPlanLayoutModeTabs
        mode={layoutMode}
        onSelectMode={onSelectLayoutMode}
        c={c}
        isDark={isDark}
        visibleModes={visibleLayoutModes}
        showLabels
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 2,
    marginBottom: 4,
  },
});
