import {
  resolveCrossLayoutRoutineKeysForTarget,
  resolvePriorityLayoutRoutineSource,
} from './priorityCrossLayoutRoutines';

describe('priorityCrossLayoutRoutines', () => {
  it('resolvePriorityLayoutRoutineSource prefers bag order', () => {
    expect(
      resolvePriorityLayoutRoutineSource({
        priorityCategoryOrder: ['reading'],
        prioritySectionsCategoryOrder: ['work'],
        prioritySectionsLinkMode: 'independent',
        planBlocks: [],
      }),
    ).toEqual({ mode: 'bag', keys: ['reading'] });
  });

  it('resolvePriorityLayoutRoutineSource uses sections when bag empty', () => {
    expect(
      resolvePriorityLayoutRoutineSource({
        priorityCategoryOrder: [],
        prioritySectionsCategoryOrder: ['work'],
        prioritySectionsLinkMode: 'independent',
        planBlocks: [],
      }),
    ).toEqual({ mode: 'sections', keys: ['work'] });
  });

  it('resolvePriorityLayoutRoutineSource uses spine blocks when bag and sections empty', () => {
    expect(
      resolvePriorityLayoutRoutineSource({
        priorityCategoryOrder: [],
        prioritySectionsCategoryOrder: [],
        prioritySectionsLinkMode: 'independent',
        planBlocks: [
          {
            id: 'b1',
            title: '독서',
            category: '독서',
            categoryKey: 'reading',
            startMinutes: 600,
            endMinutes: 630,
            order: 0,
            blockOrigin: 'spineTimeline',
          },
        ],
      }),
    ).toEqual({ mode: 'spine', keys: ['reading'] });
  });

  it('resolveCrossLayoutRoutineKeysForTarget excludes same mode', () => {
    expect(
      resolveCrossLayoutRoutineKeysForTarget({
        targetMode: 'sections',
        priorityCategoryOrder: ['reading'],
        prioritySectionsCategoryOrder: [],
        prioritySectionsLinkMode: null,
        planBlocks: [],
      }),
    ).toEqual(['reading']);
  });

  it('resolveCrossLayoutRoutineKeysForTarget returns empty when source matches target', () => {
    expect(
      resolveCrossLayoutRoutineKeysForTarget({
        targetMode: 'bag',
        priorityCategoryOrder: ['reading'],
        prioritySectionsCategoryOrder: [],
        prioritySectionsLinkMode: null,
        planBlocks: [],
      }),
    ).toEqual([]);
  });
});
