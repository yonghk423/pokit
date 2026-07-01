import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DAY_MEAL_SLOT_LABEL,
  DAY_MEAL_SLOT_ORDER,
  DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
  isDayMealSlotScheduleValid,
  type DayMealSlot,
  type DayMealSlotSchedule,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { paletteForReminderTimeCard, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

type Props = {
  visible: boolean;
  schedule: DayMealSlotSchedule;
  isDark: boolean;
  onClose: () => void;
  onSave: (next: DayMealSlotSchedule) => void;
};

const SLOT_HINTS: Record<DayMealSlot, string> = {
  dawn: '새벽 구간이 시작되는 시각',
  morning: '아침 구간이 시작되는 시각',
  lunch: '점심 구간이 시작되는 시각',
  dinner: '저녁 구간이 시작되는 시각',
  night: '밤 구간이 시작되는 시각',
};

export function DayMealSlotScheduleSheet({
  visible,
  schedule,
  isDark,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const palette = useMemo(() => paletteForReminderTimeCard(isDark), [isDark]);
  const [draft, setDraft] = useState(schedule);
  const [expandedSlot, setExpandedSlot] = useState<DayMealSlot | null>(null);

  useEffect(() => {
    if (visible) {
      setDraft(schedule);
      setExpandedSlot(null);
    }
  }, [visible, schedule]);

  const handleSave = useCallback(() => {
    if (!isDayMealSlotScheduleValid(draft)) {
      Alert.alert(
        '시간 순서를 확인해 주세요',
        '새벽 → 아침 → 점심 → 저녁 → 밤 순으로 시작 시각이 앞서야 해요.',
      );
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(draft);
    onClose();
  }, [draft, onClose, onSave]);

  const handleReset = useCallback(() => {
    void Haptics.selectionAsync();
    setDraft({ ...DEFAULT_DAY_MEAL_SLOT_SCHEDULE });
    setExpandedSlot(null);
  }, []);

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
            시간대 설정
          </ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={palette.timeField.onVariant} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <ThemedText style={[styles.lead, { color: palette.timeField.onVariant }]}>
            각 구간이 시작되는 시각을 정해요. 오늘 탭 구간 보기와 나만의 루틴에 함께 반영돼요.
          </ThemedText>
          {DAY_MEAL_SLOT_ORDER.map((slot) => (
            <View key={slot} style={[styles.rowWrap, { borderBottomColor: palette.timeField.border }]}>
              <SnappedTimePickerField
                label={DAY_MEAL_SLOT_LABEL[slot]}
                hint={SLOT_HINTS[slot]}
                valueHhmm={draft[slot]}
                onChangeHhmm={(next) => setDraft((prev) => ({ ...prev, [slot]: next }))}
                expanded={expandedSlot === slot}
                onToggleExpand={() =>
                  setExpandedSlot((cur) => (cur === slot ? null : slot))
                }
                isDark={isDark}
                palette={palette.timeField}
                snapStepMinutes={1}
              />
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: palette.timeField.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="기본값으로 되돌리기"
            onPress={handleReset}
            style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.72 }]}>
            <ThemedText style={[styles.ghostBtnLabel, { color: palette.timeField.onVariant }]}>
              기본값
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="시간대 설정 저장"
            onPress={handleSave}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: isDark ? '#fafafa' : '#000000' },
              pressed && { opacity: 0.88 },
            ]}>
            <ThemedText style={[styles.primaryBtnLabel, { color: isDark ? '#09090b' : '#ffffff' }]}>
              저장
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
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ghostBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1.4,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
