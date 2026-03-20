export type RoutineTaskType = 'habit' | 'health' | 'focus' | 'relax' | 'other' | string;

export type RoutineTask = {
  id: string;
  routineId: string;

  title: string;
  type: RoutineTaskType;

  /**
   * Task expected duration in seconds.
   * - optional: early MVP where durations are not enforced yet
   */
  durationSec?: number;

  /** 0-based ordering within a routine. */
  order: number;

  /** Locked tasks cannot be skipped/edited during an execution. */
  isLocked: boolean;
};

