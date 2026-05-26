import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { addDaysToLocalDateKey, getLocalDateKey } from '@entities/day-plan';
import { useHorizonCompletionStore } from '@entities/horizon-completion';
import {
  horizonDocumentHasContent,
  horizonDocumentToPlainText,
  horizonWeeklyDayMemoHasContent,
  loadHorizonWeeklyDayMemo,
  loadWeeklyGoalDocument,
  saveHorizonWeeklyDayMemo,
  saveWeeklyGoalDocument,
  type HorizonGoalDocument,
} from '@shared/lib/storage';

import { buildHorizonWeekDays, getHorizonWeekStartKey } from '../lib/buildHorizonWeekDays';
import { formatWeekPeriodBadge } from '../lib/formatHorizonPeriod';
import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { HorizonCalendarSheet } from './horizon/HorizonCalendarSheet';
import { HorizonFocusCard } from './horizon/HorizonFocusCard';
import { HorizonPeriodHeader } from './horizon/HorizonPeriodHeader';
import { HorizonWeekDayMemoCard } from './horizon/HorizonWeekDayMemoCard';
import { HorizonWeekDayStrip } from './horizon/HorizonWeekDayStrip';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
};

export function WeeklyPlanSection({ c, isDark }: Props) {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const [anchorDate, setAnchorDate] = useState(todayKey);

  const weekStart = useMemo(() => getHorizonWeekStartKey(anchorDate), [anchorDate]);

  const [document, setDocument] = useState<HorizonGoalDocument>(() =>
    loadWeeklyGoalDocument(weekStart),
  );
  const [syncTick, setSyncTick] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayMemoDraft, setDayMemoDraft] = useState(() => loadHorizonWeeklyDayMemo(todayKey));
  const [dayMemoSyncTick, setDayMemoSyncTick] = useState(0);
  const anchorDateRef = useRef(anchorDate);
  const dayMemoDraftRef = useRef(dayMemoDraft);
  const dayMemoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dayMemoDraftRef.current = dayMemoDraft;
  }, [dayMemoDraft]);

  useEffect(() => {
    const leaving = anchorDateRef.current;
    if (leaving !== anchorDate) {
      if (dayMemoSaveTimerRef.current) {
        clearTimeout(dayMemoSaveTimerRef.current);
        dayMemoSaveTimerRef.current = null;
      }
      saveHorizonWeeklyDayMemo(leaving, dayMemoDraftRef.current);
      setDayMemoSyncTick((t) => t + 1);
      anchorDateRef.current = anchorDate;
    }
    setDayMemoDraft(loadHorizonWeeklyDayMemo(anchorDate));
  }, [anchorDate]);

  useEffect(
    () => () => {
      if (dayMemoSaveTimerRef.current) clearTimeout(dayMemoSaveTimerRef.current);
      saveHorizonWeeklyDayMemo(anchorDateRef.current, dayMemoDraftRef.current);
    },
    [],
  );

  const onChangeDayMemo = useCallback(
    (next: string) => {
      setDayMemoDraft(next);
      if (dayMemoSaveTimerRef.current) clearTimeout(dayMemoSaveTimerRef.current);
      dayMemoSaveTimerRef.current = setTimeout(() => {
        saveHorizonWeeklyDayMemo(anchorDateRef.current, next);
        setDayMemoSyncTick((t) => t + 1);
      }, 400);
    },
    [],
  );

  const dayMemoSyncLabel = dayMemoSyncTick > 0 ? '방금 저장됨' : '자동 저장';

  useEffect(() => {
    setDocument(loadWeeklyGoalDocument(weekStart));
  }, [weekStart]);

  const persistDocument = useCallback(
    (next: HorizonGoalDocument) => {
      saveWeeklyGoalDocument(weekStart, next);
      setSyncTick((t) => t + 1);
    },
    [weekStart],
  );

  const onChangeDocument = useCallback(
    (next: HorizonGoalDocument) => {
      setDocument(next);
      persistDocument(next);
    },
    [persistDocument],
  );

  const goWeek = useCallback((delta: number) => {
    setAnchorDate((prev) => addDaysToLocalDateKey(prev, delta * 7));
  }, []);

  const syncLabel = syncTick > 0 ? '방금 저장됨' : '자동 저장';

  const periodLabel = formatWeekPeriodBadge(weekStart);
  const weekDays = useMemo(() => buildHorizonWeekDays(weekStart), [weekStart]);
  const selectedDayCell = useMemo(
    () => weekDays.find((day) => day.dateKey === anchorDate) ?? weekDays[0],
    [anchorDate, weekDays],
  );
  const memoDateKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const day of weekDays) {
      if (day.dateKey === anchorDate) {
        if (dayMemoDraft.trim().length > 0) keys.add(day.dateKey);
      } else if (horizonWeeklyDayMemoHasContent(day.dateKey)) {
        keys.add(day.dateKey);
      }
    }
    return keys;
  }, [weekDays, dayMemoSyncTick, anchorDate, dayMemoDraft]);
  const hasContent = useMemo(() => horizonDocumentHasContent(document), [document]);

  const hydrateCompletions = useHorizonCompletionStore((s) => s.hydrate);
  const markWeeklyComplete = useHorizonCompletionStore((s) => s.markWeeklyComplete);
  const cancelWeeklyComplete = useHorizonCompletionStore((s) => s.cancelWeeklyComplete);
  const weeklyCompletion = useHorizonCompletionStore((s) => s.weeklyByKey[weekStart]);
  const isCompleted = Boolean(weeklyCompletion);

  useEffect(() => {
    hydrateCompletions();
  }, [hydrateCompletions]);

  const onCompletePress = useCallback(() => {
    if (isCompleted) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      cancelWeeklyComplete(weekStart);
      return;
    }
    if (!hasContent) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markWeeklyComplete({
      periodKey: weekStart,
      label: periodLabel,
      completedAt: new Date().toISOString(),
      summaryText: horizonDocumentToPlainText(document),
    });
  }, [
    cancelWeeklyComplete,
    document,
    hasContent,
    isCompleted,
    markWeeklyComplete,
    periodLabel,
    weekStart,
  ]);

  return (
    <View style={styles.root}>
      <HorizonPeriodHeader
        c={c}
        isDark={isDark}
        label={periodLabel}
        onPrev={() => goWeek(-1)}
        onNext={() => goWeek(1)}
        onOpenCalendar={() => setCalendarOpen(true)}
      />
      <HorizonCalendarSheet
        c={c}
        isDark={isDark}
        visible={calendarOpen}
        mode="day"
        focusDateKey={anchorDate}
        todayDateKey={todayKey}
        onClose={() => setCalendarOpen(false)}
        onSelectDay={setAnchorDate}
        onSelectMonth={() => {}}
      />
      <HorizonWeekDayStrip
        c={c}
        isDark={isDark}
        days={weekDays}
        selectedDateKey={anchorDate}
        todayDateKey={todayKey}
        memoDateKeys={memoDateKeys}
        onSelectDate={setAnchorDate}
      />
      {selectedDayCell ? (
        <HorizonWeekDayMemoCard
          c={c}
          isDark={isDark}
          dateKey={selectedDayCell.dateKey}
          weekdayLabel={selectedDayCell.weekdayLabel}
          text={dayMemoDraft}
          onChangeText={onChangeDayMemo}
          syncLabel={dayMemoSyncLabel}
        />
      ) : null}
      <HorizonFocusCard
        c={c}
        isDark={isDark}
        strategyEyebrow="주간 전략"
        document={document}
        onChangeDocument={onChangeDocument}
        syncLabel={syncLabel}
        showCompleteButton
        completeLabel={isCompleted ? '완료 취소' : '완료'}
        completeTone={isCompleted ? 'ghost' : 'primary'}
        completeDisabled={!isCompleted && !hasContent}
        onCompletePress={onCompletePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
