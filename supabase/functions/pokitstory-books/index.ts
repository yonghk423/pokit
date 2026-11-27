const headers = {
  'Access-Control-Allow-Origin': 'https://www.pokitstory.com',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'public, max-age=300, s-maxage=300',
  'Vary': 'Origin',
};

type Yes24Item = {
  itemId: number;
  title: string;
  author?: string;
  publisher?: string;
  publishDate?: string;
  cover?: string;
  pages?: number;
  contentDetail?: { bookIntroduction?: string; bookSummary?: string };
};

type Yes24Category = {
  categoryId: string;
  categoryFullPath: string;
};

const domesticCategory = /^001(?:\d{3}){0,5}$/;
const pageSize = 20;

Deno.serve(async request => {
  const origin = request.headers.get('Origin');
  const responseHeaders = { ...headers, ...(origin === 'https://www.pokitstory.com' ? { 'Access-Control-Allow-Origin': origin } : {}) };
  const json = (body: object, status = 200) => Response.json(body, { status, headers: responseHeaders });
  if (request.method === 'OPTIONS') return new Response(null, { headers: responseHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (origin && origin !== 'https://www.pokitstory.com') return json({ error: 'origin_not_allowed' }, 403);

  const body = await request.json().catch(() => null);
  const operation: unknown = body?.operation;
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (operation !== 'categories' && operation !== 'search') {
    return json({ error: 'invalid_request' }, 400);
  }
  if (operation === 'search' && (!query || query.length > 100)) return json({ error: 'invalid_request' }, 400);
  const page = body?.page ?? 1;
  if (!Number.isSafeInteger(page) || page < 1) return json({ error: 'invalid_request' }, 400);

  const key = Deno.env.get('POKITSTORY_YES24_API_KEY')?.trim();
  if (!key) return json({ error: 'not_configured' }, 503);

  const paths = { categories: 'category/list', search: 'goods/itemList' };
  const url = new URL(paths[operation], 'https://apis.yes24.com/v1/');
  if (operation !== 'categories') {
    url.search = new URLSearchParams({
      query,
      category: 'BOOK',
      page: String(page),
      pageSize: String(pageSize),
    }).toString();
  }

  try {
    const response = await fetch(url, {
      headers: { 'X-Api-Key': key, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    const payload = await response.json();
    if (response.status === 404 && operation === 'search' && payload?.errorCode === 'SEARCH_001') {
      return json({ items: [], hasMore: false });
    }
    if (!response.ok) return json({ error: 'provider_error' }, response.status === 429 ? 429 : 502);
    if (operation === 'categories') {
      if (payload?.success !== true || !Array.isArray(payload.data?.data)) {
        return json({ error: 'provider_error' }, 502);
      }
      const categories = (payload.data.data as Yes24Category[])
        .filter(category => typeof category?.categoryId === 'string' && domesticCategory.test(category.categoryId)
          && category.categoryId !== '001' && typeof category.categoryFullPath === 'string')
        .map(category => ({ id: category.categoryId, name: category.categoryFullPath }));
      return json({ categories });
    }
    if (payload?.success !== true || !Array.isArray(payload.data?.items)) return json({ error: 'provider_error' }, 502);
    const items = (payload.data.items as Yes24Item[])
      .filter(item => Number.isSafeInteger(item?.itemId) && item.itemId > 0 && typeof item.title === 'string' && item.title.trim())
      .slice(0, pageSize)
      .map(item => ({
        itemId: item.itemId,
        title: item.title,
        author: item.author ?? '',
        publisher: item.publisher ?? '',
        pubDate: item.publishDate ?? '',
        coverUrl: item.cover?.startsWith('https://') ? item.cover : '',
        link: `https://www.yes24.com/product/goods/${item.itemId}`,
        description: (item.contentDetail?.bookIntroduction || item.contentDetail?.bookSummary || '').slice(0, 1000),
      }));
    const { totalCount, pageSize: responsePageSize } = payload.data;
    const hasMore = Number.isSafeInteger(totalCount)
      && page * (responsePageSize > 0 ? responsePageSize : pageSize) < totalCount
      && payload.data.items.length > 0;
    return json({ items, hasMore });
  } catch {
    return json({ error: 'provider_error' }, 502);
  }
});
