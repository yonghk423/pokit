import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { consumePendingWidgetPlanMode, useDayPlanDraftStore } from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

import type { PlanMode } from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { PlanModeSwitch } from './PlanModeSwitch';
import { SettingsTopBarButton } from './SettingsTopBarButton';

const WIDGET_PLAN_MODES: readonly PlanMode[] = [
  'priority',
  'todoList',
  'reading',
  'quickMemo',
  'dayNote',
];

function planModeFromWidgetParam(value: string | string[] | undefined): PlanMode | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  return WIDGET_PLAN_MODES.includes(raw as PlanMode) ? (raw as PlanMode) : null;
}

function planModeFromPending(value: string | null): PlanMode | null {
  if (!value) return null;
  return WIDGET_PLAN_MODES.includes(value as PlanMode) ? (value as PlanMode) : null;
}

type Props = {
  children: ReactNode;
};

/**
 * 스토리 탭 제외 메인 탭 — 상단 데일리·메모 전환을 항상 고정.
 * SafeAreaView 조건부 래핑을 쓰지 않고 insets.paddingTop 만 사용해
 * 탭 전환 시 상단 점프를 막는다.
 */
export function DayPlanTabScreenShell({ children }: Props) {
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams<{ planMode?: string | string[] }>();
  const insets = useSafeAreaInsets();
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

  useEffect(() => {
    const next = planModeFromWidgetParam(params.planMode);
    if (!next) return;
    setPlanMode(next);
    // 위젯 딥링크는 항상 오늘 탭으로 보낸다 (다른 탭·콜드스타트에서도 전환이 끊기지 않게).
    router.replace('/(tabs)/day-plan');
  }, [params.planMode, router, setPlanMode]);

  // Open Intent 탭: App Group에 남긴 planMode를 적용한다.
  useEffect(() => {
    let cancelled = false;
    const applyPending = async () => {
      const next = planModeFromPending(await consumePendingWidgetPlanMode());
      if (cancelled || !next) return;
      setPlanMode(next);
      router.replace('/(tabs)/day-plan');
    };
    void applyPending();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void applyPending();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [router, setPlanMode]);

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
    <View style={[styles.root, { backgroundColor: shellBg, paddingTop: insets.top }]}>
      <View style={styles.stickyTopBar}>
        <PlanModeSwitch
          planMode={planMode}
          onSelectMode={handleSelectMode}
          c={c}
          /** 빠른메모 힌트는 오늘 탭에서만 — 루틴/퍼즐 등에서 planMode 잔상으로 비치지 않게 */
          description={isDayPlanTab ? undefined : null}
          trailing={<SettingsTopBarButton c={c} />}
        />
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
