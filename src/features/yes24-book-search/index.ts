import { getHeroAiAccessToken, getHeroAiAuthClient } from '@shared/lib/supabase/heroAiAuth';

export type Yes24BookDetail = {
  rank?: number;
  itemId: number;
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  coverUrl: string;
  link: string;
  totalPages?: number;
  description: string;
};

export type Yes24SearchBookItem = Yes24BookDetail;

async function requestBooks(operation: 'search' | 'detail' | 'monthly', query: string, options?: { category: 'BOOK' | 'FOREIGN'; locale?: string }) {
  const token = await getHeroAiAccessToken();
  const { data, error } = await getHeroAiAuthClient().functions.invoke<{ items: Yes24BookDetail[] }>('yes24-books', {
    headers: { Authorization: `Bearer ${token}` },
    body: { operation, query, ...options },
  });
  if (error || !data || !Array.isArray(data.items)) throw new Error('yes24_unavailable');
  return data;
}

export function searchYes24Books(query: string, options: { category: 'BOOK' | 'FOREIGN'; locale?: string }) {
  return requestBooks('search', query, options);
}

export async function resolveYes24BookDetail(item: Yes24SearchBookItem): Promise<Yes24BookDetail> {
  const { items } = await requestBooks('detail', String(item.itemId));
  return items[0] ?? item;
}

export function getMonthlyBestsellers(month: string) {
  return requestBooks('monthly', month);
}

export const catalogFeeds = [
  'bestsellerMonthly', 'bestsellerDaily', 'bestsellerRealtime', 'bestseller',
  'bestsellerDeal', 'bestsellerSteady', 'newproduct', 'newproductAttention',
] as const;
export type CatalogFeed = typeof catalogFeeds[number];
export type CatalogSelection = { feed: CatalogFeed; categoryId: string; query: string };

export async function requestYes24<T>(body: Record<string, unknown>): Promise<T> {
  const token = await getHeroAiAccessToken();
  const { data, error } = await getHeroAiAuthClient().functions.invoke<T>('yes24-books', {
    headers: { Authorization: `Bearer ${token}` }, body,
  });
  if (error || data == null) throw new Error('yes24_unavailable');
  return data;
}
