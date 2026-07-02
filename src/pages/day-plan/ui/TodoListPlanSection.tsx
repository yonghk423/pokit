import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import {
  TODO_LAYOUT,
  TODO_LIST_BORDER,
  TODO_LIST_CREAM,
  TODO_LIST_INK,
  TODO_DONE_GREEN,
  TODO_PRIORITY_META,
} from '../lib/todoListTheme';
import { TodoListTimeEditSheet } from './TodoListTimeEditSheet';

const EMPTY_TODOS: DayPlanTodoItem[] = [];
const TODO_TOP_BAR_ACTION_HEIGHT = 34;

type Props = {
  /** embedded: 타임라인 카드 내부 — 날짜 헤더는 상위 레이아웃 사용 */
  dateLabel?: string;
  embedded?: boolean;
};

function StatusCheckbox({
  checked,
  label,
  variant = 'default',
  onPress,
}: {
  checked: boolean;
  label: string;
  variant?: 'default' | 'done';
  onPress: () => void;
}) {
  const doneCheck = variant === 'done' && checked;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.statusBox,
        { borderColor: TODO_LIST_BORDER, width: TODO_LAYOUT.statusWidth },
      ]}>
      {checked ? (
        <Text
          style={[styles.checkMark, doneCheck && styles.checkMarkDone]}
          accessibilityElementsHidden>
          ✓
        </Text>
      ) : null}
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
  deleteMode,
  onCyclePriority,
  onChangeWhat,
  onPressTime,
  onToggleInProgress,
  onToggleDone,
  onRemove,
}: {
  item: DayPlanTodoItem;
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
  const deleteReadyStyle = deleteMode ? styles.deleteReadyCell : null;

  return (
    <View style={styles.dataRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={deleteMode ? '탭하면 이 할 일 삭제' : undefined}
        onPress={deleteMode ? onRemove : undefined}
        style={[
          styles.taskCell,
          { borderColor: deleteMode ? '#b91c1c' : TODO_LIST_BORDER },
          deleteReadyStyle,
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`우선순위 ${priorityMeta.label}, 탭하면 변경`}
          onPress={deleteMode ? onRemove : onCyclePriority}
          style={styles.priorityChip}>
          <View style={[styles.priorityDot, { backgroundColor: priorityMeta.dot }]} />
          <ThemedText
            style={[styles.priorityLabel, rowMuted && styles.mutedText]}
            lightColor={TODO_LIST_INK}
            darkColor={TODO_LIST_INK}
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
          placeholderTextColor="rgba(17,17,17,0.35)"
          multiline
          style={[
            styles.cellInput,
            rowMuted && styles.mutedText,
            { color: TODO_LIST_INK },
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
            borderColor: deleteMode ? '#b91c1c' : TODO_LIST_BORDER,
            width: TODO_LAYOUT.timeWidth,
          },
          deleteReadyStyle,
        ]}>
        <ThemedText
          style={[styles.timeText, rowMuted && styles.mutedText]}
          lightColor={TODO_LIST_INK}
          darkColor={TODO_LIST_INK}
          numberOfLines={2}>
          {timeLabel}
        </ThemedText>
      </Pressable>
      <StatusCheckbox checked={item.inProgress} label="진행 중" onPress={onToggleInProgress} />
      <StatusCheckbox checked={item.isDone} label="완료" variant="done" onPress={onToggleDone} />
    </View>
  );
}

/** 투두 리스트 — 모바일 한 화면 표 (우선순위+할 일 통합) */
export function TodoListPlanSection({ dateLabel, embedded = false }: Props) {
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

  const hintText = deleteMode
    ? '삭제할 행의 할 일·시간 칸을 탭하세요 · 휴지통을 다시 눌러 종료'
    : '색 점·우선순위 탭으로 높음·보통·낮음 · 시간 탭으로 구간 조절 · 휴지통으로 삭제 모드';

  return (
    <View
      style={[
        embedded ? styles.rootEmbedded : styles.root,
        !embedded && { backgroundColor: TODO_LIST_CREAM, borderColor: TODO_LIST_BORDER },
      ]}>
      <View style={[styles.topBar, embedded && styles.topBarEmbedded]}>
        {!embedded && dateLabel ? (
          <ThemedText style={styles.dateCaption} lightColor={TODO_LIST_INK} darkColor={TODO_LIST_INK}>
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
                borderColor: deleteMode ? '#b91c1c' : TODO_LIST_BORDER,
                backgroundColor: deleteMode ? 'rgba(185,28,28,0.08)' : '#FFFCF6',
              },
            ]}>
            <IconSymbol name="trash" size={15} color={deleteMode ? '#b91c1c' : TODO_LIST_INK} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="할 일 추가"
            onPress={addTodo}
            style={[styles.addBtn, { borderColor: TODO_LIST_BORDER }]}>
            <ThemedText style={styles.addBtnText} lightColor={TODO_LIST_INK} darkColor={TODO_LIST_INK}>
              + 추가
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          embedded ? styles.tableEmbedded : styles.table,
          embedded && { backgroundColor: TODO_LIST_CREAM, borderColor: TODO_LIST_BORDER },
        ]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTask}>
            <ThemedText style={styles.headerText} lightColor={TODO_LIST_INK} darkColor={TODO_LIST_INK}>
              할 일
            </ThemedText>
          </View>
          <View style={[styles.headerTime, { width: TODO_LAYOUT.timeWidth }]}>
            <ThemedText style={styles.headerText} lightColor={TODO_LIST_INK} darkColor={TODO_LIST_INK}>
              시간
            </ThemedText>
          </View>
          <View style={[styles.headerStatus, { width: TODO_LAYOUT.statusWidth }]}>
            <ThemedText style={styles.headerText} lightColor={TODO_LIST_INK} darkColor={TODO_LIST_INK}>
              진행
            </ThemedText>
          </View>
          <View style={[styles.headerStatus, { width: TODO_LAYOUT.statusWidth }]}>
            <ThemedText style={styles.headerText} lightColor={TODO_LIST_INK} darkColor={TODO_LIST_INK}>
              완료
            </ThemedText>
          </View>
        </View>

        {todos.map((item) => (
          <TodoListRow
            key={item.id}
            item={item}
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

      <ThemedText style={styles.hint} lightColor="rgba(17,17,17,0.55)" darkColor="rgba(17,17,17,0.55)">
        {hintText}
      </ThemedText>

      {timeEditItem ? (
        <TodoListTimeEditSheet
          visible={timeEditId != null}
          startMinutes={timeEditItem.startMinutes}
          endMinutes={timeEditItem.endMinutes}
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
    borderWidth: 1.5,
    borderRadius: 0,
    padding: 12,
    gap: 10,
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
    gap: 6,
  },
  iconBtn: {
    width: TODO_TOP_BAR_ACTION_HEIGHT,
    height: TODO_TOP_BAR_ACTION_HEIGHT,
    borderWidth: 1.5,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCaption: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  addBtn: {
    height: TODO_TOP_BAR_ACTION_HEIGHT,
    borderWidth: 1.5,
    borderRadius: 0,
    paddingHorizontal: 10,
    backgroundColor: '#FFFCF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    lineHeight: 14,
  },
  table: {
    width: '100%',
    gap: 6,
  },
  tableEmbedded: {
    width: '100%',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 0,
    padding: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: TODO_LAYOUT.gap,
  },
  headerTask: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingBottom: 2,
  },
  headerTime: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  headerStatus: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 0,
    backgroundColor: '#FFFCF6',
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 48,
  },
  deleteReadyCell: {
    backgroundColor: '#FFF5F5',
  },
  priorityChip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    gap: 2,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  priorityLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cellInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
    margin: 0,
    minHeight: 20,
  },
  timeCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 0,
    backgroundColor: '#FFFCF6',
    paddingHorizontal: 4,
    paddingVertical: 6,
    minHeight: 48,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
    lineHeight: 13,
  },
  mutedText: {
    opacity: 0.45,
    textDecorationLine: 'line-through',
  },
  statusBox: {
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFCF6',
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '800',
    color: TODO_LIST_INK,
    lineHeight: 18,
  },
  checkMarkDone: {
    color: TODO_DONE_GREEN,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
});
