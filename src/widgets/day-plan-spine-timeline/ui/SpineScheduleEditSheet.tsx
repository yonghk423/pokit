import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMinutesToHHmm, parseHHmmToMinutes, resolveCategoryCatalogAccentColor } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { SpineTimelinePalette } from './SpineTimelineView';

export type SpineRoutineOption = {
  key: string;
  label: string;
  icon: string;
};

export type SpineRoutineSection = {
  title: string;
  items: SpineRoutineOption[];
};

export type SpineScheduleEditDraft = {
  mode: 'create' | 'edit';
  blockId?: string;
  title: string;
  /** null이면 루틴 없이 직접 입력(투두형) */
  categoryKey: string | null;
  startMinutes: number;
  endMinutes: number;
};

type Props = {
  visible: boolean;
  draft: SpineScheduleEditDraft | null;
  routineSections: SpineRoutineSection[];
  palette: SpineTimelinePalette;
  isDark: boolean;
  onClose: () => void;
  onSave: (input: {
    title: string;
    categoryKey: string | null;
    startMinutes: number;
    endMinutes: number;
    blockId?: string;
  }) => void;
  onDelete?: (blockId: string) => void;
  onStartFocus?: (blockId: string) => void;
  onOpenCategorySettings?: (categoryKey: string) => void;
};

function minutesToInput(minutes: number): string {
  return formatMinutesToHHmm(minutes);
}

function parseTimeInput(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return fallback;
  const parsed = parseHHmmToMinutes(trimmed);
  return parsed != null && Number.isFinite(parsed) ? parsed : fallback;
}

