import type { DayPlanBlock } from '@entities/day-plan/model/types';

/** 앱 첫 실행·빈 저장소 시 시드 (Day Plan UI와 동일한 흐름) */
export const DEFAULT_DAY_PLAN_BLOCKS: DayPlanBlock[] = [
  {
    id: 'dpb_wake',
    title: '기상',
    category: '습관',
    startMinutes: 7 * 60,
    endMinutes: 7 * 60 + 15,
    order: 0,
  },
  {
    id: 'dpb_jog',
    title: '아침 조깅',
    category: '건강',
    startMinutes: 7 * 60 + 30,
    endMinutes: 8 * 60 + 15,
    order: 1,
  },
  {
    id: 'dpb_deep',
    title: '딥워크 세션',
    category: '딥워크',
    startMinutes: 9 * 60,
    endMinutes: 10 * 60 + 30,
    order: 2,
  },
  {
    id: 'dpb_sleep',
    title: '취침',
    category: '습관',
    startMinutes: 22 * 60 + 30,
    endMinutes: 23 * 60,
    order: 3,
  },
];
