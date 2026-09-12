import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  formatMinutesToHHmm,
  formatTodoItemShareText,
  PRIORITY_MARK_COLOR_PRESETS,
  priorityMarkTitleHighlight,
  useDayPlanTodoStore,
  type DayPlanTodoItem,
  type PriorityMarkColorId,
} from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import {
  loadPostItFaceColorIdForGroup,
  postItFaceUsesLightInk,
  resolvePostItFaceColor,
  resolvePostItFaceInk,
  resolvePostItFaceMuted,
  savePostItFaceColorForGroup,
  TODO_LIST_POST_IT_KEY,
  type PostItFaceColorId,
} from '@shared/lib/storage';
import { CompletionRadioButton } from '@shared/ui/completion-radio-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PostItCardShell, POST_IT_SOLID_SHADOW } from '@shared/ui/post-it-card-shell';
import { PostItFaceColorChips } from '@shared/ui/post-it-face-color-chips';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import {
  TODO_LAYOUT,
  TODO_TABLE_BORDER_WIDTH,
  todoListUiColors,
  type TodoListUiColors,
} from '../lib/todoListTheme';
import { TodoListTimeEditSheet } from './TodoListTimeEditSheet';

const EMPTY_TODOS: DayPlanTodoItem[] = [];
const FIELD_SHADOW = 2;
const ACTION_SHADOW = 2;
const MARK_SWATCH = 22;
const MARK_CHIP_RADIUS = 6;
/** 형광펜 밑줄 — FixedRoutine / priority row 와 동일 톤 */
const TITLE_UNDERLINE_HEIGHT = 10;
const TITLE_UNDERLINE_BOTTOM_INSET = 2;

type TitleUnderlineLine = {
  left: number;
  top: number;
  width: number;
};
const MARK_SHADOW = 2;
const MARK_ACCORDION_OPEN_MS = 240;
const MARK_ACCORDION_CLOSE_MS = 200;
const MARK_ACCORDION_EASING = Easing.out(Easing.cubic);

function useMeasuredAccordion(expanded: boolean) {
  const progress = useSharedValue(expanded ? 1 : 0);
  const contentHeight = useSharedValue(0);
  const [mounted, setMounted] = useState(expanded);

  useEffect(() => {
    if (expanded) {
      setMounted(true);
      if (contentHeight.value > 0) {
        progress.value = withTiming(1, {
          duration: MARK_ACCORDION_OPEN_MS,
          easing: MARK_ACCORDION_EASING,
        });
      }
      return;
    }
    progress.value = withTiming(
      0,
      { duration: MARK_ACCORDION_CLOSE_MS, easing: MARK_ACCORDION_EASING },
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      },
    );
  }, [contentHeight, expanded, progress]);

  const panelStyle = useAnimatedStyle(() => {
    if (contentHeight.value <= 0) {
      return {
        opacity: expanded ? 1 : 0,
        overflow: 'hidden' as const,
        transform: [{ translateY: 0 }],
      };
    }
    return {
      opacity: progress.value,
      height: progress.value * contentHeight.value,
      overflow: 'hidden' as const,
      transform: [{ translateY: (1 - progress.value) * -4 }],
    };
  });

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  const onContentLayout = useCallback(
    (height: number) => {
      if (height <= 0 || Math.abs(height - contentHeight.value) <= 0.5) return;
      const wasUnmeasured = contentHeight.value <= 0;
      contentHeight.value = height;
      if (!expanded) return;
      if (wasUnmeasured) {
        progress.value = 0;
        progress.value = withTiming(1, {
          duration: MARK_ACCORDION_OPEN_MS,
          easing: MARK_ACCORDION_EASING,
        });
        return;
      }
      if (progress.value < 1) {
        progress.value = withTiming(1, {
          duration: MARK_ACCORDION_OPEN_MS,
          easing: MARK_ACCORDION_EASING,
        });
      }
    },
    [contentHeight, expanded, progress],
  );

  return { mounted, panelStyle, chevronStyle, onContentLayout };
}

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  dateLabel?: string;
  embedded?: boolean;
  /** 키보드에 가리지 않도록 부모 스크롤이 입력칸을 보이게 함 */
  onFieldFocus?: (windowY: number, height: number) => void;
};

function reportFieldFocus(
  target: { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void },
  onFieldFocus?: (windowY: number, height: number) => void,
) {
  if (!onFieldFocus || typeof target.measureInWindow !== 'function') return;
  const measure = () => {
    target.measureInWindow((_x, y, _w, h) => {
      if (Number.isFinite(y) && Number.isFinite(h)) onFieldFocus(y, h);
    });
  };
  requestAnimationFrame(() => {
    setTimeout(measure, 80);
  });
}

