import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

import type { FlowHistoryCategoryGroup } from '../lib/groupFlowHistoryRows';
import type { WeeklyFlowHistoryRow } from '../lib/buildWeeklyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { FlowHistoryCategoryIcon } from './FlowHistoryCategoryIcon';
import { FlowHistoryWeekdayRow } from './FlowHistoryWeekdayRow';

type Props = {
  group: FlowHistoryCategoryGroup<WeeklyFlowHistoryRow>;
  palette: FlowHistoryPalette;
  onPressDay?: (weekdayIndex: number, done: boolean) => void;
};

export const WeeklyFlowHistoryCard = memo(function WeeklyFlowHistoryCard({ group, palette, onPressDay }: Props) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const streakDays = group.row.streakDays;

  return (
    <PostItCardShell
      isDark={isDark}
      faceColor={palette.card}
      shadowColor={palette.shadow}
      shadowOffset={1}
      contentStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <FlowHistoryCategoryIcon
            categoryKey={group.categoryKey}
            icon={group.icon}
            palette={palette}
          />
          <ThemedText style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
            {group.label}
          </ThemedText>
        </View>
        <View style={styles.metaWrap}>
          {streakDays > 0 ? (
            <ThemedText style={[styles.streak, { color: palette.ink }]}>
              {t('history.streak.label', { count: streakDays })}
            </ThemedText>
          ) : null}
          <ThemedText style={[styles.weekCount, { color: palette.ink }]}>
            {group.row.completedDays}/7
          </ThemedText>
        </View>
      </View>

      <FlowHistoryWeekdayRow
        row={group.row}
        palette={palette}
        categoryKey={group.categoryKey}
        onPressDay={onPressDay}
      />
    </PostItCardShell>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  metaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  streak: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  weekCount: {
    fontSize: 12,
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'right',
    flexShrink: 0,
    letterSpacing: -0.2,
  },
});
