import { DEFAULT_DAY_MEAL_SLOT_SCHEDULE } from '@shared/lib/storage';

import {
  collectRoutineStartNotifySlots,
  hasResolvableRoutineStartTime,
} from './resolveRoutineStartNotifySlots';

const sets = [
  {
    id: 'set-a',
    name: '평일',
    applyRule: 'daily' as const,
    items: [
      {
        categoryKey: 'reading',
        enabled: true,
        spineStartMinutes: 9 * 60,
        spineEndMinutes: 10 * 60,
        mealSlots: ['morning' as const],
      },
      {
        categoryKey: 'work',
        enabled: true,
        spineStartMinutes: 14 * 60,
        spineEndMinutes: 15 * 60,
        mealSlots: ['lunch' as const, 'dinner' as const],
      },
      {
        categoryKey: 'water',
        enabled: false,
        spineStartMinutes: 8 * 60,
        spineEndMinutes: 8 * 60 + 30,
      },
      {
        categoryKey: 'customFlow:clean',
        enabled: true,
      },
    ],
  },
];

describe('collectRoutineStartNotifySlots', () => {
  it('타임라인·시간대 시각을 모드와 무관하게 모은다', () => {
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: ['reading'],
      sets,
      activeSetIds: ['set-a'],
      layoutMode: 'bag',
      mealSchedule: DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
    });
    expect(slots.map((s) => s.hhmm).sort()).toEqual(['06:00', '09:00']);
  });

  it('활성 세트가 아니어도 저장된 시각을 찾는다', () => {
    expect(
      hasResolvableRoutineStartTime({
        categoryKey: 'work',
        sets,
        activeSetIds: [],
        layoutMode: 'bag',
        mealSchedule: DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
      }),
    ).toBe(true);
  });

  it('오늘 일정 블록 시작 시각을 쓴다', () => {
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: ['customFlow:clean'],
      sets,
      activeSetIds: ['set-a'],
      layoutMode: 'bag',
      mealSchedule: DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
      planBlocks: [{ categoryKey: 'customFlow:clean', startMinutes: 18 * 60 + 10 }],
    });
    expect(slots.map((s) => s.hhmm)).toEqual(['18:10']);
  });

  it('꺼진 항목은 제외한다', () => {
    expect(
      hasResolvableRoutineStartTime({
        categoryKey: 'water',
        sets,
        activeSetIds: ['set-a'],
        mealSchedule: DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
      }),
    ).toBe(false);
  });
});
