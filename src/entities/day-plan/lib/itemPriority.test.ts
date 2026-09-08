import {
  cycleItemPriority,
  normalizeItemPriority,
} from './itemPriority';
import {
  cyclePriorityMarkColor,
  normalizePriorityMarkColor,
  resolveCategoryMarkColor,
} from './priorityMarkColor';

describe('itemPriority', () => {
  it('cycles high → medium → low', () => {
    expect(cycleItemPriority('high')).toBe('medium');
    expect(cycleItemPriority('medium')).toBe('low');
    expect(cycleItemPriority('low')).toBe('high');
  });

  it('defaults unknown values to medium', () => {
    expect(normalizeItemPriority('unknown')).toBe('medium');
  });
});

describe('priorityMarkColor', () => {
  it('cycles none → yellow → … → none', () => {
    expect(cyclePriorityMarkColor(null)).toBe('yellow');
    expect(cyclePriorityMarkColor('yellow')).toBe('mint');
    expect(cyclePriorityMarkColor('mint')).toBe('softGreen');
    expect(cyclePriorityMarkColor('lavender')).toBe(null);
  });

  it('accepts soft green / soft pink ids', () => {
    expect(normalizePriorityMarkColor('softGreen')).toBe('softGreen');
    expect(normalizePriorityMarkColor('softPink')).toBe('softPink');
  });

  it('migrates legacy high/low importance', () => {
    expect(normalizePriorityMarkColor('high')).toBe('pink');
    expect(normalizePriorityMarkColor('low')).toBe('yellow');
    expect(normalizePriorityMarkColor('medium')).toBe(null);
    expect(normalizePriorityMarkColor('mint')).toBe('mint');
  });

  it('resolves category mark from map', () => {
    expect(resolveCategoryMarkColor({}, 'water')).toBe(null);
    expect(resolveCategoryMarkColor({ water: 'pink' }, 'water')).toBe('pink');
  });
});
