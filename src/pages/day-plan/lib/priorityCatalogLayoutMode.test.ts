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

  it('resolveCatalogSelectedKeys uses timeline blocks instead of bag order for spine mode', () => {
    expect(
      resolveCatalogSelectedKeys({
        layoutMode: 'spine',
        priorityCategoryOrder: ['reading'],
        prioritySectionsCategoryOrder: ['work'],
        planBlocks: [
          {
            id: 'spine-health',
            title: '건강 챙기기',
            category: '건강',
            categoryKey: 'healthIntake',
            startMinutes: 9 * 60,
            endMinutes: 10 * 60,
            order: 0,
            blockOrigin: 'spineTimeline',
          },
        ],
      }),
    ).toEqual(['healthIntake']);
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
    const tr = (key: string) =>
      ({ 'catalog.layoutLeadBag': '목록', 'catalog.layoutLeadSections': '시간대', 'catalog.layoutLeadSpine': '시간 아이콘' } as Record<string, string>)[key] ?? key;
    expect(catalogLayoutModeLead('bag', tr)).toContain('목록');
    expect(catalogLayoutModeLead('sections', tr)).toContain('시간대');
    expect(catalogLayoutModeLead('spine', tr)).toContain('시간 아이콘');
  });
});
