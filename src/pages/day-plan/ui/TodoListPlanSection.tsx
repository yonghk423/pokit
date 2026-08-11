import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  formatMinutesToHHmm,
  useDayPlanTodoStore,
  type DayPlanTodoItem,
} from '@entities/day-plan';
import { completionCheckIconColor } from '@shared/ui/completion-radio-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import {
  TODO_LAYOUT,
  TODO_PRIORITY_META,
  TODO_TABLE_BORDER_WIDTH,
  todoListUiColors,
  type TodoListUiColors,
} from '../lib/todoListTheme';
import { TodoListTimeEditSheet } from './TodoListTimeEditSheet';

const EMPTY_TODOS: DayPlanTodoItem[] = [];

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  dateLabel?: string;
  embedded?: boolean;
};

function DoneCheckbox({
  checked,
  ui,
  onPress,
  accessibilityLabel,
}: {
  checked: boolean;
  ui: TodoListUiColors;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const checkMarkColor = completionCheckIconColor(ui.checkFill);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={[
        styles.checkbox,
        {
          borderColor: ui.btnBorder,
          backgroundColor: checked ? ui.checkFill : ui.cellBg,
        },
      ]}>
      {checked ? (
        <Text style={[styles.checkMark, { color: checkMarkColor }]} accessibilityElementsHidden>
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
}

function TodoListRow({
  item,
  ui,
  deleteMode,
  deleteSelected,
  isLast,
  onCyclePriority,
  onChangeWhat,
  onPressTime,
  onToggleDone,
  onToggleDeleteSelect,
}: {
  item: DayPlanTodoItem;
  ui: TodoListUiColors;
  deleteMode: boolean;
  deleteSelected: boolean;
  isLast: boolean;
  onCyclePriority: () => void;
  onChangeWhat: (value: string) => void;
  onPressTime: () => void;
  onToggleDone: () => void;
  onToggleDeleteSelect: () => void;
}) {
  const priorityMeta = TODO_PRIORITY_META[item.priority];
  const rowMuted = item.isDone;
  const timeLabel = `${formatMinutesToHHmm(item.startMinutes)}–${formatMinutesToHHmm(item.endMinutes)}`;

  return (
    <Pressable
      accessibilityRole={deleteMode ? 'button' : undefined}
      accessibilityLabel={deleteMode ? '탭하면 삭제 선택' : undefined}
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
      style={[
        styles.row,
        !isLast && { borderBottomColor: ui.line, borderBottomWidth: TODO_TABLE_BORDER_WIDTH },
        deleteMode && { backgroundColor: deleteSelected ? ui.dangerBg : ui.cellBg },
      ]}>
      <DoneCheckbox
        checked={deleteMode ? deleteSelected : item.isDone}
        ui={ui}
        accessibilityLabel={
          deleteMode
            ? deleteSelected
              ? `${item.what || '할 일'} 삭제 선택 해제`
              : `${item.what || '할 일'} 삭제 선택`
            : item.isDone
              ? `${item.what || '할 일'} 완료 취소`
              : `${item.what || '할 일'} 완료`
        }
        onPress={deleteMode ? onToggleDeleteSelect : onToggleDone}
      />

      <View style={styles.rowBody}>
        <TextInput
          key={`${item.id}-${item.isDone ? 'done' : 'todo'}`}
          value={item.what}
          onChangeText={onChangeWhat}
          editable={!deleteMode}
          pointerEvents={deleteMode ? 'none' : 'auto'}
          placeholder="할 일을 입력하세요"
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
            },
          ]}
        />
        {!deleteMode ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`시간 ${timeLabel}, 탭하면 조절`}
            hitSlop={6}
            onPress={onPressTime}
            style={styles.timeMetaRow}>
            <IconSymbol name="clock" size={11} color={ui.muted} />
            <ThemedText style={styles.timeMeta} lightColor={ui.muted} darkColor={ui.muted}>
              {timeLabel}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`우선순위 ${priorityMeta.label}, 탭하면 변경`}
        onPress={deleteMode ? onToggleDeleteSelect : onCyclePriority}
        style={[
          styles.priorityBtn,
          {
            borderColor: ui.btnBorder,
            backgroundColor: ui.btnBg,
          },
        ]}>
        <ThemedText
          style={[
            styles.priorityBtnText,
            { color: priorityMeta.dot },
            rowMuted && styles.priorityLabelDone,
          ]}
          numberOfLines={1}>
          {priorityMeta.label}
        </ThemedText>
      </Pressable>
    </Pressable>
  );
}

