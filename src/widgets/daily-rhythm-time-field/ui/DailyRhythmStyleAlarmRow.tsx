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
};

/** `DailyRhythmTimeEditorBody` 알림 행과 동일 레이아웃 */
export function DailyRhythmStyleAlarmRow({
  title,
  hint,
  value,
  onValueChange,
  palette,
}: DailyRhythmStyleAlarmRowProps) {
  return (
    <View style={styles.alarmRow}>
      <View style={styles.alarmTextCol}>
        <ThemedText
          style={[styles.alarmTitle, { color: palette.onSurface }]}
          lightColor={palette.onSurface}
          darkColor={palette.onSurface}>
          {title}
        </ThemedText>
        <ThemedText
          style={[styles.alarmHint, { color: palette.onVariant }]}
          lightColor={palette.onVariant}
          darkColor={palette.onVariant}>
          {hint}
        </ThemedText>
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
  alarmTextCol: { flex: 1, minWidth: 0, gap: 6 },
  alarmTitle: { fontSize: 15, fontWeight: '800' },
  alarmHint: { fontSize: 11, fontWeight: '500', lineHeight: 15 },
});
