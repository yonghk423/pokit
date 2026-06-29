jest.mock('@shared/lib/storage', () => ({
  loadGoalDetailCategoryConfig: jest.fn(() => null),
}));

jest.mock('@entities/day-plan', () => {
  const local = jest.requireActual('@entities/day-plan/lib/localDateKey');
  const parse = jest.requireActual('@entities/day-plan/lib/parseTime');
  const priority = jest.requireActual('@entities/day-plan/lib/priorityRoutineWindow');
  const math = jest.requireActual('@entities/day-plan/lib/dayPlanTimeMath');
  const labels = jest.requireActual('@entities/day-plan/lib/priorityCatalogPickerLabels');
  return {
    ...local,
    ...parse,
    ...priority,
    ...math,
    ...labels,
    getLocalDateKey: () => '2025-05-26',
    defaultCustomFlowPickerLabel: () => '사용자',
    getInitialOtherDataConfig: () => ({}),
    getOtherCategoryResolvedDisplayLabel: () => '기타',
    isCustomFlowCategoryKey: () => false,
    normalizeOtherDetailConfig: (v: unknown) => v,
  };
});

import {
  formatDateKeyDisplayKo,
  pickPlanDateKeyForBlock,
  planDayIntroFromRange,
  priorityClockCaptionDateKeyEnd,
  sortedPlanDateRange,
} from './dayPlanEditorShared';

describe('dayPlanEditorShared', () => {
  it('formats date key in korean', () => {
    expect(formatDateKeyDisplayKo('2025-05-26')).toBe('5월 26일');
  });

  it('shows 오늘 for single-day intro when today matches', () => {
    expect(planDayIntroFromRange('2025-05-26', '2025-05-26', '2025-05-26')).toBe('오늘');
  });

  it('formats multi-day intro within same month', () => {
    expect(planDayIntroFromRange('2025-05-26', '2025-05-26', '2025-05-28')).toBe(
      '5월 26일 ~ 28일',
    );
  });

  it('sorts plan date range', () => {
    expect(sortedPlanDateRange('2025-05-28', '2025-05-26')).toEqual({
      lo: '2025-05-26',
      hi: '2025-05-28',
    });
  });

  it('picks today when in range', () => {
    expect(pickPlanDateKeyForBlock('2025-05-20', '2025-05-30')).toBe('2025-05-26');
    expect(pickPlanDateKeyForBlock('2025-06-01', '2025-06-10')).toBe('2025-06-01');
  });

  it('extends end caption to next day for overnight window', () => {
    expect(priorityClockCaptionDateKeyEnd('2025-05-26', '22:00', '06:00')).toBe('2025-05-27');
    expect(priorityClockCaptionDateKeyEnd('2025-05-26', '09:00', '18:00')).toBe('2025-05-26');
  });
});
