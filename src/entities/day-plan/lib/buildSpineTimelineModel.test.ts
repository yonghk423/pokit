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

  it('앵커에 날짜 캡션을 전달하면 행에 포함한다', () => {
    const rows = buildSpineTimelineModel({
      priorityStart: '03:00',
      priorityEnd: '15:03',
      nowMinutes: 3 * 60,
      blocks: [],
      dayStartDateCaption: '7월 10일',
      dayEndDateCaption: '7월 11일',
    });

    const start = rows.find((r) => r.kind === 'anchor' && r.role === 'dayStart');
    const end = rows.find((r) => r.kind === 'anchor' && r.role === 'dayEnd');
    expect(start).toMatchObject({ dateCaption: '7월 10일' });
    expect(end).toMatchObject({ dateCaption: '7월 11일' });
  });

  it('overnight 구간은 시작 → 저녁 블록 → 마무리 순으로 펼친다', () => {
    const rows = buildSpineTimelineModel({
      priorityStart: '06:30',
      priorityEnd: '00:00',
      nowMinutes: 9 * 60 + 29,
      blocks: [
        block({
          id: 'pushup',
          startMinutes: 23 * 60,
          endMinutes: 23 * 60 + 10,
          title: '푸쉬업',
        }),
      ],
      dayStartDateCaption: '7월 14일',
      dayEndDateCaption: '7월 15일',
    });

    const kindsAndRoles = rows.map((r) => {
      if (r.kind === 'anchor') return `${r.kind}:${r.role}`;
      if (r.kind === 'block') return `block:${r.startMinutes}`;
      return `gap:${r.fromMinutes}-${r.toMinutes}`;
    });

    expect(kindsAndRoles[0]).toBe('anchor:dayStart');
    expect(kindsAndRoles).toContain('block:1380');
    expect(kindsAndRoles[kindsAndRoles.length - 1]).toBe('anchor:dayEnd');

    const dayStartIdx = kindsAndRoles.indexOf('anchor:dayStart');
    const blockIdx = kindsAndRoles.indexOf('block:1380');
    const dayEndIdx = kindsAndRoles.indexOf('anchor:dayEnd');
    expect(dayStartIdx).toBeLessThan(blockIdx);
    expect(blockIdx).toBeLessThan(dayEndIdx);

    const morningGap = rows.find(
      (r) => r.kind === 'gap' && r.fromMinutes === 6 * 60 + 30 && r.toMinutes === 23 * 60,
    );
    expect(morningGap).toMatchObject({ kind: 'gap', nowMinutes: 9 * 60 + 29 });
  });

  it('동일 id 블록은 한 번만 표시하고 창 밖 익일 종료는 제외한다', () => {
    const rows = buildSpineTimelineModel({
      priorityStart: '06:30',
      priorityEnd: '00:00',
      nowMinutes: 15 * 60,
      blocks: [
        block({
          id: 'same',
          startMinutes: 15 * 60 + 40,
          endMinutes: 16 * 60 + 10,
          endsNextCalendarDay: true,
        }),
        block({
          id: 'same',
          startMinutes: 15 * 60 + 40,
          endMinutes: 16 * 60 + 10,
          endsNextCalendarDay: true,
        }),
        block({
          id: 'ok',
          startMinutes: 22 * 60,
          endMinutes: 22 * 60 + 30,
        }),
      ],
    });

    const blockRows = rows.filter((r) => r.kind === 'block');
    expect(blockRows).toHaveLength(1);
    expect(blockRows[0]).toMatchObject({ kind: 'block', startMinutes: 22 * 60 });
  });
});
