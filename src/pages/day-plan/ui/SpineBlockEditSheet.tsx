import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveCategoryCatalogIcon } from '@entities/day-plan';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';
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
  onClose: () => void;
  onSave: (input: {
    title: string;
    categoryKey: string | null;
    startMinutes: number;
    endMinutes: number;
    blockId: string;
  }) => void;
  onDelete?: (blockId: string) => void;
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
  onClose,
  onSave,
  onDelete,
}: Props) {
  const insets = useSafeAreaInsets();
  const [titleText, setTitleText] = useState('');
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [endMinutes, setEndMinutes] = useState(9 * 60 + 30);

  useEffect(() => {
    if (!visible || !draft) return;
    setTitleText(draft.title);
    setCategoryKey(draft.categoryKey);
    setStartMinutes(draft.startMinutes);
    setEndMinutes(draft.endMinutes);
  }, [visible, draft]);

  const handleScheduleChange = useCallback((start: number, end: number) => {
    let nextEnd = end;
    if (nextEnd <= start) {
      nextEnd = Math.min(24 * 60, start + 15);
    }
    setStartMinutes(start);
    setEndMinutes(nextEnd);
  }, []);

  const handleUnlinkRoutine = useCallback(() => {
    void Haptics.selectionAsync();
    setCategoryKey(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!draft) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      title: titleText,
      categoryKey,
      startMinutes,
      endMinutes,
      blockId: draft.blockId,
    });
  }, [categoryKey, draft, endMinutes, onSave, startMinutes, titleText]);

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
            <TextInput
              value={titleText}
              onChangeText={setTitleText}
              placeholder="무엇을 할까요?"
              placeholderTextColor={muted}
              multiline
              style={[
                styles.titleInput,
                {
                  borderColor: line,
                  color: ink,
                  backgroundColor: panelBg,
                },
              ]}
            />
          </View>

          {categoryKey && linkedLabel ? (
            <View style={styles.fieldBlock}>
              <ThemedText style={[styles.sectionLabel, { color: muted }]}>연결된 루틴</ThemedText>
              <View style={[styles.linkedRow, { borderColor: line, backgroundColor: panelBg }]}>
                <View style={[styles.linkedIcon, { backgroundColor: `${linkedAccent}22` }]}>
                  {linkedIcon ? (
                    <IconSymbol name={linkedIcon as 'drop.fill'} size={16} color={linkedAccent} />
                  ) : null}
                </View>
                <ThemedText style={[styles.linkedLabel, { color: ink }]} numberOfLines={2}>
                  {linkedLabel}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="루틴 연결 해제"
                  onPress={handleUnlinkRoutine}
                  hitSlop={8}
                  style={({ pressed }) => [styles.unlinkBtn, pressed && { opacity: 0.72 }]}>
                  <IconSymbol name="xmark.circle.fill" size={20} color={muted} />
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.fieldBlock}>
            <ThemedText style={[styles.sectionLabel, { color: muted }]}>시간</ThemedText>
            <CatalogRowSpineTimePanel
              startMinutes={startMinutes}
              endMinutes={endMinutes}
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
  titleInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    minHeight: 48,
    textAlignVertical: 'top',
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
  unlinkBtn: {
    padding: 2,
  },
  deleteBtn: {
    marginTop: 8,
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
