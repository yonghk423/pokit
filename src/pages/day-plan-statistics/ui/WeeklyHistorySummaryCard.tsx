import { StyleSheet, View } from 'react-native';

import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import type { WeeklyHistorySummary } from '../lib/buildWeeklyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';

type Props = {
  summary: WeeklyHistorySummary;
  palette: FlowHistoryPalette;
};

export function WeeklyHistorySummaryCard({ summary, palette }: Props) {
  const { t } = useTranslation();
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.topRow}>
        <ThemedText style={[styles.title, { color: palette.ink }]}>{t('history.summary.weekTitle')}</ThemedText>
        <ThemedText style={[styles.percent, { color: palette.accent }]}>
          {summary.progressPercent}%
        </ThemedText>
      </View>
      <ThemedText style={[styles.body, { color: palette.muted }]}>
        {t('history.summary.body', {
          activeDays: summary.activeDays,
          totalDays: summary.daysInWeek,
          completions: summary.totalCompletions,
        })}
      </ThemedText>
      {summary.topCategoryLabels.length > 0 ? (
        <ThemedText style={[styles.highlight, { color: palette.ink }]}>
          {t('history.summary.topRoutine', { labels: summary.topCategoryLabels.join(' · ') })}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 0,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  percent: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  highlight: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
});
