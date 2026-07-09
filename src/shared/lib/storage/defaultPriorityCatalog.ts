/** 앱 기본 담기 카탈로그 — 커스텀 그룹·플로우(신규 설치·초기화 시 자동 반영) */

import {
  DEFAULT_CUSTOM_FLOW_ACCENT_COLOR,
  DEFAULT_CUSTOM_FLOW_ICON,
  normalizeCustomFlowAccentColor,
  normalizeCustomFlowIcon,
} from '../customFlowAppearanceCatalog';
import { loadGoalDetailCategoryConfig } from './goalDetailSettingsStorage';

/** @deprecated 제거된 빌트인 그룹 키 — 마이그레이션·레거시 참조용 */
export const BUILTIN_CUSTOM_GROUP_HOBBY = 'customGroup:builtin_hobby' as const;
export const BUILTIN_CUSTOM_GROUP_FAMILY = 'customGroup:builtin_family' as const;
export const BUILTIN_CUSTOM_GROUP_MINDSET = 'customGroup:builtin_mindset' as const;

export type BuiltinCustomFlowDef = {
  id: string;
  groupKey: string;
  displayName: string;
  /** SF Symbol — 없으면 `person.fill` */
  icon: string;
  /** 집중 중 아이콘 강조색 — 없으면 기본 오렌지 */
  color: string;
  /** 루틴 한 줄 요약 — 시드 시 goal-detail에 저장 */
  summary?: string;
  /** 체크리스트 항목 문구 — 시드 시 goal-detail checklist로 저장 */
  checklistLabels?: readonly string[];
  /** 커스텀 플로우 템플릿 — 기본 checklist, 금지는 abstain, 알림은 reminder */
  templateKey?: 'checklist' | 'abstain' | 'reminder';
  /** `reminder` 템플릿 시드용 HH:mm 목록 */
  reminderTimes?: readonly string[];
};

/** @deprecated 제거됨 — 마이그레이션·히스토리 표시용 */
export const BUILTIN_INTERMITTENT_FASTING_FLOW_ID = 'customFlow:preset_intermittent_fasting' as const;

/** 일상 루틴 그룹 (`customFlow:builtin_*` purge 대상 아님) */
export const BUILTIN_DAILY_LIFE_GROUP_KEY = 'customGroup:preset_daily_life' as const;

/** 통합 체크리스트 프리셋 — 7개 개별 루틴으로 분리됨 */
export const LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID = 'customFlow:preset_daily_life' as const;

export const BUILTIN_DAILY_LIFE_FLOW_IDS = [
  'customFlow:preset_daily_bed',
  'customFlow:preset_daily_clean',
  'customFlow:preset_daily_laundry',
  'customFlow:preset_daily_wash',
  'customFlow:preset_daily_recycle',
  'customFlow:preset_daily_exercise',
  'customFlow:preset_daily_shopping',
] as const;

/** @deprecated — `BUILTIN_DAILY_LIFE_FLOW_IDS[0]` 등 개별 ID 사용 */
export const BUILTIN_DAILY_LIFE_FLOW_ID = BUILTIN_DAILY_LIFE_FLOW_IDS[0];

/** 금지 루틴 — 그룹·플로우 식별자 */
export const BUILTIN_ABSTAIN_GROUP_KEY = 'customGroup:preset_abstain' as const;
export const BUILTIN_ABSTAIN_FLOW_ID = 'customFlow:preset_abstain' as const;

/** @deprecated 제거됨 — 마이그레이션·히스토리 표시용 */
export const BUILTIN_GOOD_POSTURE_FLOW_ID = 'customFlow:preset_good_posture' as const;

/** 건강 루틴 — 스트레칭 */
export const BUILTIN_STRETCHING_FLOW_ID = 'customFlow:preset_stretching' as const;

/** 금지 루틴 기본 항목 */
export const ABSTAIN_CHECKLIST_LABELS = [
  '밤늦게 폰 보기',
  '과자·야식 먹기',
  'SNS 무한 스크롤',
  '충동 구매하기',
  '늦잠 자기',
] as const;

