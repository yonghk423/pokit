import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';
import {
  DEFAULT_BUILTIN_CUSTOM_FLOWS,
  LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS,
} from '@shared/lib/storage/defaultPriorityCatalog';

import { defaultCustomFlowPickerLabel, isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { getInitialOtherDataConfig, normalizeOtherDetailConfig } from './goalCategorySessionConfig';

const BUILTIN_CUSTOM_FLOW_LABEL_BY_ID = Object.fromEntries([
  ...LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS.map((flow) => [flow.id, flow.displayName]),
  ...DEFAULT_BUILTIN_CUSTOM_FLOWS.map((flow) => [flow.id, flow.displayName]),
]) as Record<string, string>;

/** 저장소 키가 그대로 노출된 자동 생성 라벨인지 — 편집·표시 폴백에서 제외 */
export function isInternalAutoRoutineLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return false;
  if (t === '루틴') return true;
  if (/^루틴 preset_/i.test(t)) return true;
  if (/^루틴 [a-f0-9_-]{4,}$/i.test(t)) return true;
  return false;
}

/** `customFlow:` 키 → 담기·목표 상세에 저장된 사용자 표시명 */
export function resolveCustomFlowCategoryLabelKo(categoryKey: string): string {
  if (!isCustomFlowCategoryKey(categoryKey)) return categoryKey;

  const raw = loadGoalDetailCategoryConfig(categoryKey);
  const cfg = normalizeOtherDetailConfig(raw ?? getInitialOtherDataConfig());
  const displayName = cfg.displayName.trim();
  if (displayName.length > 0) return displayName;

  return (
    BUILTIN_CUSTOM_FLOW_LABEL_BY_ID[categoryKey] ?? defaultCustomFlowPickerLabel(categoryKey)
  );
}
