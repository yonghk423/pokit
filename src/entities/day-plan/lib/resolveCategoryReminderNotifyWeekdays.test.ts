import { resolveCategoryReminderNotifyWeekdays } from './resolveCategoryReminderNotifyWeekdays';

const sets = [
  {
    id: 'set_daily',
    name: '데일리',
    applyRule: 'daily' as const,
    items: [{ categoryKey: 'customFlow:a', enabled: true }],
  },
  {
    id: 'set_weekend',
    name: '주말',
    applyRule: 'weekend' as const,
    items: [{ categoryKey: 'customFlow:b', enabled: true }],
  },
  {
    id: 'set_off',
    name: '미적용',
    applyRule: 'manual' as const,
    items: [{ categoryKey: 'customFlow:c', enabled: true }],
  },
];

describe('resolveCategoryReminderNotifyWeekdays', () => {
  it('적용 중인 그룹의 요일만 반환한다', () => {
    const map = resolveCategoryReminderNotifyWeekdays({
      categoryKeys: ['customFlow:a', 'customFlow:b', 'customFlow:c'],
      sets,
      activeSetIds: ['set_daily', 'set_weekend'],
    });

    expect(map.get('customFlow:a')).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(map.get('customFlow:b')).toEqual([0, 6]);
    expect(map.has('customFlow:c')).toBe(false);
  });

  it('적용되지 않은 키는 제외한다', () => {
    const map = resolveCategoryReminderNotifyWeekdays({
      categoryKeys: ['customFlow:c'],
      sets,
      activeSetIds: [],
      todayPlanCategoryKeys: [],
    });
    expect(map.size).toBe(0);
  });

  it('오늘 일정에만 있으면 매일로 잡는다', () => {
    const map = resolveCategoryReminderNotifyWeekdays({
      categoryKeys: ['customFlow:c'],
      sets,
      activeSetIds: [],
      todayPlanCategoryKeys: ['customFlow:c'],
    });
    expect(map.get('customFlow:c')).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
