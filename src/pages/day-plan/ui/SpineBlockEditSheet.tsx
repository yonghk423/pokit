import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatHhmmClockKo,
  isSpineBlockScheduleWithinPriorityWindow,
  resolveCategoryCatalogIcon,
  resolveSpinePriorityWindow,
} from '@entities/day-plan';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';
import {
  COMPLETION_CHECKED_COLOR_DARK,
  COMPLETION_CHECKED_COLOR_LIGHT,
  CompletionRadioButton,
} from '@shared/ui/completion-radio-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { getPickerCategoryLabel } from '../lib/dayPlanEditorShared';
import { CatalogRowSpineTimePanel } from './CatalogRowSpineTimePanel';

export type SpineBlockEditDraft = {
  blockId: string;
  title: string;
  categoryKey: string | null;
  startMinutes: number;
  endMinutes: number;
  endsNextCalendarDay?: boolean;
};

type Props = {
  visible: boolean;
  draft: SpineBlockEditDraft | null;
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  priorityStart: string;
  priorityEnd: string;
  /** 일정 시작 기준 달력일 — 시간 패널 날짜 표시용 */
  baseDateKey?: string;
  onClose: () => void;
  onSave: (input: {
    title: string;
    categoryKey: string | null;
    startMinutes: number;
    endMinutes: number;
    endsNextCalendarDay: boolean;
    blockId: string;
  }) => void;
  onDelete?: (blockId: string) => void;
  /** 연결된 루틴의 상세 설정 화면 열기 */
  onOpenCategorySettings?: (categoryKey: string) => void;
  /** 완료 상태·토글 (타임라인 완료 버튼을 이 시트로 통합) */
  completed?: boolean;
  onToggleComplete?: () => void;
};

