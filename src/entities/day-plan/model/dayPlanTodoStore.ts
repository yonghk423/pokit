import { create } from 'zustand';

import { loadDayPlanTodos, saveDayPlanTodos } from '@shared/lib/storage';

import { defaultEditorBlockTimesFromNow } from '../lib/dayPlanTimeMath';
import { getLocalDateKey } from '../lib/localDateKey';
import { parseHHmmToMinutes } from '../lib/parseTime';
import {
  isPriorityMarkColorId,
  type PriorityMarkColorId,
} from '../lib/priorityMarkColor';
import type { DayPlanTodoItem, DayPlanTodoSubItem, TodoPriority } from './types';

const EMPTY_TODOS: DayPlanTodoItem[] = [];

function createTodoId(): string {
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createSubItemId(): string {
  return `todo-sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyTodo(order: number): DayPlanTodoItem {
  const { startTime, endTime } = defaultEditorBlockTimesFromNow();
  const startMinutes = parseHHmmToMinutes(startTime) ?? 0;
  const endMinutes = parseHHmmToMinutes(endTime) ?? startMinutes + 60;
  return {
    id: createTodoId(),
    what: '',
    who: '',
    priority: 'medium',
    markColor: null,
    startMinutes,
    endMinutes,
    inProgress: false,
    isDone: false,
    order,
    subItems: [],
  };
}

function createEmptySubItem(order: number, text = ''): DayPlanTodoSubItem {
  return {
    id: createSubItemId(),
    text,
    isDone: false,
    order,
  };
}

function normalizeSubItem(raw: unknown, fallbackOrder: number): DayPlanTodoSubItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<DayPlanTodoSubItem>;
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : createSubItemId();
  return {
    id,
    text: typeof o.text === 'string' ? o.text : '',
    isDone: Boolean(o.isDone),
    order: typeof o.order === 'number' ? o.order : fallbackOrder,
  };
}

function normalizeSubItems(raw: unknown): DayPlanTodoSubItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => normalizeSubItem(item, index))
    .filter((item): item is DayPlanTodoSubItem => item != null)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}

function normalizeTodoItem(raw: unknown, fallbackOrder: number): DayPlanTodoItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<DayPlanTodoItem> & { markColor?: unknown };
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : createTodoId();
  const priority: TodoPriority =
    o.priority === 'high' || o.priority === 'low' ? o.priority : 'medium';
  const startMinutes =
    typeof o.startMinutes === 'number' && Number.isFinite(o.startMinutes) ? o.startMinutes : 0;
  let endMinutes =
    typeof o.endMinutes === 'number' && Number.isFinite(o.endMinutes)
      ? o.endMinutes
      : startMinutes + 60;
  if (endMinutes <= startMinutes) endMinutes = startMinutes + 15;
  const markColor: PriorityMarkColorId | null = isPriorityMarkColorId(o.markColor)
    ? o.markColor
    : o.markColor === null
      ? null
      : null;
  return {
    id,
    what: typeof o.what === 'string' ? o.what : '',
    who: typeof o.who === 'string' ? o.who : '',
    priority,
    markColor,
    startMinutes,
    endMinutes,
    endsNextCalendarDay: Boolean(o.endsNextCalendarDay),
    inProgress: Boolean(o.inProgress) && !o.isDone,
    isDone: Boolean(o.isDone),
    order: typeof o.order === 'number' ? o.order : fallbackOrder,
    subItems: normalizeSubItems(o.subItems),
  };
}

function normalizeTodosByDate(raw: unknown): Record<string, DayPlanTodoItem[]> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, DayPlanTodoItem[]> = {};
  for (const [dateKey, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const items = list
      .map((item, index) => normalizeTodoItem(item, index))
      .filter((item): item is DayPlanTodoItem => item != null)
      .sort((a, b) => a.order - b.order);
    if (items.length > 0) out[dateKey] = items;
  }
  return out;
}

type DayPlanTodoState = {
  todosByDate: Record<string, DayPlanTodoItem[]>;
  activeDateKey: string;
  isHydrated: boolean;
  hydrate: () => void;
  setActiveDateKey: (dateKey: string) => void;
  getActiveTodos: () => DayPlanTodoItem[];
  addTodo: () => void;
  updateTodo: (
    id: string,
    patch: Partial<
      Pick<
        DayPlanTodoItem,
        'what' | 'who' | 'startMinutes' | 'endMinutes' | 'endsNextCalendarDay' | 'markColor'
      >
    >,
  ) => void;
  setMarkColor: (id: string, markColor: PriorityMarkColorId | null) => void;
  addSubItem: (parentId: string, text?: string) => void;
  updateSubItem: (parentId: string, subId: string, text: string) => void;
  toggleSubItemDone: (parentId: string, subId: string) => void;
  removeSubItem: (parentId: string, subId: string) => void;
  toggleInProgress: (id: string) => void;
  toggleDone: (id: string) => void;
  removeTodo: (id: string) => void;
};

function persistTodos(state: DayPlanTodoState): void {
  if (!state.isHydrated) return;
  saveDayPlanTodos({ todosByDate: state.todosByDate });
}

function patchActiveTodos(
  state: DayPlanTodoState,
  updater: (items: DayPlanTodoItem[]) => DayPlanTodoItem[],
): Partial<DayPlanTodoState> {
  const key = state.activeDateKey;
  const nextItems = updater(state.todosByDate[key] ?? []);
  return {
    todosByDate: {
      ...state.todosByDate,
      [key]: nextItems,
    },
  };
}

function patchParentSubItems(
  items: DayPlanTodoItem[],
  parentId: string,
  updater: (subs: DayPlanTodoSubItem[]) => DayPlanTodoSubItem[],
): DayPlanTodoItem[] {
  return items.map((item) => {
    if (item.id !== parentId) return item;
    const nextSubs = updater(item.subItems ?? []).map((sub, index) => ({
      ...sub,
      order: index,
    }));
    return { ...item, subItems: nextSubs };
  });
}

export const useDayPlanTodoStore = create<DayPlanTodoState>((set, get) => ({
  todosByDate: {},
  activeDateKey: getLocalDateKey(),
  isHydrated: false,

  hydrate: () => {
    const raw = loadDayPlanTodos();
    const today = getLocalDateKey();
    const todosByDate = normalizeTodosByDate(raw?.todosByDate);
    set({
      todosByDate,
      activeDateKey: today,
      isHydrated: true,
    });
  },

  setActiveDateKey: (dateKey) => set({ activeDateKey: dateKey }),

  getActiveTodos: () => {
    const { todosByDate, activeDateKey } = get();
    return todosByDate[activeDateKey] ?? EMPTY_TODOS;
  },

  addTodo: () => {
    set((s) => {
      const current = s.todosByDate[s.activeDateKey] ?? [];
      const next = [...current, createEmptyTodo(current.length)];
      return {
        todosByDate: {
          ...s.todosByDate,
          [s.activeDateKey]: next,
        },
      };
    });
    persistTodos(get());
  },

  updateTodo: (id, patch) => {
    set((s) =>
      patchActiveTodos(s, (items) =>
        items.map((item) => {
          if (item.id !== id) return item;
          const next = { ...item, ...patch };
          if (typeof patch.endsNextCalendarDay === 'boolean') {
            next.endsNextCalendarDay = patch.endsNextCalendarDay;
          }
          if ('markColor' in patch) {
            next.markColor = patch.markColor ?? null;
          }
          if (
            !next.endsNextCalendarDay &&
            typeof next.startMinutes === 'number' &&
            typeof next.endMinutes === 'number' &&
            next.endMinutes <= next.startMinutes
          ) {
            next.endMinutes = next.startMinutes + 15;
          }
          return next;
        }),
      ),
    );
    persistTodos(get());
  },

  setMarkColor: (id, markColor) => {
    set((s) =>
      patchActiveTodos(s, (items) =>
        items.map((item) => (item.id === id ? { ...item, markColor } : item)),
      ),
    );
    persistTodos(get());
  },

  addSubItem: (parentId, text = '') => {
    set((s) =>
      patchActiveTodos(s, (items) =>
        patchParentSubItems(items, parentId, (subs) => [
          ...subs,
          createEmptySubItem(subs.length, text),
        ]),
      ),
    );
    persistTodos(get());
  },

  updateSubItem: (parentId, subId, text) => {
    set((s) =>
      patchActiveTodos(s, (items) =>
        patchParentSubItems(items, parentId, (subs) =>
          subs.map((sub) => (sub.id === subId ? { ...sub, text } : sub)),
        ),
      ),
    );
    persistTodos(get());
  },

  toggleSubItemDone: (parentId, subId) => {
    set((s) =>
      patchActiveTodos(s, (items) =>
        patchParentSubItems(items, parentId, (subs) =>
          subs.map((sub) => (sub.id === subId ? { ...sub, isDone: !sub.isDone } : sub)),
        ),
      ),
    );
    persistTodos(get());
  },

  removeSubItem: (parentId, subId) => {
    set((s) =>
      patchActiveTodos(s, (items) =>
        patchParentSubItems(items, parentId, (subs) => subs.filter((sub) => sub.id !== subId)),
      ),
    );
    persistTodos(get());
  },

  toggleInProgress: (id) => {
    set((s) =>
      patchActiveTodos(s, (items) =>
        items.map((item) => {
          if (item.id !== id) return item;
          const nextInProgress = !item.inProgress;
          return {
            ...item,
            inProgress: nextInProgress,
            isDone: nextInProgress ? false : item.isDone,
          };
        }),
      ),
    );
    persistTodos(get());
  },

  toggleDone: (id) => {
    set((s) =>
      patchActiveTodos(s, (items) =>
        items.map((item) => {
          if (item.id !== id) return item;
          const nextDone = !item.isDone;
          return {
            ...item,
            isDone: nextDone,
            inProgress: nextDone ? false : item.inProgress,
          };
        }),
      ),
    );
    persistTodos(get());
  },

  removeTodo: (id) => {
    set((s) =>
      patchActiveTodos(s, (items) =>
        items
          .filter((item) => item.id !== id)
          .map((item, index) => ({ ...item, order: index })),
      ),
    );
    persistTodos(get());
  },
}));
