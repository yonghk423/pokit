import { normalizeReadingAladinBook, type ReadingAladinBook } from './readingAladinBook';
import { normalizeRoutineDisplayName } from './routineDisplayName';
import { normalizeRoutineSummary } from './routineSummary';

export type { ReadingAladinBook };

export type ReadingMetricKey = 'pages_read' | 'pages_left' | 'focus_level';

/** 서재 탭 필터 — want: 읽고 싶은, reading: 읽는 중, done: 완료 */
export type ReadingBookStatus = 'want' | 'reading' | 'done';

const READING_BOOK_STATUS_SET = new Set<ReadingBookStatus>(['want', 'reading', 'done']);

/** 읽을 도서 1권 — 알라딘 검색 또는 직접 입력 */
export type ReadingBookEntry = {
  id: string;
  title: string;
  startPage: number;
  targetPage: number;
  status?: ReadingBookStatus;
  aladin?: ReadingAladinBook | null;
};

export function normalizeReadingBookStatus(input: unknown): ReadingBookStatus {
  if (typeof input === 'string' && READING_BOOK_STATUS_SET.has(input as ReadingBookStatus)) {
    return input as ReadingBookStatus;
  }
  return 'reading';
}

export type ReadingLiveActivityConfig = {
  displayName: string;
  /** @deprecated books[] 우선. 하위 호환용으로 유지 */
  bookTitle: string;
  /** @deprecated books[] 우선. 하위 호환용으로 유지 */
  aladinBook?: ReadingAladinBook | null;
  books: ReadingBookEntry[];
  /** @deprecated books[0]과 동기화. 하위 호환용 */
  startPage: number;
  /** @deprecated books[0]과 동기화. 하위 호환용 */
  targetPage: number;
  selectedMetrics: ReadingMetricKey[];
  summary: string;
};

export const DEFAULT_READING_LIVE_ACTIVITY_CONFIG: ReadingLiveActivityConfig = {
  displayName: '',
  bookTitle: '',
  aladinBook: null,
  books: [],
  startPage: 1,
  targetPage: 100,
  selectedMetrics: [],
  summary: '',
};

const READING_METRIC_SET = new Set<ReadingMetricKey>([
  'pages_read',
  'pages_left',
  'focus_level',
]);

function toNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

