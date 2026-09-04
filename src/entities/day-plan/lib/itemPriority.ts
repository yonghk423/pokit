import type { TodoPriority } from '../model/types';

export const ITEM_PRIORITY_CYCLE: readonly TodoPriority[] = ['high', 'medium', 'low'] as const;

export const ITEM_PRIORITY_META: Record<TodoPriority, { label: string; dot: string }> = {
  high: { label: '높음', dot: '#DC2626' },
  medium: { label: '보통', dot: '#5B8DEF' },
  low: { label: '낮음', dot: '#64748B' },
};

/** 우선순위 → 행 배경 워시 (보통은 무색) */
export function priorityRowWash(priority: TodoPriority, isDark: boolean): string | undefined {
  switch (priority) {
    case 'high':
      return isDark ? 'rgba(220, 38, 38, 0.22)' : 'rgba(220, 38, 38, 0.12)';
    case 'low':
      // slate — 연하면 크림 배경에서 거의 안 보이므로 대비를 올린다
      return isDark ? 'rgba(148, 163, 184, 0.32)' : 'rgba(100, 116, 139, 0.22)';
    case 'medium':
    default:
      return undefined;
  }
}

export function normalizeItemPriority(raw: unknown): TodoPriority {
  return raw === 'high' || raw === 'low' ? raw : 'medium';
}

export function cycleItemPriority(current: TodoPriority): TodoPriority {
  const idx = ITEM_PRIORITY_CYCLE.indexOf(current);
  return ITEM_PRIORITY_CYCLE[(idx + 1) % ITEM_PRIORITY_CYCLE.length] ?? 'medium';
}

export function resolveCategoryImportance(
  map: Readonly<Record<string, TodoPriority>>,
  categoryKey: string,
): TodoPriority {
  return normalizeItemPriority(map[categoryKey]);
}
