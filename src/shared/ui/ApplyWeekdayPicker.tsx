import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  WEEKDAY_LABELS,
  WEEKDAY_PICKER_ORDER,
  normalizeApplyWeekdays,
  type WeekdayIndex,
} from '@shared/lib/storage';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  selectedWeekdays: WeekdayIndex[];
  onChange: (weekdays: WeekdayIndex[]) => void;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  surface: string;
};

export function ApplyWeekdayPicker({
  selectedWeekdays,
  onChange,
  isDark,
  ink,
  muted,
  line,
  surface,
}: Props) {
  const pill = tabPillColors(isDark);
  const selected = new Set(normalizeApplyWeekdays(selectedWeekdays));

  const toggleDay = (day: WeekdayIndex) => {
    const current = normalizeApplyWeekdays(selectedWeekdays);
    const next = current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day];
    if (next.length === 0) return;
    void Haptics.selectionAsync();
    onChange(normalizeApplyWeekdays(next));
  };

  return (
    <View style={styles.root}>
      <ThemedText style={[styles.title, { color: ink }]}>적용 요일</ThemedText>
      <View style={styles.dayRow}>
        {WEEKDAY_PICKER_ORDER.map((day) => {
          const active = selected.has(day);
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${WEEKDAY_LABELS[day]} ${active ? '선택됨' : '선택'}`}
              onPress={() => toggleDay(day)}
              style={({ pressed }) => [
                styles.dayChip,
                {
                  backgroundColor: active ? pill.activeBg : surface,
                  borderColor: active ? pill.activeBorder : line,
                },
                pressed && { opacity: 0.86 },
              ]}>
              <ThemedText
                style={[
                  styles.dayChipLabel,
                  { color: active ? pill.activeIcon : muted },
                ]}>
                {WEEKDAY_LABELS[day]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
