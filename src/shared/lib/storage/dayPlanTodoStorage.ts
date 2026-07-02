import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type PersistedDayPlanTodoItem = {
  id: string;
  what: string;
  who: string;
  priority: 'high' | 'medium' | 'low';
  startMinutes: number;
  endMinutes: number;
  inProgress: boolean;
  isDone: boolean;
  order: number;
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
