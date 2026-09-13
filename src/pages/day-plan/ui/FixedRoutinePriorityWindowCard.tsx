import { StyleSheet, View } from 'react-native';

import { formatDateKeyCompact, formatHhmmClock } from '@shared/lib/i18n';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import {
  endsOnNextCalendarDay,
  priorityClockCaptionDateKeyEnd,
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
  locale: import('@shared/lib/i18n').AppLocale,
): { dateLine: string; timeLine: string } {
  const { lo, hi } = sortedPlanDateRange(planDateKey, planDateKeyEnd);
  const crossesNextDay = endsOnNextCalendarDay(start, end);
  const endDateKey = priorityClockCaptionDateKeyEnd(lo, hi, start, end);
  const dateLine =
    lo === endDateKey
      ? formatDateKeyCompact(lo, locale)
      : `${formatDateKeyCompact(lo, locale)} ~ ${formatDateKeyCompact(endDateKey, locale)}`;
  const startLabel = formatHhmmClock(start, locale);
  const endLabel = formatHhmmClock(end, locale);
  const timeLine = crossesNextDay
    ? `${startLabel} — ${formatDateKeyCompact(endDateKey, locale)} ${endLabel}`
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
  const { locale, t } = useTranslation();
  const { dateLine, timeLine } = formatPriorityWindowLines(
    priorityStart,
    priorityEnd,
    planDateKey,
    planDateKeyEnd,
    locale,
  );

  return (
    <View style={[styles.root, { backgroundColor: cardBg, borderColor: line }]}>
      <View style={styles.textCol}>
        <ThemedText style={[styles.title, { color: ink }]}>{t('fixedRoutine.spineFocusWindowTitle')}</ThemedText>
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
        accessibilityLabel={t('fixedRoutine.focusWindowSettingsA11y')}
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
