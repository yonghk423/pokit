import {
  collectActiveFixedFlowCategoryKeys,
  type FixedFlowSetsState,
} from '@shared/lib/storage';

export type ResolveTodayFixedRoutineKeysOptions = {
  now?: Date;
  excludedKeys?: Iterable<string>;
};

/** 수동 그룹(오늘 적용) + 목표 상세 요일 자동 담기 — categoryKey 중복 없이 합친다. */
export function resolveTodayFixedRoutineKeys(
  flowSets: FixedFlowSetsState,
  options?: ResolveTodayFixedRoutineKeysOptions,
): string[] {
  const keys = collectActiveFixedFlowCategoryKeys(flowSets, options?.now ?? new Date());
  if (!options?.excludedKeys) return keys;
  const excluded = new Set(options.excludedKeys);
  return keys.filter((key) => !excluded.has(key));
}