function DoneCheckbox({
  checked,
  isDark,
  ui,
  shadow,
  onPress,
  accessibilityLabel,
  size = TODO_LAYOUT.checkboxSize,
  uncheckedFill,
  checkedColor,
}: {
  checked: boolean;
  isDark: boolean;
  ui: TodoListUiColors;
  shadow: string;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  uncheckedFill?: string;
  checkedColor?: string;
}) {
  return (
    <CompletionRadioButton
      checked={checked}
      isDark={isDark}
      shape="square"
      size={size}
      motion="soft"
      outline="shadow"
      shadowColor={shadow}
      uncheckedFill={uncheckedFill}
      checkedColor={checkedColor ?? ui.checkFill}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    />
  );
}

function TodoListRow({
  item,
  ui,
  isDark,
  shadow,
  checkboxFill,
  actionBtnBg,
  actionIconColor,
  deleteMode,
  deleteSelected,
  isLast,
  markPickerOpen,
  onToggleMarkPicker,
  onSelectMarkColor,
  onChangeWhat,
  onPressTime,
  onToggleDone,
  onToggleDeleteSelect,
  onAddSubItem,
  onUpdateSubItem,
  onToggleSubItemDone,
  onRemoveSubItem,
  onFieldFocus,
}: {
  item: DayPlanTodoItem;
  ui: TodoListUiColors;
  isDark: boolean;
  shadow: string;
  checkboxFill: string;
  actionBtnBg: string;
  actionIconColor: string;
  deleteMode: boolean;
  deleteSelected: boolean;
  isLast: boolean;
  markPickerOpen: boolean;
  onToggleMarkPicker: () => void;
  onSelectMarkColor: (color: PriorityMarkColorId | null) => void;
  onChangeWhat: (value: string) => void;
  onPressTime: () => void;
  onToggleDone: () => void;
  onToggleDeleteSelect: () => void;
  onAddSubItem: (text: string) => void;
  onUpdateSubItem: (subId: string, text: string) => void;
  onToggleSubItemDone: (subId: string) => void;
  onRemoveSubItem: (subId: string) => void;
  onFieldFocus?: (windowY: number, height: number) => void;
}) {
  const { t } = useTranslation();
  const rowMuted = item.isDone;
  const timeLabel = `${formatMinutesToHHmm(item.startMinutes)}–${formatMinutesToHHmm(item.endMinutes)}`;
  const title = item.what || t('todo.fallbackTitle');
  const markColor = item.markColor ?? null;
  const underlineColor = priorityMarkTitleHighlight(markColor, false);
  const [underlineLines, setUnderlineLines] = useState<TitleUnderlineLine[]>([]);
  const [subDraft, setSubDraft] = useState('');
  const [copiedFlash, setCopiedFlash] = useState(false);
  const displayForMeasure = item.what.length > 0 ? item.what : '';
  const markAccordion = useMeasuredAccordion(markPickerOpen && !deleteMode);
  const subItems = [...(item.subItems ?? [])].sort((a, b) => a.order - b.order);
  const subDoneCount = subItems.filter((s) => s.isDone).length;

  useEffect(() => {
    if (displayForMeasure.length === 0) {
      setUnderlineLines([]);
    }
  }, [displayForMeasure]);

  const buildItemShareText = () =>
    formatTodoItemShareText({
      item,
      fallbackTitle: t('todo.fallbackTitle'),
    });

  const handleCopyItem = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(buildItemShareText());
    setCopiedFlash(true);
    setTimeout(() => setCopiedFlash(false), 1400);
  };

  const handleShareItem = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: buildItemShareText(),
        title: title,
      });
    } catch {
      /* cancelled */
    }
  };

  const handleAddSub = () => {
    const text = subDraft.trim();
    if (!text) return;
    onAddSubItem(text);
    setSubDraft('');
  };

  return (
    <View
      style={[
        styles.rowWrap,
        !isLast && { borderBottomColor: ui.line, borderBottomWidth: StyleSheet.hairlineWidth },
        deleteMode && { backgroundColor: deleteSelected ? ui.dangerBg : 'transparent' },
      ]}>
      <Pressable
        accessibilityRole={deleteMode ? 'button' : undefined}
        accessibilityLabel={deleteMode ? t('todo.tapToSelectDelete') : undefined}
        accessibilityState={deleteMode ? { selected: deleteSelected } : undefined}
        onPress={deleteMode ? onToggleDeleteSelect : undefined}
        onLongPress={
          deleteMode
            ? undefined
            : () => {
                void Haptics.selectionAsync();
                onToggleDone();
              }
        }
        delayLongPress={280}
        style={styles.row}>
        <DoneCheckbox
          checked={deleteMode ? deleteSelected : item.isDone}
          isDark={isDark}
          ui={ui}
          shadow={shadow}
          uncheckedFill={checkboxFill}
          accessibilityLabel={
            deleteMode
              ? deleteSelected
                ? t('todo.deselectDelete', { title })
                : t('todo.selectDelete', { title })
              : item.isDone
                ? t('todo.undoDone', { title })
                : t('todo.markDone', { title })
          }
          onPress={deleteMode ? onToggleDeleteSelect : onToggleDone}
        />

        <View style={styles.rowBody}>
          <View style={styles.taskInputMark}>
            {displayForMeasure.length > 0 ? (
              <ThemedText
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                type="defaultSemiBold"
                onTextLayout={(event) => {
                  const next = event.nativeEvent.lines.map((line) => ({
                    left: Math.round(line.x) - 2,
                    top: Math.round(
                      line.y + line.height - TITLE_UNDERLINE_HEIGHT - TITLE_UNDERLINE_BOTTOM_INSET,
                    ),
                    width: Math.ceil(line.width) + 4,
                  }));
                  setUnderlineLines((prev) => {
                    if (
                      prev.length === next.length &&
                      prev.every(
                        (p, i) =>
                          p.left === next[i]!.left &&
                          p.top === next[i]!.top &&
                          p.width === next[i]!.width,
                      )
                    ) {
                      return prev;
                    }
                    return next;
                  });
                }}
                style={[styles.taskInput, styles.measureGhost]}
                lightColor={ui.ink}
                darkColor={ui.ink}>
                {displayForMeasure}
              </ThemedText>
            ) : null}
            {underlineColor && !rowMuted
              ? underlineLines.map((line, index) => (
                  <View
                    key={`ul-${index}`}
                    pointerEvents="none"
                    style={[
                      styles.taskInputUnderline,
                      {
                        backgroundColor: underlineColor,
                        left: line.left,
                        top: line.top,
                        width: line.width,
                      },
                    ]}
                  />
                ))
              : null}
            <ThemedTextInput
              key={`${item.id}-${item.isDone ? 'done' : 'todo'}`}
              value={item.what}
              onChangeText={onChangeWhat}
              onFocus={(e) => reportFieldFocus(e.target, onFieldFocus)}
              editable={!deleteMode}
              pointerEvents={deleteMode ? 'none' : 'auto'}
              placeholder={t('todo.placeholder')}
              placeholderTextColor={ui.placeholder}
              multiline
              style={[
                styles.taskInput,
                {
                  color: rowMuted ? ui.done : ui.ink,
                  textDecorationLine: rowMuted ? 'line-through' : 'none',
                  textDecorationStyle: rowMuted ? 'dashed' : 'solid',
                  textDecorationColor: rowMuted ? ui.muted : ui.ink,
                  opacity: rowMuted ? 0.42 : 1,
                  zIndex: 1,
                },
              ]}
            />
          </View>
          {!deleteMode ? (
            <View style={styles.metaRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('todo.timeA11y', { time: timeLabel })}
                hitSlop={6}
                onPress={onPressTime}
                style={styles.timeMetaRow}>
                <IconSymbol name="clock" size={11} color={actionIconColor} />
                <ThemedText style={styles.timeMeta} lightColor={ui.muted} darkColor={ui.muted}>
                  {timeLabel}
                </ThemedText>
              </Pressable>
              {subItems.length > 0 ? (
                <ThemedText style={styles.subProgress} lightColor={ui.muted} darkColor={ui.muted}>
                  {t('todo.subProgress', { done: subDoneCount, total: subItems.length })}
                </ThemedText>
              ) : null}
              <View style={styles.itemShareActions}>
                <View
                  style={[
                    styles.itemActionShell,
                    { marginRight: ACTION_SHADOW, marginBottom: ACTION_SHADOW },
                  ]}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.itemActionShadow,
                      {
                        backgroundColor: shadow,
                        transform: [
                          { translateX: ACTION_SHADOW },
                          { translateY: ACTION_SHADOW },
                        ],
                      },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      copiedFlash ? t('todo.copiedItem') : t('todo.copyItemA11y')
                    }
                    hitSlop={6}
                    onPress={() => {
                      void handleCopyItem();
                    }}
                    style={[styles.itemActionBtn, { backgroundColor: actionBtnBg }]}>
                    <IconSymbol
                      name={copiedFlash ? 'checkmark' : 'doc.on.doc'}
                      size={11}
                      color={copiedFlash ? ui.primary : actionIconColor}
                    />
                  </Pressable>
                </View>
                <View
                  style={[
                    styles.itemActionShell,
                    { marginRight: ACTION_SHADOW, marginBottom: ACTION_SHADOW },
                  ]}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.itemActionShadow,
                      {
                        backgroundColor: shadow,
                        transform: [
                          { translateX: ACTION_SHADOW },
                          { translateY: ACTION_SHADOW },
                        ],
                      },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('todo.shareItemA11y')}
                    hitSlop={6}
                    onPress={() => {
                      void handleShareItem();
                    }}
                    style={[styles.itemActionBtn, { backgroundColor: actionBtnBg }]}>
                    <IconSymbol name="square.and.arrow.up" size={11} color={actionIconColor} />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {!deleteMode ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: markPickerOpen }}
            accessibilityLabel={
              markColor
                ? t('dayPlan.importanceMarkA11yOn', {
                    color: t(`dayPlan.importanceMarkSwatch.${markColor}` as const),
                  })
                : t('dayPlan.importanceMarkA11yOff')
            }
            onPress={() => {
              void Haptics.selectionAsync();
              onToggleMarkPicker();
            }}
            style={[
              styles.markTriggerShell,
              { marginRight: MARK_SHADOW, marginBottom: MARK_SHADOW },
            ]}>
            <View
              pointerEvents="none"
              style={[
                styles.markTriggerShadow,
                {
                  backgroundColor: shadow,
                  transform: [{ translateX: MARK_SHADOW }, { translateY: MARK_SHADOW }],
                },
              ]}
            />
            <View
              style={[
                styles.markTriggerFace,
                {
                  backgroundColor: actionBtnBg,
                },
              ]}>
              <Reanimated.View style={markAccordion.chevronStyle}>
                <IconSymbol name="chevron.down" size={11} color={actionIconColor} />
              </Reanimated.View>
            </View>
          </Pressable>
        ) : null}
      </Pressable>

      {markAccordion.mounted ? (
        <Reanimated.View style={[styles.markPickerPanel, markAccordion.panelStyle]}>
          <View
            style={styles.detailPanelBody}
            onLayout={(event) => {
              markAccordion.onContentLayout(event.nativeEvent.layout.height);
            }}>
            <View
              style={styles.markPickerRow}
              accessibilityRole="toolbar"
              accessibilityLabel={t('dayPlan.importanceMarkLabel')}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: markColor == null }}
                accessibilityLabel={t('dayPlan.importanceMarkClearA11y')}
                hitSlop={6}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onSelectMarkColor(null);
                }}
                style={[
                  styles.markChipShell,
                  {
                    width: MARK_SWATCH,
                    height: MARK_SWATCH,
                    marginRight: MARK_SHADOW,
                    marginBottom: MARK_SHADOW,
                  },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.markChipShadow,
                    {
                      backgroundColor: shadow,
                      transform: [{ translateX: MARK_SHADOW }, { translateY: MARK_SHADOW }],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.markChipFace,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                      borderColor: ui.line,
                      borderWidth: markColor == null ? 2 : 1,
                    },
                  ]}>
                  <IconSymbol name="xmark" size={11} color={ui.muted} />
                </View>
              </Pressable>
              {PRIORITY_MARK_COLOR_PRESETS.map((preset) => {
                const selectedMark = markColor === preset.id;
                const face = preset.face;
                return (
                  <Pressable
                    key={preset.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedMark }}
                    accessibilityLabel={t('dayPlan.importanceMarkColorA11y', {
                      color: t(`dayPlan.importanceMarkSwatch.${preset.id}` as const),
                    })}
                    hitSlop={6}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      onSelectMarkColor(preset.id);
                    }}
                    style={[
                      styles.markChipShell,
                      {
                        width: MARK_SWATCH,
                        height: MARK_SWATCH,
                        marginRight: MARK_SHADOW,
                        marginBottom: MARK_SHADOW,
                      },
                    ]}>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.markChipShadow,
                        {
                          backgroundColor: shadow,
                          transform: [{ translateX: MARK_SHADOW }, { translateY: MARK_SHADOW }],
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.markChipFace,
                        {
                          backgroundColor: face,
                          borderColor: selectedMark ? ui.ink : 'transparent',
                          borderWidth: selectedMark ? 2 : 0,
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.subSection}>
              <ThemedText style={styles.subSectionLabel} lightColor={ui.muted} darkColor={ui.muted}>
                {t('todo.subSectionLabel')}
              </ThemedText>
              {subItems.map((sub) => (
                <View key={sub.id} style={styles.subRow}>
                  <DoneCheckbox
                    checked={sub.isDone}
                    isDark={isDark}
                    ui={ui}
                    shadow={shadow}
                    uncheckedFill={checkboxFill}
                    checkedColor={ui.checkFillSub}
                    size={18}
                    accessibilityLabel={t('todo.subToggleA11y')}
                    onPress={() => onToggleSubItemDone(sub.id)}
                  />
                  <ThemedTextInput
                    value={sub.text}
                    onChangeText={(value) => onUpdateSubItem(sub.id, value)}
                    onFocus={(e) => reportFieldFocus(e.target, onFieldFocus)}
                    editable={!deleteMode}
                    placeholder={t('todo.subPlaceholder')}
                    placeholderTextColor={ui.placeholder}
                    style={[
                      styles.subInput,
                      {
                        color: sub.isDone ? ui.done : ui.ink,
                        textDecorationLine: sub.isDone ? 'line-through' : 'none',
                        opacity: sub.isDone ? 0.5 : 1,
                      },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('todo.subRemoveA11y')}
                    hitSlop={8}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      onRemoveSubItem(sub.id);
                    }}
                    style={styles.subRemoveBtn}>
                    <IconSymbol name="xmark" size={10} color={ui.muted} />
                  </Pressable>
                </View>
              ))}
              <View style={styles.subAddRow}>
                <ThemedTextInput
                  value={subDraft}
                  onChangeText={setSubDraft}
                  onFocus={(e) => reportFieldFocus(e.target, onFieldFocus)}
                  placeholder={t('todo.subPlaceholder')}
                  placeholderTextColor={ui.placeholder}
                  returnKeyType="done"
                  onSubmitEditing={handleAddSub}
                  style={[styles.subInput, { color: ui.ink, flex: 1 }]}
                />
                <View
                  style={[
                    styles.subAddBtnShell,
                    { marginRight: ACTION_SHADOW, marginBottom: ACTION_SHADOW },
                  ]}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.subAddBtnShadow,
                      {
                        backgroundColor: shadow,
                        transform: [
                          { translateX: ACTION_SHADOW },
                          { translateY: ACTION_SHADOW },
                        ],
                      },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('todo.subAddA11y')}
                    hitSlop={6}
                    onPress={handleAddSub}
                    style={[
                      styles.subAddBtn,
                      {
                        backgroundColor: ui.addBtnBg,
                      },
                    ]}>
                    <IconSymbol name="plus" size={12} color={ui.ink} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Reanimated.View>
      ) : null}
    </View>
  );
}

