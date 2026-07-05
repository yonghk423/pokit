import { getAladinTtbKey } from '@shared/config/aladin';

import {
  lookupAladinBook,
  resolveAladinBookDetail,
  searchAladinBooks,
  toAladinBookDetailFromSearchItem,
} from './searchAladinBooks';

describe('searchAladinBooks', () => {
  const originalKey = process.env.EXPO_PUBLIC_ALADIN_TTB_KEY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_ALADIN_TTB_KEY = originalKey;
    jest.restoreAllMocks();
  });

  it('returns empty results for blank query without calling fetch', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const result = await searchAladinBooks('   ');
    expect(result).toEqual({ totalResults: 0, items: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when API key is missing', async () => {
    process.env.EXPO_PUBLIC_ALADIN_TTB_KEY = '';
    await expect(searchAladinBooks('해리포터')).rejects.toMatchObject({
      code: 'MISSING_KEY',
    });
  });

  it('maps search response items', async () => {
    process.env.EXPO_PUBLIC_ALADIN_TTB_KEY = 'test-key';
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        `callback(${JSON.stringify({
          totalResults: 1,
          item: [
            {
              itemId: 123,
              title: '<b>테스트</b> 책',
              author: '홍길동',
              publisher: '출판사',
              cover: 'https://example.com/cover.jpg',
              link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=123',
              pubDate: '2024-01-01',
            },
          ],
        })});`,
      ),
    );

    const result = await searchAladinBooks('테스트');
    expect(getAladinTtbKey()).toBe('test-key');
    expect(result.totalResults).toBe(1);
    expect(result.items).toEqual([
      expect.objectContaining({
        itemId: 123,
        title: '테스트 책',
        author: '홍길동',
      }),
    ]);
  });

  it('requests ItemLookUp with ItemId and itemIdType', async () => {
    process.env.EXPO_PUBLIC_ALADIN_TTB_KEY = 'test-key';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          item: [
            {
              itemId: 456,
              title: '페이지 책',
              author: '작가',
              publisher: '출판',
              cover: 'https://example.com/cover.jpg',
              link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=456',
              pubDate: '2025-01-01',
              subInfo: { itemPage: 320 },
            },
          ],
        }),
      ),
    );

    const detail = await lookupAladinBook(456);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('ItemLookUp.aspx'),
    );
    expect(fetchMock.mock.calls[0]?.[0]).toContain('ItemId=456');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('itemIdType=ItemId');
    expect(detail).toEqual(
      expect.objectContaining({
        itemId: 456,
        title: '페이지 책',
        totalPages: 320,
      }),
    );
  });

  it('falls back to search item when lookup keeps failing', async () => {
    process.env.EXPO_PUBLIC_ALADIN_TTB_KEY = 'test-key';
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          errorCode: 8,
          errorMessage: '키에 해당하는 상품이 존재하지 않습니다.',
        }),
      ),
    );

    const searchItem = toAladinBookDetailFromSearchItem({
      itemId: 789,
      title: '폴백 책',
      author: '작가',
      publisher: '출판',
      coverUrl: 'https://example.com/cover.jpg',
      link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=789',
      pubDate: '2025-01-01',
    });

    const detail = await resolveAladinBookDetail(searchItem);
    expect(detail).toEqual(
      expect.objectContaining({
        itemId: 789,
        title: '폴백 책',
      }),
    );
  });
});
