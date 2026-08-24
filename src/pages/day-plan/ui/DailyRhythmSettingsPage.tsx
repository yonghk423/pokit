import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { syncPriorityDayEndAlarm, syncPriorityDayStartAlarm } from '@features/day-plan-notifications';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  loadPriorityDayEndAlarm,
  loadPriorityDayStartAlarm,
  savePriorityDayRollMode,
  syncDayMealSlotScheduleWithPriorityWindow,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { addDaysToLocalDateKey, useDayPlanDraftStore } from '@entities/day-plan';
import { palette } from '../lib/dayPlanPalette';
import { formatDateKeyCompactKo } from '../lib/dayPlanEditorShared';
import { DailyRhythmTimeEditorBody } from './DailyRhythmTimeEditorBody';

/** 임시 비활성 — 담기 유지(keep) 롤 모드는 UI·저장 경로에서 제외 */
const SHOW_PRIORITY_DAY_ROLL_KEEP_SETTING = false;

/** 설정 탭에서 우선순위 데이플랜의 하루 시작·마무리 시각을 바꿀 때 */
export function DailyRhythmSettingsPage() {
  const router = useRouter();
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
  const [dayStartAlarmOn, setDayStartAlarmOn] = useState(true);
  const [dayEndAlarmOn, setDayEndAlarmOn] = useState(false);
  const [dayEndAlarmHhmm, setDayEndAlarmHhmm] = useState('22:00');
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
  const todayChoiceLabel = useMemo(() => `당일 · ${formatDateKeyCompactKo(planRangeLo)}`, [planRangeLo]);
  const nextDayChoiceLabel = useMemo(
    () => `다음 날 · ${formatDateKeyCompactKo(addDaysToLocalDateKey(planRangeLo, 1))}`,
    [planRangeLo],
  );

  useFocusEffect(
    useCallback(() => {
      const st = useDayPlanDraftStore.getState();
      setSeedStart(st.priorityStart);
      setSeedEnd(st.priorityEnd);
      setDayStartAlarmOn(loadPriorityDayStartAlarm().enabled);
      const endAlarm = loadPriorityDayEndAlarm();
      setDayEndAlarmOn(endAlarm.enabled);
      setDayEndAlarmHhmm(endAlarm.reminderHhmm);
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

      const [startOk, endOk] = await Promise.all([
        syncPriorityDayStartAlarm({ enabled: dayStartAlarmOn, startHhmm: start }),
        syncPriorityDayEndAlarm({ enabled: dayEndAlarmOn, reminderHhmm: dayEndAlarmHhmm }),
      ]);

      if (dayStartAlarmOn && !startOk) {
        setDayStartAlarmOn(false);
      }
      if (dayEndAlarmOn && !endOk) {
        setDayEndAlarmOn(false);
      }
      if ((dayStartAlarmOn && !startOk) || (dayEndAlarmOn && !endOk)) {
        Alert.alert('알림', '알림을 켜려면 기기에서 알림 권한을 허용해 주세요.');
      }

      router.back();
    },
    [dayEndAlarmHhmm, dayEndAlarmOn, dayStartAlarmOn, router, setPriorityEnd, setPriorityStart, syncOvernightPriorityPlanDates],
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
            accessibilityLabel="뒤로가기">
            <IconSymbol name="chevron.left" size={20} color={headerFg} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: headerFg }]} lightColor={headerFg} darkColor={headerFg}>
            시작·마무리 시간
          </ThemedText>
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <DailyRhythmTimeEditorBody
          c={c}
          isDark={isDark}
          seedStart={seedStart}
          seedEnd={seedEnd}
          seedKey={seedKey}
          variant="settings"
          primaryLabel="저장"
          onPrimaryPress={handleSave}
          currentSpansMultiDay={planRangeHi > planRangeLo}
          onEndDateChoice={handleEndDateChoice}
          endDateChoiceTodayLabel={todayChoiceLabel}
          endDateChoiceNextDayLabel={nextDayChoiceLabel}
          priorityPlanRangeLo={planRangeLo}
          priorityPlanRangeHi={planRangeHi}
          dayStartAlarmOn={dayStartAlarmOn}
          onDayStartAlarmChange={setDayStartAlarmOn}
          dayEndAlarmOn={dayEndAlarmOn}
          dayEndAlarmHhmm={dayEndAlarmHhmm}
          onDayEndAlarmChange={setDayEndAlarmOn}
          onDayEndAlarmHhmmChange={setDayEndAlarmHhmm}
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
    borderBottomWidth: 2,
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
