import { getAppLocale, t } from '@shared/lib/i18n';
import { getBuiltinFlowDefaultLabel, getBuiltinFlowKoDefaultLabel } from '@shared/lib/i18n/lib/builtinFlowLabels';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { defaultCustomFlowPickerLabel, isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { getInitialOtherDataConfig, normalizeOtherDetailConfig } from './goalCategorySessionConfig';

/** 저장소 키가 그대로 노출된 자동 생성 라벨인지 — 편집·표시 폴백에서 제외 */
export function isInternalAutoRoutineLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  if (trimmed === '루틴' || trimmed === t('category.routineFallback', 'en')) return true;
  if (/^루틴 preset_/i.test(trimmed)) return true;
  if (/^루틴 [a-f0-9_-]{4,}$/i.test(trimmed)) return true;
  return false;
}

function resolveStoredOrBuiltinLabel(categoryKey: string, displayName: string): string {
  const locale = getAppLocale();
  const koDefault = getBuiltinFlowKoDefaultLabel(categoryKey);
  const localizedDefault = getBuiltinFlowDefaultLabel(categoryKey, locale);

  if (displayName.length > 0) {
    if (koDefault && displayName === koDefault && localizedDefault && locale === 'en') {
      return localizedDefault;
    }
    return displayName;
  }

  if (localizedDefault) return localizedDefault;
  return defaultCustomFlowPickerLabel(categoryKey);
}

/** `customFlow:` 키 → 담기·목표 상세에 저장된 사용자 표시명 */
export function resolveCustomFlowCategoryLabelKo(categoryKey: string): string {
  if (!isCustomFlowCategoryKey(categoryKey)) return categoryKey;

  const raw = loadGoalDetailCategoryConfig(categoryKey);
  const cfg = normalizeOtherDetailConfig(raw ?? getInitialOtherDataConfig());
  return resolveStoredOrBuiltinLabel(categoryKey, cfg.displayName.trim());
}
