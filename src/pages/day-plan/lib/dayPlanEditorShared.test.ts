jest.mock('@shared/lib/storage', () => ({
  loadGoalDetailCategoryConfig: jest.fn(() => null),
}));

jest.mock('@entities/day-plan', () => {
  const local = jest.requireActual('@entities/day-plan/lib/localDateKey');
  const parse = jest.requireActual('@entities/day-plan/lib/parseTime');
  const priority = jest.requireActual('@entities/day-plan/lib/priorityRoutineWindow');
  const instances = jest.requireActual('@entities/day-plan/lib/priorityRoutineInstance');
  const math = jest.requireActual('@entities/day-plan/lib/dayPlanTimeMath');
  const labels = jest.requireActual('@entities/day-plan/lib/priorityCatalogPickerLabels');
  return {
    ...local,
    ...parse,
    ...priority,
    ...instances,
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
  formatEndHhmmFrom12hParts,
  endsOnNextCalendarDay,
  pickPlanDateKeyForBlock,
  planDayIntroFromRange,
  priorityClockCaptionDateKeyEnd,
  sortedPlanDateRange,
  toggleEndMeridiemHhmm,
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

  it('treats 24:00 end as next calendar day in UI', () => {
    expect(endsOnNextCalendarDay('23:15', '24:00')).toBe(true);
    expect(endsOnNextCalendarDay('09:00', '18:00')).toBe(false);
    expect(endsOnNextCalendarDay('22:00', '06:00')).toBe(true);
  });

  it('extends end caption to next day for overnight window', () => {
    expect(priorityClockCaptionDateKeyEnd('2025-05-26', '2025-05-26', '22:00', '06:00')).toBe(
      '2025-05-27',
    );
    expect(priorityClockCaptionDateKeyEnd('2025-05-26', '2025-05-26', '09:00', '18:00')).toBe(
      '2025-05-26',
    );
    expect(priorityClockCaptionDateKeyEnd('2025-05-26', '2025-05-26', '23:15', '24:00')).toBe(
      '2025-05-27',
    );
  });

  it('does not double-extend when calendar range already spans overnight end day', () => {
    expect(priorityClockCaptionDateKeyEnd('2025-07-14', '2025-07-15', '06:30', '00:00')).toBe(
      '2025-07-15',
    );
  });

  it('resolves end noon vs midnight for ambiguous 오전 12:xx', () => {
    expect(formatEndHhmmFrom12hParts(12, 20, '오전', '09:20')).toBe('00:20');
    expect(formatEndHhmmFrom12hParts(12, 20, '오후', '09:20')).toBe('12:20');
    expect(formatEndHhmmFrom12hParts(12, 5, '오후', '22:00')).toBe('12:05');
  });

  it('toggles end meridiem to keep overnight for evening start', () => {
    expect(toggleEndMeridiemHhmm('22:00', 12, 5, '오전')).toBe('12:05');
    expect(toggleEndMeridiemHhmm('22:00', 12, 5, '오후')).toBe('00:05');
    expect(toggleEndMeridiemHhmm('22:00', 7, 0, '오전')).toBe('19:00');
  });
});
