import { createClient } from 'npm:@supabase/supabase-js@2';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

type Item = {
  sortOrder?: number;
  itemId: number;
  title: string;
  author?: string;
  publisher?: string;
  isbn13?: string;
  publishDate?: string;
  cover?: string;
  pages?: number;
  contentDetail?: { bookIntroduction?: string; bookSummary?: string };
};

function isTaiwanEdition(item: Item): boolean {
  return /(?:대만도서|臺灣版|台灣版|臺版|台版)/.test(item.title) ||
    /^978(?:957|986|626)\d{7}$/.test(item.isbn13 ?? '');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  const json = (body: object, status = 200) => Response.json(body, { status, headers });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: 'unauthorized' }, 401);
  const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  const detail = body?.operation === 'detail';
  const foreign = body?.category === 'FOREIGN';
  const preferTaiwan = foreign && body?.locale === 'zh-TW';
  const monthly = body?.operation === 'monthly';
  const feeds = ['list', 'bestsellerRealtime', 'bestseller', 'bestsellerDeal', 'bestsellerSteady', 'bestsellerDaily', 'bestsellerMonthly', 'newproduct', 'newproductAttention'];
  const catalog = body?.operation === 'catalog';
  const extra = body?.operation === 'content' || body?.operation === 'author';
  const feed = body?.feed;
  if (catalog) {
    if (!feeds.includes(feed) || !/^\d{3}(?:\d{3})*$/.test(String(body.categoryId ?? ''))
      || !/^\d{4}-\d{2}-\d{2}$/.test(query)) return json({ error: 'invalid_request' }, 400);
  } else if (monthly ? !/^\d{4}-(0[1-9]|1[0-2])$/.test(query) : detail || extra ? !/^\d{1,12}$/.test(query) : body?.operation !== 'search' || !query || query.length > 200) {
    return json({ error: 'invalid_request' }, 400);
  }

  const key = Deno.env.get('YES24_API_KEY')?.trim();
  if (!key) return json({ error: 'not_configured' }, 503);

  const path = catalog ? `category/${feed}${body.export === true ? '/export' : ''}`
    : extra ? `goods/${body.operation}` : monthly ? 'category/bestsellerMonthly' : detail ? 'goods/itemDetail' : 'goods/itemList';
  const url = new URL(path, 'https://apis.yes24.com/v1/');
  if (catalog) {
    if (feed !== 'list') {
      url.searchParams.set('categoryId', body.categoryId);
      if (feed === 'bestsellerDaily' || feed === 'bestsellerMonthly') url.searchParams.set('date', query);
      if (!body.export) url.searchParams.set('pageSize', '20');
    }
  } else if (extra) {
    url.search = new URLSearchParams({ searchType: 'ItemId', query }).toString();
  } else if (monthly) {
    url.search = new URLSearchParams({ categoryId: '001', date: query + '-01', page: '1', pageSize: '20' }).toString();
  } else {
    url.search = new URLSearchParams(detail
      ? { searchType: 'ItemId', query, detail: 'Y' }
      : { query, category: foreign ? 'FOREIGN' : 'BOOK', page: '1', pageSize: preferTaiwan ? '30' : '12' }).toString();
  }

  try {
    const response = await fetch(url, {
      headers: { 'X-Api-Key': key, Accept: catalog && body.export ? '*/*' : 'application/json' },
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    if (response.status === 404 && (catalog || extra) && !body.export) return json(extra ? { text: '' } : { items: [] });
    if (!response.ok) return json({ error: 'provider_error' }, response.status === 429 ? 429 : 502);
    if (catalog && body.export) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return json({ error: 'invalid_export' }, 502);
      return new Response(bytes, { headers: { ...headers, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
    }
    const payload = await response.json();
    if (payload?.success && extra) {
      const value = payload.data?.data;
      const entries = Array.isArray(value) ? value : [value];
      return json({ text: entries.map(v => body.operation === 'content' ? v?.contents : [v?.author, v?.details].filter(Boolean).join('\n')).filter(Boolean).join('\n\n') });
    }
    if (payload?.success && catalog && feed === 'list' && Array.isArray(payload.data?.data)) {
      return json({ categories: payload.data.data.map((c: {categoryId: string; categoryFullPath: string}) => ({ id: c.categoryId, name: c.categoryFullPath })) });
    }
    if (payload?.success !== true || !Array.isArray(payload.data?.items)) {
      return json({ error: 'provider_error' }, 502);
    }
    const candidates = (payload.data.items as Item[])
      .filter(item => Number.isSafeInteger(item?.itemId) && item.itemId > 0 && typeof item.title === 'string' && item.title.trim());
    if (!monthly && preferTaiwan) candidates.sort((a, b) => Number(isTaiwanEdition(b)) - Number(isTaiwanEdition(a)));
    const items = candidates
      .slice(0, monthly || catalog ? 20 : detail ? 1 : 12)
      .map(item => ({
        rank: monthly || catalog ? item.sortOrder : undefined,
        itemId: item.itemId,
        title: item.title,
        author: item.author ?? '',
        publisher: item.publisher ?? '',
        pubDate: item.publishDate ?? '',
        coverUrl: item.cover?.startsWith('https://') ? item.cover : '',
        link: `https://www.yes24.com/product/goods/${item.itemId}`,
        totalPages: Number.isSafeInteger(item.pages) && item.pages! > 0 ? item.pages : undefined,
        description: (item.contentDetail?.bookIntroduction || item.contentDetail?.bookSummary || '').slice(0, 2000),
      }));
    return json({ items });
  } catch {
    return json({ error: 'provider_error' }, 502);
  }
});