/** 투두 리스트 — 체크·할 일·우선순위 리스트형 + 포스트잇 면색 */
export function TodoListPlanSection({
  c,
  isDark,
  dateLabel,
  embedded = false,
  onFieldFocus,
}: Props) {
  const { t } = useTranslation();
  const baseUi = useMemo(() => todoListUiColors(c, isDark), [c, isDark]);
  const activeDateKey = useDayPlanTodoStore((s) => s.activeDateKey);
  const todos = useDayPlanTodoStore((s) => s.todosByDate[s.activeDateKey] ?? EMPTY_TODOS);
  const addTodo = useDayPlanTodoStore((s) => s.addTodo);
  const updateTodo = useDayPlanTodoStore((s) => s.updateTodo);
  const setMarkColor = useDayPlanTodoStore((s) => s.setMarkColor);
  const addSubItem = useDayPlanTodoStore((s) => s.addSubItem);
  const updateSubItem = useDayPlanTodoStore((s) => s.updateSubItem);
  const toggleSubItemDone = useDayPlanTodoStore((s) => s.toggleSubItemDone);
  const removeSubItem = useDayPlanTodoStore((s) => s.removeSubItem);
  const toggleDone = useDayPlanTodoStore((s) => s.toggleDone);
  const removeTodo = useDayPlanTodoStore((s) => s.removeTodo);

  const [faceColorId, setFaceColorId] = useState<PostItFaceColorId>(() =>
    loadPostItFaceColorIdForGroup(TODO_LIST_POST_IT_KEY),
  );
  const [draftWhat, setDraftWhat] = useState('');
  const [timeEditId, setTimeEditId] = useState<string | null>(null);
  const [markPickerIds, setMarkPickerIds] = useState<Set<string>>(() => new Set());
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteSelection, setDeleteSelection] = useState<Set<string>>(() => new Set());

  const faceUsesLightInk = postItFaceUsesLightInk(faceColorId);
  const faceColor = resolvePostItFaceColor(faceColorId, isDark);
  const faceInk = resolvePostItFaceInk(faceColorId, baseUi.ink);
  const faceMuted = resolvePostItFaceMuted(faceColorId, baseUi.muted);
  const faceLine = faceUsesLightInk
    ? 'rgba(255,255,255,0.28)'
    : isDark
      ? 'rgba(241,239,255,0.22)'
      : 'rgba(24,26,46,0.12)';
  const faceCellBg = faceUsesLightInk
    ? 'rgba(255,255,255,0.14)'
    : isDark
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(255,255,255,0.78)';
  const faceBtnBorder = faceUsesLightInk ? 'rgba(255,255,255,0.55)' : baseUi.btnBorder;
  const facePlaceholder = faceUsesLightInk
    ? 'rgba(255,255,255,0.45)'
    : baseUi.placeholder;

  const ui = useMemo(
    (): TodoListUiColors => ({
      ...baseUi,
      ink: faceInk,
      muted: faceMuted,
      line: faceLine,
      placeholder: facePlaceholder,
      btnBorder: faceBtnBorder,
      cellBg: faceCellBg,
      cardBg: faceColor,
      btnBg: faceUsesLightInk ? 'rgba(255,255,255,0.16)' : baseUi.btnBg,
      done: faceUsesLightInk ? 'rgba(255,255,255,0.55)' : baseUi.done,
    }),
    [
      baseUi,
      faceBtnBorder,
      faceCellBg,
      faceColor,
      faceInk,
      faceLine,
      faceMuted,
      facePlaceholder,
      faceUsesLightInk,
    ],
  );

  const timeEditItem = useMemo(
    () => todos.find((todo) => todo.id === timeEditId) ?? null,
    [todos, timeEditId],
  );

  const onSelectFaceColor = useCallback((id: PostItFaceColorId) => {
    setFaceColorId(id);
    savePostItFaceColorForGroup(TODO_LIST_POST_IT_KEY, id);
  }, []);

  const toggleDeleteSelection = useCallback((id: string) => {
    void Haptics.selectionAsync();
    setDeleteSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleDeleteMode = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDeleteMode((prev) => {
      if (prev) {
        setDeleteSelection(new Set());
        return false;
      }
      setTimeEditId(null);
      setMarkPickerIds(new Set());
      setDeleteSelection(new Set());
      return true;
    });
  }, []);

  const handleTrashPress = useCallback(() => {
    if (!deleteMode) {
      toggleDeleteMode();
      return;
    }
    if (deleteSelection.size === 0) {
      toggleDeleteMode();
      return;
    }
    const count = deleteSelection.size;
    Alert.alert(t('alert.deleteTodo.title'), t('alert.deleteTodo.message', { count }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteSelection.forEach((id) => removeTodo(id));
          setDeleteSelection(new Set());
          setDeleteMode(false);
        },
      },
    ]);
  }, [deleteMode, deleteSelection, removeTodo, t, toggleDeleteMode]);

  const handleQuickAdd = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = draftWhat.trim();
    addTodo();
    if (text.length > 0) {
      const nextTodos =
        useDayPlanTodoStore.getState().todosByDate[activeDateKey] ?? EMPTY_TODOS;
      const created = nextTodos[nextTodos.length - 1];
      if (created) updateTodo(created.id, { what: text });
    }
    setDraftWhat('');
  }, [activeDateKey, addTodo, draftWhat, updateTodo]);

  const hintText = deleteMode
    ? deleteSelection.size > 0
      ? t('todo.hintDeleteSelected', { count: deleteSelection.size })
      : t('todo.hintDeletePick')
    : null;

  /** 액션·체크 면은 포스트잇 면색과 무관하게 항상 흰색 유지 */
  const actionBtnBg = '#FFFFFF';
  const actionIconColor = baseUi.muted;

  return (
    <View style={embedded ? styles.rootEmbedded : styles.root}>
      {!embedded && dateLabel ? (
        <ThemedText style={styles.dateCaption} lightColor={ui.ink} darkColor={ui.ink}>
          {dateLabel}
        </ThemedText>
      ) : null}

      <PostItCardShell
        isDark={isDark}
        faceColor={faceColor}
        solidShadow={false}
        contentStyle={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View style={[styles.newTaskTag, { backgroundColor: ui.tagBg }]}>
            <ThemedText style={[styles.newTaskTagText, { color: ui.tagText }]}>
              {t('todo.newTaskTag')}
            </ThemedText>
          </View>
          <View style={styles.cardTopActions}>
            <View
              style={[
                styles.trashShell,
                { marginRight: ACTION_SHADOW, marginBottom: ACTION_SHADOW },
              ]}>
              <View
                pointerEvents="none"
                style={[
                  styles.trashShadow,
                  {
                    backgroundColor: POST_IT_SOLID_SHADOW,
                    transform: [
                      { translateX: ACTION_SHADOW },
                      { translateY: ACTION_SHADOW },
                    ],
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: deleteMode }}
                accessibilityLabel={deleteMode ? t('todo.deleteModeOff') : t('todo.deleteModeOn')}
                hitSlop={8}
                onPress={handleTrashPress}
                style={[
                  styles.trashBtn,
                  {
                    backgroundColor: deleteMode
                      ? ui.dangerBg
                      : actionBtnBg,
                  },
                ]}>
                <IconSymbol
                  name="trash"
                  size={13}
                  color={deleteMode ? ui.danger : actionIconColor}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.faceChipsPad}>
          <PostItFaceColorChips
            compact
            selectedId={faceColorId}
            isDark={isDark}
            ink={faceInk}
            shadowColor={POST_IT_SOLID_SHADOW}
            onSelect={onSelectFaceColor}
          />
        </View>

        <View
          style={[
            styles.fieldShell,
            { marginRight: FIELD_SHADOW, marginBottom: FIELD_SHADOW },
          ]}>
          <View
            pointerEvents="none"
            style={[
              styles.fieldShadow,
              {
                backgroundColor: POST_IT_SOLID_SHADOW,
                transform: [{ translateX: FIELD_SHADOW }, { translateY: FIELD_SHADOW }],
              },
            ]}
          />
          <View
            style={[
              styles.quickAddRow,
              {
                backgroundColor: '#FFFFFF',
              },
            ]}>
            <ThemedTextInput
              value={draftWhat}
              onChangeText={setDraftWhat}
              onFocus={(e) => reportFieldFocus(e.target, onFieldFocus)}
              placeholder={t('todo.quickAddPlaceholder')}
              placeholderTextColor={baseUi.placeholder}
              returnKeyType="done"
              onSubmitEditing={handleQuickAdd}
              style={[styles.quickAddInput, { color: baseUi.ink }]}
            />
            <View style={styles.quickAddBtnWrap}>
              <View
                style={[
                  styles.quickAddBtnShell,
                  { marginRight: ACTION_SHADOW, marginBottom: ACTION_SHADOW },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.quickAddBtnShadow,
                    {
                      backgroundColor: POST_IT_SOLID_SHADOW,
                      transform: [
                        { translateX: ACTION_SHADOW },
                        { translateY: ACTION_SHADOW },
                      ],
                    },
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('todo.addA11y')}
                  onPress={handleQuickAdd}
                  style={[
                    styles.quickAddBtn,
                    {
                      backgroundColor: ui.addBtnBg,
                    },
                  ]}>
                  <IconSymbol name="plus" size={15} color={baseUi.ink} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.listShell,
            {
              borderTopColor: faceLine,
            },
          ]}>
          {todos.length === 0 ? (
            <View style={styles.emptyRow}>
              <ThemedText style={styles.emptyText} lightColor={ui.muted} darkColor={ui.muted}>
                {t('todo.emptyHint')}
              </ThemedText>
            </View>
          ) : (
            todos.map((item, index) => (
              <TodoListRow
                key={item.id}
                item={item}
                ui={ui}
                isDark={isDark}
                shadow={POST_IT_SOLID_SHADOW}
                checkboxFill="#FFFFFF"
                actionBtnBg={actionBtnBg}
                actionIconColor={actionIconColor}
                deleteMode={deleteMode}
                deleteSelected={deleteSelection.has(item.id)}
                isLast={index === todos.length - 1}
                markPickerOpen={markPickerIds.has(item.id)}
                onToggleMarkPicker={() =>
                  setMarkPickerIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
                onSelectMarkColor={(color) => {
                  setMarkColor(item.id, color);
                }}
                onChangeWhat={(what) => updateTodo(item.id, { what })}
                onPressTime={() => setTimeEditId(item.id)}
                onToggleDone={() => toggleDone(item.id)}
                onToggleDeleteSelect={() => toggleDeleteSelection(item.id)}
                onAddSubItem={(text) => addSubItem(item.id, text)}
                onUpdateSubItem={(subId, text) => updateSubItem(item.id, subId, text)}
                onToggleSubItemDone={(subId) => toggleSubItemDone(item.id, subId)}
                onRemoveSubItem={(subId) => removeSubItem(item.id, subId)}
                onFieldFocus={onFieldFocus}
              />
            ))
          )}
        </View>
      </PostItCardShell>

      {hintText ? (
        <ThemedText style={styles.hint} lightColor={baseUi.muted} darkColor={baseUi.muted}>
          {hintText}
        </ThemedText>
      ) : null}

      {timeEditItem ? (
        <TodoListTimeEditSheet
          visible={timeEditId != null}
          startMinutes={timeEditItem.startMinutes}
          endMinutes={timeEditItem.endMinutes}
          isDark={isDark}
          ink={baseUi.ink}
          muted={baseUi.muted}
          line={baseUi.btnBorder}
          onClose={() => setTimeEditId(null)}
          onSave={(startMinutes, endMinutes) =>
            updateTodo(timeEditItem.id, {
              startMinutes,
              endMinutes,
              endsNextCalendarDay: false,
            })
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
  },
  rootEmbedded: {
    width: '100%',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
    gap: 10,
  },
  dateCaption: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
    paddingHorizontal: 2,
  },
  cardContent: {
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newTaskTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
  },
  newTaskTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  trashShell: {
    position: 'relative',
    flexShrink: 0,
  },
  trashShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  trashBtn: {
    width: 28,
    height: 28,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  faceChipsPad: {
    paddingBottom: 2,
  },
  fieldShell: {
    position: 'relative',
    overflow: 'visible',
  },
  fieldShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 0,
    height: 42,
    paddingLeft: 10,
    paddingRight: 6,
    gap: 8,
    overflow: 'visible',
    zIndex: 1,
  },
  quickAddInput: {
    flex: 1,
    alignSelf: 'stretch',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    ...Platform.select({
      ios: {
        lineHeight: 20,
      },
      android: {
        textAlignVertical: 'center',
      },
      default: {},
    }),
  },
  quickAddBtnWrap: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 2,
  },
  quickAddBtnShell: {
    position: 'relative',
  },
  quickAddBtnShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  quickAddBtn: {
    width: 32,
    height: 32,
    borderWidth: 0,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  listShell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
    paddingTop: 2,
  },
  emptyRow: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rowWrap: {
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 10,
    minHeight: TODO_LAYOUT.rowMinHeight,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  taskInputMark: {
    position: 'relative',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  taskInputUnderline: {
    position: 'absolute',
    height: TITLE_UNDERLINE_HEIGHT,
    borderRadius: 0,
    zIndex: 0,
  },
  taskInput: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.15,
    lineHeight: 20,
    padding: 0,
    margin: 0,
    minHeight: 20,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  measureGhost: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    alignSelf: 'stretch',
  },
  itemShareActions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemActionShell: {
    position: 'relative',
  },
  itemActionShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  itemActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  subProgress: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  detailPanelBody: {
    paddingBottom: 8,
    gap: 10,
  },
  subSection: {
    paddingLeft: TODO_LAYOUT.checkboxSize + 10,
    paddingRight: 4,
    gap: 6,
  },
  subSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 2,
    paddingHorizontal: 0,
    margin: 0,
  },
  subRemoveBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subAddBtnShell: {
    position: 'relative',
    flexShrink: 0,
  },
  subAddBtnShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  subAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timeMeta: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  markTriggerShell: {
    position: 'relative',
    flexShrink: 0,
    marginTop: 2,
  },
  markTriggerShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  markTriggerFace: {
    width: MARK_SWATCH,
    height: MARK_SWATCH,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  markPickerPanel: {
    overflow: 'hidden',
  },
  markPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingLeft: TODO_LAYOUT.checkboxSize + 10,
    paddingRight: 4,
    gap: 4,
  },
  markChipShell: {
    position: 'relative',
  },
  markChipShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: MARK_CHIP_RADIUS,
  },
  markChipFace: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: MARK_CHIP_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
});