/** 타임라인 블록 탭 — 선택한 일정만 수정(제목·시간) */
export function SpineBlockEditSheet({
  visible,
  draft,
  isDark,
  ink,
  muted,
  surface,
  line,
  priorityStart,
  priorityEnd,
  baseDateKey,
  onClose,
  onSave,
  onDelete,
  onOpenCategorySettings,
  completed = false,
  onToggleComplete,
}: Props) {
  const insets = useSafeAreaInsets();
  const [titleText, setTitleText] = useState('');
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [endMinutes, setEndMinutes] = useState(9 * 60 + 30);
  const [endsNextCalendarDay, setEndsNextCalendarDay] = useState(false);

  useEffect(() => {
    if (!visible || !draft) return;
    setTitleText(draft.title);
    setCategoryKey(draft.categoryKey);
    setStartMinutes(draft.startMinutes);
    setEndMinutes(draft.endMinutes);
    setEndsNextCalendarDay(Boolean(draft.endsNextCalendarDay));
  }, [visible, draft]);

  const handleScheduleChange = useCallback((start: number, end: number, endsNext: boolean) => {
    let nextEnd = end;
    if (!endsNext && nextEnd <= start) {
      nextEnd = Math.min(24 * 60, start + 15);
    }
    setStartMinutes(start);
    setEndMinutes(nextEnd);
    setEndsNextCalendarDay(endsNext);
  }, []);

  const handleSave = useCallback(() => {
    if (!draft) return;
    const window = resolveSpinePriorityWindow(priorityStart, priorityEnd);
    if (
      !window ||
      !isSpineBlockScheduleWithinPriorityWindow(
        {
          startMinutes,
          endMinutes,
          endsNextCalendarDay,
        },
        window,
      )
    ) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        '시간을 확인해 주세요',
        `루틴 종료 시간(${formatHhmmClockKo(priorityEnd)})을 넘는 일정은 저장할 수 없어요. 하루 시작~마무리 안으로 맞춰 주세요.`,
      );
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      title: titleText,
      categoryKey,
      startMinutes,
      endMinutes,
      endsNextCalendarDay,
      blockId: draft.blockId,
    });
  }, [
    categoryKey,
    draft,
    endMinutes,
    endsNextCalendarDay,
    onSave,
    priorityEnd,
    priorityStart,
    startMinutes,
    titleText,
  ]);

  if (!draft) return null;

  const linkedLabel = categoryKey ? getPickerCategoryLabel(categoryKey) : null;
  const linkedIcon = categoryKey ? resolveCategoryCatalogIcon(categoryKey) : null;
  const linkedAccent = categoryKey ? activeIconColorByCategory(categoryKey) : ink;
  const destructive = isDark ? '#F87171' : '#DC2626';
  const panelBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.header, { borderBottomColor: line }]}>
          <ThemedText style={[styles.title, { color: ink }]}>일정 수정</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.fieldBlock}>
            <ThemedText style={[styles.sectionLabel, { color: muted }]}>할 일</ThemedText>
            <View
              style={[
                styles.titleRow,
                {
                  borderColor: completed ? (isDark ? '#FAFAFA' : ink) : line,
                  backgroundColor: panelBg,
                },
              ]}>
              {onToggleComplete ? (
                <View style={styles.titleRadioSlot}>
                  <View style={styles.titleRadioHitTrim}>
                    <CompletionRadioButton
                      checked={completed}
                      isDark={isDark}
                      checkedColor={isDark ? COMPLETION_CHECKED_COLOR_DARK : COMPLETION_CHECKED_COLOR_LIGHT}
                      accessibilityLabel={completed ? '완료 취소' : '완료로 표시'}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onToggleComplete();
                      }}
                    />
                  </View>
                </View>
              ) : null}
              <TextInput
                value={titleText}
                onChangeText={setTitleText}
                placeholder="무엇을 할까요?"
                placeholderTextColor={muted}
                multiline
                style={[
                  styles.titleInput,
                  {
                    color: ink,
                    textDecorationLine: completed ? 'line-through' : 'none',
                    opacity: completed ? 0.55 : 1,
                  },
                ]}
              />
            </View>
          </View>

          {categoryKey && linkedLabel ? (
            <View style={styles.fieldBlock}>
              <ThemedText style={[styles.sectionLabel, { color: muted }]}>연결된 루틴</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  onOpenCategorySettings
                    ? `${linkedLabel} 상세 설정`
                    : linkedLabel
                }
                disabled={!onOpenCategorySettings}
                onPress={() => {
                  if (!onOpenCategorySettings) return;
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenCategorySettings(categoryKey);
                }}
                style={({ pressed }) => [
                  styles.linkedRow,
                  { borderColor: line, backgroundColor: panelBg },
                  onOpenCategorySettings && pressed && { opacity: 0.72 },
                ]}>
                <View style={[styles.linkedIcon, { backgroundColor: `${linkedAccent}22` }]}>
                  {linkedIcon ? (
                    <IconSymbol name={linkedIcon as 'drop.fill'} size={16} color={linkedAccent} />
                  ) : null}
                </View>
                <ThemedText style={[styles.linkedLabel, { color: ink }]} numberOfLines={2}>
                  {linkedLabel}
                </ThemedText>
                {onOpenCategorySettings ? (
                  <IconSymbol name="chevron.right" size={16} color={muted} />
                ) : null}
              </Pressable>
            </View>
          ) : null}

          <View style={styles.fieldBlock}>
            <ThemedText style={[styles.sectionLabel, { color: muted }]}>시간</ThemedText>
            <CatalogRowSpineTimePanel
              startMinutes={startMinutes}
              endMinutes={endMinutes}
              endsNextCalendarDay={endsNextCalendarDay}
              baseDateKey={baseDateKey}
              ink={ink}
              muted={muted}
              line={line}
              isDark={isDark}
              priorityStart={priorityStart}
              priorityEnd={priorityEnd}
              onScheduleChange={handleScheduleChange}
              contentInsetLeft={0}
            />
          </View>

          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="일정 삭제"
              onPress={() => onDelete(draft.blockId)}
              style={({ pressed }) => [
                styles.deleteBtn,
                { borderColor: destructive, opacity: pressed ? 0.82 : 1 },
              ]}>
              <ThemedText style={[styles.deleteBtnText, { color: destructive }]}>삭제</ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: line,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: surface,
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="저장"
            onPress={handleSave}
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: ink, opacity: pressed ? 0.9 : 1 },
            ]}>
            <ThemedText style={[styles.confirmLabel, { color: isDark ? '#09090b' : '#fff' }]}>
              저장
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 12, paddingHorizontal: 20, gap: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  fieldBlock: {
    marginBottom: 8,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  titleRadioSlot: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  /** CompletionRadioButton hit 영역(44)을 시각 원(30)에 맞춰 정렬 */
  titleRadioHitTrim: {
    margin: -7,
  },
  titleInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    padding: 0,
    margin: 0,
    minHeight: 30,
    textAlignVertical: 'center',
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  linkedIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  linkedLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  deleteBtn: {
    marginTop: 16,
    marginBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  confirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
