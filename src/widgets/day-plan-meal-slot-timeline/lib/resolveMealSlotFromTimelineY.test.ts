import { resolveMealSlotFromTimelineY } from './resolveMealSlotFromTimelineY';

describe('resolveMealSlotFromTimelineY', () => {
  const bounds = {
    dawn: { y: 0, height: 80 },
    morning: { y: 80, height: 60 },
    lunch: { y: 140, height: 100 },
    dinner: { y: 240, height: 90 },
    night: { y: 330, height: 70 },
  } as const;

  it('returns the section containing the pointer Y', () => {
    expect(resolveMealSlotFromTimelineY(30, bounds, 'morning')).toBe('dawn');
    expect(resolveMealSlotFromTimelineY(150, bounds, 'morning')).toBe('lunch');
  });

  it('falls back to the nearest section center when outside all bounds', () => {
    expect(resolveMealSlotFromTimelineY(500, bounds, 'morning')).toBe('night');
    expect(resolveMealSlotFromTimelineY(-10, bounds, 'morning')).toBe('dawn');
  });
});
