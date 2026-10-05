import { countTrailingStreak } from './historyStreak';

export type HistoryPeriodCompare = {
  /** 현재 − 이전 (활동 일수) */
  activeDaysDelta: number;
  /** 현재 − 이전 (완료 횟수) */
  completionsDelta: number;
  /** 비교할 이전 기간에 기록이 하나라도 있었는지 */
  hasPreviousData: boolean;
};

export function buildHistoryPeriodCompare(input: {
  activeDays: number;
  totalCompletions: number;
  prevActiveDays: number;
  prevTotalCompletions: number;
}): HistoryPeriodCompare {
  const hasPreviousData = input.prevActiveDays > 0 || input.prevTotalCompletions > 0;
  return {
    activeDaysDelta: input.activeDays - input.prevActiveDays,
    completionsDelta: input.totalCompletions - input.prevTotalCompletions,
    hasPreviousData,
  };
}

/** 테스트·요약용 — 연속 활성일(그날 완료가 1회 이상) */
export function countActiveDayTrailingStreak(activeByDay: readonly boolean[]): number {
  return countTrailingStreak(activeByDay);
}
