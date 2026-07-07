/** 오늘 탭 레이아웃 모드 — 히스토리 기록 단위 */
export type RoutineHistoryLayoutMode = 'bag' | 'sections' | 'spine';

export const ROUTINE_HISTORY_LAYOUT_MODES: readonly RoutineHistoryLayoutMode[] = [
  'bag',
  'sections',
  'spine',
] as const;

const LAYOUT_PREFIX = /^(bag|sections|spine):/;

export const ROUTINE_HISTORY_LAYOUT_META: Record<
  RoutineHistoryLayoutMode,
  { icon: string; labelKo: string }
> = {
  bag: { icon: 'list.bullet.rectangle', labelKo: '전체' },
  sections: { icon: 'sun.horizon.fill', labelKo: '시간대별' },
  spine: { icon: 'clock', labelKo: '타임라인' },
};

export function buildRoutineHistoryRecordKey(
  categoryKey: string,
  layoutMode: RoutineHistoryLayoutMode,
): string {
  const base = categoryKey.trim();
  if (!base) return `${layoutMode}:`;
  return `${layoutMode}:${base}`;
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

/** 레거시 `reading` → `bag:reading` */
export function normalizeHistoryRecordKey(recordKey: string): string {
  const trimmed = recordKey.trim();
  if (!trimmed) return trimmed;
  const parsed = parseRoutineHistoryRecordKey(trimmed);
  return buildRoutineHistoryRecordKey(parsed.categoryKey, parsed.layoutMode);
}

export function resolveDraftLayoutMode(input: {
  prioritySpineLayoutEnabled: boolean;
  priorityMealSlotLayoutEnabled: boolean;
}): RoutineHistoryLayoutMode {
  if (input.prioritySpineLayoutEnabled) return 'spine';
  if (input.priorityMealSlotLayoutEnabled) return 'sections';
  return 'bag';
}
