import { DAY_PLAN_TOOLBAR_TOP_PADDING } from '../lib/dayPlanDeckMetrics';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { useTranslation } from '@shared/lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { consumePendingWidgetPlanMode, useDayPlanDraftStore } from '@entities/day-plan';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

import type { PlanMode } from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { PlanModeSwitch } from './PlanModeSwitch';
import { InitialDeckSurface } from './InitialDeckSurface';
import { SettingsTopBarButton } from './SettingsTopBarButton';
import { WeatherSummary } from './WeatherSummary';
import { DayPlanHeaderActionsContext, DayPlanShellBackgroundContext } from '../model/dayPlanHeaderActions';

const WIDGET_PLAN_MODES: readonly PlanMode[] = [
  'priority',
  'reading',
  'quickMemo',
  'dayNote',
];

function isPlanModeAllowed(mode: PlanMode): boolean {
  if (mode === 'quickMemo' && !FEATURE_FLAGS.quickMemoShortcut) return false;
  if (mode === 'dayNote' && !FEATURE_FLAGS.dayNoteShortcut) return false;
  return true;
}

function planModeFromWidgetParam(value: string | string[] | undefined): PlanMode | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  if (!WIDGET_PLAN_MODES.includes(raw as PlanMode)) return null;
  const mode = raw as PlanMode;
  return isPlanModeAllowed(mode) ? mode : null;
}

function planModeFromPending(value: string | null): PlanMode | null {
  if (!value) return null;
  if (!WIDGET_PLAN_MODES.includes(value as PlanMode)) return null;
  const mode = value as PlanMode;
  return isPlanModeAllowed(mode) ? mode : null;
}

type Props = {
  children: ReactNode;
  tabName?: string;
  onClose?: () => void;
};

/**
 * 스토리 탭 제외 메인 탭 — 상단 데일리·메모 전환을 항상 고정.
 * SafeAreaView 조건부 래핑을 쓰지 않고 insets.paddingTop 만 사용해
 * 탭 전환 시 상단 점프를 막는다.
 */
export function DayPlanTabScreenShell({ children, tabName, onClose }: Props) {
  const { t } = useTranslation();
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const [shellOverride, setShellOverride] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams<{ planMode?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const inTabs = segments.some((segment) => segment === '(tabs)');
  const isComicTab = tabName ? tabName === 'comic-day' : segments.some(segment => segment === 'comic-day');
  const isDayPlanTab = tabName ? tabName === 'day-plan' : inTabs
    ? segments.some((segment) => segment === 'day-plan')
    : headerActions != null;
  const isDark = useColorScheme() === 'dark';
  const c = palette(isDark);
  /** 카드 면과 같은 크림 — 상단 상태바·헤더가 흰 띠로 남지 않게 */
  const shellBg = shellOverride ?? (isDark ? c.containerLow : '#F7F6F4');
  const shellPalette = { ...c, containerLow: shellBg, bg: shellBg, headerBg: shellBg };
  const { planMode, setPlanMode } = useDayPlanDraftStore(
    useShallow((s) => ({
      planMode: s.planMode,
      setPlanMode: s.setPlanMode,
    })),
  );

  useEffect(() => {
    if (isPlanModeAllowed(planMode)) return;
    setPlanMode('priority');
  }, [planMode, setPlanMode]);

  useEffect(() => {
    const next = planModeFromWidgetParam(params.planMode);
    if (!next) return;
    setPlanMode(next);
    // 위젯 딥링크는 항상 오늘 탭으로 보낸다 (다른 탭·콜드스타트에서도 전환이 끊기지 않게).
    router.replace('/day-plan');
  }, [params.planMode, router, setPlanMode]);

  // Open Intent 탭: App Group에 남긴 planMode를 적용한다.
  useEffect(() => {
    let cancelled = false;
    const applyPending = async () => {
      const next = planModeFromPending(await consumePendingWidgetPlanMode());
      if (cancelled || !next) return;
      setPlanMode(next);
      router.replace('/day-plan');
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
      if (!isPlanModeAllowed(mode)) return;
      setPlanMode(mode);
      if (
        (mode === 'quickMemo' ||
          mode === 'dayNote' ||
          mode === 'reading') &&
        !isDayPlanTab
      ) {
        router.push('/day-plan');
      }
    },
    [isDayPlanTab, router, setPlanMode],
  );

  return (
    <DayPlanShellBackgroundContext.Provider value={setShellOverride}>
    <DayPlanHeaderActionsContext.Provider value={setHeaderActions}>
      <View style={[styles.root, { backgroundColor: shellBg, paddingTop: insets.top }]}>
        <View style={styles.stickyTopBar}>
          <PlanModeSwitch
            planMode={planMode}
            onSelectMode={handleSelectMode}
            c={shellPalette}
            /** 빠른메모 힌트는 오늘 탭에서만 — 루틴/퍼즐 등에서 planMode 잔상으로 비치지 않게 */
            description={isDayPlanTab ? undefined : null}
            middle={isComicTab || (isDayPlanTab && planMode === 'priority') ? headerActions : null}
            fixedMiddle={isComicTab}
            trailingAlign={isComicTab ? 'start' : 'center'}
            trailing={
              <View style={isComicTab ? styles.comicTrailing : styles.trailingRow}>
                <View style={styles.trailingRow}>
                  <SettingsTopBarButton c={c} />
                  {onClose ? <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={styles.closeButton}><ThemedText style={{ fontSize: 28, color: c.onSurface }}>×</ThemedText></Pressable> : null}
                </View>
                {isComicTab ? <View style={styles.comicWeather}><WeatherSummary ink={c.onSurface} muted={c.onVariant} /></View> : null}
              </View>
            }
          />
        </View>
        <View style={styles.body}>
          {tabName === 'comic-day' || tabName === 'day-plan' ? (
            <InitialDeckSurface kind={isComicTab ? 'hero' : 'mate'} backgroundColor={shellBg} isDark={isDark}>
              {children}
            </InitialDeckSurface>
          ) : children}
        </View>
      </View>
    </DayPlanHeaderActionsContext.Provider>
    </DayPlanShellBackgroundContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stickyTopBar: {
    paddingTop: DAY_PLAN_TOOLBAR_TOP_PADDING,
    zIndex: 2,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comicTrailing: {
    alignItems: 'flex-end',
  },
  comicWeather: {
    maxWidth: 168,
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
