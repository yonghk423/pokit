import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { syncPriorityDayStartAlarm } from '@features/day-plan-notifications';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { formatDateKeyCompact } from '@shared/lib/i18n/lib/formatLocale';
import {
  loadPriorityDayStartAlarm,
  savePriorityDayRollMode,
  syncDayMealSlotScheduleWithPriorityWindow,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { addDaysToLocalDateKey, useDayPlanDraftStore } from '@entities/day-plan';
import { palette } from '../lib/dayPlanPalette';
import { DailyRhythmTimeEditorBody } from './DailyRhythmTimeEditorBody';

/** 임시 비활성 — 담기 유지(keep) 롤 모드는 UI·저장 경로에서 제외 */
const SHOW_PRIORITY_DAY_ROLL_KEEP_SETTING = false;

/** 하루 시작·마무리 시각 전체 화면 (오늘 탭·설정에서 진입) */
export function DailyRhythmSettingsPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const c = palette(isDark);

  const {
    priorityStart,
    priorityEnd,
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    setPriorityStart,
    setPriorityEnd,
    applyPriorityPlanCalendarRange,
    syncOvernightPriorityPlanDates,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      priorityStart: s.priorityStart,
      priorityEnd: s.priorityEnd,
      priorityPlanDateKey: s.priorityPlanDateKey,
      priorityPlanDateKeyEnd: s.priorityPlanDateKeyEnd,
      setPriorityStart: s.setPriorityStart,
      setPriorityEnd: s.setPriorityEnd,
      applyPriorityPlanCalendarRange: s.applyPriorityPlanCalendarRange,
      syncOvernightPriorityPlanDates: s.syncOvernightPriorityPlanDates,
    })),
  );

  const [seedStart, setSeedStart] = useState(priorityStart);
  const [seedEnd, setSeedEnd] = useState(priorityEnd);
  const [seedKey, setSeedKey] = useState(0);
  const planRangeLo = useMemo(
    () =>
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKey : priorityPlanDateKeyEnd,
    [priorityPlanDateKey, priorityPlanDateKeyEnd],
  );
  const planRangeHi = useMemo(
    () =>
      priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKeyEnd : priorityPlanDateKey,
    [priorityPlanDateKey, priorityPlanDateKeyEnd],
  );
  const todayChoiceLabel = useMemo(
    () => t('dayRhythm.todayChoice', { date: formatDateKeyCompact(planRangeLo, locale) }),
    [locale, planRangeLo, t],
  );
  const nextDayChoiceLabel = useMemo(
    () =>
      t('dayRhythm.nextDayChoice', {
        date: formatDateKeyCompact(addDaysToLocalDateKey(planRangeLo, 1), locale),
      }),
    [locale, planRangeLo, t],
  );

  useFocusEffect(
    useCallback(() => {
      const st = useDayPlanDraftStore.getState();
      setSeedStart(st.priorityStart);
      setSeedEnd(st.priorityEnd);
      if (!SHOW_PRIORITY_DAY_ROLL_KEEP_SETTING) {
        savePriorityDayRollMode('reset');
      }
      setSeedKey((k) => k + 1);
    }, []),
  );

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;
  const bottomInset = Math.max(insets.bottom, 16);

  const headerFg = c.onSurface;

  const handleSave = useCallback(
    async (start: string, end: string) => {
      setPriorityStart(start);
      setPriorityEnd(end);
      syncOvernightPriorityPlanDates();
      syncDayMealSlotScheduleWithPriorityWindow(start, end);
      savePriorityDayRollMode('reset');

      // 알림 on/off는 설정 → 알림 탭에서 관리. 시각만 바뀌면 스케줄 재동기화.
      const dayStartAlarm = loadPriorityDayStartAlarm();
      if (dayStartAlarm.enabled) {
        const startOk = await syncPriorityDayStartAlarm({
          enabled: true,
          startHhmm: start,
        });
        if (!startOk) {
          Alert.alert(t('alert.permission.title'), t('alert.permission.message'));
        }
      }

      router.back();
    },
    [router, setPriorityEnd, setPriorityStart, syncOvernightPriorityPlanDates, t],
  );

  const handleEndDateChoice = useCallback(
    (start: string, end: string, target: 'today' | 'nextDay') => {
      setPriorityStart(start);
      setPriorityEnd(end);
      const endDate = target === 'nextDay' ? addDaysToLocalDateKey(planRangeLo, 1) : planRangeLo;
      applyPriorityPlanCalendarRange(planRangeLo, endDate);
    },
    [applyPriorityPlanCalendarRange, planRangeLo, setPriorityEnd, setPriorityStart],
  );

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.bg }]} darkColor={c.bg} lightColor={c.bg}>
      <View style={[styles.safe, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: c.bg,
              borderBottomColor: c.border,
            },
          ]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.back')}>
            <IconSymbol name="chevron.left" size={20} color={headerFg} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: headerFg }]} lightColor={headerFg} darkColor={headerFg}>
            {t('dayCycleDial.title')}
          </ThemedText>
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <DailyRhythmTimeEditorBody
          c={c}
          isDark={isDark}
          seedStart={seedStart}
          seedEnd={seedEnd}
          seedKey={seedKey}
          variant="onboarding"
          hideOnboardingHero
          primaryLabel={t('common.save')}
          onPrimaryPress={handleSave}
          secondaryLabel={t('common.cancel')}
          onSecondaryPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          currentSpansMultiDay={planRangeHi > planRangeLo}
          onEndDateChoice={handleEndDateChoice}
          endDateChoiceTodayLabel={todayChoiceLabel}
          endDateChoiceNextDayLabel={nextDayChoiceLabel}
          priorityPlanRangeLo={planRangeLo}
          priorityPlanRangeHi={planRangeHi}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
  },
});
