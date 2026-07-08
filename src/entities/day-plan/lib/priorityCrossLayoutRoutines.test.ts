import type { DayPlanBlock } from '../model/types';

import {
  collectSpineTimelineCategoryKeys,
  resolveCrossLayoutRoutineKeysForTarget,
  resolvePriorityLayoutRoutineSource,
} from './priorityCrossLayoutRoutines';

function spineBlock(categoryKey: string): DayPlanBlock {
  return {
    id: `spine-${categoryKey}`,
    title: categoryKey,
    category: '사용자',
    startMinutes: 600,
    endMinutes: 615,
    order: 0,
    blockOrigin: 'spineTimeline',
    categoryKey,
  };
}

describe('priorityCrossLayoutRoutines', () => {
  it('prefers bag routines as layout source', () => {
    expect(
      resolvePriorityLayoutRoutineSource({
        priorityCategoryOrder: ['water'],
        prioritySectionsCategoryOrder: ['reading'],
        prioritySectionsLinkMode: 'independent',
        planBlocks: [spineBlock('fasting')],
      }),
    ).toEqual({ mode: 'bag', keys: ['water'] });
  });

  it('uses sections routines when bag is empty', () => {
    expect(
      resolvePriorityLayoutRoutineSource({
        priorityCategoryOrder: [],
        prioritySectionsCategoryOrder: ['reading', 'water'],
        prioritySectionsLinkMode: 'independent',
        planBlocks: [],
      }),
    ).toEqual({ mode: 'sections', keys: ['reading', 'water'] });
  });

  it('uses spine routines when only timeline has category blocks', () => {
    expect(
      resolvePriorityLayoutRoutineSource({
        priorityCategoryOrder: [],
        prioritySectionsCategoryOrder: [],
        prioritySectionsLinkMode: null,
        planBlocks: [spineBlock('fasting')],
      }),
    ).toEqual({ mode: 'spine', keys: ['fasting'] });
  });

  it('returns cross-layout keys for bag target from spine source', () => {
    expect(
      resolveCrossLayoutRoutineKeysForTarget({
        targetMode: 'bag',
        priorityCategoryOrder: [],
        prioritySectionsCategoryOrder: [],
        prioritySectionsLinkMode: null,
        planBlocks: [spineBlock('stretching')],
      }),
    ).toEqual(['stretching']);
  });

  it('returns cross-layout keys for spine target from sections source', () => {
    expect(
      resolveCrossLayoutRoutineKeysForTarget({
        targetMode: 'spine',
        priorityCategoryOrder: [],
        prioritySectionsCategoryOrder: ['water'],
        prioritySectionsLinkMode: 'independent',
        planBlocks: [],
      }),
    ).toEqual(['water']);
  });

  it('collects unique spine category keys in timeline order', () => {
    expect(
      collectSpineTimelineCategoryKeys([
        spineBlock('water'),
        spineBlock('water'),
        spineBlock('reading'),
      ]),
    ).toEqual(['water', 'reading']);
  });
});
