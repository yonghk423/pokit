import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMinutesToHHmm, parseHHmmToMinutes } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { paletteForReminderTimeCard, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

type Props = {
  visible: boolean;
  itemLabel: string;
  startMinutes: number;
  endMinutes: number;
  isDark: boolean;
  onClose: () => void;
  onSave: (startMinutes: number, endMinutes: number) => void;
};

export function FixedRoutineSpineItemTimeSheet({
  visible,
  itemLabel,
  startMinutes,
  endMinutes,
  isDark,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const palette = useMemo(() => paletteForReminderTimeCard(isDark), [isDark]);
  const [draftStart, setDraftStart] = useState(formatMinutesToHHmm(startMinutes));
  const [draftEnd, setDraftEnd] = useState(formatMinutesToHHmm(endMinutes));
  const [expanded, setExpanded] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraftStart(formatMinutesToHHmm(startMinutes));
    setDraftEnd(formatMinutesToHHmm(endMinutes));
    setExpanded(null);
  }, [visible, startMinutes, endMinutes]);

  const handleSave = useCallback(() => {
    const start = parseHHmmToMinutes(draftStart);
    let end = parseHHmmToMinutes(draftEnd);
    if (start === null || end === null) return;
    if (end <= start) end = Math.min(24 * 60, start + 15);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(start, end);
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
          <ThemedText style={[styles.title, { color: palette.timeField.onSurface }]} numberOfLines={1}>
            {itemLabel} 시간
          </ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={palette.timeField.onVariant} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <ThemedText style={[styles.lead, { color: palette.timeField.onVariant }]}>
            타임라인에 배치될 시작·종료 시각을 정해요.
          </ThemedText>
          <View style={[styles.rowWrap, { borderBottomColor: palette.timeField.border }]}>
            <SnappedTimePickerField
              label="시작"
              hint="루틴이 시작되는 시각"
              valueHhmm={draftStart}
              onChangeHhmm={setDraftStart}
              expanded={expanded === 'start'}
              onToggleExpand={() => setExpanded((cur) => (cur === 'start' ? null : 'start'))}
              isDark={isDark}
              palette={palette.timeField}
              snapStepMinutes={5}
            />
          </View>
          <View style={[styles.rowWrap, { borderBottomColor: palette.timeField.border }]}>
            <SnappedTimePickerField
              label="종료"
              hint="루틴이 끝나는 시각"
              valueHhmm={draftEnd}
              onChangeHhmm={setDraftEnd}
              expanded={expanded === 'end'}
              onToggleExpand={() => setExpanded((cur) => (cur === 'end' ? null : 'end'))}
              isDark={isDark}
              palette={palette.timeField}
              snapStepMinutes={5}
            />
          </View>
        </View>

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
            accessibilityLabel="루틴 시간 저장"
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
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
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
