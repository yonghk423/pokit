import {
  buildPriorityCatalogSections,
  defaultSystemGroupForCatalogKey,
} from './priorityCatalogSections';

describe('priorityCatalogSections', () => {
  it('maps standard keys to system groups', () => {
    expect(defaultSystemGroupForCatalogKey('water')).toBe('health');
    expect(defaultSystemGroupForCatalogKey('reading')).toBe('productivity');
  });

  it('builds health and productivity sections with custom flows', () => {
    const result = buildPriorityCatalogSections({
      available: [
        { key: 'water', label: '수분', icon: 'drop.fill' },
        { key: 'reading', label: '독서', icon: 'book.fill' },
      ],
      customFlowPickerItems: [
        { key: 'customFlow:a', label: '나만의 플로우', icon: 'book.fill' },
      ],
      customFlowEntries: [{ id: 'customFlow:a', groupKey: 'health' }],
      customGroups: [{ key: 'customGroup:1', label: '나의 그룹' }],
    });

    expect(result.groupSections.map((s) => s.groupKey)).toEqual([
      'health',
      'productivity',
      'customGroup:1',
    ]);
    const health = result.groupSections.find((s) => s.groupKey === 'health');
    expect(health?.items.map((i) => i.key)).toEqual(['water', 'customFlow:a']);
    const custom = result.groupSections.find((s) => s.groupKey === 'customGroup:1');
    expect(custom?.isCustomGroup).toBe(true);
    expect(custom?.items).toHaveLength(0);
  });
});
