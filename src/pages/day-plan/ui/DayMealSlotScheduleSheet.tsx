import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  alignDayMealSlotScheduleToPriorityWindow,
  DAY_MEAL_SLOT_ORDER,
  isDayMealSlotScheduleValid,
  type DayMealSlot,
  type DayMealSlotSchedule,
} from '@shared/lib/storage';
import { formatMealSlotLabel, type LocaleDayMealSlot } from '@shared/lib/i18n';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { paletteForReminderTimeCard, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

import { isOvernightHhmmRange } from '../lib/dayPlanEditorShared';

type Props = {
  visible: boolean;
  schedule: DayMealSlotSchedule;
  isDark: boolean;
  onClose: () => void;
  onSave: (next: DayMealSlotSchedule) => void;
  /** 열릴 때 펼칠 구간 — 오늘 탭에서 특정 시간을 눌러 들어올 때 */
  initialExpandedSlot?: DayMealSlot | null;
  /** 하루 시작·마무리 — 있으면 첫·끝 구간을 창에 맞춰 표시 */
  priorityStart?: string;
  priorityEnd?: string;
};

const SLOT_HINT_KEYS = {
  dawn: 'mealSlot.dawnStartHint',
  morning: 'mealSlot.morningStartHint',
  lunch: 'mealSlot.lunchStartHint',
  dinner: 'mealSlot.dinnerStartHint',
  night: 'mealSlot.nightStartHint',
} as const satisfies Record<DayMealSlot, import('@shared/lib/i18n').I18nKey>;

export function DayMealSlotScheduleSheet({
  visible,
  schedule,
  isDark,
  onClose,
  onSave,
  initialExpandedSlot = null,
  priorityStart,
  priorityEnd,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const palette = useMemo(() => paletteForReminderTimeCard(isDark), [isDark]);
  const [draft, setDraft] = useState(schedule);
  const [expandedSlot, setExpandedSlot] = useState<DayMealSlot | null>(null);

  useEffect(() => {
    if (!visible) return;
    const start = priorityStart?.trim() ?? '';
    const end = priorityEnd?.trim() ?? '';
    const aligned =
      start && end
        ? alignDayMealSlotScheduleToPriorityWindow(
            schedule,
            start,
            end,
            isOvernightHhmmRange(start, end),
          )
        : schedule;
    setDraft(aligned);
    setExpandedSlot(initialExpandedSlot);
  }, [visible, schedule, initialExpandedSlot, priorityStart, priorityEnd]);

  const handleSave = useCallback(() => {
    if (!isDayMealSlotScheduleValid(draft)) {
      Alert.alert(
        t('alert.mealSlotOrder.title'),
        t('alert.mealSlotOrder.message'),
      );
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(draft);
    onClose();
  }, [draft, onClose, onSave]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: palette.cardBg,
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <View style={[styles.header, { borderBottomColor: palette.timeField.border }]}>
          <ThemedText style={[styles.title, { color: palette.timeField.onSurface }]}>
            {t('dayPlan.mealSlotScheduleTitle')}
          </ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={palette.timeField.onVariant} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <ThemedText style={[styles.lead, { color: palette.timeField.onVariant }]}>
            {t('dayPlan.mealSlotScheduleLead')}
          </ThemedText>
          {DAY_MEAL_SLOT_ORDER.map((slot) => (
            <View key={slot} style={[styles.rowWrap, { borderBottomColor: palette.timeField.border }]}>
              <SnappedTimePickerField
                label={formatMealSlotLabel(slot as LocaleDayMealSlot)}
                hint={t(SLOT_HINT_KEYS[slot])}
                valueHhmm={draft[slot]}
                onChangeHhmm={(next) => setDraft((prev) => ({ ...prev, [slot]: next }))}
                expanded={expandedSlot === slot}
                onToggleExpand={() =>
                  setExpandedSlot((cur) => (cur === slot ? null : slot))
                }
                isDark={isDark}
                palette={palette.timeField}
                snapStepMinutes={1}
                mapMidnightToEndOfDay={slot === 'night'}
              />
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: palette.timeField.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dayPlan.mealSlotScheduleSaveA11y')}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: isDark ? '#fafafa' : '#000000' },
              pressed && { opacity: 0.88 },
            ]}>
            <ThemedText style={[styles.primaryBtnLabel, { color: isDark ? '#09090b' : '#ffffff' }]}>
              {t('common.save')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 4,
  },
  lead: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    marginBottom: 8,
  },
  rowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
