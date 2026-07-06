import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

const PRIMARY = 'rgb(0, 0, 0)';

export type DailyRhythmStyleAlarmRowPalette = {
  onSurface: string;
  onVariant: string;
  trackOff: string;
};

export type DailyRhythmStyleAlarmRowProps = {
  title: string;
  hint: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  palette: DailyRhythmStyleAlarmRowPalette;
  compact?: boolean;
};

/** `DailyRhythmTimeEditorBody` 알림 행과 동일 레이아웃 */
export function DailyRhythmStyleAlarmRow({
  title,
  hint,
  value,
  onValueChange,
  palette,
  compact = false,
}: DailyRhythmStyleAlarmRowProps) {
  return (
    <View style={[styles.alarmRow, compact && styles.alarmRowCompact]}>
      <View style={[styles.alarmTextCol, compact && styles.alarmTextColCompact]}>
        <ThemedText
          style={[styles.alarmTitle, compact && styles.alarmTitleCompact, { color: palette.onSurface }]}
          lightColor={palette.onSurface}
          darkColor={palette.onSurface}>
          {title}
        </ThemedText>
        {hint.length > 0 ? (
          <ThemedText
            style={[styles.alarmHint, compact && styles.alarmHintCompact, { color: palette.onVariant }]}
            lightColor={palette.onVariant}
            darkColor={palette.onVariant}>
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        trackColor={{ true: PRIMARY, false: palette.trackOff }}
        thumbColor="#fff"
        value={value}
        onValueChange={onValueChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  alarmRowCompact: {
    gap: 10,
  },
  alarmTextCol: { flex: 1, minWidth: 0, gap: 6 },
  alarmTextColCompact: { gap: 2 },
  alarmTitle: { fontSize: 15, fontWeight: '800' },
  alarmTitleCompact: { fontSize: 13, fontWeight: '800' },
  alarmHint: { fontSize: 11, fontWeight: '500', lineHeight: 15 },
  alarmHintCompact: { fontSize: 10, lineHeight: 14 },
});
