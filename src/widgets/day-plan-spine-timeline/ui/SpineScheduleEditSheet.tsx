import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatMinutesToHHmm,
  parseHHmmToMinutes,
  resolveCategoryCatalogAccentColor,
  resolveCategoryCatalogIcon,
} from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import { formatDurationMinutes, useTranslation } from '@shared/lib/i18n';
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

function resolveRoutineLabel(
  categoryKey: string,
  routineSections: SpineRoutineSection[],
  fallback: string,
): string {
  for (const section of routineSections) {
    const match = section.items.find((item) => item.key === categoryKey);
    if (match) return match.label;
  }
  return fallback;
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
}: Props) {
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.min(windowHeight * 0.92, windowHeight - insets.top - 12);
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
    void Haptics.selectionAsync();
    setCategoryKey(key);
    setTitleText(label);
  }, []);

  const selectDirectInput = useCallback(() => {
    void Haptics.selectionAsync();
    setCategoryKey(null);
  }, []);

  const clearRoutineLink = useCallback(() => {
    void Haptics.selectionAsync();
    setCategoryKey(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!draft) return;
    const start = parseTimeInput(startText, draft.startMinutes);
    let end = parseTimeInput(endText, draft.endMinutes);
    if (end <= start) end = Math.min(24 * 60, start + 15);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      title: titleText,
      categoryKey,
      startMinutes: start,
      endMinutes: end,
      blockId: draft.blockId,
    });
  }, [draft, titleText, categoryKey, startText, endText, onSave]);

  const durationMinutes = useMemo(() => {
    const fallbackStart = draft?.startMinutes ?? 9 * 60;
    const fallbackEnd = draft?.endMinutes ?? 10 * 60;
    const start = parseTimeInput(startText, fallbackStart);
    let end = parseTimeInput(endText, fallbackEnd);
    if (end <= start) end = Math.min(24 * 60, start + 15);
    return end - start;
  }, [draft?.endMinutes, draft?.startMinutes, endText, startText]);

  const linkedRoutineLabel = useMemo(() => {
    if (!categoryKey) return null;
    return resolveRoutineLabel(categoryKey, routineSections, titleText);
  }, [categoryKey, routineSections, titleText]);

  const linkedRoutineIcon = categoryKey ? resolveCategoryCatalogIcon(categoryKey) : null;
  const linkedRoutineAccent = categoryKey ? resolveCategoryCatalogAccentColor(categoryKey) : palette.ink;

  const destructive = isDark ? '#F87171' : '#DC2626';
  const sheetBg = isDark ? '#18181B' : '#FFFFFF';
  const inputBg = isDark ? '#27272A' : '#FAFAFA';
  const panelBg = isDark ? '#1F1F23' : '#F7F7F5';
  const primaryBtnBg = isDark ? '#FAFAFA' : PrimaryColor.rgb;
  const primaryBtnFg = isDark ? PrimaryColor.rgb : '#FAFAFA';
  const selectedRowBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

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
                maxHeight: sheetMaxHeight,
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={[styles.header, { borderBottomColor: palette.line }]}>
              <ThemedText style={[styles.title, { color: palette.ink }]}>
                {draft?.mode === 'edit' ? t('dayPlan.blockEditTitle') : t('dayPlan.blockAddTitle')}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={onClose}
                hitSlop={12}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}>
                <IconSymbol name="xmark" size={18} color={palette.muted} />
              </Pressable>
            </View>

            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}>
              <View style={styles.fieldBlock}>
                <ThemedText style={[styles.label, { color: palette.muted }]}>{t('dayPlan.todoLabel')}</ThemedText>
                <TextInput
                  value={titleText}
                  onChangeText={setTitleText}
                  placeholder={t('dayPlan.todoPlaceholder')}
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
                {categoryKey && linkedRoutineLabel ? (
                  <View style={[styles.linkedRoutineRow, { borderColor: palette.line, backgroundColor: panelBg }]}>
                    <View style={[styles.linkedRoutineIcon, { backgroundColor: `${linkedRoutineAccent}22` }]}>
                      {linkedRoutineIcon ? (
                        <IconSymbol name={linkedRoutineIcon as any} size={16} color={linkedRoutineAccent} />
                      ) : null}
                    </View>
                    <View style={styles.linkedRoutineTextWrap}>
                      <ThemedText style={[styles.linkedRoutineCaption, { color: palette.muted }]}>
                        {t('dayPlan.linkedRoutine')}
                      </ThemedText>
                      <ThemedText style={[styles.linkedRoutineLabel, { color: palette.ink }]} numberOfLines={1}>
                        {linkedRoutineLabel}
                      </ThemedText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('dayPlan.unlinkRoutine')}
                      onPress={clearRoutineLink}
                      hitSlop={8}
                      style={({ pressed }) => [styles.unlinkBtn, pressed && { opacity: 0.72 }]}>
                      <IconSymbol name="xmark.circle.fill" size={20} color={palette.muted} />
                    </Pressable>
                  </View>
                ) : (
                  <ThemedText style={[styles.hint, { color: palette.muted }]}>
                    {t('dayPlan.routineLinkHint')}
                  </ThemedText>
                )}
              </View>

              {routineSections.length > 0 ? (
                <View style={styles.fieldBlock}>
                  <ThemedText style={[styles.label, { color: palette.muted }]}>
                    {t('dayPlan.routineLinkOptional')}
                  </ThemedText>
                  <View
                    style={[
                      styles.routinePanel,
                      { borderColor: palette.line, backgroundColor: panelBg },
                    ]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: categoryKey === null }}
                      accessibilityLabel={t('dayPlan.directInput')}
                      onPress={selectDirectInput}
                      style={({ pressed }) => [
                        styles.routineRow,
                        {
                          borderBottomColor: palette.line,
                          backgroundColor: categoryKey === null ? selectedRowBg : 'transparent',
                        },
                        pressed && { opacity: 0.82 },
                      ]}>
                      <View style={[styles.routineIconBox, { backgroundColor: isDark ? '#27272A' : '#FFFFFF' }]}>
                        <IconSymbol
                          name="square.and.pencil"
                          size={17}
                          color={categoryKey === null ? palette.ink : palette.muted}
                        />
                      </View>
                      <View style={styles.routineRowTextWrap}>
                        <ThemedText
                          style={[
                            styles.routineRowLabel,
                            { color: categoryKey === null ? palette.ink : palette.muted },
                          ]}>
                          {t('dayPlan.directInput')}
                        </ThemedText>
                        <ThemedText style={[styles.routineRowHint, { color: palette.muted }]}>
                          {t('dayPlan.directInputHint')}
                        </ThemedText>
                      </View>
                      <IconSymbol
                        name={categoryKey === null ? 'checkmark.circle.fill' : 'circle'}
                        size={20}
                        color={categoryKey === null ? palette.ink : palette.muted}
                      />
                    </Pressable>

                    {routineSections.map((section, sectionIndex) => (
                      <View key={section.title}>
                        <View
                          style={[
                            styles.routineSectionHeader,
                            sectionIndex > 0 ? { borderTopColor: palette.line, borderTopWidth: 1 } : null,
                          ]}>
                          <ThemedText style={[styles.routineSectionTitle, { color: palette.muted }]}>
                            {section.title}
                          </ThemedText>
                        </View>
                        {section.items.map((option, itemIndex) => {
                          const selected = option.key === categoryKey;
                          const accent = resolveCategoryCatalogAccentColor(option.key);
                          const isLastInSection = itemIndex === section.items.length - 1;
                          return (
                            <Pressable
                              key={option.key}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              accessibilityLabel={t('dayPlan.routineA11y', { label: option.label })}
                              onPress={() => selectRoutine(option.key, option.label)}
                              style={({ pressed }) => [
                                styles.routineRow,
                                {
                                  borderBottomColor: palette.line,
                                  borderBottomWidth: isLastInSection ? 0 : StyleSheet.hairlineWidth,
                                  backgroundColor: selected ? selectedRowBg : 'transparent',
                                },
                                pressed && { opacity: 0.82 },
                              ]}>
                              <View
                                style={[
                                  styles.routineIconBox,
                                  {
                                    backgroundColor: selected
                                      ? `${accent}22`
                                      : isDark
                                        ? '#27272A'
                                        : '#FFFFFF',
                                  },
                                ]}>
                                <IconSymbol
                                  name={option.icon as any}
                                  size={17}
                                  color={selected ? accent : palette.muted}
                                />
                              </View>
                              <View style={styles.routineRowTextWrap}>
                                <ThemedText
                                  style={[
                                    styles.routineRowLabel,
                                    { color: selected ? palette.ink : palette.muted },
                                  ]}
                                  numberOfLines={2}>
                                  {option.label}
                                </ThemedText>
                              </View>
                              <IconSymbol
                                name={selected ? 'checkmark.circle.fill' : 'circle'}
                                size={20}
                                color={selected ? accent : palette.muted}
                              />
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.fieldBlock}>
                <View style={styles.timeHeaderRow}>
                  <ThemedText style={[styles.label, styles.timeHeaderLabel, { color: palette.muted }]}>
                    {t('common.time')}
                  </ThemedText>
                  <ThemedText style={[styles.durationHint, { color: palette.muted }]}>
                    {formatDurationMinutes(durationMinutes, locale)}
                  </ThemedText>
                </View>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <ThemedText style={[styles.timeCaption, { color: palette.muted }]}>{t('dayPlan.startTimeLabel')}</ThemedText>
                    <TextInput
                      value={startText}
                      onChangeText={setStartText}
                      placeholder="09:00"
                      placeholderTextColor={palette.muted}
                      keyboardType="numbers-and-punctuation"
                      style={[
                        styles.input,
                        styles.timeInput,
                        { borderColor: palette.line, color: palette.ink, backgroundColor: inputBg },
                      ]}
                    />
                  </View>
                  <View style={styles.timeArrowWrap}>
                    <IconSymbol name="arrow.right" size={14} color={palette.muted} />
                  </View>
                  <View style={styles.timeField}>
                    <ThemedText style={[styles.timeCaption, { color: palette.muted }]}>{t('dayPlan.endTimeLabel')}</ThemedText>
                    <TextInput
                      value={endText}
                      onChangeText={setEndText}
                      placeholder="10:00"
                      placeholderTextColor={palette.muted}
                      keyboardType="numbers-and-punctuation"
                      style={[
                        styles.input,
                        styles.timeInput,
                        { borderColor: palette.line, color: palette.ink, backgroundColor: inputBg },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {draft?.mode === 'edit' && draft.blockId && onDelete ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onDelete(draft.blockId!)}
                  style={[styles.deleteBtn, { borderColor: destructive }]}>
                  <ThemedText style={[styles.deleteBtnText, { color: destructive }]}>{t('common.delete')}</ThemedText>
                </Pressable>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: palette.line, backgroundColor: sheetBg }]}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={[styles.btn, styles.btnGhost, { borderColor: palette.line }]}>
                <ThemedText style={[styles.btnText, { color: palette.ink }]}>{t('common.cancel')}</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleSave}
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  { borderColor: primaryBtnBg, backgroundColor: primaryBtnBg },
                ]}>
                <ThemedText style={[styles.btnText, { color: primaryBtnFg }]}>{t('common.save')}</ThemedText>
              </Pressable>
            </View>
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
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  timeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeHeaderLabel: {
    marginBottom: 0,
  },
  durationHint: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  timeField: {
    flex: 1,
    minWidth: 0,
  },
  timeArrowWrap: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 14,
  },
  timeCaption: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.1,
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
  timeInput: {
    textAlign: 'center',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  linkedRoutineRow: {
    marginTop: 10,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkedRoutineIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkedRoutineTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  linkedRoutineCaption: {
    fontSize: 10,
    fontWeight: '600',
  },
  linkedRoutineLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  unlinkBtn: {
    padding: 2,
  },
  deleteBtn: {
    borderWidth: 2,
    borderRadius: 0,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 18,
    paddingVertical: 11,
    minWidth: 80,
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
  routinePanel: {
    borderWidth: 2,
    borderRadius: 0,
    overflow: 'hidden',
  },
  routineSectionHeader: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  routineSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  routineIconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  routineRowTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  routineRowLabel: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  routineRowHint: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
});
