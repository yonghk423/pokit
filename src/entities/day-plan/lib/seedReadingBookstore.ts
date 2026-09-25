import {
  loadGoalDetailCategoryConfig,
  markReadingBookstoreTapGuidePending,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';

import {
  getInitialReadingLiveActivityConfig,
  normalizeReadingLiveActivityConfig,
  SEED_READING_LITTLE_PRINCE_ALADIN_ITEM_ID,
  SEED_READING_LITTLE_PRINCE_BOOK_ID,
  upgradeSeedLittlePrinceBookEntry,
} from './readingLiveActivityConfig';

const READING_CATEGORY_KEY = 'reading';

/**
 * 독서 설정이 한 번도 없으면 「어린 왕자」시드 + 리스트 탭 유도 플래그를 남긴다.
 * 이미 Open Library 시드만 있으면 알라딘 에디션으로 교체한다.
 */
export function seedReadingBookstoreIfNeeded(): void {
  const raw = loadGoalDetailCategoryConfig(READING_CATEGORY_KEY);
  if (raw == null) {
    saveGoalDetailCategoryConfig(READING_CATEGORY_KEY, getInitialReadingLiveActivityConfig());
    markReadingBookstoreTapGuidePending();
    return;
  }

  const cfg = normalizeReadingLiveActivityConfig(raw);
  const seed = cfg.books.find((book) => book.id === SEED_READING_LITTLE_PRINCE_BOOK_ID);
  if (!seed) return;
  if (seed.aladin?.itemId === SEED_READING_LITTLE_PRINCE_ALADIN_ITEM_ID) return;

  const books = cfg.books.map(upgradeSeedLittlePrinceBookEntry);
  const first = books[0];
  saveGoalDetailCategoryConfig(READING_CATEGORY_KEY, {
    ...cfg,
    books,
    bookTitle: first?.title ?? cfg.bookTitle,
    aladinBook: first?.aladin ?? null,
    startPage: first?.startPage ?? cfg.startPage,
    targetPage: first?.targetPage ?? cfg.targetPage,
  });
}