/** 투두 리스트 — 체크·할 일·우선순위 리스트형 */
export function TodoListPlanSection({ c, isDark, dateLabel, embedded = false }: Props) {
  const ui = useMemo(() => todoListUiColors(c, isDark), [c, isDark]);
  const activeDateKey = useDayPlanTodoStore((s) => s.activeDateKey);
  const todos = useDayPlanTodoStore((s) => s.todosByDate[s.activeDateKey] ?? EMPTY_TODOS);
  const addTodo = useDayPlanTodoStore((s) => s.addTodo);
  const updateTodo = useDayPlanTodoStore((s) => s.updateTodo);
  const cyclePriority = useDayPlanTodoStore((s) => s.cyclePriority);
  const toggleDone = useDayPlanTodoStore((s) => s.toggleDone);
  const removeTodo = useDayPlanTodoStore((s) => s.removeTodo);

  const [draftWhat, setDraftWhat] = useState('');
  const [timeEditId, setTimeEditId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteSelection, setDeleteSelection] = useState<Set<string>>(() => new Set());

  const timeEditItem = useMemo(
    () => todos.find((t) => t.id === timeEditId) ?? null,
    [todos, timeEditId],
  );

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
    Alert.alert('할 일 삭제', `${count}개 항목을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteSelection.forEach((id) => removeTodo(id));
          setDeleteSelection(new Set());
          setDeleteMode(false);
        },
      },
    ]);
  }, [deleteMode, deleteSelection, removeTodo, toggleDeleteMode]);

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
      ? `${deleteSelection.size}개 선택됨 · 휴지통으로 삭제 · 다시 눌러 종료`
      : '삭제할 행을 선택하세요 · 휴지통을 다시 눌러 종료'
    : '왼쪽 체크로 완료 · 길게 눌러도 완료 · 우선순위와 시간을 눌러 조절';

  return (
    <View style={embedded ? styles.rootEmbedded : styles.root}>
      {!embedded && dateLabel ? (
        <ThemedText style={styles.dateCaption} lightColor={ui.ink} darkColor={ui.ink}>
          {dateLabel}
        </ThemedText>
      ) : null}

      <View
        style={[
          styles.card,
          {
            backgroundColor: ui.cardBg,
            borderColor: ui.tableBorder,
          },
        ]}>
        <View style={styles.cardTopRow}>
          <View style={[styles.newTaskTag, { backgroundColor: ui.tagBg }]}>
            <ThemedText style={[styles.newTaskTagText, { color: ui.tagText }]}>새 할 일</ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: deleteMode }}
            accessibilityLabel={deleteMode ? '삭제 모드 끄기' : '삭제 모드'}
            hitSlop={8}
            onPress={handleTrashPress}
            style={[
              styles.trashBtn,
              {
                borderColor: deleteMode ? ui.danger : ui.btnBorder,
                backgroundColor: deleteMode ? ui.dangerBg : ui.cellBg,
              },
            ]}>
            <IconSymbol name="trash" size={13} color={deleteMode ? ui.danger : ui.muted} />
          </Pressable>
        </View>

        <View
          style={[
            styles.quickAddRow,
            {
              borderColor: ui.tableBorder,
              backgroundColor: ui.cellBg,
            },
          ]}>
          <TextInput
            value={draftWhat}
            onChangeText={setDraftWhat}
            placeholder="할 일을 빠르게 추가..."
            placeholderTextColor={ui.placeholder}
            returnKeyType="done"
            onSubmitEditing={handleQuickAdd}
            style={[styles.quickAddInput, { color: ui.ink }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="할 일 추가"
            onPress={handleQuickAdd}
            style={[
              styles.quickAddBtn,
              {
                borderColor: ui.btnBorder,
                backgroundColor: ui.addBtnBg,
              },
            ]}>
            <ThemedText style={styles.quickAddBtnText} lightColor={ui.ink} darkColor={ui.ink}>
              +
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.listBody, { backgroundColor: ui.cellBg, borderColor: ui.tableBorder }]}>
          {todos.length === 0 ? (
            <View style={styles.emptyRow}>
              <ThemedText style={styles.emptyText} lightColor={ui.muted} darkColor={ui.muted}>
                위에서 할 일을 추가해 보세요
              </ThemedText>
            </View>
          ) : (
            todos.map((item, index) => (
              <TodoListRow
                key={item.id}
                item={item}
                ui={ui}
                deleteMode={deleteMode}
                deleteSelected={deleteSelection.has(item.id)}
                isLast={index === todos.length - 1}
                onCyclePriority={() => cyclePriority(item.id)}
                onChangeWhat={(what) => updateTodo(item.id, { what })}
                onPressTime={() => setTimeEditId(item.id)}
                onToggleDone={() => toggleDone(item.id)}
                onToggleDeleteSelect={() => toggleDeleteSelection(item.id)}
              />
            ))
          )}
        </View>
      </View>

      <ThemedText style={styles.hint} lightColor={ui.muted} darkColor={ui.muted}>
        {hintText}
      </ThemedText>

      {timeEditItem ? (
        <TodoListTimeEditSheet
          visible={timeEditId != null}
          startMinutes={timeEditItem.startMinutes}
          endMinutes={timeEditItem.endMinutes}
          c={c}
          isDark={isDark}
          onClose={() => setTimeEditId(null)}
          onSave={(startMinutes, endMinutes) =>
            updateTodo(timeEditItem.id, { startMinutes, endMinutes })
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  rootEmbedded: {
    width: '100%',
    paddingHorizontal: 4,
    paddingTop: 0,
    paddingBottom: 8,
    gap: 8,
  },
  dateCaption: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
    paddingHorizontal: 2,
  },
  card: {
    borderWidth: TODO_TABLE_BORDER_WIDTH,
    borderRadius: 0,
    padding: 10,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  newTaskTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newTaskTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  trashBtn: {
    width: 28,
    height: 28,
    borderWidth: TODO_TABLE_BORDER_WIDTH,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: TODO_TABLE_BORDER_WIDTH,
    borderRadius: 0,
    minHeight: 42,
    paddingLeft: 10,
    paddingRight: 4,
    gap: 6,
  },
  quickAddInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 8,
    padding: 0,
    margin: 0,
    minHeight: 22,
  },
  quickAddBtn: {
    width: 32,
    height: 32,
    borderWidth: TODO_TABLE_BORDER_WIDTH,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddBtnText: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 22,
    marginTop: -1,
  },
  listBody: {
    borderWidth: TODO_TABLE_BORDER_WIDTH,
    borderRadius: 0,
    overflow: 'hidden',
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: TODO_LAYOUT.rowMinHeight,
  },
  checkbox: {
    width: TODO_LAYOUT.checkboxSize,
    height: TODO_LAYOUT.checkboxSize,
    borderWidth: TODO_TABLE_BORDER_WIDTH,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkMark: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  taskInput: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.15,
    lineHeight: 20,
    padding: 0,
    margin: 0,
    minHeight: 20,
  },
  timeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  timeMeta: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  priorityBtn: {
    minWidth: 40,
    height: 28,
    borderWidth: TODO_TABLE_BORDER_WIDTH,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginTop: 2,
    flexShrink: 0,
  },
  priorityBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 14,
  },
  priorityLabelDone: {
    opacity: 0.45,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
});
