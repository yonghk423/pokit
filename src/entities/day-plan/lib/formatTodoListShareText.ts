import { formatMinutesToHHmm } from './dayPlanTimeMath';
import type { DayPlanTodoItem } from '../model/types';

/** 단일 할 일(+세부) 본문 — 복사·공유용 */
export function formatTodoItemShareText(params: {
  item: DayPlanTodoItem;
  fallbackTitle: string;
}): string {
  const { item, fallbackTitle } = params;
  const title = item.what.trim() || fallbackTitle;
  const time = `${formatMinutesToHHmm(item.startMinutes)}–${formatMinutesToHHmm(item.endMinutes)}`;
  const lines: string[] = [`${item.isDone ? '☑' : '☐'} ${title} (${time})`];

  const subs = item.subItems ?? [];
  for (const sub of [...subs].sort((a, b) => a.order - b.order)) {
    const subTitle = sub.text.trim() || '—';
    lines.push(`  ${sub.isDone ? '☑' : '☐'} ${subTitle}`);
  }

  return lines.join('\n');
}

/** 투두 리스트 전체 복사·공유용 평문 */
export function formatTodoListShareText(params: {
  dateLabel: string;
  todos: readonly DayPlanTodoItem[];
  emptyLabel: string;
  fallbackTitle?: string;
}): string {
  const { dateLabel, todos, emptyLabel, fallbackTitle = '—' } = params;
  const lines: string[] = [`POKIT · ${dateLabel}`];

  if (todos.length === 0) {
    lines.push(emptyLabel);
    return lines.join('\n');
  }

  for (const item of todos) {
    lines.push(formatTodoItemShareText({ item, fallbackTitle }));
  }

  return lines.join('\n');
}
