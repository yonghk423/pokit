import type { TodoPriority } from '../model/types';

export const ITEM_PRIORITY_CYCLE: readonly TodoPriority[] = ['high', 'medium', 'low'] as const;

export const ITEM_PRIORITY_META: Record<TodoPriority, { label: string; dot: string }> = {
  high: { label: '높음', dot: '#DC2626' },
  medium: { label: '보통', dot: '#5B8DEF' },
  low: { label: '낮음', dot: '#64748B' },
};

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
