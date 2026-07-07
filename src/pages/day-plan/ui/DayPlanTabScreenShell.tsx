import { useRouter, useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useDayPlanDraftStore } from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

import type { PlanMode } from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { PlanModeSwitch } from './PlanModeSwitch';
import { SettingsTopBarButton } from './SettingsTopBarButton';

type Props = {
  children: ReactNode;
};

/** 스토리 탭 제외 메인 탭 — 상단 데일리·메모 전환을 항상 고정 */
export function DayPlanTabScreenShell({ children }: Props) {
  const router = useRouter();
  const segments = useSegments();
  const isDayPlanTab = segments.some((segment) => segment === 'day-plan');
  const isDark = useColorScheme() === 'dark';
  const c = palette(isDark);
  const shellBg = c.containerLow;
  const { planMode, setPlanMode } = useDayPlanDraftStore(
    useShallow((s) => ({
      planMode: s.planMode,
      setPlanMode: s.setPlanMode,
    })),
  );

  const handleSelectMode = useCallback(
    (mode: PlanMode) => {
      setPlanMode(mode);
      if (
        (mode === 'quickMemo' ||
          mode === 'dayNote' ||
          mode === 'todoList' ||
          mode === 'reading') &&
        !isDayPlanTab
      ) {
        router.push('/(tabs)/day-plan');
      }
    },
    [isDayPlanTab, router, setPlanMode],
  );

  return (
    <View style={[styles.root, { backgroundColor: shellBg }]}>
      <SafeAreaView style={[styles.safe, { backgroundColor: shellBg }]} edges={['top']}>
        <View style={[styles.stickyTopBar, { backgroundColor: shellBg }]}>
          <PlanModeSwitch
            planMode={planMode}
            onSelectMode={handleSelectMode}
            c={c}
            trailing={<SettingsTopBarButton c={c} />}
          />
        </View>
        <View style={styles.body}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  stickyTopBar: {
    paddingTop: 12,
    zIndex: 2,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
