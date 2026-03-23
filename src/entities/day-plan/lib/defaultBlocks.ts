import type { DayPlanBlock } from '@entities/day-plan/model/types';

/**
 * 신규·빈 저장소 시 기본 타임라인.
 * 초기 온보딩에서는 사용자가 직접 리듬을 추가하도록 **빈 배열**을 사용한다.
 */
export const DEFAULT_DAY_PLAN_BLOCKS: DayPlanBlock[] = [];
