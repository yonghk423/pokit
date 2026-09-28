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
  it('루틴당 spine 시작 시각만 쓰고 시간대(식사 구간)는 무시한다', () => {
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: ['reading'],
      sets,
      activeSetIds: ['set-a'],
      layoutMode: 'bag',
      mealSchedule: DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
    });
    expect(slots.map((s) => s.hhmm)).toEqual(['09:00']);
    expect(slots[0]?.weekdays).toEqual([1, 2, 3, 4, 5]);
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
    expect(slots.map((s) => s.hhmm)).toEqual(['09:00']);
  });

  it('오늘 일정 블록 시작 시각을 쓴다', () => {
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: ['customFlow:clean'],
      sets,
      activeSetIds: ['set-a'],
      layoutMode: 'bag',
      mealSchedule: DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
      planBlocks: [
        {
          categoryKey: 'customFlow:clean',
          startMinutes: 18 * 60 + 10,
          hasManualScheduleOverride: true,
        },
      ],
    });
    expect(slots.map((s) => s.hhmm)).toEqual(['18:10']);
    expect(slots[0]?.weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('전역 저장 시각이 있으면 다른 후보보다 우선하고 하나만 남긴다', () => {
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: ['reading'],
      sets,
      activeSetIds: ['set-a'],
      mealSchedule: DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
      storedStartTimes: {
        reading: { startMinutes: 17 * 60 + 51, endMinutes: 18 * 60 + 21 },
      },
      planBlocks: [
        {
          categoryKey: 'reading',
          startMinutes: 9 * 60,
          hasManualScheduleOverride: true,
        },
      ],
    });
    expect(slots).toHaveLength(1);
    expect(slots[0]?.hhmm).toBe('17:51');
  });

  it('집중 세션 자동 블록의 하루 시작 시각은 쓰지 않는다', () => {
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: ['customFlow:preset_daily_exercise'],
      sets: [
        {
          id: 'set_weekend',
          name: '주말',
          applyRule: 'weekend',
          items: [{ categoryKey: 'customFlow:preset_daily_exercise', enabled: true }],
        },
      ],
      activeSetIds: [],
      includeInactiveSets: false,
      mealSchedule: DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
      planBlocks: [
        {
          categoryKey: 'customFlow:preset_daily_exercise',
          startMinutes: 7 * 60,
          blockOrigin: 'prioritySession',
        },
      ],
      priorityStart: '07:00',
    });
    expect(slots).toEqual([]);
  });

  it('오늘 담기만 있고 루틴 시간이 없으면 슬롯이 없다', () => {
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: ['healthIntake'],
      sets,
      activeSetIds: [],
      includeInactiveSets: false,
      mealSchedule: DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
      todayCategoryKeys: ['healthIntake'],
      priorityStart: '07:30',
    });
    expect(slots).toEqual([]);
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

  it('시간대만 있고 spine/저장 시각이 없으면 시작 알림 후보가 없다', () => {
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: ['customFlow:clean'],
      sets,
      activeSetIds: ['set-a'],
      mealSchedule: DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
      sectionsMealSlots: { 'customFlow:clean': ['morning'] },
    });
    expect(slots).toEqual([]);
  });
});
