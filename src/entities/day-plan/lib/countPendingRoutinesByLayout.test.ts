import type { DayPlanBlock } from '../model/types';

import { countPendingRoutinesByLayout, totalPendingRoutinesByLayout } from './countPendingRoutinesByLayout';

function spineBlock(id: string): DayPlanBlock {
  return {
    id,
    title: '루틴',
    category: '사용자',
    startMinutes: 60,
    endMinutes: 120,
    order: 0,
    blockOrigin: 'spineTimeline',
  };
}

describe('countPendingRoutinesByLayout', () => {
  it('counts each layout independently, including repeated sections slots', () => {
    const counts = countPendingRoutinesByLayout({
      visibility: { bag: true, sections: true, spine: true },
      priorityCategoryOrder: ['reading', 'water', 'reading::instance:2'],
      prioritySectionsCategoryOrder: ['stretching', 'water'],
      prioritySectionsMealSlots: {
        stretching: ['morning', 'night'],
        water: ['lunch'],
      },
      completedFocusCategoryKeys: ['water', 'stretching@morning'],
      planCompletionDismissedKeys: [],
      isFocusStarted: false,
      priorityStart: '00:00',
      priorityEnd: '24:00',
      blocks: [spineBlock('a'), spineBlock('b')],
      completedBlockIds: ['a'],
      skippedBlockIds: [],
    });

    expect(counts).toEqual({ bag: 2, sections: 2, spine: 1 });
    expect(totalPendingRoutinesByLayout(counts)).toBe(5);
  });

  it('excludes hidden modes and skipped spine blocks', () => {
    expect(
      countPendingRoutinesByLayout({
        visibility: { bag: false, sections: true, spine: true },
        priorityCategoryOrder: ['reading'],
        prioritySectionsCategoryOrder: ['water'],
        prioritySectionsMealSlots: { water: ['morning'] },
        completedFocusCategoryKeys: [],
        planCompletionDismissedKeys: [],
        isFocusStarted: false,
        priorityStart: '00:00',
        priorityEnd: '24:00',
        blocks: [spineBlock('spine')],
        completedBlockIds: [],
        skippedBlockIds: ['spine'],
      }),
    ).toEqual({ bag: 0, sections: 1, spine: 0 });
  });

  it('does not count sections routines without a visible time slot', () => {
    expect(
      countPendingRoutinesByLayout({
        visibility: { bag: true, sections: true, spine: true },
        priorityCategoryOrder: [],
        prioritySectionsCategoryOrder: ['reading'],
        prioritySectionsMealSlots: {},
        completedFocusCategoryKeys: [],
        planCompletionDismissedKeys: [],
        isFocusStarted: false,
        priorityStart: '00:00',
        priorityEnd: '24:00',
        blocks: [],
        completedBlockIds: [],
        skippedBlockIds: [],
      }),
    ).toEqual({ bag: 0, sections: 0, spine: 0 });
  });

  it('counts unique spine blocks only inside the priority window', () => {
    const inside = { ...spineBlock('inside'), startMinutes: 9 * 60, endMinutes: 10 * 60 };
    const outside = { ...spineBlock('outside'), startMinutes: 6 * 60, endMinutes: 7 * 60 };

    expect(
      countPendingRoutinesByLayout({
        visibility: { bag: false, sections: false, spine: true },
        priorityCategoryOrder: [],
        prioritySectionsCategoryOrder: [],
        prioritySectionsMealSlots: {},
        completedFocusCategoryKeys: [],
        planCompletionDismissedKeys: [],
        isFocusStarted: false,
        priorityStart: '08:00',
        priorityEnd: '22:00',
        blocks: [inside, inside, outside],
        completedBlockIds: [],
        skippedBlockIds: [],
      }),
    ).toEqual({ bag: 0, sections: 0, spine: 1 });
  });

  it('matches focused plan completion and dismissal behavior used by the UI', () => {
    const completedBagBlock = {
      ...spineBlock('bag-session'),
      categoryKey: 'reading',
      blockOrigin: 'prioritySession' as const,
    };
    const base = {
      visibility: { bag: true, sections: true, spine: false },
      priorityCategoryOrder: ['reading'],
      prioritySectionsCategoryOrder: ['reading'],
      prioritySectionsMealSlots: { reading: ['morning'] as const },
      completedFocusCategoryKeys: [],
      isFocusStarted: true,
      priorityStart: '00:00',
      priorityEnd: '24:00',
      blocks: [completedBagBlock],
      completedBlockIds: ['bag-session'],
      skippedBlockIds: [],
    };

    expect(
      countPendingRoutinesByLayout({
        ...base,
        planCompletionDismissedKeys: [],
      }),
    ).toEqual({ bag: 0, sections: 0, spine: 0 });

    expect(
      countPendingRoutinesByLayout({
        ...base,
        planCompletionDismissedKeys: ['reading', 'reading@morning'],
      }),
    ).toEqual({ bag: 1, sections: 1, spine: 0 });
  });
});
