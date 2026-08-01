import { Pressable, StyleSheet, View } from 'react-native';

import {
  DAY_MEAL_SLOT_LABEL,
  DAY_MEAL_SLOT_ORDER,
  type DayMealSlotSchedule,
} from '@shared/lib/storage';
import { formatHhmmClockKo } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="시간대 설정"
        onPress={onPressSettings}
        style={({ pressed }) => [
          styles.settingsBtn,
          {
            borderColor: line,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
          },
          pressed && { opacity: 0.72 },
        ]}>
        <IconSymbol name="clock" size={12} color={ink} />
        <ThemedText style={[styles.settingsBtnLabel, { color: ink }]}>설정</ThemedText>
      </Pressable>
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
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 15,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 2,
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
  },
  settingsBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
