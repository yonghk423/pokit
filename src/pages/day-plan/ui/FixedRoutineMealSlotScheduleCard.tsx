import { StyleSheet, View } from 'react-native';

import {
  DAY_MEAL_SLOT_LABEL,
  DAY_MEAL_SLOT_ORDER,
  type DayMealSlotSchedule,
} from '@shared/lib/storage';
import { formatHhmmClockKo } from '@entities/day-plan';
import { ThemedText } from '@shared/ui/themed-text';

import { FixedRoutineSettingsButton } from './FixedRoutineSettingsButton';

type Props = {
  schedule: DayMealSlotSchedule;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  cardBg: string;
  onPressSettings: () => void;
};

/** 오늘의 루틴 — 시간대 요약 + 설정 진입 */
export function FixedRoutineMealSlotScheduleCard({
  schedule,
  isDark,
  ink,
  muted,
  line,
  cardBg,
  onPressSettings,
}: Props) {
  return (
    <View style={[styles.root, { backgroundColor: cardBg, borderColor: line }]}>
      <View style={styles.textCol}>
        <ThemedText style={[styles.title, { color: ink }]}>시간대 모드</ThemedText>
        <ThemedText style={[styles.summary, { color: muted }]} numberOfLines={3}>
          {DAY_MEAL_SLOT_ORDER.map(
            (slot) => `${DAY_MEAL_SLOT_LABEL[slot]} ${formatHhmmClockKo(schedule[slot])}`,
          ).join(' · ')}
        </ThemedText>
      </View>
      <FixedRoutineSettingsButton
        isDark={isDark}
        ink={ink}
        line={line}
        accessibilityLabel="시간대 설정"
        onPress={onPressSettings}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  summary: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
});