export {
  DEFAULT_CUSTOM_FLOW_ACCENT_COLOR as DEFAULT_CUSTOM_FLOW_COLOR,
  DEFAULT_CUSTOM_FLOW_ICON,
} from '../customFlowAppearanceCatalog';

/** @deprecated `health` 시스템 그룹으로 통합됨 — 마이그레이션용 */
export const BUILTIN_HEALTH_GROUP_KEY = 'customGroup:preset_health' as const;

/** 신규 설치 시 자동 시드되는 커스텀 그룹 */
export const DEFAULT_BUILTIN_CUSTOM_GROUPS = [
  { key: BUILTIN_DAILY_LIFE_GROUP_KEY, label: '일상 루틴' },
  { key: BUILTIN_ABSTAIN_GROUP_KEY, label: '금지 루틴' },
] as const;

export const DEFAULT_BUILTIN_CUSTOM_FLOWS: readonly BuiltinCustomFlowDef[] = [
  {
    id: BUILTIN_DAILY_LIFE_FLOW_IDS[0],
    groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY,
    displayName: '이불정리',
    icon: 'bed.double.fill',
    color: '#0d9488',
    summary: '아침에 이불을 정리해 하루를 가볍게 시작해요.',
    templateKey: 'checklist',
    checklistLabels: ['이불정리'],
  },
  {
    id: BUILTIN_DAILY_LIFE_FLOW_IDS[1],
    groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY,
    displayName: '청소하기',
    icon: 'sparkles',
    color: '#0891b2',
    summary: '방·거실 등 생활 공간을 간단히 정리해요.',
    templateKey: 'checklist',
    checklistLabels: ['청소하기'],
  },
  {
    id: BUILTIN_DAILY_LIFE_FLOW_IDS[2],
    groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY,
    displayName: '빨래하기',
    icon: 'washer.fill',
    color: '#6366f1',
    summary: '쌓인 빨래를 돌리거나 개어 정리해요.',
    templateKey: 'checklist',
    checklistLabels: ['빨래하기'],
  },
  {
    id: BUILTIN_DAILY_LIFE_FLOW_IDS[3],
    groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY,
    displayName: '세수하기',
    icon: 'hands.sparkles.fill',
    color: '#14b8a6',
    summary: '하루를 시작·마무리할 때 깨끗이 씻어요.',
    templateKey: 'checklist',
    checklistLabels: ['세수하기'],
  },
  {
    id: BUILTIN_DAILY_LIFE_FLOW_IDS[4],
    groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY,
    displayName: '분리수거',
    icon: 'arrow.3.trianglepath',
    color: '#22c55e',
    summary: '재활용·분리수거를 챙겨요.',
    templateKey: 'checklist',
    checklistLabels: ['분리수거'],
  },
  {
    id: BUILTIN_DAILY_LIFE_FLOW_IDS[5],
    groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY,
    displayName: '운동하기',
    icon: 'figure.run',
    color: '#ef4444',
    summary: '가벼운 스트레칭부터 유산소까지, 오늘 몸을 움직여요.',
    templateKey: 'checklist',
    checklistLabels: ['운동하기'],
  },
  {
    id: BUILTIN_DAILY_LIFE_FLOW_IDS[6],
    groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY,
    displayName: '쇼핑하기',
    icon: 'cart.fill',
    color: '#f59e0b',
    summary: '장보기·필요한 물건을 사러 나가요.',
    templateKey: 'checklist',
    checklistLabels: ['쇼핑하기'],
  },
  {
    id: BUILTIN_ABSTAIN_FLOW_ID,
    groupKey: BUILTIN_ABSTAIN_GROUP_KEY,
    displayName: '금지',
    icon: 'hand.raised.fill',
    color: '#dc2626',
    summary: '오늘 하지 말아야 할 것들을 지켰는지 확인해요.',
    checklistLabels: ABSTAIN_CHECKLIST_LABELS,
    templateKey: 'abstain',
  },
  {
    id: BUILTIN_STRETCHING_FLOW_ID,
    groupKey: 'health',
    displayName: '스트레칭',
    icon: 'figure.flexibility',
    color: '#14b8a6',
    summary: '몸을 풀고 가볍게 늘려 줘요.',
    templateKey: 'checklist',
    checklistLabels: ['스트레칭'],
  },
];

