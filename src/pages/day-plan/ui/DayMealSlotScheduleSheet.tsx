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
import { RetroFlatColors } from '@shared/config/retroFlat';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
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
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const [draft, setDraft] = useState(schedule);
  const [expandedSlot, setExpandedSlot] = useState<DayMealSlot | null>(null);

  const timePickerPalette = useMemo(
    () => ({
      ...palette.timeField,
      containerLowest: isDark ? tone.surfaceAlt : '#FFFFFF',
    }),
    [isDark, palette.timeField, tone.surfaceAlt],
  );

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
  }, [draft, onClose, onSave, t]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: tone.bg,
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: timePickerPalette.onSurface }]}>
            {t('dayPlan.mealSlotScheduleTitle')}
          </ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={timePickerPalette.onVariant} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.lead, { color: timePickerPalette.onVariant }]}>
            {t('dayPlan.mealSlotScheduleLead')}
          </ThemedText>
          <CityPopCardShell
            isDark={isDark}
            faceColor={isDark ? tone.surfaceAlt : '#FFFFFF'}
            contentStyle={styles.settingsCard}>
            {DAY_MEAL_SLOT_ORDER.map((slot, index) => (
              <View key={slot}>
                {index > 0 ? (
                  <View style={[styles.divider, { backgroundColor: timePickerPalette.border }]} />
                ) : null}
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
                  palette={timePickerPalette}
                  snapStepMinutes={1}
                  mapMidnightToEndOfDay={slot === 'night'}
                />
              </View>
            ))}
          </CityPopCardShell>
        </ScrollView>

        <View style={styles.footer}>
          <BrutalConfirmButton
            align="stretch"
            label={t('common.save')}
            accessibilityLabel={t('dayPlan.mealSlotScheduleSaveA11y')}
            onPress={handleSave}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            onPress={onClose}
            style={({ pressed }) => [styles.textBtn, pressed && { opacity: 0.7 }]}>
            <ThemedText style={[styles.textBtnLabel, { color: timePickerPalette.onVariant }]}>
              {t('common.cancel')}
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
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  lead: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  settingsCard: {
    borderWidth: 0,
    padding: 12,
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  textBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  textBtnLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
