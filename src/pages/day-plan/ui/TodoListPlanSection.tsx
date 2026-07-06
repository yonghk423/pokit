import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import {
  formatMinutesToHHmm,
  useDayPlanTodoStore,
  type DayPlanTodoItem,
} from '@entities/day-plan';
import { RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
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
const TODO_TOP_BAR_ACTION_HEIGHT = 32;
const STATUS_BOX_SIZE = 48;
const STATUS_CHECK_SIZE = 22;

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  /** embedded: 타임라인 카드 내부 — 날짜 헤더는 상위 레이아웃 사용 */
  dateLabel?: string;
  embedded?: boolean;
};

function StatusCheckbox({
  checked,
  label,
  ui,
  variant = 'default',
  onPress,
}: {
  checked: boolean;
  label: string;
  ui: TodoListUiColors;
  variant?: 'default' | 'done';
  onPress: () => void;
}) {
  const isDone = variant === 'done';
  const accent = isDone ? ui.done : ui.primary;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={[styles.statusCell, { width: TODO_LAYOUT.statusWidth, minHeight: STATUS_BOX_SIZE }]}>
      <View
        style={[
          styles.statusCheck,
          checked
            ? { backgroundColor: accent, borderColor: accent }
            : { backgroundColor: ui.cellBg, borderColor: ui.tableBorder },
        ]}>
        {checked ? (
          <IconSymbol name="checkmark" size={12} color={isDone ? '#fff' : ui.primaryOn} />
        ) : null}
      </View>
    </Pressable>
  );
}

function formatTodoTimeCompact(startMinutes: number, endMinutes: number): string {
  const start = formatMinutesToHHmm(startMinutes);
  const end = formatMinutesToHHmm(endMinutes);
  if (start === end) return start;
  return `${start}\n${end}`;
}

