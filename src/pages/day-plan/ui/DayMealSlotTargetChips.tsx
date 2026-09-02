import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  formatHhmmClock,
  formatMealSlotLabel,
  type LocaleDayMealSlot,
} from '@shared/lib/i18n';
import { useTranslation } from '@shared/lib/i18n';
import {
  DAY_MEAL_SLOT_ORDER,
  getMealSlotStartHhmm,
  type DayMealSlot,
  type DayMealSlotSchedule,
} from '@shared/lib/storage';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  selectedSlot: DayMealSlot;
  schedule: DayMealSlotSchedule;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  onSelectSlot: (slot: DayMealSlot) => void;
};

/** 루틴 탭·담기 — 시간대별 보기에 담을 구간 선택 */
export function DayMealSlotTargetChips({
  selectedSlot,
  schedule,
  isDark,
  ink,
  muted,
  line,
  onSelectSlot,
}: Props) {
  const { locale, t } = useTranslation();

  return (
    <View style={styles.root}>
      <ThemedText style={[styles.title, { color: muted }]}>{t('dayPlan.targetMealSlot')}</ThemedText>
      <View style={styles.chips}>
        {DAY_MEAL_SLOT_ORDER.map((slot) => {
          const selected = slot === selectedSlot;
          const hint = formatHhmmClock(getMealSlotStartHhmm(schedule, slot), locale);
          return (
            <Pressable
              key={slot}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${formatMealSlotLabel(slot as LocaleDayMealSlot, locale)} ${hint}, ${selected ? t('common.selected') : t('common.select')}`}
              onPress={() => {
                if (selected) return;
                void Haptics.selectionAsync();
                onSelectSlot(slot);
              }}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: selected ? ink : line,
                  backgroundColor: selected
                    ? isDark
                      ? 'rgba(255,255,255,0.14)'
                      : 'rgba(0,0,0,0.06)'
                    : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.03)',
                },
                pressed && !selected && { opacity: 0.72 },
              ]}>
              <ThemedText
                style={[styles.chipLabel, { color: selected ? ink : muted }]}
                numberOfLines={1}>
                {formatMealSlotLabel(slot as LocaleDayMealSlot, locale)}
              </ThemedText>
              <ThemedText
                style={[styles.chipHint, { color: selected ? ink : muted }]}
                numberOfLines={1}>
                {hint}
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    minWidth: 58,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    gap: 1,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  chipHint: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: -0.05,
  },
});
