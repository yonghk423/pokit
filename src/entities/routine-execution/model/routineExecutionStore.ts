import { create } from 'zustand';

import type { Routine } from '@entities/routine';
import type { RoutineExecution } from '@entities/routine-execution';
import { getRoutineExecutionIsCompleted } from '@entities/routine-execution';

import { loadRoutineExecutions, saveRoutineExecutions } from '@shared/lib/storage';

function createRoutineExecutionId(): string {
  const cryptoAny = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  const maybe = cryptoAny.crypto?.randomUUID?.();
  if (maybe) return maybe;
  return `re_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getTasksSorted(routine: Routine) {
  return [...routine.defaultTasks].sort((a, b) => a.order - b.order);
}

function upsertExecutionById(items: RoutineExecution[], execution: RoutineExecution) {
  const idx = items.findIndex((x) => x.id === execution.id);
  if (idx === -1) return [...items, execution];
  return items.map((x) => (x.id === execution.id ? execution : x));
}

export type RoutineExecutionStoreState = {
  routineExecutions: RoutineExecution[];
  currentRoutineExecutionId: string | null;
  isHydrated: boolean;

  hydrate: () => void;

  startRoutineExecution: (routine: Routine) => void;
  completeCurrentTask: (routine: Routine, executionId: string) => void;
  endRoutineExecution: (executionId: string) => void;
  setCurrentRoutineExecutionId: (executionId: string | null) => void;
};

export const useRoutineExecutionStore = create<RoutineExecutionStoreState>((set, get) => ({
  routineExecutions: [],
  currentRoutineExecutionId: null,
  isHydrated: false,

  hydrate: () => {
    const { isHydrated } = get();
    if (isHydrated) return;

    const routineExecutions = loadRoutineExecutions<RoutineExecution>();
    const currentRoutineExecutionId =
      routineExecutions.find((e) => !getRoutineExecutionIsCompleted(e))?.id ?? null;

    set({
      routineExecutions,
      currentRoutineExecutionId,
      isHydrated: true,
    });
  },

  setCurrentRoutineExecutionId: (executionId) => {
    set({ currentRoutineExecutionId: executionId });
  },

  startRoutineExecution: (routine) => {
    const { currentRoutineExecutionId, routineExecutions: existingExecutions } = get();
    if (currentRoutineExecutionId) {
      const current = existingExecutions.find((e) => e.id === currentRoutineExecutionId);
      if (current && !getRoutineExecutionIsCompleted(current)) {
        return;
      }
    }

    const tasks = getTasksSorted(routine);
    const nowIso = new Date().toISOString();

    const execution: RoutineExecution = {
      id: createRoutineExecutionId(),
      routineId: routine.id,
      startTime: nowIso,
      endTime: null,
      currentTaskId: tasks[0]?.id ?? null,
      completedTaskIds: [],
    };

    const routineExecutions = [...get().routineExecutions, execution];
    set({
      routineExecutions,
      currentRoutineExecutionId: execution.id,
    });
    saveRoutineExecutions<RoutineExecution>(routineExecutions);
  },

  completeCurrentTask: (routine, executionId) => {
    const current = get().routineExecutions.find((e) => e.id === executionId);
    if (!current) return;
    if (getRoutineExecutionIsCompleted(current)) return;
    if (!current.currentTaskId) return;

    const tasks = getTasksSorted(routine);
    const currentTaskIdx = tasks.findIndex((t) => t.id === current.currentTaskId);
    if (currentTaskIdx === -1) return;

    const completedTaskIds = current.completedTaskIds.includes(current.currentTaskId)
      ? current.completedTaskIds
      : [...current.completedTaskIds, current.currentTaskId];

    const nextTaskId = tasks[currentTaskIdx + 1]?.id ?? null;
    const endTime = nextTaskId ? null : new Date().toISOString();

    const nextExecution: RoutineExecution = {
      ...current,
      completedTaskIds,
      currentTaskId: nextTaskId,
      endTime,
    };

    const routineExecutions = upsertExecutionById(get().routineExecutions, nextExecution);
    set({ routineExecutions });
    saveRoutineExecutions<RoutineExecution>(routineExecutions);
  },

  endRoutineExecution: (executionId) => {
    const current = get().routineExecutions.find((e) => e.id === executionId);
    if (!current) return;
    if (getRoutineExecutionIsCompleted(current)) return;

    const nextExecution: RoutineExecution = {
      ...current,
      endTime: new Date().toISOString(),
      currentTaskId: null,
    };

    const routineExecutions = upsertExecutionById(get().routineExecutions, nextExecution);
    set({
      routineExecutions,
      currentRoutineExecutionId:
        get().currentRoutineExecutionId === executionId ? null : get().currentRoutineExecutionId,
    });
    saveRoutineExecutions<RoutineExecution>(routineExecutions);
  },
}));

