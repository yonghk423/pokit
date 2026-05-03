export const StorageKeys = {
  routines: 'lockflow:routines',
  routineExecutions: 'lockflow:routine-executions',
  settings: 'lockflow:settings',
  dayPlan: 'lockflow:day-plan',
  /** 일별 완료 카테고리 횟수(통계 탭·히스토리) */
  dayPlanStatsHistory: 'lockflow:day-plan-stats-history',
  goalDetailSettings: 'lockflow:goal-detail-settings',
  /** 담기 탭 상단「내 고정 루틴」에 넣을 카테고리 키 순서(사용자 구성) */
  priorityCatalogFixedRoutines: 'lockflow:priority-catalog-fixed-routines',
  /** 첫 실행 하루 주기(시작·마무리 시각) 온보딩 완료 여부 */
  dailyRhythmOnboarding: 'lockflow:daily-rhythm-onboarding',
  /** 우선순위 완료 행 X(담기에서 빼기) 확인창 생략 여부 */
  priorityBagRemoveConfirmSkip: 'lockflow:priority-bag-remove-confirm-skip',
  /** 데이플랜 화면 드래프트(모드/시작·마무리/순서 등) */
  dayPlanDraft: 'lockflow:day-plan-draft',
  /** 사용자 정의 플로우(`customFlow:…`) 카탈로그 순서 */
  customFlowCatalog: 'lockflow:custom-flow-catalog',
  /** 사용자 정의 카탈로그 그룹(상위 카테고리) 라벨 목록 */
  customCatalogGroups: 'lockflow:custom-catalog-groups',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
