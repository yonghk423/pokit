import {
  bookMatchesReadingLibraryQuery,
  deriveReadingBookProgress,
  deriveReadingProgress,
  ensureReadingBookPages,
  firstAladinBookEntry,
  getInitialReadingLiveActivityConfig,
  makeReadingBookId,
  normalizeReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  readingDisplayTitle,
  sortReadingBooksByAddedAt,
  sortReadingBooksByNewestFirst,
  type ReadingBookEntry,
} from './readingLiveActivityConfig';

describe('readingLiveActivityConfig', () => {
  it('normalizes config with defaults', () => {
    const cfg = normalizeReadingLiveActivityConfig({});
    expect(cfg.startPage).toBe(1);
    expect(cfg.targetPage).toBe(100);
    expect(cfg.selectedMetrics).toEqual([]);
    expect(cfg.aladinBook).toBeNull();
    expect(cfg.books).toEqual([]);
  });

  it('limits metric selection to valid keys', () => {
    expect(
      normalizeReadingMetricSelection(['pages_read', 'invalid', 'focus_level', 'pages_read']),
    ).toEqual(['pages_read', 'focus_level']);
  });

  it('prefers book title over flow title', () => {
    const cfg = getInitialReadingLiveActivityConfig();
    expect(readingDisplayTitle('플로우 제목', { ...cfg, bookTitle: '책' })).toBe('책');
    expect(readingDisplayTitle('플로우 제목', cfg)).toBe('플로우 제목');
    expect(readingDisplayTitle('', cfg)).toBe('제목 없음');
  });

  it('prefers books[] titles over bookTitle', () => {
    const cfg = normalizeReadingLiveActivityConfig({
      books: [
        { id: 'b1', title: '첫째 책', startPage: 1, targetPage: 50 },
        { id: 'b2', title: '둘째 책', startPage: 10, targetPage: 120 },
      ],
    });
    expect(readingDisplayTitle('플로우', cfg)).toBe('첫째 책, 둘째 책');
  });

  it('migrates legacy bookTitle into books[] with page range', () => {
    const cfg = normalizeReadingLiveActivityConfig({
      bookTitle: '레거시 도서',
      startPage: 20,
      targetPage: 180,
      aladinBook: {
        itemId: 123,
        link: 'https://aladin.co.kr/123',
        coverUrl: '',
        author: '작가',
        totalPages: 200,
      },
    });
    expect(cfg.books.length).toBe(1);
    expect(cfg.books[0].title).toBe('레거시 도서');
    expect(cfg.books[0].startPage).toBe(20);
    expect(cfg.books[0].targetPage).toBe(200);
    expect(cfg.books[0].aladin?.itemId).toBe(123);
  });

  it('fills missing page values on legacy book entries', () => {
    const fixed = ensureReadingBookPages({
      id: 'b1',
      title: '레거시',
      startPage: undefined as unknown as number,
      targetPage: undefined as unknown as number,
      aladin: {
        itemId: 1,
        link: 'https://aladin.co.kr/1',
        coverUrl: '',
        author: '',
        totalPages: 144,
      },
    });
    expect(fixed.startPage).toBe(1);
    expect(fixed.targetPage).toBe(144);
  });

  it('derives per-book reading progress', () => {
    const progress = deriveReadingBookProgress({ startPage: 10, targetPage: 100 });
    expect(progress.pagesRead).toBe(90);
    expect(progress.progressPct).toBe(0);
  });

  it('derives book completion from total pages', () => {
    const progress = deriveReadingBookProgress({
      startPage: 1,
      targetPage: 26,
      totalPages: 196,
    });
    expect(progress.pagesRead).toBe(25);
    expect(progress.progressPct).toBe(13);
  });

  it('preserves book memo within max length', () => {
    const cfg = normalizeReadingLiveActivityConfig({
      books: [{ id: 'b1', title: '책', startPage: 1, targetPage: 50, memo: '  오늘 20쪽  ' }],
    });
    expect(cfg.books[0].memo).toBe('오늘 20쪽');
  });

  it('derives aggregate reading progress from multiple books', () => {
    const cfg = normalizeReadingLiveActivityConfig({
      books: [
        {
          id: 'b1',
          title: 'A',
          startPage: 1,
          targetPage: 100,
          aladin: {
            itemId: 1,
            link: 'https://aladin.co.kr/1',
            coverUrl: '',
            author: '',
            totalPages: 200,
          },
        },
        {
          id: 'b2',
          title: 'B',
          startPage: 10,
          targetPage: 50,
          aladin: {
            itemId: 2,
            link: 'https://aladin.co.kr/2',
            coverUrl: '',
            author: '',
            totalPages: 100,
          },
        },
      ],
    });
    const p = deriveReadingProgress(cfg);
    expect(p.pagesRead).toBe(139);
    expect(p.progressPct).toBe(50);
  });

  it('generates unique book IDs', () => {
    const id1 = makeReadingBookId();
    const id2 = makeReadingBookId();
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('rb-')).toBe(true);
  });

  it('returns first aladin book entry', () => {
    const cfg = normalizeReadingLiveActivityConfig({
      books: [
        { id: 'b1', title: '텍스트만', startPage: 1, targetPage: 100 },
        {
          id: 'b2',
          title: '알라딘',
          startPage: 1,
          targetPage: 144,
          aladin: {
            itemId: 456,
            link: 'https://aladin.co.kr/456',
            coverUrl: '',
            author: '',
          },
        },
      ],
    });
    expect(firstAladinBookEntry(cfg)?.itemId).toBe(456);
  });

  it('returns null when no aladin books', () => {
    const cfg = normalizeReadingLiveActivityConfig({
      books: [{ id: 'b1', title: '텍스트만', startPage: 1, targetPage: 100 }],
    });
    expect(firstAladinBookEntry(cfg)).toBeNull();
  });

  it('defaults book status to reading and preserves valid values', () => {
    const cfg = normalizeReadingLiveActivityConfig({
      books: [{ id: 'b1', title: '책', startPage: 1, targetPage: 50, status: 'done' }],
    });
    expect(cfg.books[0].status).toBe('done');

    const legacy = normalizeReadingLiveActivityConfig({
      books: [{ id: 'b2', title: '레거시', startPage: 1, targetPage: 80 }],
    });
    expect(legacy.books[0].status).toBe('reading');
  });

  it('sorts books by newest registration first', () => {
    const sorted = sortReadingBooksByNewestFirst([
      { id: 'rb-100-aaaa', title: '오래된 책', startPage: 1, targetPage: 100, addedAtMs: 100 },
      { id: 'rb-300-bbbb', title: '최신 책', startPage: 1, targetPage: 100, addedAtMs: 300 },
      { id: 'rb-200-cccc', title: '중간 책', startPage: 1, targetPage: 100, addedAtMs: 200 },
    ]);
    expect(sorted.map((book) => book.title)).toEqual(['최신 책', '중간 책', '오래된 책']);
  });

  it('sorts books by oldest registration first', () => {
    const sorted = sortReadingBooksByAddedAt(
      [
        { id: 'rb-100-aaaa', title: '오래된 책', startPage: 1, targetPage: 100, addedAtMs: 100 },
        { id: 'rb-300-bbbb', title: '최신 책', startPage: 1, targetPage: 100, addedAtMs: 300 },
        { id: 'rb-200-cccc', title: '중간 책', startPage: 1, targetPage: 100, addedAtMs: 200 },
      ],
      'oldest',
    );
    expect(sorted.map((book) => book.title)).toEqual(['오래된 책', '중간 책', '최신 책']);
  });

  it('filters library query by title and author', () => {
    const book: ReadingBookEntry = {
      id: 'b1',
      title: '어린 왕자',
      startPage: 1,
      targetPage: 100,
      aladin: {
        itemId: 1,
        link: 'https://aladin.co.kr/1',
        coverUrl: '',
        author: '생텍쥐페리',
        totalPages: 120,
      },
    };
    expect(bookMatchesReadingLibraryQuery(book, '왕자')).toBe(true);
    expect(bookMatchesReadingLibraryQuery(book, '생텍')).toBe(true);
    expect(bookMatchesReadingLibraryQuery(book, '없는책')).toBe(false);
  });

  it('infers addedAtMs from reading book id when missing', () => {
    const ts = Date.now();
    const id = `rb-${ts.toString(36)}-abcd`;
    const cfg = normalizeReadingLiveActivityConfig({
      books: [{ id, title: '테스트', startPage: 1, targetPage: 50 }],
    });
    expect(cfg.books[0]?.addedAtMs).toBe(ts);
  });
});
