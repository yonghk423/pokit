export const StorageKeys = {
  settings: 'pokit:settings',
  dayPlan: 'pokit:day-plan',
  /** 히스토리 일별 지표(집중 시간/완료 수/카테고리 분포) */
  historyDailyStats: 'pokit:history-daily-stats',
  /** 배지/마일스톤 달성 내역 */
  historyAchievements: 'pokit:history-achievements',
  /** 히스토리 메타(최근 계산 시각/버전 등) */
  historyMeta: 'pokit:history-meta',
  goalDetailSettings: 'pokit:goal-detail-settings',
  /** 담기 탭 상단「내 고정 루틴」에 넣을 카테고리 키 순서(사용자 구성) */
  priorityCatalogFixedRoutines: 'pokit:priority-catalog-fixed-routines',
  /** 고정 플로우 세트(여러 세트/활성 세트/세트별 항목) */
  fixedFlowSets: 'pokit:fixed-flow-sets',
  /** 첫 실행 하루 주기(시작·마무리 시각) 온보딩 완료 여부 */
  dailyRhythmOnboarding: 'pokit:daily-rhythm-onboarding',
  /** 우선순위 완료 행 X(담기에서 빼기) 확인창 생략 여부 */
  priorityBagRemoveConfirmSkip: 'pokit:priority-bag-remove-confirm-skip',
  /** 데이플랜 화면 드래프트(모드/시작·마무리/순서 등) */
  dayPlanDraft: 'pokit:day-plan-draft',
  /** 투두 리스트 모드 — 날짜별 할 일 표 */
  dayPlanTodos: 'pokit:day-plan-todos',
  /** 위클리·먼슬리 목표 텍스트(주 시작일·연-월 키) */
  horizonGoals: 'pokit:horizon-goals',
  /** 위클리·먼슬리 기간 완료 기록(통계 목록) */
  horizonCompletions: 'pokit:horizon-completions',
  /** 위클리 화면 — 요일별 간단 메모 (`YYYY-MM-DD` → 텍스트) */
  horizonWeeklyDayMemos: 'pokit:horizon-weekly-day-memos',
  /** 사용자 정의 플로우(`customFlow:…`) 카탈로그 순서 */
  customFlowCatalog: 'pokit:custom-flow-catalog',
  /** 사용자 정의 카탈로그 그룹(상위 카테고리) 라벨 목록 */
  customCatalogGroups: 'pokit:custom-catalog-groups',
  /** 표준 카탈로그 키의 상위 묶음 재배치(기본 그룹 덮어쓰기) */
  standardCatalogGroupOverrides: 'pokit:standard-catalog-group-overrides',
  /** 시스템 상위 묶음(건강·생산성) 제목·설명 사용자 편집 */
  systemCatalogGroupMeta: 'pokit:system-catalog-group-meta',
  /** 담기 화면에서 숨긴 상위 묶음 */
  dismissedCatalogGroups: 'pokit:dismissed-catalog-groups',
  /** 담기 목록에서 숨긴 표준 카테고리 */
  hiddenStandardCatalogKeys: 'pokit:hidden-standard-catalog-keys',
  /** 데일리 시간대 구간(새벽·아침·점심·저녁·밤) 시작 시각 */
  dayMealSlotSchedule: 'pokit:day-meal-slot-schedule',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

/** `lockflow:*` → `pokit:*` 1회 마이그레이션 완료 플래그 */
export const STORAGE_MIGRATION_FLAG_KEY = 'pokit:storage-migration-v1';

/** 레거시 AsyncStorage 키 (마이그레이션 전용) */
export const LegacyStorageKeys: Record<keyof typeof StorageKeys, string> = {
  settings: 'lockflow:settings',
  dayPlan: 'lockflow:day-plan',
  historyDailyStats: 'lockflow:history-daily-stats',
  historyAchievements: 'lockflow:history-achievements',
  historyMeta: 'lockflow:history-meta',
  goalDetailSettings: 'lockflow:goal-detail-settings',
  priorityCatalogFixedRoutines: 'lockflow:priority-catalog-fixed-routines',
  fixedFlowSets: 'lockflow:fixed-flow-sets',
  dailyRhythmOnboarding: 'lockflow:daily-rhythm-onboarding',
  priorityBagRemoveConfirmSkip: 'lockflow:priority-bag-remove-confirm-skip',
  dayPlanDraft: 'lockflow:day-plan-draft',
  dayPlanTodos: 'lockflow:day-plan-todos',
  horizonGoals: 'lockflow:horizon-goals',
  horizonCompletions: 'lockflow:horizon-completions',
  horizonWeeklyDayMemos: 'lockflow:horizon-weekly-day-memos',
  customFlowCatalog: 'lockflow:custom-flow-catalog',
  customCatalogGroups: 'lockflow:custom-catalog-groups',
  standardCatalogGroupOverrides: 'lockflow:standard-catalog-group-overrides',
  systemCatalogGroupMeta: 'lockflow:system-catalog-group-meta',
  dismissedCatalogGroups: 'lockflow:dismissed-catalog-groups',
  hiddenStandardCatalogKeys: 'lockflow:hidden-standard-catalog-keys',
  dayMealSlotSchedule: 'lockflow:day-meal-slot-schedule',
};
