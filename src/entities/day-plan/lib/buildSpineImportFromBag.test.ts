import { buildSpineImportFromBag } from './buildSpineImportFromBag';
import type { DayPlanBlock } from '../model/types';

function spineBlock(categoryKey: string, start: number, end: number): DayPlanBlock {
  return {
    id: `spine-${categoryKey}`,
    title: categoryKey,
    category: categoryKey,
    categoryKey,
    startMinutes: start,
    endMinutes: end,
    order: 0,
    blockOrigin: 'spineTimeline',
  };
}

describe('buildSpineImportFromBag', () => {
  it('returns empty when bag is empty', () => {
    expect(
      buildSpineImportFromBag({
        categoryKeys: [],
        resolveTitle: (key) => key,
        priorityStart: '09:00',
        priorityEnd: '22:00',
        existingBlocks: [],
        nowMinutes: 9 * 60,
      }),
    ).toEqual([]);
  });

  it('skips categories already on spine timeline', () => {
    const result = buildSpineImportFromBag({
      categoryKeys: ['reading', 'work'],
      resolveTitle: (key) => (key === 'reading' ? '독서' : '업무'),
      priorityStart: '09:00',
      priorityEnd: '22:00',
      existingBlocks: [spineBlock('reading', 600, 630)],
      nowMinutes: 9 * 60,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.categoryKey).toBe('work');
  });

  it('places imported blocks sequentially inside focus window', () => {
    const result = buildSpineImportFromBag({
      categoryKeys: ['reading', 'work'],
      resolveTitle: (key) => (key === 'reading' ? '독서' : '업무'),
      priorityStart: '09:00',
      priorityEnd: '22:00',
      existingBlocks: [],
      nowMinutes: 10 * 60,
      defaultDurationMin: 30,
    });
    expect(result).toEqual([
      {
        categoryKey: 'reading',
        title: '독서',
        startMinutes: 10 * 60,
        endMinutes: 10 * 60 + 30,
      },
      {
        categoryKey: 'work',
        title: '업무',
        startMinutes: 10 * 60 + 30 + 5,
        endMinutes: 10 * 60 + 30 + 5 + 30,
      },
    ]);
  });
});
