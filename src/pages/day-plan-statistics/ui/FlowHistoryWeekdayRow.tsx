import { StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import type { SymbolViewProps } from 'expo-symbols';

import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import {
  activeIconColorByCategory,
  categoryAccentColorPastel,
} from '@widgets/day-plan-priority-order';

import { getHistoryWeekdayLabels, type WeeklyFlowHistoryRow } from '../lib/buildWeeklyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';

type Props = {
  row: WeeklyFlowHistoryRow;
  palette: FlowHistoryPalette;
  categoryKey: string;
  icon: string;
};

/** 요일별 완료 트랙 — 완료 시 루틴 아이콘 표시 */
export function FlowHistoryWeekdayRow({ row, palette, categoryKey, icon }: Props) {
  const { locale } = useTranslation();
  const weekdayLabels = useMemo(() => getHistoryWeekdayLabels(locale), [locale]);
  const iconColor = activeIconColorByCategory(categoryKey);
  const doneBg = categoryAccentColorPastel(categoryKey);

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
                    borderColor: palette.border,
                    backgroundColor: done ? doneBg : 'transparent',
                  },
                ]}>
                {done ? (
                  <IconSymbol name={icon as SymbolViewProps['name']} size={14} color={iconColor} />
                ) : null}
              </View>
              <ThemedText
                style={[styles.weekdayLabel, { color: done ? palette.ink : palette.muted }]}>
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
    gap: 5,
    alignItems: 'flex-start',
  },
  weekdayCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 4,
  },
  weekdayDot: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 0,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayLabel: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
