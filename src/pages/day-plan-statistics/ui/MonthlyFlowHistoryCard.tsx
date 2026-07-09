import { StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import type { MonthlyFlowHistoryRow } from '../lib/buildMonthlyFlowHistory';
import type { FlowHistoryCategoryGroup } from '../lib/groupFlowHistoryRows';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { FlowHistoryMetaLine } from './FlowHistoryMetaLine';
import { FlowHistoryMonthRow } from './FlowHistoryMonthRow';

type Props = {
  group: FlowHistoryCategoryGroup<MonthlyFlowHistoryRow>;
  monthPrefix: string;
  palette: FlowHistoryPalette;
};

export function MonthlyFlowHistoryCard({ group, monthPrefix, palette }: Props) {
  const iconColor = activeIconColorByCategory(group.categoryKey);
  const monthCountLabel = `${group.row.completedDays}/${group.row.daysInMonth}`;

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconWrap, { backgroundColor: palette.weekdayIdle }]}>
            <IconSymbol name={group.icon as SymbolViewProps['name']} size={14} color={iconColor} />
          </View>
          <View style={styles.titleTextWrap}>
            <ThemedText style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
              {group.label}
            </ThemedText>
            <FlowHistoryMetaLine
              timeLabel={group.timeLabel}
              startDateLabel={group.startDateLabel}
              muted={palette.muted}
            />
          </View>
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
    paddingVertical: 7,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.25,
    lineHeight: 17,
  },
  monthCount: {
    fontSize: 10,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'right',
    flexShrink: 0,
  },
});
