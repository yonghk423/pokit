import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

import type { MonthlyFlowHistoryRow } from '../lib/buildMonthlyFlowHistory';
import type { FlowHistoryCategoryGroup } from '../lib/groupFlowHistoryRows';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { FlowHistoryCategoryIcon } from './FlowHistoryCategoryIcon';
import { FlowHistoryMonthRow } from './FlowHistoryMonthRow';

type Props = {
  group: FlowHistoryCategoryGroup<MonthlyFlowHistoryRow>;
  monthPrefix: string;
  palette: FlowHistoryPalette;
};

export function MonthlyFlowHistoryCard({ group, monthPrefix, palette }: Props) {
  const isDark = useColorScheme() === 'dark';
  const monthCountLabel = `${group.row.completedDays}/${group.row.daysInMonth}`;

  return (
    <PostItCardShell
      isDark={isDark}
      faceColor={palette.card}
      borderColor={palette.ink}
      borderWidth={1}
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
        <ThemedText style={[styles.monthCount, { color: palette.ink }]}>
          {monthCountLabel}
        </ThemedText>
      </View>

      <FlowHistoryMonthRow row={group.row} monthPrefix={monthPrefix} palette={palette} />
    </PostItCardShell>
  );
}

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
  monthCount: {
    fontSize: 12,
    fontWeight: '800',
    minWidth: 36,
    textAlign: 'right',
    flexShrink: 0,
    letterSpacing: -0.2,
  },
});
