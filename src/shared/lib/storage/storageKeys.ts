export const StorageKeys = {
  routines: 'lockflow:routines',
  routineExecutions: 'lockflow:routine-executions',
  settings: 'lockflow:settings',
  dayPlan: 'lockflow:day-plan',
  goalDetailSettings: 'lockflow:goal-detail-settings',
  /** 담기 탭 상단「내 고정 루틴」에 넣을 카테고리 키 순서(사용자 구성) */
  priorityCatalogFixedRoutines: 'lockflow:priority-catalog-fixed-routines',
  /** 첫 실행 하루 주기(시작·마무리 시각) 온보딩 완료 여부 */
  dailyRhythmOnboarding: 'lockflow:daily-rhythm-onboarding',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
