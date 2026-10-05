import { buildHistoryPeriodCompare } from './historyPeriodCompare';

describe('historyPeriodCompare', () => {
  it('computes deltas and previous-data flag', () => {
    expect(
      buildHistoryPeriodCompare({
        activeDays: 10,
        totalCompletions: 20,
        prevActiveDays: 7,
        prevTotalCompletions: 15,
      }),
    ).toEqual({
      activeDaysDelta: 3,
      completionsDelta: 5,
      hasPreviousData: true,
    });

    expect(
      buildHistoryPeriodCompare({
        activeDays: 5,
        totalCompletions: 8,
        prevActiveDays: 0,
        prevTotalCompletions: 0,
      }),
    ).toEqual({
      activeDaysDelta: 5,
      completionsDelta: 8,
      hasPreviousData: false,
    });
  });
});
