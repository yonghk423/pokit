import { createWorkStudyNotePage } from './workStudyDocument';
import { toNoteWidgetPages } from './noteWidgetPayload';

describe('toNoteWidgetPages', () => {
  it('keeps same-day notes as separate picker rows with unique titles', () => {
    const pages = [
      createWorkStudyNotePage({
        createdDateKey: '2026-10-04',
        blocks: [{ id: 'b1', kind: 'paragraph', text: '첫번째' }],
      }),
      createWorkStudyNotePage({
        createdDateKey: '2026-10-04',
        blocks: [{ id: 'b2', kind: 'paragraph', text: '두번째' }],
      }),
      createWorkStudyNotePage({
        createdDateKey: '2026-10-04',
        blocks: [{ id: 'b3', kind: 'paragraph', text: '세번째' }],
      }),
    ];
    const rows = toNoteWidgetPages(pages);
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((row) => row.id)).size).toBe(3);
    expect(rows.map((row) => row.title)).toEqual([
      '2026년 10월 4일',
      '2026년 10월 4일 · 2',
      '2026년 10월 4일 · 3',
    ]);
    expect(rows.map((row) => row.preview)).toEqual(['첫번째', '두번째', '세번째']);
  });
});
