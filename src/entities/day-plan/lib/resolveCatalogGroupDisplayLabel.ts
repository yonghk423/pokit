import { t, type I18nKey } from '@shared/lib/i18n';
import {
  BUILTIN_ABSTAIN_GROUP_KEY,
  BUILTIN_DAILY_LIFE_GROUP_KEY,
} from '@shared/lib/storage/defaultPriorityCatalog';
import {
  BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_NAMES,
  BUILTIN_PRESET_SCHEDULE_SET_IDS,
  isBuiltinExampleCustomFlowSet,
} from '@shared/lib/storage/defaultFixedFlowSets';

type LocaleMatchKey =
  | 'catalog.groupDailyLife'
  | 'catalog.groupAbstain'
  | 'fixedRoutine.exampleHealth'
  | 'fixedRoutine.exampleFocus'
  | 'fixedRoutine.presetDaily'
  | 'fixedRoutine.presetWeekend';

function matchesAnyLocaleDefault(value: string, key: LocaleMatchKey): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return (
    trimmed === t(key, 'ko') || trimmed === t(key, 'en') || trimmed === t(key, 'ja')
  );
}

/** 커스텀 카탈로그 그룹 — 내장 기본명이면 현재 로케일 라벨 */
export function resolveCustomCatalogGroupDisplayLabel(groupKey: string, storedLabel: string): string {
  if (groupKey === BUILTIN_DAILY_LIFE_GROUP_KEY) {
    if (matchesAnyLocaleDefault(storedLabel, 'catalog.groupDailyLife')) {
      return t('catalog.groupDailyLife');
    }
  }
  if (groupKey === BUILTIN_ABSTAIN_GROUP_KEY) {
    if (matchesAnyLocaleDefault(storedLabel, 'catalog.groupAbstain')) {
      return t('catalog.groupAbstain');
    }
  }
  return storedLabel.trim().length > 0 ? storedLabel.trim() : groupKey;
}

const PRESET_SCHEDULE_NAME_KEYS: Record<'set_daily' | 'set_weekend', I18nKey> = {
  set_daily: 'fixedRoutine.presetDaily',
  set_weekend: 'fixedRoutine.presetWeekend',
};

/** 나만의 루틴 세트 — 내장 프리셋·예시 기본명이면 현재 로케일 라벨 */
export function resolveFixedFlowSetDisplayName(set: { id: string; name: string }): string {
  if ((BUILTIN_PRESET_SCHEDULE_SET_IDS as readonly string[]).includes(set.id)) {
    const key = PRESET_SCHEDULE_NAME_KEYS[set.id as 'set_daily' | 'set_weekend'];
    if (key && matchesAnyLocaleDefault(set.name, key)) {
      return t(key);
    }
    const trimmed = set.name.trim();
    if (trimmed.length > 0) return trimmed;
    if (key) return t(key);
  }

  if (!isBuiltinExampleCustomFlowSet(set)) return set.name;
  if (set.id === 'set_example_health') {
    const ko = BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_NAMES.set_example_health;
    if (set.name === ko || matchesAnyLocaleDefault(set.name, 'fixedRoutine.exampleHealth')) {
      return t('fixedRoutine.exampleHealth');
    }
  }
  if (set.id === 'set_example_focus') {
    const ko = BUILTIN_EXAMPLE_CUSTOM_FLOW_SET_NAMES.set_example_focus;
    if (set.name === ko || matchesAnyLocaleDefault(set.name, 'fixedRoutine.exampleFocus')) {
      return t('fixedRoutine.exampleFocus');
    }
  }
  return set.name;
}
