import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type PersistedDayPlanTodoSubItem = {
  id: string;
  text: string;
  isDone: boolean;
  order: number;
};

export type PersistedDayPlanTodoItem = {
  id: string;
  what: string;
  who: string;
  priority: 'high' | 'medium' | 'low';
  markColor?: string | null;
  startMinutes: number;
  endMinutes: number;
  endsNextCalendarDay?: boolean;
  inProgress: boolean;
  isDone: boolean;
  order: number;
  subItems?: PersistedDayPlanTodoSubItem[];
};

export type PersistedDayPlanTodos = {
  todosByDate: Record<string, PersistedDayPlanTodoItem[]>;
};

export function loadDayPlanTodos(): PersistedDayPlanTodos | null {
  return localStorageClient.getJson<PersistedDayPlanTodos>(StorageKeys.dayPlanTodos);
}

export function saveDayPlanTodos(data: PersistedDayPlanTodos): void {
  localStorageClient.setJson(StorageKeys.dayPlanTodos, data);
}
