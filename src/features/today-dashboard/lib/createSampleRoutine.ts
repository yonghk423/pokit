import type { Routine } from '@entities/routine';
import type { RoutineTask } from '@entities/routine-task';

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createSampleRoutine(): Routine {
  const routineId = createId('r');

  const tasks: RoutineTask[] = [
    {
      id: createId('t'),
      routineId,
      title: '물 한 잔 마시기',
      type: 'health',
      durationSec: 60,
      order: 0,
      isLocked: false,
    },
    {
      id: createId('t'),
      routineId,
      title: '스트레칭',
      type: 'health',
      durationSec: 5 * 60,
      order: 1,
      isLocked: false,
    },
    {
      id: createId('t'),
      routineId,
      title: '오늘 계획 3가지 적기',
      type: 'focus',
      durationSec: 5 * 60,
      order: 2,
      isLocked: false,
    },
  ];

  return {
    id: routineId,
    title: 'Morning Energy',
    description: '가볍게 시작하는 아침 루틴',
    category: 'Morning',
    tags: ['morning', 'energy'],
    color: '#2F80ED',
    icon: 'sun.max.fill',
    defaultTasks: tasks,
  };
}

