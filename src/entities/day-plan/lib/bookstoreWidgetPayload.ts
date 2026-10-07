import { formatDateKeyDisplay, t } from '@shared/lib/i18n';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { getLocalDateKey } from './localDateKey';
import {
  deriveReadingBookProgress,
  normalizeReadingBookStatus,
  normalizeReadingLiveActivityConfig,
  sortReadingBooksByNewestFirst,
  type ReadingBookEntry,
  type ReadingBookStatus,
} from './readingLiveActivityConfig';
import { resolveReadingBookAuthor, resolveReadingBookTotalPages } from './readingBookCatalog';
import { normalizeReadingPageLogs, sortedReadingPageLogKeys } from './readingPageLog';
import { resolveWidgetPostItAppearance } from './widgetPostItAppearance';

export type BookstoreWidgetBook = {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  targetPage: number;
  totalPages: number | null;
  progressRatio: number;
  progressLabel: string;
  memo: string;
  status: ReadingBookStatus;
  statusLabel: string;
  pagesLine: string;
  remainingLabel: string;
  percentLabel: string;
  lastReadLabel: string;
  todayGoalLabel: string;
};

export type BookstoreWidgetBundlePayload = {
  version: 1;
  fallbackBookId: string | null;
  books: BookstoreWidgetBook[];
  faceHex: string;
  inkHex: string;
  mutedHex: string;
  underlineText: boolean;
  emptyMessage: string;
};

function statusLabelFor(status: ReadingBookStatus): string {
  if (status === 'want') return t('goalDetail.reading.status.want');
  if (status === 'done') return t('goalDetail.reading.status.done');
  return t('goalDetail.reading.status.reading');
}

export function toBookstoreWidgetBook(book: ReadingBookEntry): BookstoreWidgetBook {
  const totalPages = resolveReadingBookTotalPages(book);
  const pages = deriveReadingBookProgress({
    ...book,
    totalPages,
  });
  const currentPage = Number.isFinite(pages.currentPage) ? Math.max(0, pages.currentPage) : 0;
  const targetPage = Number.isFinite(book.targetPage) && book.targetPage > 0 ? book.targetPage : 1;
  const progressRatio =
    totalPages != null && totalPages > 0
      ? Math.min(1, Math.max(0, currentPage / totalPages))
      : 0;
  // 진행 바와 동일하게 「현재 읽은 위치 / 전체 쪽」. targetPage는 오늘 목표라 분모로 쓰면 48/48처럼 보임.
  const progressLabel =
    totalPages != null && totalPages > 0
      ? t('widgetSettings.bookstore.progressWithTotal', {
          current: currentPage,
          total: totalPages,
        })
      : t('widgetSettings.bookstore.progress', {
          current: currentPage,
          target: Math.max(currentPage, targetPage),
        });
  const status = normalizeReadingBookStatus(book.status);
  const pagesLine =
    totalPages != null && totalPages > 0
      ? t('widgetSettings.bookstore.pagesLine', { current: currentPage, total: totalPages })
      : t('widgetSettings.bookstore.pagesOnly', { current: currentPage });
  const remaining =
    totalPages != null && totalPages > 0 ? Math.max(0, totalPages - currentPage) : null;
  const remainingLabel =
    remaining == null || remaining <= 0 || status === 'done'
      ? ''
      : t('widgetSettings.bookstore.remaining', { pages: remaining });
  const percentLabel =
    totalPages != null && totalPages > 0
      ? t('widgetSettings.bookstore.percent', { pct: pages.progressPct })
      : '';
  const logs = normalizeReadingPageLogs(book.pageLogs);
  const logKeys = sortedReadingPageLogKeys(logs);
  const lastKey = logKeys.length > 0 ? logKeys[logKeys.length - 1]! : null;
  const lastReadLabel =
    lastKey != null
      ? t('widgetSettings.bookstore.lastRead', { date: formatDateKeyDisplay(lastKey) })
      : '';
  const todayLog = logs[getLocalDateKey()] ?? null;
  const todayGoalLabel =
    todayLog != null
      ? t('widgetSettings.bookstore.todayGoal', {
          start: todayLog.startPage,
          target: todayLog.targetPage,
        })
      : '';
  return {
    id: book.id,
    title: book.title.trim() || t('widgetSettings.bookstore.untitled'),
    author: resolveReadingBookAuthor(book),
    currentPage,
    targetPage,
    totalPages,
    progressRatio: Number.isFinite(progressRatio) ? progressRatio : 0,
    progressLabel,
    memo: typeof book.memo === 'string' ? book.memo.trim() : '',
    status,
    statusLabel: statusLabelFor(status),
    pagesLine,
    remainingLabel,
    percentLabel,
    lastReadLabel,
    todayGoalLabel,
  };
}

function uniquifyBookstoreWidgetTitles(books: BookstoreWidgetBook[]): BookstoreWidgetBook[] {
  const seen = new Map<string, number>();
  return books.map((book) => {
    const base = book.title.trim() || t('widgetSettings.bookstore.untitled');
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return {
      ...book,
      title: count > 1 ? `${base} · ${count}` : base,
    };
  });
}

export function toBookstoreWidgetBooks(books: ReadingBookEntry[]): BookstoreWidgetBook[] {
  const seenIds = new Set<string>();
  const unique = books.filter((book) => {
    const id = book.id.trim();
    if (!id || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
  return uniquifyBookstoreWidgetTitles(unique.map(toBookstoreWidgetBook));
}

export function buildBookstoreWidgetBundlePayload(
  readingInput?: unknown,
): BookstoreWidgetBundlePayload {
  const readingRaw =
    readingInput !== undefined ? readingInput : loadGoalDetailCategoryConfig('reading');
  const reading = normalizeReadingLiveActivityConfig(readingRaw ?? {});
  const books = toBookstoreWidgetBooks(sortReadingBooksByNewestFirst(reading.books));
  const appearance = resolveWidgetPostItAppearance(false);
  return {
    version: 1,
    fallbackBookId: books[0]?.id ?? null,
    books,
    faceHex: appearance.faceHex,
    inkHex: appearance.inkHex,
    mutedHex: appearance.mutedHex,
    underlineText: appearance.underlineText,
    emptyMessage: t('widgetSettings.bookstore.emptyMessage'),
  };
}
