import type { RoutineTask } from '@entities/routine-task';

export type Routine = {
  id: string;

  title: string;
  description?: string;

  /** e.g. Morning Energy */
  category?: string;
  tags: string[];

  /** UI hint */
  color: string;
  icon: string;

  /** Default tasks for each routine execution. */
  defaultTasks: RoutineTask[];
};

