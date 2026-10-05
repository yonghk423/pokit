import { buildPinnedRoutineWidgetPayload } from './pinnedRoutineWidgetPayload';

type Fixture = {
  key: string;
  config: Record<string, unknown>;
  expectMetric: string;
  expectBody: RegExp;
};

const fixtures: Fixture[] = [
  {
    key: 'customFlow:counter',
    config: {
      templateKey: 'counter',
      displayName: '푸쉬업',
      activityLabel: '푸쉬업',
      unitKey: 'count',
      unitLabel: '회',
      goalCount: 50,
      currentCount: 12,
      dailyReset: false,
      countDateKey: '2026-10-05',
    },
    expectMetric: 'counter',
    expectBody: /12/,
  },
  {
    key: 'customFlow:habit',
    config: {
      templateKey: 'habit',
      displayName: '물 마시기',
      doneToday: false,
      streakDays: 4,
    },
    expectMetric: 'counter',
    expectBody: /4/,
  },
  {
    key: 'customFlow:focus',
    config: {
      templateKey: 'focus',
      displayName: '집중',
      planMin: 25,
      doneMin: 10,
    },
    expectMetric: 'counter',
    expectBody: /10/,
  },
  {
    key: 'customFlow:measurement',
    config: {
      templateKey: 'measurement',
      displayName: '체중',
      metricLabel: '체중',
      unit: 'kg',
      currentValue: 68.5,
      useGoalValue: true,
      goalValue: 65,
    },
    expectMetric: 'counter',
    expectBody: /68/,
  },
  {
    key: 'customFlow:reminder',
    config: {
      templateKey: 'reminder',
      displayName: '알림',
      reminderItems: [
        { time: '09:00', label: '물' },
        { time: '13:00', label: '약' },
      ],
      reminderTimes: ['09:00', '13:00'],
      completedTimes: ['09:00'],
    },
    expectMetric: 'intake',
    expectBody: /1/,
  },
  {
    key: 'customFlow:journal',
    config: {
      templateKey: 'journal',
      displayName: '일기',
      lastEntry: '오늘은 맑음',
      prompt: '',
    },
    expectMetric: 'reading',
    expectBody: /맑음/,
  },
  {
    key: 'customFlow:memo',
    config: {
      templateKey: 'memo',
      displayName: '메모',
      lastEntry: '장보기 목록',
    },
    expectMetric: 'reading',
    expectBody: /장보기/,
  },
  {
    key: 'customFlow:checklist',
    config: {
      templateKey: 'checklist',
      displayName: '할 일',
      checklist: [
        { id: 'a', text: '빨래', done: true },
        { id: 'b', text: '청소', done: false },
      ],
    },
    expectMetric: 'checklist',
    expectBody: /빨래/,
  },
];

const mockFixtureRef: { current: Fixture } = { current: fixtures[0]! };

jest.mock('@shared/lib/storage', () => {
  const actual = jest.requireActual('@shared/lib/storage') as Record<string, unknown>;
  return {
    ...actual,
    loadPinnedRoutineCategoryKey: () => mockFixtureRef.current.key,
    loadGoalDetailCategoryConfig: () => mockFixtureRef.current.config,
    loadDayPlanDraft: () => null,
  };
});

describe('buildPinnedRoutineWidgetPayload — templates', () => {
  it.each(fixtures)('$key 본문이 비지 않는다', (fixture) => {
    mockFixtureRef.current = fixture;
    const payload = buildPinnedRoutineWidgetPayload(fixture.key);
    expect(payload.metricKind).toBe(fixture.expectMetric);
    const body = [payload.heroLine, payload.subLine, ...payload.detailLines, payload.progressLabel]
      .join(' ')
      .concat(payload.checklistItems.map((i) => i.text).join(' '));
    expect(body).toMatch(fixture.expectBody);
    expect(payload.metricKind).not.toBe('none');
  });
});
