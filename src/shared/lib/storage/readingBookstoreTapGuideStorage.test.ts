import {
  clearReadingBookstoreTapGuide,
  clearReadingBookstoreSearchGuidePending,
  clearReadingBookstoreTapGuidePending,
  loadReadingBookstoreSearchGuidePending,
  loadReadingBookstoreTapGuidePending,
  markReadingBookstoreTapGuidePending,
} from './readingBookstoreTapGuideStorage';

describe('readingBookstoreTapGuideStorage', () => {
  beforeEach(() => {
    clearReadingBookstoreTapGuide();
  });

  it('marks and clears list pending without clearing search', () => {
    expect(loadReadingBookstoreTapGuidePending()).toBe(false);
    expect(loadReadingBookstoreSearchGuidePending()).toBe(false);
    markReadingBookstoreTapGuidePending();
    expect(loadReadingBookstoreTapGuidePending()).toBe(true);
    expect(loadReadingBookstoreSearchGuidePending()).toBe(true);
    clearReadingBookstoreTapGuidePending();
    expect(loadReadingBookstoreTapGuidePending()).toBe(false);
    expect(loadReadingBookstoreSearchGuidePending()).toBe(true);
  });

  it('clears search pending independently', () => {
    markReadingBookstoreTapGuidePending();
    clearReadingBookstoreSearchGuidePending();
    expect(loadReadingBookstoreSearchGuidePending()).toBe(false);
    expect(loadReadingBookstoreTapGuidePending()).toBe(true);
  });
});
