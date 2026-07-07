import { StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { WEEKDAY_LABELS, type WeeklyFlowHistoryRow } from '../lib/buildWeeklyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';

const WEEKDAY_DOT_MAX = 20;
const MODE_ICON_SIZE = WEEKDAY_DOT_MAX;

type Props = {
  row: WeeklyFlowHistoryRow;
  palette: FlowHistoryPalette;
};

/** 모드 아이콘 + 요일 트랙 한 줄 */
export function FlowHistoryModeWeekdayRow({ row, palette }: Props) {
  return (
    <View style={styles.modeRow}>
      <View
        style={[styles.layoutIconWrap, { backgroundColor: palette.weekdayIdle }]}
        accessibilityLabel={row.layoutLabel}>
        <IconSymbol
          name={row.layoutIcon as SymbolViewProps['name']}
          size={11}
          color={palette.muted}
        />
      </View>

      <View style={styles.trackWrap}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  layoutIconWrap: {
    width: MODE_ICON_SIZE,
    height: MODE_ICON_SIZE,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 0,
  },
  trackWrap: {
    flex: 1,
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
    borderWidth: 2,
  },
  weekdayLabel: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