function TodoListRow({
  item,
  ui,
  deleteMode,
  onCyclePriority,
  onChangeWhat,
  onPressTime,
  onToggleInProgress,
  onToggleDone,
  onRemove,
}: {
  item: DayPlanTodoItem;
  ui: TodoListUiColors;
  deleteMode: boolean;
  onCyclePriority: () => void;
  onChangeWhat: (value: string) => void;
  onPressTime: () => void;
  onToggleInProgress: () => void;
  onToggleDone: () => void;
  onRemove: () => void;
}) {
  const priorityMeta = TODO_PRIORITY_META[item.priority];
  const timeLabel = formatTodoTimeCompact(item.startMinutes, item.endMinutes);
  const timeA11y = `${formatMinutesToHHmm(item.startMinutes)}–${formatMinutesToHHmm(item.endMinutes)}`;
  const rowMuted = item.isDone;
  const cellBorderColor = deleteMode ? ui.danger : ui.tableBorder;
  const cellBg = deleteMode ? ui.dangerBg : ui.cellBg;

  return (
    <View style={styles.dataRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={deleteMode ? '탭하면 이 할 일 삭제' : undefined}
        onPress={deleteMode ? onRemove : undefined}
        style={[
          styles.taskCell,
          {
            borderColor: cellBorderColor,
            borderWidth: TODO_TABLE_BORDER_WIDTH,
            backgroundColor: cellBg,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`우선순위 ${priorityMeta.label}, 탭하면 변경`}
          onPress={deleteMode ? onRemove : onCyclePriority}
          style={[styles.priorityChip, { width: TODO_LAYOUT.priorityWidth }]}>
          <View style={[styles.priorityDot, { backgroundColor: priorityMeta.dot }]} />
          <ThemedText
            style={[styles.priorityLabel, rowMuted && styles.mutedText]}
            lightColor={ui.muted}
            darkColor={ui.muted}
            numberOfLines={1}>
            {priorityMeta.label}
          </ThemedText>
        </Pressable>

        <TextInput
          value={item.what}
          onChangeText={onChangeWhat}
          editable={!deleteMode}
          pointerEvents={deleteMode ? 'none' : 'auto'}
          placeholder="할 일 입력"
          placeholderTextColor={ui.placeholder}
          multiline
          style={[
            styles.cellInput,
            rowMuted && styles.mutedText,
            { color: ui.ink },
          ]}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          deleteMode ? '탭하면 이 할 일 삭제' : `시간 ${timeA11y}, 탭하면 조절`
        }
        onPress={deleteMode ? onRemove : onPressTime}
        style={[
          styles.timeCell,
          {
            borderColor: cellBorderColor,
            borderWidth: TODO_TABLE_BORDER_WIDTH,
            backgroundColor: cellBg,
            width: TODO_LAYOUT.timeWidth,
          },
        ]}>
        <ThemedText
          style={[styles.timeText, rowMuted && styles.mutedText]}
          lightColor={ui.ink}
          darkColor={ui.ink}
          numberOfLines={2}>
          {timeLabel}
        </ThemedText>
      </Pressable>

      <StatusCheckbox
        checked={item.inProgress}
        label="진행 중"
        ui={ui}
        onPress={onToggleInProgress}
      />
      <StatusCheckbox
        checked={item.isDone}
        label="완료"
        ui={ui}
        variant="done"
        onPress={onToggleDone}
      />
    </View>
  );
}

/** 투두 리스트 — 우선순위 루틴 목록과 같은 리스트형 레이아웃 */
export function TodoListPlanSection({ c, isDark, dateLabel, embedded = false }: Props) {
  const ui = useMemo(() => todoListUiColors(c, isDark), [c, isDark]);
  const todos = useDayPlanTodoStore((s) => s.todosByDate[s.activeDateKey] ?? EMPTY_TODOS);
  const addTodo = useDayPlanTodoStore((s) => s.addTodo);
  const updateTodo = useDayPlanTodoStore((s) => s.updateTodo);
  const cyclePriority = useDayPlanTodoStore((s) => s.cyclePriority);
  const toggleInProgress = useDayPlanTodoStore((s) => s.toggleInProgress);
  const toggleDone = useDayPlanTodoStore((s) => s.toggleDone);
  const removeTodo = useDayPlanTodoStore((s) => s.removeTodo);

  const handleRemoveTodo = useCallback(
    (item: DayPlanTodoItem) => {
      const label = item.what.trim();
      if (label.length > 0) {
        Alert.alert('할 일 삭제', `「${label}」 항목을 삭제할까요?`, [
          { text: '취소', style: 'cancel' },
          { text: '삭제', style: 'destructive', onPress: () => removeTodo(item.id) },
        ]);
        return;
      }
      removeTodo(item.id);
    },
    [removeTodo],
  );

  const [timeEditId, setTimeEditId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const timeEditItem = useMemo(
    () => todos.find((t) => t.id === timeEditId) ?? null,
    [todos, timeEditId],
  );

  const isHydrated = useDayPlanTodoStore((s) => s.isHydrated);
  const ensureAtLeastOneRow = useCallback(() => {
    if (!isHydrated) return;
    if (todos.length === 0) addTodo();
  }, [addTodo, isHydrated, todos.length]);

  useEffect(() => {
    ensureAtLeastOneRow();
  }, [ensureAtLeastOneRow]);

  const toggleDeleteMode = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDeleteMode((prev) => {
      if (prev) return false;
      setTimeEditId(null);
      return true;
    });
  }, []);

  const handleAddTodo = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addTodo();
  }, [addTodo]);

  const hintText = deleteMode
    ? '삭제할 행을 탭하세요 · 휴지통을 다시 눌러 종료'
    : '색 점·우선순위 탭으로 높음·보통·낮음 · 시간 탭으로 구간 조절 · 휴지통으로 삭제 모드';

  return (
    <View style={embedded ? styles.rootEmbedded : styles.root}>
      <View style={[styles.topBar, embedded && styles.topBarEmbedded]}>
        {!embedded && dateLabel ? (
          <ThemedText style={styles.dateCaption} lightColor={ui.ink} darkColor={ui.ink}>
            {dateLabel}
          </ThemedText>
        ) : (
          <View style={styles.topBarSpacer} />
        )}
        <View style={styles.topBarActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: deleteMode }}
            accessibilityLabel={deleteMode ? '삭제 모드 끄기' : '삭제 모드'}
            onPress={toggleDeleteMode}
            style={[
              styles.iconBtn,
              {
                borderColor: deleteMode ? ui.danger : ui.btnBorder,
                backgroundColor: deleteMode ? ui.dangerBg : ui.btnBg,
              },
            ]}>
            <IconSymbol name="trash" size={14} color={deleteMode ? ui.danger : ui.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="할 일 추가"
            onPress={handleAddTodo}
            style={[
              styles.addBtn,
              { borderColor: ui.primary, backgroundColor: ui.primary },
            ]}>
            <ThemedText style={styles.addBtnText} lightColor={ui.primaryOn} darkColor={ui.primaryOn}>
              + 추가
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={[styles.listShell, { borderColor: ui.tableBorder, borderWidth: TODO_TABLE_BORDER_WIDTH }]}>
        <View style={styles.headerRow}>
          <View style={[styles.headerPriority, { width: TODO_LAYOUT.priorityWidth }]}>
            <ThemedText style={styles.headerText} lightColor={ui.muted} darkColor={ui.muted}>
              우선
            </ThemedText>
          </View>
          <View style={styles.headerTask}>
            <ThemedText style={styles.headerText} lightColor={ui.muted} darkColor={ui.muted}>
              할 일
            </ThemedText>
          </View>
          <View style={[styles.headerTime, { width: TODO_LAYOUT.timeWidth }]}>
            <ThemedText style={styles.headerText} lightColor={ui.muted} darkColor={ui.muted}>
              시간
            </ThemedText>
          </View>
          <View style={[styles.headerStatus, { width: TODO_LAYOUT.statusWidth }]}>
            <ThemedText style={styles.headerText} lightColor={ui.muted} darkColor={ui.muted}>
              진행
            </ThemedText>
          </View>
          <View style={[styles.headerStatus, { width: TODO_LAYOUT.statusWidth }]}>
            <ThemedText style={styles.headerText} lightColor={ui.muted} darkColor={ui.muted}>
              완료
            </ThemedText>
          </View>
        </View>

        {todos.map((item) => (
          <TodoListRow
            key={item.id}
            item={item}
            ui={ui}
            deleteMode={deleteMode}
            onCyclePriority={() => cyclePriority(item.id)}
            onChangeWhat={(what) => updateTodo(item.id, { what })}
            onPressTime={() => setTimeEditId(item.id)}
            onToggleInProgress={() => toggleInProgress(item.id)}
            onToggleDone={() => toggleDone(item.id)}
            onRemove={() => handleRemoveTodo(item)}
          />
        ))}
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
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  topBarEmbedded: {
    paddingHorizontal: 8,
  },
  topBarSpacer: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: TODO_TOP_BAR_ACTION_HEIGHT,
    height: TODO_TOP_BAR_ACTION_HEIGHT,
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCaption: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  addBtn: {
    height: TODO_TOP_BAR_ACTION_HEIGHT,
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  listShell: {
    width: '100%',
    borderRadius: 0,
    padding: 8,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: TODO_LAYOUT.gap,
    paddingBottom: 2,
  },
  headerPriority: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTask: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  headerTime: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStatus: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: TODO_LAYOUT.gap,
  },
  taskCell: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: STATUS_BOX_SIZE,
  },
  priorityChip: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 7,
    paddingBottom: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 0,
  },
  priorityLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cellInput: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'center',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    padding: 0,
    margin: 0,
    minHeight: 22,
  },
  timeCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
    paddingHorizontal: 4,
    paddingVertical: 6,
    minHeight: STATUS_BOX_SIZE,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
    lineHeight: 13,
  },
  statusCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCheck: {
    width: STATUS_CHECK_SIZE,
    height: STATUS_CHECK_SIZE,
    borderRadius: STATUS_CHECK_SIZE / 2,
    borderWidth: TODO_TABLE_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: {
    opacity: 0.45,
    textDecorationLine: 'line-through',
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
});
