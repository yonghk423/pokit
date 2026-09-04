import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

import type { FlowHistoryCategoryGroup } from '../lib/groupFlowHistoryRows';
import type { WeeklyFlowHistoryRow } from '../lib/buildWeeklyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { FlowHistoryCategoryIcon } from './FlowHistoryCategoryIcon';
import { FlowHistoryWeekdayRow } from './FlowHistoryWeekdayRow';

type Props = {
  group: FlowHistoryCategoryGroup<WeeklyFlowHistoryRow>;
  palette: FlowHistoryPalette;
};

export function WeeklyFlowHistoryCard({ group, palette }: Props) {
  const isDark = useColorScheme() === 'dark';

  return (
    <CityPopCardShell isDark={isDark} faceColor={palette.card} contentStyle={styles.content}>
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
        <ThemedText style={[styles.weekCount, { color: palette.ink }]}>
          {group.row.completedDays}/7
        </ThemedText>
      </View>

      <FlowHistoryWeekdayRow
        row={group.row}
        palette={palette}
        categoryKey={group.categoryKey}
      />
    </CityPopCardShell>
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
  weekCount: {
    fontSize: 12,
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'right',
    flexShrink: 0,
    letterSpacing: -0.2,
  },
});