function clampReadingBookTitle(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  const t = raw.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function defaultTargetPageForBook(
  aladin: ReadingAladinBook | null,
  fallback: number,
): number {
  if (aladin?.totalPages && aladin.totalPages > 0) return aladin.totalPages;
  return fallback;
}

export function makeReadingBookId(): string {
  return `rb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeBookEntry(
  input: unknown,
  fallbackTarget = DEFAULT_READING_LIVE_ACTIVITY_CONFIG.targetPage,
): ReadingBookEntry | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<ReadingBookEntry>;
  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : null;
  const title = clampReadingBookTitle(raw.title, 200);
  if (!id || title.length === 0) return null;
  const aladin = normalizeReadingAladinBook(raw.aladin);
  return {
    id,
    title,
    startPage: toNonNegativeInt(raw.startPage, DEFAULT_READING_LIVE_ACTIVITY_CONFIG.startPage),
    targetPage: toNonNegativeInt(
      raw.targetPage,
      defaultTargetPageForBook(aladin, fallbackTarget),
    ),
    status: normalizeReadingBookStatus(raw.status),
    aladin,
  };
}

export function ensureReadingBookPages(
  entry: ReadingBookEntry,
  fallbackTarget = DEFAULT_READING_LIVE_ACTIVITY_CONFIG.targetPage,
): ReadingBookEntry {
  const aladin = entry.aladin ?? null;
  return {
    ...entry,
    startPage: toNonNegativeInt(entry.startPage, DEFAULT_READING_LIVE_ACTIVITY_CONFIG.startPage),
    targetPage: toNonNegativeInt(
      entry.targetPage,
      defaultTargetPageForBook(aladin, fallbackTarget),
    ),
    status: normalizeReadingBookStatus(entry.status),
    aladin,
  };
}

function normalizeBookEntries(
  input: unknown,
  fallbackTarget = DEFAULT_READING_LIVE_ACTIVITY_CONFIG.targetPage,
): ReadingBookEntry[] {
  if (!Array.isArray(input)) return [];
  const result: ReadingBookEntry[] = [];
  for (const item of input) {
    const entry = normalizeBookEntry(item, fallbackTarget);
    if (entry) result.push(entry);
  }
  return result;
}

/** 하위 호환: books[]가 비어 있으면 bookTitle/aladinBook에서 마이그레이션 */
function migrateBookEntries(
  books: ReadingBookEntry[],
  bookTitle: string,
  aladinBook: ReadingAladinBook | null,
  startPage: number,
  targetPage: number,
): ReadingBookEntry[] {
  if (books.length > 0) {
    return books.map((book) => ensureReadingBookPages(book, targetPage));
  }
  if (bookTitle.length === 0 && !aladinBook) return [];
  return [
    {
      id: makeReadingBookId(),
      title: bookTitle || (aladinBook ? '도서' : ''),
      startPage,
      targetPage: defaultTargetPageForBook(aladinBook, targetPage),
      status: 'reading',
      aladin: aladinBook,
    },
  ];
}

/** 세션·미리보기에 쓸 도서 제목 */
export function readingDisplayTitle(
  flowTitle: string,
  config: ReadingLiveActivityConfig,
): string {
  if (config.books.length > 0) {
    const titles = config.books.map((b) => b.title).filter(Boolean);
    if (titles.length > 0) return titles.join(', ');
  }
  const book = clampReadingBookTitle(config.bookTitle, 200);
  if (book.length > 0) return book;
  const flow = typeof flowTitle === 'string' ? flowTitle.trim() : '';
  return flow.length > 0 ? flow : '제목 없음';
}

/** 첫 번째 알라딘 연결 도서를 반환합니다 */
export function firstAladinBookEntry(
  config: ReadingLiveActivityConfig,
): ReadingAladinBook | null {
  for (const entry of config.books) {
    if (entry.aladin) return entry.aladin;
  }
  return config.aladinBook ?? null;
}

export function deriveReadingBookProgress(entry: Pick<ReadingBookEntry, 'startPage' | 'targetPage'>): {
  pagesRead: number;
  pagesLeft: number;
  progressPct: number;
} {
  const pagesRead = Math.max(0, entry.targetPage - entry.startPage);
  const pagesLeft = Math.max(0, entry.startPage);
  const progressPct =
    entry.targetPage === 0
      ? 0
      : Math.max(
          0,
          Math.min(100, Math.round((pagesRead / entry.targetPage) * 100)),
        );

  return { pagesRead, pagesLeft, progressPct };
}

export function getInitialReadingLiveActivityConfig(): ReadingLiveActivityConfig {
  return {
    displayName: '',
    bookTitle: '',
    aladinBook: null,
    books: [],
    startPage: DEFAULT_READING_LIVE_ACTIVITY_CONFIG.startPage,
    targetPage: DEFAULT_READING_LIVE_ACTIVITY_CONFIG.targetPage,
    selectedMetrics: [...DEFAULT_READING_LIVE_ACTIVITY_CONFIG.selectedMetrics],
    summary: '',
  };
}

export function normalizeReadingMetricSelection(input: unknown): ReadingMetricKey[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const unique: ReadingMetricKey[] = [];
  for (const value of input) {
    if (typeof value !== 'string') continue;
    if (!READING_METRIC_SET.has(value as ReadingMetricKey)) continue;
    const key = value as ReadingMetricKey;
    if (!unique.includes(key)) unique.push(key);
    if (unique.length >= 3) break;
  }

  return unique;
}

export function normalizeReadingLiveActivityConfig(input: unknown): ReadingLiveActivityConfig {
  const raw =
    input && typeof input === 'object'
      ? (input as Partial<ReadingLiveActivityConfig>)
      : {};

  const bookTitle = clampReadingBookTitle(raw.bookTitle, 120);
  const aladinBook = normalizeReadingAladinBook(raw.aladinBook);
  const legacyStartPage = toNonNegativeInt(
    raw.startPage,
    DEFAULT_READING_LIVE_ACTIVITY_CONFIG.startPage,
  );
  const legacyTargetPage = toNonNegativeInt(
    raw.targetPage,
    DEFAULT_READING_LIVE_ACTIVITY_CONFIG.targetPage,
  );

  const booksRaw = normalizeBookEntries(raw.books, legacyTargetPage);
  const books = migrateBookEntries(
    booksRaw,
    bookTitle,
    aladinBook,
    legacyStartPage,
    legacyTargetPage,
  );

  const firstBook = books[0];
  const startPage = firstBook?.startPage ?? legacyStartPage;
  const targetPage = firstBook?.targetPage ?? legacyTargetPage;

  return {
    displayName: normalizeRoutineDisplayName(raw.displayName),
    bookTitle: firstBook?.title ?? bookTitle,
    aladinBook: firstBook?.aladin ?? aladinBook,
    books,
    startPage,
    targetPage,
    selectedMetrics: normalizeReadingMetricSelection(raw.selectedMetrics),
    summary: normalizeRoutineSummary(raw.summary),
  };
}

export function deriveReadingProgress(config: ReadingLiveActivityConfig): {
  pagesRead: number;
  pagesLeft: number;
  progressPct: number;
} {
  if (config.books.length > 0) {
    const totals = config.books.map(deriveReadingBookProgress);
    const pagesRead = totals.reduce((sum, item) => sum + item.pagesRead, 0);
    const pagesLeft = totals.reduce((sum, item) => sum + item.pagesLeft, 0);
    const totalTarget = config.books.reduce((sum, book) => sum + book.targetPage, 0);
    const progressPct =
      totalTarget === 0
        ? 0
        : Math.max(0, Math.min(100, Math.round((pagesRead / totalTarget) * 100)));

    return { pagesRead, pagesLeft, progressPct };
  }

  return deriveReadingBookProgress(config);
}
