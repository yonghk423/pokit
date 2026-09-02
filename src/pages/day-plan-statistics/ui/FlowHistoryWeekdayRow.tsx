import { StyleSheet, View } from 'react-native';
import { useMemo } from 'react';

import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import { getHistoryWeekdayLabels, type WeeklyFlowHistoryRow } from '../lib/buildWeeklyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';

const WEEKDAY_DOT_MAX = 18;

type Props = {
  row: WeeklyFlowHistoryRow;
  palette: FlowHistoryPalette;
};

/** 요일별 완료 트랙 */
export function FlowHistoryWeekdayRow({ row, palette }: Props) {
  const { locale } = useTranslation();
  const weekdayLabels = useMemo(() => getHistoryWeekdayLabels(locale), [locale]);

  return (
    <View style={styles.trackWrap}>
      <View style={styles.weekdayTrack}>
        {weekdayLabels.map((label, index) => {
          const done = row.weekdayDone[index] ?? false;
          return (
            <View key={`${label}-${index}`} style={styles.weekdayCol}>
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
  trackWrap: {
    width: '100%',
    minWidth: 0,
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
    borderWidth: 1.5,
  },
  weekdayLabel: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
