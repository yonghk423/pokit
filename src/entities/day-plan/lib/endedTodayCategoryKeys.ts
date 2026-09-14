import { getLocalDateKey } from './localDateKey';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';

export function resolveEndedTodayCategoryKeys(
  endedKeys: readonly string[] | undefined,
  endedDateKey: string | undefined,
  today: string = getLocalDateKey(),
): string[] {
  if (!endedDateKey || endedDateKey !== today || !Array.isArray(endedKeys)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of endedKeys) {
    const key = raw.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function categoryKeysReferToSameRoutine(left: string, right: string): boolean {
  const a = left.trim();
  const b = right.trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const aBase = resolvePriorityRoutineCategoryKey(a);
  const bBase = resolvePriorityRoutineCategoryKey(b);
  return aBase === b || bBase === a || aBase === bBase;
}

export function isEndedTodayCategoryKey(
  categoryKey: string,
  endedKeys: readonly string[],
): boolean {
  const key = categoryKey.trim();
  if (!key) return false;
  return endedKeys.some((ended) => categoryKeysReferToSameRoutine(ended, key));
}

export function excludeEndedTodayCategoryKeys(
  keys: readonly string[],
  endedKeys: readonly string[],
): string[] {
  if (endedKeys.length === 0) return [...keys];
  return keys.filter((key) => !isEndedTodayCategoryKey(key, endedKeys));
}

export function dropReaddedEndedTodayKeys(
  endedKeys: readonly string[],
  presentKeys: readonly string[],
): string[] {
  if (endedKeys.length === 0) return [];
  return endedKeys.filter(
    (ended) => !presentKeys.some((present) => categoryKeysReferToSameRoutine(ended, present)),
  );
}
