import { formatReadingBookAuthorLine, resolveReadingBookAuthor, resolveReadingBookTotalPages } from './readingBookCatalog';
import { normalizeReadingAladinBook } from './readingAladinBook';

describe('readingBookCatalog', () => {
  it('strips Aladin author roles for list display', () => {
    expect(
      formatReadingBookAuthorLine('앙투안 드 생텍쥐페리 (지은이), 전성자 (옮긴이)'),
    ).toBe('앙투안 드 생텍쥐페리, 전성자');
  });

  it('resolves author and total pages from a seeded Aladin book', () => {
    const entry = {
      aladin: {
        itemId: 1,
        link: 'https://example.com',
        coverUrl: '',
        author: '앙투안 드 생텍쥐페리 (지은이), 전성자 (옮긴이)',
        totalPages: 144,
      },
    };
    expect(resolveReadingBookAuthor(entry)).toBe('앙투안 드 생텍쥐페리, 전성자');
    expect(resolveReadingBookTotalPages(entry)).toBe(144);
  });

  it('parses string itemId and itemPage when normalizing Aladin payload', () => {
    const book = normalizeReadingAladinBook({
      itemId: '251847567',
      link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=251847567',
      coverUrl: '',
      author: '작가',
      totalPages: '144',
    });
    expect(book).toEqual(
      expect.objectContaining({
        itemId: 251847567,
        totalPages: 144,
      }),
    );
  });
});