export function SpineScheduleEditSheet({
  visible,
  draft,
  routineSections,
  palette,
  isDark,
  onClose,
  onSave,
  onDelete,
  onStartFocus,
  onOpenCategorySettings,
}: Props) {
  const insets = useSafeAreaInsets();
  const [titleText, setTitleText] = useState('');
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [startText, setStartText] = useState('09:00');
  const [endText, setEndText] = useState('10:00');

  useEffect(() => {
    if (!visible || !draft) return;
    setTitleText(draft.title);
    setCategoryKey(draft.categoryKey);
    setStartText(minutesToInput(draft.startMinutes));
    setEndText(minutesToInput(draft.endMinutes));
  }, [visible, draft]);

  const selectRoutine = useCallback((key: string, label: string) => {
    setCategoryKey(key);
    setTitleText((prev) => (prev.trim().length > 0 ? prev : label));
  }, []);

  const selectDirectInput = useCallback(() => {
    setCategoryKey(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!draft) return;
    const start = parseTimeInput(startText, draft.startMinutes);
    let end = parseTimeInput(endText, draft.endMinutes);
    if (end <= start) end = Math.min(24 * 60, start + 15);
    onSave({
      title: titleText,
      categoryKey,
      startMinutes: start,
      endMinutes: end,
      blockId: draft.blockId,
    });
  }, [draft, titleText, categoryKey, startText, endText, onSave]);

  const destructive = isDark ? '#F87171' : '#DC2626';
  const sheetBg = isDark ? '#18181B' : '#FFFFFF';
  const inputBg = isDark ? '#27272A' : '#FAFAFA';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdropPress} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: sheetBg,
                borderColor: palette.line,
                marginBottom: Math.max(insets.bottom, 16),
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}>
              <ThemedText style={[styles.title, { color: palette.ink }]}>
                {draft?.mode === 'edit' ? '일정 수정' : '일정 추가'}
              </ThemedText>

              <View style={styles.fieldBlock}>
                <ThemedText style={[styles.label, { color: palette.muted }]}>할 일</ThemedText>
                <TextInput
                  value={titleText}
                  onChangeText={setTitleText}
                  placeholder="무엇을 할까요?"
                  placeholderTextColor={palette.muted}
                  autoFocus={draft?.mode === 'create'}
                  returnKeyType="done"
                  multiline
                  style={[
                    styles.input,
                    styles.titleInput,
                    { borderColor: palette.line, color: palette.ink, backgroundColor: inputBg },
                  ]}
                />
                <ThemedText style={[styles.hint, { color: palette.muted }]}>
                  직접 적거나, 아래에서 루틴을 고르면 아이콘이 연결돼요.
                </ThemedText>
              </View>

              {routineSections.length > 0 ? (
                <View style={styles.fieldBlock}>
                  <ThemedText style={[styles.label, { color: palette.muted }]}>
                    루틴 연결 (선택)
                  </ThemedText>
                  <View
                    style={[
                      styles.routinePanel,
                      { borderColor: palette.line, backgroundColor: inputBg },
                    ]}>
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.routinePanelContent}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: categoryKey === null }}
                        accessibilityLabel="직접 입력"
                        onPress={selectDirectInput}
                        style={[
                          styles.directInputChip,
                          {
                            borderColor: categoryKey === null ? palette.ink : palette.line,
                            backgroundColor:
                              categoryKey === null
                                ? isDark
                                  ? 'rgba(255,255,255,0.12)'
                                  : 'rgba(0,0,0,0.06)'
                                : isDark
                                  ? '#27272A'
                                  : '#FFFFFF',
                          },
                        ]}>
                        <IconSymbol
                          name="square.and.pencil"
                          size={16}
                          color={categoryKey === null ? palette.ink : palette.muted}
                        />
                        <ThemedText
                          style={[
                            styles.directInputChipText,
                            { color: categoryKey === null ? palette.ink : palette.muted },
                          ]}>
                          직접 입력
                        </ThemedText>
                      </Pressable>
                      {routineSections.map((section) => (
                        <View key={section.title} style={styles.routineSection}>
                          <ThemedText
                            style={[styles.routineSectionTitle, { color: palette.muted }]}>
                            {section.title}
                          </ThemedText>
                          <View style={styles.routineGrid}>
                            {section.items.map((option) => {
                              const selected = option.key === categoryKey;
                              const accent = resolveCategoryCatalogAccentColor(option.key);
                              return (
                                <Pressable
                                  key={option.key}
                                  accessibilityRole="button"
                                  accessibilityState={{ selected }}
                                  accessibilityLabel={`${option.label} 루틴`}
                                  onPress={() => selectRoutine(option.key, option.label)}
                                  style={[
                                    styles.routineCell,
                                    {
                                      borderColor: selected ? accent : palette.line,
                                      backgroundColor: selected
                                        ? isDark
                                          ? 'rgba(255,255,255,0.1)'
                                          : 'rgba(0,0,0,0.03)'
                                        : isDark
                                          ? '#27272A'
                                          : '#FFFFFF',
                                    },
                                  ]}>
                                  <IconSymbol
                                    name={option.icon as any}
                                    size={16}
                                    color={selected ? accent : palette.muted}
                                  />
                                  <ThemedText
                                    style={[
                                      styles.routineCellText,
                                      { color: selected ? palette.ink : palette.muted },
                                    ]}
                                    numberOfLines={2}>
                                    {option.label}
                                  </ThemedText>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              ) : null}

              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <ThemedText style={[styles.label, { color: palette.muted }]}>시작</ThemedText>
                  <TextInput
                    value={startText}
                    onChangeText={setStartText}
                    placeholder="09:00"
                    placeholderTextColor={palette.muted}
                    keyboardType="numbers-and-punctuation"
                    style={[
                      styles.input,
                      { borderColor: palette.line, color: palette.ink, backgroundColor: inputBg },
                    ]}
                  />
                </View>
                <View style={styles.timeField}>
                  <ThemedText style={[styles.label, { color: palette.muted }]}>종료</ThemedText>
                  <TextInput
                    value={endText}
                    onChangeText={setEndText}
                    placeholder="10:00"
                    placeholderTextColor={palette.muted}
                    keyboardType="numbers-and-punctuation"
                    style={[
                      styles.input,
                      { borderColor: palette.line, color: palette.ink, backgroundColor: inputBg },
                    ]}
                  />
                </View>
              </View>

              {categoryKey && onOpenCategorySettings ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="목표 상세 설정"
                  onPress={() => {
                    onOpenCategorySettings(categoryKey);
                    onClose();
                  }}
                  style={[styles.detailSettingsBtn, { borderColor: palette.line }]}>
                  <IconSymbol name="slider.horizontal.3" size={16} color={palette.ink} />
                  <ThemedText style={[styles.detailSettingsBtnText, { color: palette.ink }]}>
                    목표 상세 설정
                  </ThemedText>
                </Pressable>
              ) : null}

              {draft?.mode === 'edit' && draft.blockId && onStartFocus ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onStartFocus(draft.blockId!);
                    onClose();
                  }}
                  style={[styles.focusBtn, { borderColor: palette.line }]}>
                  <ThemedText style={[styles.focusBtnText, { color: palette.ink }]}>
                    집중 시작
                  </ThemedText>
                </Pressable>
              ) : null}

              {draft?.mode === 'edit' && draft.blockId && onDelete ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onDelete(draft.blockId!)}
                  style={[styles.deleteBtn, { borderColor: destructive }]}>
                  <ThemedText style={[styles.deleteBtnText, { color: destructive }]}>삭제</ThemedText>
                </Pressable>
              ) : null}

              <View style={styles.actionsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onClose}
                  style={[styles.btn, styles.btnGhost, { borderColor: palette.line }]}>
                  <ThemedText style={[styles.btnText, { color: palette.ink }]}>취소</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleSave}
                  style={[
                    styles.btn,
                    styles.btnPrimary,
                    { borderColor: palette.ink, backgroundColor: palette.ink },
                  ]}>
                  <ThemedText style={[styles.btnText, styles.btnPrimaryText]}>저장</ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  sheet: {
    borderWidth: 2,
    borderRadius: 0,
    maxHeight: '90%',
  },
  sheetScroll: {
    padding: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  timeField: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    fontWeight: '600',
    minHeight: 44,
  },
  titleInput: {
    minHeight: 52,
    textAlignVertical: 'top',
  },
  hint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  detailSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 0,
    paddingVertical: 11,
    marginBottom: 10,
  },
  detailSettingsBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  focusBtn: {
    borderWidth: 2,
    borderRadius: 0,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 10,
  },
  focusBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteBtn: {
    borderWidth: 2,
    borderRadius: 0,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  btn: {
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minWidth: 72,
    alignItems: 'center',
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnPrimary: {},
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnPrimaryText: {
    color: '#FAFAFA',
  },
  routinePanel: {
    borderWidth: 2,
    borderRadius: 0,
    maxHeight: 280,
    overflow: 'hidden',
  },
  routinePanelContent: {
    padding: 10,
    gap: 12,
  },
  directInputChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  directInputChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  routineSection: {
    gap: 8,
  },
  routineSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  routineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routineCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: '47%',
    maxWidth: '100%',
    flexGrow: 1,
    flexBasis: '47%',
  },
  routineCellText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
});
