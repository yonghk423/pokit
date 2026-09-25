import { seedReadingBookstoreIfNeeded } from './seedReadingBookstore';
import {
  SEED_READING_LITTLE_PRINCE_BOOK_ID,
  getInitialReadingLiveActivityConfig,
} from './readingLiveActivityConfig';
import {
  clearReadingBookstoreTapGuide,
  loadReadingBookstoreTapGuidePending,
} from '@shared/lib/storage/readingBookstoreTapGuideStorage';
import {
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage/goalDetailSettingsStorage';
import { clearPokitLocalStorage } from '@shared/lib/storage/localStorageClient';

describe('seedReadingBookstoreIfNeeded', () => {
  beforeEach(async () => {
    await clearPokitLocalStorage();
    clearReadingBookstoreTapGuide();
  });

  it('seeds Little Prince when reading config is missing', () => {
    seedReadingBookstoreIfNeeded();
    const raw = loadGoalDetailCategoryConfig('reading') as {
      books?: { id: string; title: string; aladin?: { itemId: number } }[];
    } | null;
    expect(raw?.books?.[0]?.id).toBe(SEED_READING_LITTLE_PRINCE_BOOK_ID);
    expect(raw?.books?.[0]?.title).toBe('어린왕자 (소프트커버 에디션) - 개정판');
    expect(raw?.books?.[0]?.aladin?.itemId).toBe(251847567);
    expect(loadReadingBookstoreTapGuidePending()).toBe(true);
  });

  it('upgrades Open Library seed to Aladin edition', () => {
    saveGoalDetailCategoryConfig('reading', {
      books: [
        {
          id: SEED_READING_LITTLE_PRINCE_BOOK_ID,
          title: '어린 왕자',
          startPage: 5,
          targetPage: 25,
          openLibrary: {
            workKey: '/works/OL45804W',
            link: 'https://openlibrary.org/works/OL45804W',
            coverUrl: 'https://covers.openlibrary.org/b/id/10523338-M.jpg',
            author: '앙투안 드 생텍쥐페리',
            totalPages: 120,
          },
        },
      ],
    });
    seedReadingBookstoreIfNeeded();
    const raw = loadGoalDetailCategoryConfig('reading') as {
      books?: {
        title: string;
        startPage: number;
        targetPage: number;
        aladin?: { itemId: number; totalPages?: number };
      }[];
    } | null;
    expect(raw?.books?.[0]?.title).toBe('어린왕자 (소프트커버 에디션) - 개정판');
    expect(raw?.books?.[0]?.aladin?.itemId).toBe(251847567);
    expect(raw?.books?.[0]?.aladin?.totalPages).toBe(144);
    expect(raw?.books?.[0]?.startPage).toBe(5);
    expect(raw?.books?.[0]?.targetPage).toBe(25);
  });

  it('does not overwrite existing reading config', () => {
    saveGoalDetailCategoryConfig('reading', {
      books: [{ id: 'rb-custom', title: '데미안', startPage: 1, targetPage: 10 }],
    });
    seedReadingBookstoreIfNeeded();
    const raw = loadGoalDetailCategoryConfig('reading') as {
      books?: { id: string }[];
    } | null;
    expect(raw?.books?.[0]?.id).toBe('rb-custom');
    expect(loadReadingBookstoreTapGuidePending()).toBe(false);
  });

  it('initial config matches seed book shape', () => {
    const cfg = getInitialReadingLiveActivityConfig();
    expect(cfg.books[0]?.aladin?.author).toContain('생텍쥐페리');
    expect(cfg.books[0]?.aladin?.totalPages).toBe(144);
  });
});
