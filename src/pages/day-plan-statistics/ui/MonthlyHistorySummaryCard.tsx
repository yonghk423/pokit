import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

import type { MonthlyHistorySummary } from '../lib/buildMonthlyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';

type Props = {
  summary: MonthlyHistorySummary;
  palette: FlowHistoryPalette;
};

export function MonthlyHistorySummaryCard({ summary, palette }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.topRow}>
        <ThemedText style={[styles.title, { color: palette.ink }]}>이번 달 요약</ThemedText>
        <ThemedText style={[styles.percent, { color: palette.accent }]}>
          {summary.progressPercent}%
        </ThemedText>
      </View>
      <ThemedText style={[styles.body, { color: palette.muted }]}>
        {summary.activeDays}일 / {summary.daysInMonth}일 중 활동 · 총 {summary.totalCompletions}회
        완료
      </ThemedText>
      {summary.topCategoryLabel ? (
        <ThemedText style={[styles.highlight, { color: palette.ink }]}>
          가장 많이 한 플로우: {summary.topCategoryLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  percent: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  highlight: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
});
