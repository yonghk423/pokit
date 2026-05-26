import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getLocalDateKey } from '@entities/day-plan';
import { useHorizonCompletionStore } from '@entities/horizon-completion';
import {
  horizonDocumentHasContent,
  horizonDocumentToPlainText,
  loadMonthlyGoalDocument,
  saveMonthlyGoalDocument,
  type HorizonGoalDocument,
} from '@shared/lib/storage';

import { horizonFocusDateKeyForMonth } from '../lib/buildCalendarMonthGrid';
import { formatMonthListLabel, formatMonthPeriodBadge } from '../lib/formatHorizonPeriod';
import type { DayPlanPalette } from '../lib/dayPlanPalette';

import { HorizonCalendarSheet } from './horizon/HorizonCalendarSheet';
import { HorizonFocusCard } from './horizon/HorizonFocusCard';
import { HorizonPeriodHeader } from './horizon/HorizonPeriodHeader';

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
};

export function MonthlyPlanSection({ c, isDark }: Props) {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const todayDate = useMemo(() => new Date(), []);
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth() + 1);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const key = monthKey(year, month);
  const [document, setDocument] = useState<HorizonGoalDocument>(() => loadMonthlyGoalDocument(key));
  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    setDocument(loadMonthlyGoalDocument(key));
  }, [key]);

  const persistDocument = useCallback(
    (next: HorizonGoalDocument) => {
      saveMonthlyGoalDocument(key, next);
      setSyncTick((t) => t + 1);
    },
    [key],
  );

  const onChangeDocument = useCallback(
    (next: HorizonGoalDocument) => {
      setDocument(next);
      persistDocument(next);
    },
    [persistDocument],
  );

  const goMonth = useCallback((delta: number) => {
    setMonth((m) => {
      const next = m + delta;
      if (next < 1) {
        setYear((y) => y - 1);
        return 12;
      }
      if (next > 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return next;
    });
  }, []);

  const syncLabel = syncTick > 0 ? '방금 저장됨' : '자동 저장';

  const periodLabel = formatMonthPeriodBadge(year, month);
  const focusDateKey = useMemo(
    () => horizonFocusDateKeyForMonth(year, month, todayKey),
    [month, todayKey, year],
  );
  const listLabel = formatMonthListLabel(month);
  const hasContent = useMemo(() => horizonDocumentHasContent(document), [document]);

  const hydrateCompletions = useHorizonCompletionStore((s) => s.hydrate);
  const markMonthlyComplete = useHorizonCompletionStore((s) => s.markMonthlyComplete);
  const cancelMonthlyComplete = useHorizonCompletionStore((s) => s.cancelMonthlyComplete);
  const monthlyCompletion = useHorizonCompletionStore((s) => s.monthlyByKey[key]);
  const isCompleted = Boolean(monthlyCompletion);

  useEffect(() => {
    hydrateCompletions();
  }, [hydrateCompletions]);

  const onCompletePress = useCallback(() => {
    if (isCompleted) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      cancelMonthlyComplete(key);
      return;
    }
    if (!hasContent) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markMonthlyComplete({
      periodKey: key,
      label: listLabel,
      completedAt: new Date().toISOString(),
      summaryText: horizonDocumentToPlainText(document),
    });
  }, [
    cancelMonthlyComplete,
    document,
    hasContent,
    isCompleted,
    key,
    listLabel,
    markMonthlyComplete,
  ]);

  return (
    <View style={styles.root}>
      <HorizonPeriodHeader
        c={c}
        isDark={isDark}
        label={periodLabel}
        onPrev={() => goMonth(-1)}
        onNext={() => goMonth(1)}
        onOpenCalendar={() => setCalendarOpen(true)}
      />
      <HorizonCalendarSheet
        c={c}
        isDark={isDark}
        visible={calendarOpen}
        mode="month"
        focusDateKey={focusDateKey}
        todayDateKey={todayKey}
        onClose={() => setCalendarOpen(false)}
        onSelectDay={() => {}}
        onSelectMonth={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
      />
      <HorizonFocusCard
        c={c}
        isDark={isDark}
        strategyEyebrow="월간 전략"
        emptyTitleHint="이번 달 핵심 전략"
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
