import { DEFAULT_DAY_MEAL_SLOT_SCHEDULE } from '@shared/lib/storage';

import {
  collectRoutineStartNotifySlots,
  hasResolvableRoutineStartTime,
} from './resolveRoutineStartNotifySlots';

const sets = [
  {
    id: 'set-a',
    name: '평일',
    applyRule: 'weekday' as const,
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
  {
    id: 'set-weekend',
    name: '주말',
    applyRule: 'weekend' as const,
    items: [
      {
        categoryKey: 'reading',
        enabled: true,
        spineStartMinutes: 11 * 60,
        spineEndMinutes: 12 * 60,
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
    expect(slots.map((s) => s.hhmm).sort()).toEqual(['06:00', '09:00', '11:00']);
    const morning = slots.find((s) => s.hhmm === '09:00');
    expect(morning?.weekdays).toEqual([1, 2, 3, 4, 5]);
    const weekend = slots.find((s) => s.hhmm === '11:00');
    expect(weekend?.weekdays).toEqual([0, 6]);
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

  it('예약 생성용 해석에서는 비활성 세트를 제외한다', () => {
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: ['reading'],
      sets,
      activeSetIds: ['set-a'],
      includeInactiveSets: false,
      layoutMode: 'bag',
      mealSchedule: DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
    });
    expect(slots.map((s) => s.hhmm).sort()).toEqual(['06:00', '09:00']);
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
    expect(slots[0]?.weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
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
