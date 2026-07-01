import { buildPriorityMealSlotSections, inferMealSlotAfterFlatReorder, reorderFlatKeys } from './priorityMealSlotSections';
import { resolvePriorityMealSlot } from '@shared/lib/storage';

describe('buildPriorityMealSlotSections with custom schedule', () => {
  it('uses custom schedule for hint times and current slot', () => {
    const custom = {
      dawn: '05:00',
      morning: '08:00',
      lunch: '11:30',
      dinner: '18:00',
      night: '22:00',
    };
    const items = [{ key: 'water', label: '수분' }];
    const sections = buildPriorityMealSlotSections(items, {
      nowMin: 11 * 60 + 45,
      schedule: custom,
    });
    expect(sections[0]?.hintTime).toBe('08:00');
    expect(sections[0]?.isCurrent).toBe(false);
    const lunchSections = buildPriorityMealSlotSections(
      [{ key: 'deepwork', label: '딥 워크' }],
      { nowMin: 12 * 60, schedule: custom },
    );
    expect(lunchSections[0]?.slot).toBe('lunch');
    expect(lunchSections[0]?.isCurrent).toBe(true);
  });
});

describe('resolvePriorityMealSlot', () => {
  it('uses overrides when provided', () => {
    const overrides = new Map([['water', 'night' as const]]);
    expect(resolvePriorityMealSlot('water', 0, overrides)).toBe('night');
  });
});

describe('buildPriorityMealSlotSections order stability', () => {
  it('keeps custom item slot when completed items move to bottom in display order', () => {
    const customKey = 'custom:water-life';
    const orderIndexByKey = new Map([
      ['water', 0],
      [customKey, 1],
      ['deepwork', 2],
    ]);
    const displayItems = [
      { key: customKey, label: '물은 생명이다' },
      { key: 'deepwork', label: '딥 워크' },
      { key: 'water', label: '수분섭취' },
    ];
    const sections = buildPriorityMealSlotSections(displayItems, { orderIndexByKey });
    const morningKeys =
      sections.find((section) => section.slot === 'morning')?.items.map((item) => item.key) ?? [];
    const dawnKeys =
      sections.find((section) => section.slot === 'dawn')?.items.map((item) => item.key) ?? [];
    expect(morningKeys).toContain(customKey);
    expect(dawnKeys).not.toContain(customKey);
  });
});

describe('meal slot drag reorder helpers', () => {
  it('reorders flat keys and infers target slot from neighbors', () => {
    const keys = ['water', 'custom:life', 'deepwork'];
    const moved = reorderFlatKeys(keys, 0, 2);
    expect(moved).toEqual(['custom:life', 'deepwork', 'water']);
    const slotOfKey = (key: string) =>
      resolvePriorityMealSlot(
        key,
        key === 'water' ? 0 : key === 'custom:life' ? 1 : 2,
        new Map(),
      );
    expect(inferMealSlotAfterFlatReorder(moved, 'water', 2, slotOfKey)).toBe('lunch');
  });
});