/** 제거된 기본 커스텀 플로우 — 히스토리·레거시 표시·마이그레이션용 */
export const LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS: readonly BuiltinCustomFlowDef[] = [
  {
    id: BUILTIN_INTERMITTENT_FASTING_FLOW_ID,
    groupKey: 'health',
    displayName: '간헐적 단식',
    icon: 'hourglass',
    color: '#a16207',
    summary: '정해 둔 식사 시간 창을 지키며 단식해요.',
  },
  {
    id: BUILTIN_GOOD_POSTURE_FLOW_ID,
    groupKey: 'health',
    displayName: '자세 바르게하기',
    icon: 'figure.stand',
    color: '#6366f1',
    summary: '정해 둔 시간마다 앉거나 서 있는 자세를 점검해요.',
  },
  { id: 'customFlow:builtin_hobby_draw', groupKey: BUILTIN_CUSTOM_GROUP_HOBBY, displayName: '드로잉 연습', icon: 'paintbrush.pointed.fill', color: '#a855f7' },
  { id: 'customFlow:builtin_hobby_guitar', groupKey: BUILTIN_CUSTOM_GROUP_HOBBY, displayName: '기타 연주', icon: 'guitars.fill', color: '#f59e0b' },
  { id: 'customFlow:builtin_hobby_photo', groupKey: BUILTIN_CUSTOM_GROUP_HOBBY, displayName: '사진 촬영', icon: 'camera.fill', color: '#0ea5e9' },
  { id: 'customFlow:builtin_hobby_cooking', groupKey: BUILTIN_CUSTOM_GROUP_HOBBY, displayName: '요리 실험', icon: 'frying.pan.fill', color: '#ea580c' },
  { id: 'customFlow:builtin_hobby_hiking', groupKey: BUILTIN_CUSTOM_GROUP_HOBBY, displayName: '등산·트레킹', icon: 'figure.hiking', color: '#10b981' },
  { id: 'customFlow:builtin_family_call', groupKey: BUILTIN_CUSTOM_GROUP_FAMILY, displayName: '가족 통화', icon: 'phone.fill', color: '#3b82f6' },
  { id: 'customFlow:builtin_family_friends', groupKey: BUILTIN_CUSTOM_GROUP_FAMILY, displayName: '친구 만남', icon: 'person.2.fill', color: '#ec4899' },
  { id: 'customFlow:builtin_family_parents', groupKey: BUILTIN_CUSTOM_GROUP_FAMILY, displayName: '부모님 안부', icon: 'heart.fill', color: '#f43f5e' },
  { id: 'customFlow:builtin_family_community', groupKey: BUILTIN_CUSTOM_GROUP_FAMILY, displayName: '커뮤니티 참여', icon: 'person.3.fill', color: '#6366f1' },
  { id: 'customFlow:builtin_family_partner', groupKey: BUILTIN_CUSTOM_GROUP_FAMILY, displayName: '연인·배우자 시간', icon: 'heart.circle.fill', color: '#e11d48' },
  { id: 'customFlow:builtin_mind_gratitude', groupKey: BUILTIN_CUSTOM_GROUP_MINDSET, displayName: '감사 일기', icon: 'heart.text.square.fill', color: '#14b8a6' },
  { id: 'customFlow:builtin_mind_pledge', groupKey: BUILTIN_CUSTOM_GROUP_MINDSET, displayName: '오늘의 다짐', icon: 'flag.fill', color: '#8b5cf6' },
  { id: 'customFlow:builtin_mind_nap', groupKey: BUILTIN_CUSTOM_GROUP_MINDSET, displayName: '낮잠·파워냅', icon: 'moon.zzz.fill', color: '#64748b' },
  { id: 'customFlow:builtin_mind_music', groupKey: BUILTIN_CUSTOM_GROUP_MINDSET, displayName: '음악 감상', icon: 'headphones', color: '#d946ef' },
  { id: 'customFlow:builtin_mind_detox', groupKey: BUILTIN_CUSTOM_GROUP_MINDSET, displayName: '디지털 디톡스', icon: 'leaf.fill', color: '#22c55e' },
];

