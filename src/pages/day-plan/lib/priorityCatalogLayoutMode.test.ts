import {
  catalogLayoutModeLead,
  resolveCatalogLayoutMode,
  resolveCatalogSelectedKeys,
  toggleCatalogItemForLayoutMode,
} from './priorityCatalogLayoutMode';

describe('priorityCatalogLayoutMode', () => {
  it('resolveCatalogLayoutMode maps draft flags', () => {
    expect(
      resolveCatalogLayoutMode({
        priorityMealSlotLayoutEnabled: false,
        prioritySpineLayoutEnabled: false,
      }),
    ).toBe('bag');
    expect(
      resolveCatalogLayoutMode({
        priorityMealSlotLayoutEnabled: true,
        prioritySpineLayoutEnabled: false,
      }),
    ).toBe('sections');
    expect(
      resolveCatalogLayoutMode({
        priorityMealSlotLayoutEnabled: false,
        prioritySpineLayoutEnabled: true,
      }),
    ).toBe('spine');
  });

  it('resolveCatalogSelectedKeys uses sections order for sections mode', () => {
    expect(
      resolveCatalogSelectedKeys({
        layoutMode: 'sections',
        priorityCategoryOrder: ['reading'],
        prioritySectionsCategoryOrder: ['work'],
        planBlocks: [],
      }),
    ).toEqual(['work']);
  });

  it('toggleCatalogItemForLayoutMode appends to bag order', () => {
    const orders: string[][] = [];
    const result = toggleCatalogItemForLayoutMode(
      {
        layoutMode: 'bag',
        key: 'reading',
        selected: false,
        priorityStart: '09:00',
        priorityEnd: '22:00',
        planBlocks: [],
        nowMinutes: 9 * 60,
      },
      {
        setPriorityCategoryOrder: (order) => orders.push(order),
        saveRoutineCatalogSelectionKeys: () => {},
        appendPrioritySectionsCategoryKeys: () => {},
        appendPrioritySectionsWithMealSlot: () => {},
        setPrioritySectionsCategoryOrder: () => {},
        addPrioritySectionMealSlot: () => {},
        addPlanBlock: () => ({ ok: true }),
        removePlanBlock: () => {},
        getPriorityCategoryOrder: () => [],
        getPrioritySectionsCategoryOrder: () => [],
      },
    );
    expect(result).toEqual({ ok: true, selected: true });
    expect(orders[0]).toEqual(['reading']);
  });

  it('toggleCatalogItemForLayoutMode assigns target meal slot in sections mode', () => {
    const slots: Array<{ keys: string[]; slot: string }> = [];
    const result = toggleCatalogItemForLayoutMode(
      {
        layoutMode: 'sections',
        key: 'reading',
        selected: false,
        priorityStart: '09:00',
        priorityEnd: '22:00',
        planBlocks: [],
        nowMinutes: 9 * 60,
        targetMealSlot: 'lunch',
      },
      {
        setPriorityCategoryOrder: () => {},
        saveRoutineCatalogSelectionKeys: () => {},
        appendPrioritySectionsCategoryKeys: () => {},
        appendPrioritySectionsWithMealSlot: (keys, slot) => slots.push({ keys, slot }),
        setPrioritySectionsCategoryOrder: () => {},
        addPrioritySectionMealSlot: () => {},
        addPlanBlock: () => ({ ok: true }),
        removePlanBlock: () => {},
        getPriorityCategoryOrder: () => [],
        getPrioritySectionsCategoryOrder: () => [],
      },
    );
    expect(result).toEqual({ ok: true, selected: true });
    expect(slots).toEqual([{ keys: ['reading'], slot: 'lunch' }]);
  });

  it('catalogLayoutModeLead differs by mode', () => {
    expect(catalogLayoutModeLead('bag')).toContain('목록');
    expect(catalogLayoutModeLead('sections')).toContain('담을 시간대');
    expect(catalogLayoutModeLead('spine')).toContain('타임라인');
  });
});
