import { getAppLocale, t } from '@shared/lib/i18n';
import { getBuiltinFlowDefaultLabel, getBuiltinFlowKoDefaultLabel } from '@shared/lib/i18n/lib/builtinFlowLabels';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { defaultCustomFlowPickerLabel, isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { getInitialOtherDataConfig, normalizeOtherDetailConfig } from './goalCategorySessionConfig';

/** 저장소 키가 그대로 노출된 자동 생성 라벨인지 — 편집·표시 폴백에서 제외 */
export function isInternalAutoRoutineLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  if (
    trimmed === '루틴' ||
    trimmed === t('category.routineFallback', 'en') ||
    trimmed === t('category.routineFallback', 'ja')
  ) {
    return true;
  }
  if (/^루틴 preset_/i.test(trimmed)) return true;
  if (/^루틴 [a-f0-9_-]{4,}$/i.test(trimmed)) return true;
  return false;
}

function isBuiltinLocalizedDefaultName(categoryKey: string, displayName: string): boolean {
  if (!displayName) return false;
  const names = [
    getBuiltinFlowDefaultLabel(categoryKey, 'ko'),
    getBuiltinFlowDefaultLabel(categoryKey, 'en'),
    getBuiltinFlowDefaultLabel(categoryKey, 'ja'),
  ];
  return names.some((name) => name != null && name === displayName);
}

/**
 * 내장 루틴: 저장명이 ko/en/ja 기본값이면 현재 로케일 기본명으로 바꾼다.
 * 사용자가 직접 지은 이름은 그대로 둔다.
 */
export function resolveCustomFlowDisplayLabel(categoryKey: string, displayName: string): string {
  const locale = getAppLocale();
  const localizedDefault = getBuiltinFlowDefaultLabel(categoryKey, locale);

  if (displayName.length > 0) {
    if (localizedDefault && isBuiltinLocalizedDefaultName(categoryKey, displayName)) {
      return localizedDefault;
    }
    return displayName;
  }

  if (localizedDefault) return localizedDefault;
  return getBuiltinFlowKoDefaultLabel(categoryKey) ?? defaultCustomFlowPickerLabel(categoryKey);
}

/** `customFlow:` 키 → 담기·목표 상세에 저장된 사용자 표시명 */
export function resolveCustomFlowCategoryLabelKo(categoryKey: string): string {
  if (!isCustomFlowCategoryKey(categoryKey)) return categoryKey;

  const raw = loadGoalDetailCategoryConfig(categoryKey);
  const cfg = normalizeOtherDetailConfig(raw ?? getInitialOtherDataConfig());
  return resolveCustomFlowDisplayLabel(categoryKey, cfg.displayName.trim());
}
