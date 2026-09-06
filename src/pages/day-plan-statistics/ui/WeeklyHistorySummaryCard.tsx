import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

import type { WeeklyHistorySummary } from '../lib/buildWeeklyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';

type Props = {
  summary: WeeklyHistorySummary;
  palette: FlowHistoryPalette;
};

export function WeeklyHistorySummaryCard({ summary, palette }: Props) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  return (
    <PostItCardShell
      isDark={isDark}
      faceColor={palette.card}
      borderColor={palette.ink}
      borderWidth={1}
      contentStyle={styles.content}>
      <View style={styles.topRow}>
        <ThemedText style={[styles.title, { color: palette.ink }]}>
          {t('history.summary.weekTitle')}
        </ThemedText>
        <ThemedText style={[styles.percent, { color: palette.ink }]}>
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
          {t('history.summary.topRoutine', {
            labels: summary.topCategoryLabels.join(' · '),
          })}
        </ThemedText>
      ) : null}
    </PostItCardShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  percent: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  highlight: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
});