export function isRemovedBuiltinCustomFlowId(id: string): boolean {
  return id.startsWith('customFlow:builtin_');
}

export function isRemovedBuiltinCustomGroupKey(key: string): boolean {
  return key.startsWith('customGroup:builtin_');
}

const ACTIVE_BUILTIN_CUSTOM_FLOW_ICON_BY_ID = Object.fromEntries(
  DEFAULT_BUILTIN_CUSTOM_FLOWS.map((flow) => [flow.id, flow.icon]),
) as Record<string, string>;

const ACTIVE_BUILTIN_CUSTOM_FLOW_COLOR_BY_ID = Object.fromEntries(
  DEFAULT_BUILTIN_CUSTOM_FLOWS.map((flow) => [flow.id, flow.color]),
) as Record<string, string>;

const LEGACY_BUILTIN_CUSTOM_FLOW_ICON_BY_ID = Object.fromEntries(
  LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS.map((flow) => [flow.id, flow.icon]),
) as Record<string, string>;

const LEGACY_BUILTIN_CUSTOM_FLOW_COLOR_BY_ID = Object.fromEntries(
  LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS.map((flow) => [flow.id, flow.color]),
) as Record<string, string>;

function readStoredCustomFlowIcon(categoryKey: string): string | undefined {
  const icon = normalizeCustomFlowIcon(
    (loadGoalDetailCategoryConfig(categoryKey) as { icon?: unknown } | null)?.icon,
  );
  return icon;
}

function readStoredCustomFlowAccentColor(categoryKey: string): string | undefined {
  const accentColor = normalizeCustomFlowAccentColor(
    (loadGoalDetailCategoryConfig(categoryKey) as { accentColor?: unknown } | null)?.accentColor,
  );
  return accentColor;
}

/** 기본·사용자 커스텀 플로우 아이콘 — 저장값 → legacy builtin → `person.fill` */
export function resolveCustomFlowCatalogIcon(categoryKey: string): string {
  const fromConfig = readStoredCustomFlowIcon(categoryKey);
  if (fromConfig) return fromConfig;
  if (ACTIVE_BUILTIN_CUSTOM_FLOW_ICON_BY_ID[categoryKey]) {
    return ACTIVE_BUILTIN_CUSTOM_FLOW_ICON_BY_ID[categoryKey];
  }
  if (LEGACY_BUILTIN_CUSTOM_FLOW_ICON_BY_ID[categoryKey]) {
    return LEGACY_BUILTIN_CUSTOM_FLOW_ICON_BY_ID[categoryKey];
  }
  return DEFAULT_CUSTOM_FLOW_ICON;
}

/** 기본·사용자 커스텀 플로우 강조색 — 저장값 → legacy builtin → 오렌지 */
export function resolveCustomFlowCatalogColor(categoryKey: string): string {
  const fromConfig = readStoredCustomFlowAccentColor(categoryKey);
  if (fromConfig) return fromConfig;
  if (ACTIVE_BUILTIN_CUSTOM_FLOW_COLOR_BY_ID[categoryKey]) {
    return ACTIVE_BUILTIN_CUSTOM_FLOW_COLOR_BY_ID[categoryKey];
  }
  if (LEGACY_BUILTIN_CUSTOM_FLOW_COLOR_BY_ID[categoryKey]) {
    return LEGACY_BUILTIN_CUSTOM_FLOW_COLOR_BY_ID[categoryKey];
  }
  return DEFAULT_CUSTOM_FLOW_ACCENT_COLOR;
}
