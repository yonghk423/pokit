import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { DAY_PLAN_TOOLBAR_TOP_PADDING } from '../lib/dayPlanDeckMetrics';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { useTranslation } from '@shared/lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scaleTypeSize, useAppFontSizeScale } from '@shared/lib/ui-font';
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
import { DayPlanComposerKeyboardContext, DayPlanHeaderCenterActionsContext, DayPlanHeaderActionsContext, DayPlanShellBackgroundContext, DayPlanWeatherActionsContext } from '../model/dayPlanHeaderActions';


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
  const [composerKeyboardOpen, setComposerKeyboardOpen] = useState(false);
  const [centerActions, setCenterActions] = useState<ReactNode>(null);
  const [weatherActions, setWeatherActions] = useState<ReactNode>(null);
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const [shellOverride, setShellOverride] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams<{ planMode?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const appFontScale = useAppFontSizeScale();
  const { fontScale } = useWindowDimensions();
  // Reserve the date and weather together, including while weather is loading.
  const weatherHeight = Math.max(28, Math.ceil(scaleTypeSize(22, appFontScale) * fontScale))
    + Math.ceil(scaleTypeSize(20, appFontScale) * fontScale) + 2;
  const characterHeight = Math.max(26, Math.ceil(scaleTypeSize(23, appFontScale) * fontScale));
  const comicHeaderHeight = Math.max(44 + characterHeight, 46 + weatherHeight);
  const inTabs = segments.some((segment) => segment === '(tabs)');
  const isComicTab = tabName ? tabName === 'comic-day' : inTabs && segments.every(segment => segment === '(tabs)');
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
    <DayPlanComposerKeyboardContext.Provider value={setComposerKeyboardOpen}>
    <DayPlanShellBackgroundContext.Provider value={setShellOverride}>
    <DayPlanHeaderActionsContext.Provider value={setHeaderActions}>
    <DayPlanWeatherActionsContext.Provider value={setWeatherActions}>
    <DayPlanHeaderCenterActionsContext.Provider value={setCenterActions}>
      <View style={[styles.root, { backgroundColor: shellBg, paddingTop: insets.top }]}>
        <View testID="day-plan-shell-header" style={[styles.stickyTopBar, isComicTab && composerKeyboardOpen && { display: 'none' }]} accessibilityElementsHidden={isComicTab && composerKeyboardOpen} importantForAccessibility={isComicTab && composerKeyboardOpen ? 'no-hide-descendants' : 'auto'}>
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
              <View testID={isComicTab ? 'comic-header-trailing' : undefined} style={isComicTab ? [styles.comicTrailing, { minHeight: comicHeaderHeight }] : styles.trailingRow}>
                <View style={styles.trailingRow}>
                  <SettingsTopBarButton c={c} />
                  {onClose ? <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); onClose(); }} style={styles.closeButton}><ThemedText style={{ fontSize: 28, color: c.onSurface }}>×</ThemedText></Pressable> : null}
                </View>
                {isComicTab ? <View testID="comic-header-weather-slot" style={[styles.comicWeather, { minHeight: weatherHeight }]}><View accessible={false} style={{ height: 20 }} /><View style={styles.weatherControls}>{weatherActions}<View style={{ flexShrink: 1 }}><WeatherSummary ink={c.onSurface} muted={c.onVariant} /></View></View></View> : null}
              </View>
            }
          />
          {isComicTab ? <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: DAY_PLAN_TOOLBAR_TOP_PADDING + 6, height: 44, alignItems: 'center', justifyContent: 'center' }}>{centerActions}</View> : null}
        </View>
        <View style={styles.body}>
          {tabName === 'comic-day' || tabName === 'day-plan' ? (
            <InitialDeckSurface kind={isComicTab ? 'hero' : 'mate'} backgroundColor={shellBg} isDark={isDark}>
              {children}
            </InitialDeckSurface>
          ) : children}
        </View>
      </View>
    </DayPlanHeaderCenterActionsContext.Provider>
    </DayPlanWeatherActionsContext.Provider>
    </DayPlanHeaderActionsContext.Provider>
    </DayPlanShellBackgroundContext.Provider>
    </DayPlanComposerKeyboardContext.Provider>
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
    maxWidth: 212,
    alignItems: 'flex-end',
    gap: 2,
    marginTop: 2,
  },
  todayDate: { fontSize: 13, lineHeight: 20, textAlign: 'right', flexShrink: 1 },
  weatherControls: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
