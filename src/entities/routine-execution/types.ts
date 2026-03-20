import type { Routine } from '@entities/routine';

export type RoutineExecution = {
  id: string;
  routineId: string;

  /**
   * ISO timestamp.
   * Store as string for LocalStorage portability.
   */
  startTime: string;
  endTime?: string | null;

  /**
   * Current task id within the routine.
   * `null` means not started yet or execution has no current task.
   */
  currentTaskId: string | null;

  /**
   * Tasks marked as completed for this execution.
   * Progress is derived from this and the routine's task list.
   */
  completedTaskIds: string[];
};

export function getRoutineExecutionProgressPercent(
  execution: RoutineExecution,
  routine: Routine,
): number {
  const total = routine.defaultTasks.length;
  if (total <= 0) return 0;

  const completedCount = execution.completedTaskIds.filter((taskId) =>
    routine.defaultTasks.some((t) => t.id === taskId),
  ).length;

  return Math.round((completedCount / total) * 100);
}

export function getRoutineExecutionIsCompleted(execution: RoutineExecution): boolean {
  return Boolean(execution.endTime);
}

