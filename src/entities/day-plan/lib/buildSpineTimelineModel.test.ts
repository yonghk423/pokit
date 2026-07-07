import type { DayPlanBlock } from '../model/types';

import { buildSpineTimelineModel } from './buildSpineTimelineModel';

function block(
  partial: Partial<DayPlanBlock> & Pick<DayPlanBlock, 'id' | 'startMinutes' | 'endMinutes'>,
): DayPlanBlock {
  return {
    title: '테스트',
    category: '사용자',
    order: 0,
    blockOrigin: 'spineTimeline',
    ...partial,
  };
}

describe('buildSpineTimelineModel', () => {
  it('앵커·블록·갭·현재 시각을 시간 순으로 펼친다', () => {
    const rows = buildSpineTimelineModel({
      priorityStart: '08:00',
      priorityEnd: '22:00',
      nowMinutes: 8 * 60 + 58,
      blocks: [block({ id: 'b1', startMinutes: 11 * 60, endMinutes: 11 * 60 + 15 })],
    });

    expect(rows.map((r) => r.kind)).toEqual([
      'anchor',
      'gap',
      'block',
      'gap',
      'anchor',
    ]);

    const start = rows[0];
    expect(start).toMatchObject({ kind: 'anchor', role: 'dayStart', minutes: 8 * 60 });

    const morningGap = rows[1];
    expect(morningGap).toMatchObject({
      kind: 'gap',
      fromMinutes: 8 * 60,
      toMinutes: 11 * 60,
      nowMinutes: 8 * 60 + 58,
    });
    if (morningGap.kind === 'gap') {
      expect(morningGap.coachingLine).toContain('2시간 2분');
    }

    const scheduled = rows[2];
    expect(scheduled).toMatchObject({
      kind: 'block',
      startMinutes: 11 * 60,
      endMinutes: 11 * 60 + 15,
    });
  });

  it('블록이 없으면 시작·마무리 사이 갭만 만든다', () => {
    const rows = buildSpineTimelineModel({
      priorityStart: '08:00',
      priorityEnd: '22:00',
      nowMinutes: 10 * 60,
      blocks: [],
    });

    expect(rows.map((r) => r.kind)).toEqual(['anchor', 'gap', 'anchor']);
    const gap = rows[1];
    if (gap.kind === 'gap') {
      expect(gap.durationMin).toBe(12 * 60);
      expect(gap.nowMinutes).toBe(10 * 60);
    }
  });

  it('하루 시작·마무리 밖 블록은 타임라인에서 제외한다', () => {
    const rows = buildSpineTimelineModel({
      priorityStart: '18:00',
      priorityEnd: '21:00',
      nowMinutes: 18 * 60,
      blocks: [
        block({ id: 'outside', startMinutes: 17 * 60 + 58, endMinutes: 18 * 60 + 13 }),
        block({ id: 'inside', startMinutes: 18 * 60 + 30, endMinutes: 18 * 60 + 45 }),
      ],
    });

    const blockRows = rows.filter((row) => row.kind === 'block');
    expect(blockRows).toHaveLength(1);
    expect(blockRows[0]).toMatchObject({
      kind: 'block',
      startMinutes: 18 * 60 + 30,
    });
  });
});
