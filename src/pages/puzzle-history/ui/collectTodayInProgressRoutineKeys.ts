import { resolvePriorityRoutineCategoryKey } from '@entities/day-plan';

/**
 * 오늘 탭 담기에 있고 아직 완료하지 않은 루틴만.
 * (카탈로그 전체가 아니라 「지금 진행 중」인 항목)
 */
export function collectTodayInProgressRoutineKeys(
  priorityCategoryOrder: readonly string[],
  completedFocusCategoryKeys: readonly string[],
): string[] {
  /** 담기 완료 체크 — 정확 키만 (구간 키 `category@slot`은 부분 완료로 둠) */
  const completedExact = new Set(
    completedFocusCategoryKeys.map((k) => k.trim()).filter(Boolean),
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of priorityCategoryOrder) {
    const trimmed = raw.trim();
    const key = resolvePriorityRoutineCategoryKey(trimmed);
    if (!key || seen.has(key)) continue;
    if (completedExact.has(trimmed) || completedExact.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
