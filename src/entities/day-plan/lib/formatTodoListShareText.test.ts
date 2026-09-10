import {
  formatTodoItemShareText,
  formatTodoListShareText,
} from './formatTodoListShareText';
import type { DayPlanTodoItem } from '../model/types';

const sample: DayPlanTodoItem = {
  id: '1',
  what: '장보기',
  who: '',
  priority: 'medium',
  startMinutes: 60,
  endMinutes: 120,
  inProgress: false,
  isDone: false,
  order: 0,
  subItems: [
    { id: 's1', text: '우유', isDone: true, order: 0 },
    { id: 's2', text: '계란', isDone: false, order: 1 },
  ],
};

describe('formatTodoItemShareText', () => {
  it('formats one todo with sub items', () => {
    const text = formatTodoItemShareText({
      item: sample,
      fallbackTitle: '할 일',
    });
    expect(text).toContain('☐ 장보기 (01:00–02:00)');
    expect(text).toContain('☑ 우유');
    expect(text).toContain('☐ 계란');
  });
});

describe('formatTodoListShareText', () => {
  it('formats parent and sub items with checkboxes', () => {
    const text = formatTodoListShareText({
      dateLabel: '9월 10일',
      todos: [sample],
      emptyLabel: '비어 있음',
    });
    expect(text).toContain('POKIT · 9월 10일');
    expect(text).toContain('☐ 장보기');
    expect(text).toContain('☑ 우유');
    expect(text).toContain('☐ 계란');
  });
});
