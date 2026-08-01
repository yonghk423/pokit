import { StyleSheet, View } from 'react-native';

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
  const monthCountLabel = `${group.row.completedDays}/${group.row.daysInMonth}`;

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
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
        <ThemedText style={[styles.monthCount, { color: palette.muted }]}>{monthCountLabel}</ThemedText>
      </View>

      <FlowHistoryMonthRow row={group.row} monthPrefix={monthPrefix} palette={palette} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 0,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
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
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.25,
    lineHeight: 16,
  },
  monthCount: {
    fontSize: 10,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'right',
    flexShrink: 0,
  },
});
