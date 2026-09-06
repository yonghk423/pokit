import { StyleSheet, View } from 'react-native';

import type { WeeklyFlowHistoryRow } from '../lib/buildWeeklyFlowHistory';
import { getHistoryWeekdayLabels } from '../lib/buildWeeklyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { categoryAccentColorPastel } from '@widgets/day-plan-priority-order';
import { useMemo } from 'react';

type Props = {
  row: WeeklyFlowHistoryRow;
  palette: FlowHistoryPalette;
  categoryKey: string;
};

/**
 * 주간 완료 리듬 — 세그먼트 스트립.
 * 아이콘 반복 대신 요일 라벨 + 얇은 채움 칸으로 단정하게 표현.
 */
export function FlowHistoryWeekdayRow({ row, palette, categoryKey }: Props) {
  const { locale } = useTranslation();
  const weekdayLabels = useMemo(() => getHistoryWeekdayLabels(locale), [locale]);
  const doneFill = categoryAccentColorPastel(categoryKey);

  return (
    <View style={styles.root}>
      <View style={styles.labelRow}>
        {weekdayLabels.map((label, index) => {
          const done = row.weekdayDone[index] ?? false;
          return (
            <ThemedText
              key={`label-${label}-${index}`}
              style={[
                styles.label,
                { color: done ? palette.ink : palette.muted },
                done && styles.labelDone,
              ]}>
              {label}
            </ThemedText>
          );
        })}
      </View>

      <View
        style={[
          styles.track,
          {
            backgroundColor: palette.weekdayIdle,
            borderColor: palette.ink,
          },
        ]}>
        {weekdayLabels.map((label, index) => {
          const done = row.weekdayDone[index] ?? false;
          const isLast = index === weekdayLabels.length - 1;
          return (
            <View
              key={`cell-${label}-${index}`}
              style={[
                styles.cell,
                !isLast && {
                  borderRightWidth: StyleSheet.hairlineWidth,
                  borderRightColor: palette.ink,
                },
                { backgroundColor: done ? doneFill : 'transparent' },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    width: '100%',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 12,
  },
  labelDone: {
    fontWeight: '800',
  },
  track: {
    flexDirection: 'row',
    width: '100%',
    height: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    height: '100%',
  },
});
