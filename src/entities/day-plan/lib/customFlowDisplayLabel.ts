import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';
import { LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS } from '@shared/lib/storage/defaultPriorityCatalog';

import { defaultCustomFlowPickerLabel, isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { getInitialOtherDataConfig, normalizeOtherDetailConfig } from './goalCategorySessionConfig';

const BUILTIN_CUSTOM_FLOW_LABEL_BY_ID = Object.fromEntries(
  LEGACY_REMOVED_BUILTIN_CUSTOM_FLOWS.map((flow) => [flow.id, flow.displayName]),
) as Record<string, string>;

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
