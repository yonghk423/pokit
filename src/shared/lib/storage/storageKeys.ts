export const StorageKeys = {
  settings: 'pokit:settings',
  dayPlan: 'pokit:day-plan',
  /** 히스토리 일별 지표(완료 수/카테고리별 달성) */
  historyDailyStats: 'pokit:history-daily-stats',
  /** 히스토리 메타(최근 계산 시각/버전 등) */
  historyMeta: 'pokit:history-meta',
  goalDetailSettings: 'pokit:goal-detail-settings',
  /** 담기 탭 상단「내 고정 루틴」에 넣을 카테고리 키 순서(사용자 구성) */
  priorityCatalogFixedRoutines: 'pokit:priority-catalog-fixed-routines',
  /** 고정 플로우 세트(여러 세트/활성 세트/세트별 항목) */
  fixedFlowSets: 'pokit:fixed-flow-sets',
  /** 첫 실행 하루 주기(시작·마무리 시각) 온보딩 완료 여부 */
  dailyRhythmOnboarding: 'pokit:daily-rhythm-onboarding',
  /** 사용 설명서(가이드북) 열람 여부 */
  guideBook: 'pokit:guide-book',
  /** 첫 실행 서비스 소개(슬라이드) 열람 여부 */
  welcomeIntro: 'pokit:welcome-intro',
  /** 「포킷 일주일 사용해보기」를 오늘 담기에 시드했는지 */
  pokitWeekTourSeeded: 'pokit:pokit-week-tour-seeded',
  /** 투어 첫 포스트잇(1/7)을 닫았는지 — 체크만 되고 시트가 사라진 상태 복구용 */
  pokitWeekTourFirstTipSeen: 'pokit:pokit-week-tour-first-tip-seen',
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
  /** 마지막으로 확인한 앱 마케팅 버전(업데이트 안내용) */
  lastSeenAppVersion: 'pokit:last-seen-app-version',
  /** 스토어 업데이트 유도 모달을 닫은 최신 버전 */
  updateAvailableDismissedVersion: 'pokit:update-available-dismissed-version',
  /** 루틴 목록 포스트잇 카드 면 색 */
  postItFaceColor: 'pokit:post-it-face-color',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

/** `lockflow:*` → `pokit:*` 1회 마이그레이션 완료 플래그 */
export const STORAGE_MIGRATION_FLAG_KEY = 'pokit:storage-migration-v1';

/** 레거시 AsyncStorage 키 (마이그레이션 전용) */
export const LegacyStorageKeys: Record<keyof typeof StorageKeys, string> = {
  settings: 'lockflow:settings',
  dayPlan: 'lockflow:day-plan',
  historyDailyStats: 'lockflow:history-daily-stats',
  historyMeta: 'lockflow:history-meta',
  goalDetailSettings: 'lockflow:goal-detail-settings',
  priorityCatalogFixedRoutines: 'lockflow:priority-catalog-fixed-routines',
  fixedFlowSets: 'lockflow:fixed-flow-sets',
  dailyRhythmOnboarding: 'lockflow:daily-rhythm-onboarding',
  guideBook: 'lockflow:guide-book',
  welcomeIntro: 'lockflow:welcome-intro',
  pokitWeekTourSeeded: 'lockflow:pokit-week-tour-seeded',
  pokitWeekTourFirstTipSeen: 'lockflow:pokit-week-tour-first-tip-seen',
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
  lastSeenAppVersion: 'lockflow:last-seen-app-version',
  updateAvailableDismissedVersion: 'lockflow:update-available-dismissed-version',
  postItFaceColor: 'lockflow:post-it-face-color',
};
