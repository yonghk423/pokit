import { StyleSheet, View } from 'react-native';

import { addDaysToLocalDateKey, formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';
import { ThemedText } from '@shared/ui/themed-text';

import {
  endsOnNextCalendarDay,
  formatDateKeyCompactKo,
  sortedPlanDateRange,
} from '../lib/dayPlanEditorShared';
import { FixedRoutineSettingsButton } from './FixedRoutineSettingsButton';

type Props = {
  priorityStart: string;
  priorityEnd: string;
  /** 집중 구간 시작 달력일 (YYYY-MM-DD) */
  planDateKey: string;
  /** 집중 구간 종료 달력일 (YYYY-MM-DD) */
  planDateKeyEnd: string;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  cardBg: string;
  onPressSettings: () => void;
};

function formatPriorityWindowLines(
  start: string,
  end: string,
  planDateKey: string,
  planDateKeyEnd: string,
): { dateLine: string; timeLine: string } {
  const { lo, hi } = sortedPlanDateRange(planDateKey, planDateKeyEnd);
  const pe = parseHHmmToMinutes(end.trim());
  const crossesNextDay = endsOnNextCalendarDay(start, end);
  const endDateKey =
    pe === 24 * 60
      ? addDaysToLocalDateKey(hi, 1)
      : crossesNextDay && lo === hi
        ? addDaysToLocalDateKey(lo, 1)
        : hi;
  const dateLine =
    lo === endDateKey
      ? formatDateKeyCompactKo(lo)
      : `${formatDateKeyCompactKo(lo)} ~ ${formatDateKeyCompactKo(endDateKey)}`;
  const startLabel = formatHhmmClockKo(start);
  const endLabel = formatHhmmClockKo(end);
  const timeLine = crossesNextDay
    ? `${startLabel} — ${formatDateKeyCompactKo(endDateKey)} ${endLabel}`
    : `${startLabel} — ${endLabel}`;
  return { dateLine, timeLine };
}

/** 고정 루틴 — 집중 구간 요약(날짜·시각) + 설정 진입 */
export function FixedRoutinePriorityWindowCard({
  priorityStart,
  priorityEnd,
  planDateKey,
  planDateKeyEnd,
  isDark,
  ink,
  muted,
  line,
  cardBg,
  onPressSettings,
}: Props) {
  const { dateLine, timeLine } = formatPriorityWindowLines(
    priorityStart,
    priorityEnd,
    planDateKey,
    planDateKeyEnd,
  );

  return (
    <View style={[styles.root, { backgroundColor: cardBg, borderColor: line }]}>
      <View style={styles.textCol}>
        <ThemedText style={[styles.title, { color: ink }]}>타임라인 집중 구간</ThemedText>
        <ThemedText style={[styles.summary, { color: muted }]} numberOfLines={2}>
          {dateLine}
          {'\n'}
          {timeLine}
        </ThemedText>
      </View>
      <FixedRoutineSettingsButton
        isDark={isDark}
        ink={ink}
        line={line}
        accessibilityLabel="집중 구간 설정"
        onPress={onPressSettings}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  summary: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
});
