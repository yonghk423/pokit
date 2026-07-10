import { searchOpenLibraryBooks } from './searchOpenLibraryBooks';

describe('searchOpenLibraryBooks', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns empty for blank query', async () => {
    const result = await searchOpenLibraryBooks('   ');
    expect(result).toEqual({ totalResults: 0, items: [] });
  });

  it('maps search docs to book items', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        numFound: 1,
        docs: [
          {
            key: '/works/OL82563W',
            title: 'Harry Potter and the Sorcerer\'s Stone',
            author_name: ['J. K. Rowling'],
            cover_i: 8739161,
            edition_key: ['OL7353617M'],
            number_of_pages_median: 309,
            first_publish_year: 1998,
          },
        ],
      }),
    }) as typeof fetch;

    const result = await searchOpenLibraryBooks('Harry Potter');
    expect(result.totalResults).toBe(1);
    expect(result.items[0]).toMatchObject({
      workKey: '/works/OL82563W',
      editionKey: '/books/OL7353617M',
      title: 'Harry Potter and the Sorcerer\'s Stone',
      author: 'J. K. Rowling',
      coverUrl: 'https://covers.openlibrary.org/b/id/8739161-M.jpg',
      link: 'https://openlibrary.org/books/OL7353617M',
      publishYear: '1998',
    });
  });
});
