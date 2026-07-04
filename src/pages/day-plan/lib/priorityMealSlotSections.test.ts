import {
  buildDefaultPriorityMealSlotOverrides,
  buildEmptyPriorityMealSlotSections,
  buildPriorityMealSlotSections,
  hasExplicitMealSlotAssignments,
  inferMealSlotAfterFlatReorder,
  listPriorityItemsForMealSlotAssignmentSheet,
  listUnslottedPriorityItems,
  reorderFlatKeys,
  splitPriorityMealSlotSections,
} from './priorityMealSlotSections';
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

describe('buildEmptyPriorityMealSlotSections', () => {
  it('returns all day slots with empty items', () => {
    const sections = buildEmptyPriorityMealSlotSections();
    expect(sections).toHaveLength(5);
    expect(sections.map((section) => section.slot)).toEqual([
      'dawn',
      'morning',
      'lunch',
      'dinner',
      'night',
    ]);
    expect(sections.every((section) => section.items.length === 0)).toBe(true);
  });
});

describe('listUnslottedPriorityItems', () => {
  it('returns only items without explicit slot override', () => {
    const items = [{ key: 'reading' }, { key: 'water' }];
    const overrides = new Map([['reading', 'morning' as const]]);
    expect(listUnslottedPriorityItems(items, overrides).map((item) => item.key)).toEqual([
      'water',
    ]);
  });
});

describe('listPriorityItemsForMealSlotAssignmentSheet', () => {
  it('returns all items when only some have explicit section assignments', () => {
    const items = [
      { key: 'meditation' },
      { key: 'stretching' },
      { key: 'drawing' },
    ];
    const overrides = new Map([
      ['meditation', ['morning'] as const],
      ['stretching', ['dinner'] as const],
    ]);
    expect(
      listPriorityItemsForMealSlotAssignmentSheet(items, overrides).map((item) => item.key),
    ).toEqual(['meditation', 'stretching', 'drawing']);
  });

  it('returns only unslotted items when none or all are assigned', () => {
    const items = [{ key: 'reading' }, { key: 'water' }];
    const noneAssigned = new Map<string, readonly ['morning']>();
    expect(
      listPriorityItemsForMealSlotAssignmentSheet(items, noneAssigned).map((item) => item.key),
    ).toEqual(['reading', 'water']);

    const allAssigned = new Map([
      ['reading', ['morning'] as const],
      ['water', ['lunch'] as const],
    ]);
    expect(listPriorityItemsForMealSlotAssignmentSheet(items, allAssigned)).toEqual([]);
  });
});

describe('buildDefaultPriorityMealSlotOverrides', () => {
  it('fills only items without existing override', () => {
    const items = [
      { key: 'water', label: '수분' },
      { key: 'reading', label: '독서' },
    ];
    const defaults = buildDefaultPriorityMealSlotOverrides(items, {
      existingOverrides: new Map([['water', 'night' as const]]),
    });
    expect(defaults).toEqual({ reading: 'morning' });
  });
});

describe('splitPriorityMealSlotSections includeEmptySections', () => {
  it('keeps all day slots when includeEmptySections is true', () => {
    const items = [{ key: 'medicine', label: '약 복용' }];
    const overrides = new Map([['medicine', 'dawn' as const]]);
    const { sections } = splitPriorityMealSlotSections(items, {
      mealSlotOverrides: overrides,
      explicitSlotsOnly: true,
      includeEmptySections: true,
    });
    expect(sections).toHaveLength(5);
    expect(sections.find((section) => section.slot === 'dawn')?.items.map((item) => item.key)).toEqual([
      'medicine',
    ]);
    expect(sections.find((section) => section.slot === 'morning')?.items).toEqual([]);
  });
});

describe('splitPriorityMealSlotSections explicit slots only', () => {
  it('keeps items without explicit override in unslotted list', () => {
    const items = [
      { key: 'water', label: '수분' },
      { key: 'reading', label: '독서' },
    ];
    const overrides = new Map([['reading', 'morning' as const]]);
    const { sections, unslottedItems } = splitPriorityMealSlotSections(items, {
      mealSlotOverrides: overrides,
      explicitSlotsOnly: true,
    });
    expect(sections).toHaveLength(1);
    expect(sections[0]?.slot).toBe('morning');
    expect(sections[0]?.items.map((item) => item.key)).toEqual(['reading']);
    expect(unslottedItems.map((item) => item.key)).toEqual(['water']);
  });

  it('still buckets items without override when includeEmptySections layout is active', () => {
    const items = [
      { key: 'water', label: '수분' },
      { key: 'reading', label: '독서' },
    ];
    const overrides = new Map([['reading', 'morning' as const]]);
    const { sections, unslottedItems } = splitPriorityMealSlotSections(items, {
      mealSlotOverrides: overrides,
      explicitSlotsOnly: false,
      includeEmptySections: true,
    });
    expect(unslottedItems).toEqual([]);
    expect(sections.find((section) => section.items.some((item) => item.key === 'water'))).toBeTruthy();
  });

  it('reports explicit assignments only when override exists', () => {
    const items = [{ key: 'water', label: '수분' }];
    expect(hasExplicitMealSlotAssignments(items, new Map())).toBe(false);
    expect(hasExplicitMealSlotAssignments(items, new Map([['water', 'morning']]))).toBe(true);
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

describe('splitPriorityMealSlotSections multi-slot assignments', () => {
  it('places the same item in every assigned section', () => {
    const items = [{ key: 'medicine', label: '약 복용' }];
    const overrides = new Map([['medicine', ['morning', 'lunch', 'dinner'] as const]]);
    const { sections } = splitPriorityMealSlotSections(items, {
      mealSlotOverrides: overrides,
      explicitSlotsOnly: true,
      includeEmptySections: true,
    });
    expect(sections.find((section) => section.slot === 'morning')?.items.map((item) => item.key)).toEqual([
      'medicine',
    ]);
    expect(sections.find((section) => section.slot === 'lunch')?.items.map((item) => item.key)).toEqual([
      'medicine',
    ]);
    expect(sections.find((section) => section.slot === 'dinner')?.items.map((item) => item.key)).toEqual([
      'medicine',
    ]);
    expect(sections.find((section) => section.slot === 'dawn')?.items).toEqual([]);
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
