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
};

export {
  DEFAULT_CUSTOM_FLOW_ACCENT_COLOR as DEFAULT_CUSTOM_FLOW_COLOR,
  DEFAULT_CUSTOM_FLOW_ICON,
} from '../customFlowAppearanceCatalog';

/** 신규 설치 시 자동 시드하지 않음 — 사용자가 직접 만든 customFlow만 사용 */
export const DEFAULT_BUILTIN_CUSTOM_GROUPS = [] as const;

export const DEFAULT_BUILTIN_CUSTOM_FLOWS: readonly BuiltinCustomFlowDef[] = [];

/** 제거된 기본 커스텀 플로우 — 히스토리·레거시 표시·마이그레이션용 */
export const LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS: readonly BuiltinCustomFlowDef[] = [
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
  if (LEGACY_BUILTIN_CUSTOM_FLOW_ICON_BY_ID[categoryKey]) {
    return LEGACY_BUILTIN_CUSTOM_FLOW_ICON_BY_ID[categoryKey];
  }
  return DEFAULT_CUSTOM_FLOW_ICON;
}

/** 기본·사용자 커스텀 플로우 강조색 — 저장값 → legacy builtin → 오렌지 */
export function resolveCustomFlowCatalogColor(categoryKey: string): string {
  const fromConfig = readStoredCustomFlowAccentColor(categoryKey);
  if (fromConfig) return fromConfig;
  if (LEGACY_BUILTIN_CUSTOM_FLOW_COLOR_BY_ID[categoryKey]) {
    return LEGACY_BUILTIN_CUSTOM_FLOW_COLOR_BY_ID[categoryKey];
  }
  return DEFAULT_CUSTOM_FLOW_ACCENT_COLOR;
}
