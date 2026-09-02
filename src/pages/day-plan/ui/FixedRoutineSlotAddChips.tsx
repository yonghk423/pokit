import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatMealSlotLabel, type LocaleDayMealSlot } from '@shared/lib/i18n';
import { useTranslation } from '@shared/lib/i18n';
import { DAY_MEAL_SLOT_ORDER, type DayMealSlot } from '@shared/lib/storage';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  title: string;
  occupiedSlots?: ReadonlySet<DayMealSlot>;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  onSelectSlot: (slot: DayMealSlot) => void;
};

/** 구간 레이아웃 — 빈 구간 또는 다른 구간에 항목 추가 */
export function FixedRoutineSlotAddChips({
  title,
  occupiedSlots,
  isDark,
  ink,
  muted,
  line,
  onSelectSlot,
}: Props) {
  const { locale, t } = useTranslation();
  const slots =
    occupiedSlots && occupiedSlots.size > 0
      ? DAY_MEAL_SLOT_ORDER.filter((slot) => !occupiedSlots.has(slot))
      : DAY_MEAL_SLOT_ORDER;

  if (slots.length === 0) return null;

  return (
    <View style={styles.root}>
      <ThemedText style={[styles.title, { color: muted }]}>{title}</ThemedText>
      <View style={styles.chips}>
        {slots.map((slot) => (
          <Pressable
            key={slot}
            accessibilityRole="button"
            accessibilityLabel={t('dayPlan.addToSlotA11y', { slot: formatMealSlotLabel(slot as LocaleDayMealSlot, locale) })}
            onPress={() => {
              void Haptics.selectionAsync();
              onSelectSlot(slot);
            }}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: line,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              },
              pressed && { opacity: 0.72 },
            ]}>
            <ThemedText style={[styles.chipLabel, { color: ink }]}>
              {formatMealSlotLabel(slot as LocaleDayMealSlot, locale)}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 2,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
