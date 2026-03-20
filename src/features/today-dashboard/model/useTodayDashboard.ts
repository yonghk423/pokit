import { useEffect, useMemo } from 'react';

import { useRoutineStore } from '@entities/routine/model';
import { useRoutineExecutionStore } from '@entities/routine-execution/model';
import type { Routine } from '@entities/routine';
import type { RoutineExecution } from '@entities/routine-execution';
import { createSampleRoutine } from '../lib/createSampleRoutine';

type TodayDashboardState = {
  isHydrated: boolean;
  routines: Routine[];
  currentExecution: RoutineExecution | null;
  currentRoutine: Routine | null;

  addSampleRoutine: () => void;
  startRoutineExecution: (routine: Routine) => void;
  endRoutineExecution: (executionId: string) => void;
};

export function useTodayDashboard(): TodayDashboardState {
  const routineStore = useRoutineStore();
  const executionStore = useRoutineExecutionStore();

  useEffect(() => {
    routineStore.hydrate();
    executionStore.hydrate();
  }, [routineStore, executionStore]);

  const currentExecution = useMemo(() => {
    const id = executionStore.currentRoutineExecutionId;
    if (!id) return null;
    return executionStore.routineExecutions.find((e) => e.id === id) ?? null;
  }, [executionStore.currentRoutineExecutionId, executionStore.routineExecutions]);

  const currentRoutine = useMemo(() => {
    if (!currentExecution) return null;
    return routineStore.routines.find((r) => r.id === currentExecution.routineId) ?? null;
  }, [currentExecution, routineStore.routines]);

  return {
    isHydrated: routineStore.isHydrated && executionStore.isHydrated,
    routines: routineStore.routines,
    currentExecution,
    currentRoutine,
    addSampleRoutine: () => {
      const routine = createSampleRoutine();
      routineStore.upsertRoutine(routine);
      routineStore.setCurrentRoutineId(routine.id);
    },
    startRoutineExecution: (routine) => {
      executionStore.startRoutineExecution(routine);
    },
    endRoutineExecution: (executionId) => {
      executionStore.endRoutineExecution(executionId);
    },
  };
}

