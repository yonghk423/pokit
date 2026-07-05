import { StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import { WEEKDAY_LABELS, type WeeklyFlowHistoryRow } from '../lib/buildWeeklyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { FlowHistoryMetaLine } from './FlowHistoryMetaLine';

const WEEKDAY_DOT_MAX = 20;

type Props = {
  row: WeeklyFlowHistoryRow;
  palette: FlowHistoryPalette;
};

export function WeeklyFlowHistoryCard({ row, palette }: Props) {
  const iconColor = activeIconColorByCategory(row.categoryKey);

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconWrap, { backgroundColor: palette.weekdayIdle }]}>
            <IconSymbol name={row.icon as SymbolViewProps['name']} size={14} color={iconColor} />
          </View>
          <View style={styles.titleTextWrap}>
            <ThemedText style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
              {row.label}
            </ThemedText>
            <FlowHistoryMetaLine
              timeLabel={row.timeLabel}
              startDateLabel={row.startDateLabel}
              muted={palette.muted}
            />
          </View>
        </View>
        <ThemedText style={[styles.weekCount, { color: palette.muted }]}>
          {row.completedDays}/7
        </ThemedText>
      </View>

      <View style={styles.weekdayTrack}>
        {WEEKDAY_LABELS.map((label, index) => {
          const done = row.weekdayDone[index] ?? false;
          return (
            <View key={label} style={styles.weekdayCol}>
              <View
                style={[
                  styles.weekdayDot,
                  {
                    borderColor: done ? palette.accent : palette.accentSoft,
                    backgroundColor: done ? palette.accent : 'transparent',
                  },
                ]}
              />
              <ThemedText
                style={[styles.weekdayLabel, { color: done ? palette.accent : palette.muted }]}>
                {label}
              </ThemedText>
            </View>
          );
        })}
      </View>
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
    gap: 5,
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
  weekdayTrack: {
    width: '100%',
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-start',
  },
  weekdayCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 2,
  },
  weekdayDot: {
    width: WEEKDAY_DOT_MAX,
    height: WEEKDAY_DOT_MAX,
    borderRadius: 0,
    borderWidth: 2,
  },
  weekdayLabel: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
  weekCount: {
    fontSize: 10,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'right',
    flexShrink: 0,
  },
});
