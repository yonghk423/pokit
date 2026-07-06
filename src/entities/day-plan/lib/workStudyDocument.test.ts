import {
  createWorkStudyNotePage,
  formatWorkStudyNoteDateLabel,
  formatWorkStudyNoteTitleFromDateKey,
  isLegacyAutoWorkStudyNoteTitle,
  migrateLegacyWorkContentToDocument,
  normalizeWorkStudyDocument,
  resolveWorkStudyNotePageLabel,
  resolveWorkStudyNotePagePreview,
  workStudyDocumentToPlainText,
} from './workStudyDocument';
import { normalizeWorkDetailConfig } from './goalCategorySessionConfig';

describe('normalizeWorkStudyDocument', () => {
  it('normalizes heading and checklist blocks in legacy flat document', () => {
    const doc = normalizeWorkStudyDocument({
      blocks: [
        { id: 'h1', kind: 'heading', text: 'MORNING', subtitle: '아침' },
        { id: 'c1', kind: 'checklist', text: '복습', checked: true },
      ],
    });
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0]?.blocks).toHaveLength(2);
    expect(doc.pages[0]?.blocks[0]?.kind).toBe('heading');
    expect(doc.pages[0]?.blocks[1]?.checked).toBe(true);
    expect(doc.pages[0]?.createdDateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(doc.activePageId).toBe(doc.pages[0]?.id);
  });

  it('normalizes multi-page documents and clears legacy memo titles', () => {
    const doc = normalizeWorkStudyDocument({
      pages: [
        { id: 'p1', title: '메모 1', blocks: [{ id: 'c1', kind: 'paragraph', text: '첫 장' }] },
        { id: 'p2', title: '나만의 제목', blocks: [{ id: 'c2', kind: 'paragraph', text: '둘째 장' }] },
      ],
      activePageId: 'p2',
    });
    expect(doc.pages).toHaveLength(2);
    expect(doc.pages[0]?.title).toBe('');
    expect(doc.pages[1]?.title).toBe('나만의 제목');
    expect(doc.activePageId).toBe('p2');
  });

  it('migrates legacy focus memo to checklist blocks', () => {
    const doc = migrateLegacyWorkContentToDocument({
      focusMemo: '문제 풀이\n복습',
    });
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0]?.blocks).toHaveLength(2);
    expect(doc.pages[0]?.blocks.every((b) => b.kind === 'checklist')).toBe(true);
  });

  it('keeps empty table rows when only the first cell has text', () => {
    const doc = normalizeWorkStudyDocument({
      blocks: [
        {
          id: 't1',
          kind: 'table',
          tableRows: [
            ['첫 칸', ''],
            ['', ''],
          ],
        },
      ],
    });
    const table = doc.pages[0]?.blocks[0];
    expect(table?.kind).toBe('table');
    expect(table?.tableRows).toEqual([
      ['첫 칸', ''],
      ['', ''],
    ]);
  });

  it('caps table size at 3 rows and 5 columns', () => {
    const doc = normalizeWorkStudyDocument({
      blocks: [
        {
          id: 't2',
          kind: 'table',
          tableRows: [
            ['a', 'b', 'c', 'd', 'e', 'f'],
            ['1', '2', '3', '4', '5', '6'],
            ['x', 'y', 'z', 'w', 'v', 'u'],
            ['overflow'],
          ],
        },
      ],
    });
    const table = doc.pages[0]?.blocks[0];
    expect(table?.tableRows).toHaveLength(3);
    expect(table?.tableRows?.every((row) => row.length === 5)).toBe(true);
    expect(table?.tableRows?.[0]).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('preserves table rows through work detail config normalization', () => {
    const cfg = normalizeWorkDetailConfig({
      document: {
        blocks: [
          {
            id: 't3',
            kind: 'table',
            tableRows: [
              ['메모', ''],
              ['', ''],
            ],
          },
        ],
      },
    });
    expect(cfg.document.pages[0]?.blocks[0]?.tableRows).toEqual([
      ['메모', ''],
      ['', ''],
    ]);
  });
});

describe('resolveWorkStudyNotePageLabel', () => {
  it('uses year-month-day for default titles', () => {
    const page = createWorkStudyNotePage({ createdDateKey: '2026-07-06' });
    expect(resolveWorkStudyNotePageLabel(page, [page])).toBe('2026년 7월 6일');
  });

  it('keeps custom titles', () => {
    const page = createWorkStudyNotePage({ title: '시험 대비', createdDateKey: '2026-07-06' });
    expect(resolveWorkStudyNotePageLabel(page, [page])).toBe('시험 대비');
  });

  it('suffixes same-day auto titles', () => {
    const first = createWorkStudyNotePage({ createdDateKey: '2026-07-06' });
    const second = createWorkStudyNotePage({ createdDateKey: '2026-07-06' });
    expect(resolveWorkStudyNotePageLabel(first, [first, second])).toBe('2026년 7월 6일');
    expect(resolveWorkStudyNotePageLabel(second, [first, second])).toBe('2026년 7월 6일 · 2');
  });

  it('formats list date labels', () => {
    expect(formatWorkStudyNoteDateLabel('2026-07-06')).toBe('2026. 7. 6.');
  });

  it('builds preview snippets from blocks', () => {
    const page = createWorkStudyNotePage({
      blocks: [{ id: 'a', kind: 'paragraph', text: '첫 줄 미리보기' }],
    });
    expect(resolveWorkStudyNotePagePreview(page)).toBe('첫 줄 미리보기');
  });
});

describe('workStudyDocumentToPlainText', () => {
  it('renders blocks as plain text lines', () => {
    const doc = normalizeWorkStudyDocument({
      blocks: [
        { id: 'h1', kind: 'heading', text: 'DAWN', subtitle: '새벽' },
        { id: 'c1', kind: 'checklist', text: '명상', checked: false },
      ],
    });
    const text = workStudyDocumentToPlainText(doc);
    expect(text).toMatch(/\d{4}년 \d{1,2}월 \d{1,2}일/);
    expect(text).toContain('DAWN · 새벽');
    expect(text).toContain('[ ] 명상');
  });

  it('joins multiple pages with blank lines', () => {
    const text = workStudyDocumentToPlainText({
      pages: [
        createWorkStudyNotePage({
          title: '수학',
          createdDateKey: '2026-07-06',
          blocks: [{ id: 'a', kind: 'paragraph', text: '공식 정리' }],
        }),
        createWorkStudyNotePage({
          title: '영어',
          createdDateKey: '2026-07-05',
          blocks: [{ id: 'b', kind: 'paragraph', text: '단어 암기' }],
        }),
      ],
      activePageId: 'ignored',
    });
    expect(text).toContain('수학\n공식 정리');
    expect(text).toContain('영어\n단어 암기');
  });
});
