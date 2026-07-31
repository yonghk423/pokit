import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { parseHHmmToMinutes } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { paletteForReminderTimeCard, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

type Props = {
  visible: boolean;
  priorityStart: string;
  priorityEnd: string;
  isDark: boolean;
  onClose: () => void;
  onSave: (start: string, end: string) => void;
};

export function FixedRoutinePriorityWindowSheet({
  visible,
  priorityStart,
  priorityEnd,
  isDark,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const palette = useMemo(() => paletteForReminderTimeCard(isDark), [isDark]);
  const [draftStart, setDraftStart] = useState(priorityStart);
  const [draftEnd, setDraftEnd] = useState(priorityEnd);
  const [expanded, setExpanded] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraftStart(priorityStart);
    setDraftEnd(priorityEnd);
    setExpanded(null);
  }, [visible, priorityStart, priorityEnd]);

  const handleSave = useCallback(() => {
    const ps = parseHHmmToMinutes(draftStart);
    const pe = parseHHmmToMinutes(draftEnd);
    if (ps === null || pe === null) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(draftStart, draftEnd);
    onClose();
  }, [draftEnd, draftStart, onClose, onSave]);

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
            집중 구간 설정
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
            타임라인에 표시되는 하루 집중 구간이에요. 오늘 탭 타임라인과 함께 반영돼요.
          </ThemedText>
          <View style={[styles.rowWrap, { borderBottomColor: palette.timeField.border }]}>
            <SnappedTimePickerField
              label="시작"
              hint="집중 구간이 시작되는 시각"
              valueHhmm={draftStart}
              onChangeHhmm={setDraftStart}
              expanded={expanded === 'start'}
              onToggleExpand={() => setExpanded((cur) => (cur === 'start' ? null : 'start'))}
              isDark={isDark}
              palette={palette.timeField}
              snapStepMinutes={1}
            />
          </View>
          <View style={[styles.rowWrap, { borderBottomColor: palette.timeField.border }]}>
            <SnappedTimePickerField
              label="종료"
              hint="집중 구간이 끝나는 시각"
              valueHhmm={draftEnd}
              onChangeHhmm={setDraftEnd}
              expanded={expanded === 'end'}
              onToggleExpand={() => setExpanded((cur) => (cur === 'end' ? null : 'end'))}
              isDark={isDark}
              palette={palette.timeField}
              snapStepMinutes={1}
              /** 종료의 오전 12시는 다음 날 경계(24:00)로 저장 */
              mapMidnightToEndOfDay
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: palette.timeField.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="취소"
            onPress={onClose}
            style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.72 }]}>
            <ThemedText style={[styles.ghostBtnLabel, { color: palette.timeField.onVariant }]}>
              취소
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="집중 구간 저장"
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
    lineHeight: 19,
    fontWeight: '500',
    marginBottom: 8,
  },
  rowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ghostBtnLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 0,
  },
  primaryBtnLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
});
