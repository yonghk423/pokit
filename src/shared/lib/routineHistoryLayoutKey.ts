/** 오늘 탭 레이아웃 모드 — 일정 UI 전용 (히스토리 기록 단위와 분리) */
export type RoutineHistoryLayoutMode = 'bag' | 'sections' | 'spine';

export const ROUTINE_HISTORY_LAYOUT_MODES: readonly RoutineHistoryLayoutMode[] = [
  'bag',
  'sections',
  'spine',
] as const;

const LAYOUT_PREFIX = /^(bag|sections|spine):/;

/** 히스토리·완료 추적에 쓰는 카테고리 키 (레이아웃 접두사 제거) */
export function buildRoutineHistoryRecordKey(categoryKey: string): string {
  return parseRoutineHistoryRecordKey(categoryKey).categoryKey;
}

export function parseRoutineHistoryRecordKey(recordKey: string): {
  categoryKey: string;
  layoutMode: RoutineHistoryLayoutMode;
} {
  const trimmed = recordKey.trim();
  const match = trimmed.match(LAYOUT_PREFIX);
  if (match) {
    const layoutMode = match[1] as RoutineHistoryLayoutMode;
    return {
      layoutMode,
      categoryKey: trimmed.slice(layoutMode.length + 1),
    };
  }
  return { categoryKey: trimmed, layoutMode: 'bag' };
}

/** 레거시 `bag:reading` → `reading` */
export function normalizeHistoryRecordKey(recordKey: string): string {
  return parseRoutineHistoryRecordKey(recordKey.trim()).categoryKey;
}

export function resolveDraftLayoutMode(input: {
  prioritySpineLayoutEnabled: boolean;
  priorityMealSlotLayoutEnabled: boolean;
}): RoutineHistoryLayoutMode {
  if (input.prioritySpineLayoutEnabled) return 'spine';
  if (input.priorityMealSlotLayoutEnabled) return 'sections';
  return 'bag';
}
