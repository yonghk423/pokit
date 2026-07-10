import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

const PRIMARY = 'rgb(0, 0, 0)';

function hhmmToPickerDate(hhmm: string): Date {
  const m = parseHHmmToMinutes(hhmm);
  const d = new Date();
  if (m === null) {
    d.setHours(12, 0, 0, 0);
    return d;
  }
  if (m >= 24 * 60) {
    d.setHours(23, 59, 0, 0);
    return d;
  }
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

function pickerDateToHhmm(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type Props = {
  valueHhmm: string;
  onChangeHhmm: (next: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  ink: string;
  muted: string;
  line: string;
  surface: string;
  placeholder?: string;
  accessibilityLabel?: string;
};

export function ReminderTimePickerPill({
  valueHhmm,
  onChangeHhmm,
  expanded,
  onToggleExpand,
  ink,
  muted,
  line,
  surface,
  placeholder = '시간 선택',
  accessibilityLabel = '알림 시간',
}: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const pickerDate = useMemo(() => hhmmToPickerDate(valueHhmm), [valueHhmm]);
  const hasValue = valueHhmm.trim().length > 0;
  const label = hasValue ? formatHhmmClockKo(valueHhmm) : placeholder;

  const onIosTimeChange = (_: unknown, date?: Date) => {
    if (!date) return;
    onChangeHhmm(pickerDateToHhmm(date));
  };

  const onAndroidTimeChange = (event: { type?: string }, date?: Date) => {
    if (event.type === 'dismissed') {
      onToggleExpand();
      return;
    }
    if (!date) return;
    onChangeHhmm(pickerDateToHhmm(date));
    onToggleExpand();
  };

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
          void Haptics.selectionAsync();
          onToggleExpand();
        }}
        style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <View
          style={[
            styles.pill,
            {
              backgroundColor: surface,
              borderColor: expanded ? PRIMARY : line,
            },
          ]}>
          <ThemedText
            style={[
              styles.pillText,
              { color: hasValue ? ink : muted },
            ]}
            numberOfLines={1}>
            {label}
          </ThemedText>
        </View>
      </Pressable>
      {Platform.OS === 'ios' && expanded ? (
        <View style={styles.iosPickerBlock}>
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display="spinner"
            themeVariant={isDark ? 'dark' : 'light'}
            minuteInterval={1}
            onChange={onIosTimeChange}
          />
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              onToggleExpand();
            }}
            accessibilityRole="button"
            accessibilityLabel="시간 선택 확인"
            style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.86 }]}>
            <ThemedText style={styles.confirmBtnText}>확인</ThemedText>
          </Pressable>
        </View>
      ) : null}
      {Platform.OS === 'android' && expanded ? (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display="default"
          onChange={onAndroidTimeChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexShrink: 0,
    maxWidth: '100%',
  },
  pill: {
    minWidth: 92,
    maxWidth: 132,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 2,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  iosPickerBlock: {
    marginTop: 6,
    paddingTop: 4,
    gap: 2,
  },
  confirmBtn: {
    alignSelf: 'flex-end',
    minWidth: 68,
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
    letterSpacing: -0.1,
  },
});
