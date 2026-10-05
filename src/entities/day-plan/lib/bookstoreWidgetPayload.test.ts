import { buildBookstoreWidgetBundlePayload, toBookstoreWidgetBook, toBookstoreWidgetBooks } from './bookstoreWidgetPayload';
import { getLocalDateKey } from './localDateKey';

describe('toBookstoreWidgetBook', () => {
  it('fills large-widget labels for position, remaining, last read, and today goal', () => {
    const today = getLocalDateKey();
    const payload = toBookstoreWidgetBook({
      id: 'b1',
      title: '어린왕자 (소프트커버 에디션) - 개정판',
      startPage: 1,
      targetPage: 20,
      status: 'reading',
      memo: '사막 장부터',
      pageLogs: {
        '2026-09-01': { startPage: 1, targetPage: 20 },
        [today]: { startPage: 20, targetPage: 45 },
      },
      aladin: {
        itemId: 1,
        link: 'https://example.com',
        coverUrl: '',
        author: '앙투안 드 생텍쥐페리 (지은이), 전성자 (옮긴이)',
        totalPages: 144,
      },
    });

    expect(payload.status).toBe('reading');
    expect(payload.statusLabel.length).toBeGreaterThan(0);
    expect(payload.pagesLine).toContain('45P');
    expect(payload.pagesLine).toContain('144P');
    expect(payload.remainingLabel).toContain('99');
    expect(payload.percentLabel).toContain('%');
    expect(payload.lastReadLabel.length).toBeGreaterThan(0);
    expect(payload.todayGoalLabel).toContain('20');
    expect(payload.todayGoalLabel).toContain('45');
    expect(payload.author).toBe('앙투안 드 생텍쥐페리, 전성자');
  });

  it('omits remaining when the book is finished', () => {
    const payload = toBookstoreWidgetBook({
      id: 'b2',
      title: '끝난 책',
      startPage: 1,
      targetPage: 144,
      status: 'done',
      aladin: {
        itemId: 2,
        link: 'https://example.com',
        coverUrl: '',
        author: '작가',
        totalPages: 144,
      },
    });
    expect(payload.remainingLabel).toBe('');
    expect(payload.pagesLine).toBe('144P / 144P');
  });

  it('keeps every book id as its own picker row', () => {
    const rows = toBookstoreWidgetBooks([
      {
        id: 'rb-seed-little-prince',
        title: '어린왕자 (소프트커버 에디션) - 개정판',
        startPage: 1,
        targetPage: 1,
      },
      {
        id: 'rb-other',
        title: '어린왕자 (소프트커버 에디션) - 개정판',
        startPage: 1,
        targetPage: 1,
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.id)).toEqual(['rb-seed-little-prince', 'rb-other']);
    expect(rows[0]?.title).toBe('어린왕자 (소프트커버 에디션) - 개정판');
    expect(rows[1]?.title).toBe('어린왕자 (소프트커버 에디션) - 개정판 · 2');
  });
});

describe('buildBookstoreWidgetBundlePayload', () => {
  it('includes every book from the in-memory reading config', () => {
    const payload = buildBookstoreWidgetBundlePayload({
      books: [
        {
          id: 'rb-harry',
          title: '해리 포터와 비밀의 방 1 (무선)',
          startPage: 1,
          targetPage: 264,
          status: 'reading',
          addedAtMs: 2_000,
        },
        {
          id: 'rb-seed-little-prince',
          title: '어린왕자 (소프트커버 에디션) - 개정판',
          startPage: 1,
          targetPage: 144,
          status: 'reading',
          addedAtMs: 1,
        },
      ],
    });
    expect(payload.books.map((book) => book.id)).toEqual([
      'rb-harry',
      'rb-seed-little-prince',
    ]);
  });
});
