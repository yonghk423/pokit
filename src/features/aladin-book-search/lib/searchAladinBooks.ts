import { ALADIN_OPEN_API_BASE, getAladinTtbKey } from '@shared/config/aladin';

import {
  AladinApiError,
  type AladinBookDetail,
  type AladinSearchBookItem,
  type AladinSearchResult,
} from './aladinApiTypes';
import { parseAladinResponse, stripAladinHtml } from './parseAladinResponse';

type AladinItemSearchResponse = {
  totalResults?: number;
  item?: AladinRawItem | AladinRawItem[];
  errorCode?: number;
  errorMessage?: string;
};

type AladinItemLookUpResponse = {
  item?: AladinRawItem | AladinRawItem[];
  errorCode?: number;
  errorMessage?: string;
};

type AladinRawItem = {
  itemId?: number;
  title?: string;
  author?: string;
  publisher?: string;
  cover?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  subInfo?: {
    itemPage?: number;
  };
};

const LOOKUP_RETRY_COUNT = 3;
const LOOKUP_RETRY_DELAY_MS = 120;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toItemArray(item: AladinRawItem | AladinRawItem[] | undefined): AladinRawItem[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function mapSearchItem(raw: AladinRawItem): AladinSearchBookItem | null {
  const itemId =
    typeof raw.itemId === 'number' && Number.isFinite(raw.itemId) && raw.itemId > 0
      ? Math.round(raw.itemId)
      : null;
  const title = stripAladinHtml(raw.title);
  const link = typeof raw.link === 'string' ? raw.link.trim() : '';
  if (itemId == null || title.length === 0 || link.length === 0) return null;

  return {
    itemId,
    title,
    author: stripAladinHtml(raw.author),
    publisher: stripAladinHtml(raw.publisher),
    coverUrl: typeof raw.cover === 'string' ? raw.cover.trim() : '',
    link,
    pubDate: typeof raw.pubDate === 'string' ? raw.pubDate.trim() : '',
  };
}

function mapSearchResponse(data: AladinItemSearchResponse): AladinSearchResult {
  const items = toItemArray(data.item)
    .map(mapSearchItem)
    .filter((item): item is AladinSearchBookItem => item != null);

  return {
    totalResults:
      typeof data.totalResults === 'number' && Number.isFinite(data.totalResults)
        ? Math.max(0, Math.round(data.totalResults))
        : items.length,
    items,
  };
}

function mapBookDetail(raw: AladinRawItem): AladinBookDetail | null {
  const base = mapSearchItem(raw);
  if (!base) return null;

  const totalPages =
    typeof raw.subInfo?.itemPage === 'number' &&
    Number.isFinite(raw.subInfo.itemPage) &&
    raw.subInfo.itemPage > 0
      ? Math.round(raw.subInfo.itemPage)
      : undefined;

  return {
    ...base,
    totalPages,
    description: stripAladinHtml(raw.description),
  };
}

function assertAladinSuccess<T extends { errorCode?: number; errorMessage?: string }>(
  data: T,
): T {
  if (typeof data.errorCode === 'number' && data.errorCode !== 0) {
    throw new AladinApiError(
      'INVALID_RESPONSE',
      data.errorMessage?.trim() || '도서 정보를 불러오지 못했어요.',
    );
  }
  return data;
}

async function fetchAladinApi<T extends { errorCode?: number; errorMessage?: string }>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const ttbKey = getAladinTtbKey();
  if (!ttbKey) {
    throw new AladinApiError('MISSING_KEY', '알라딘 API 키가 설정되지 않았어요.');
  }

  const searchParams = new URLSearchParams({
    ...params,
    ttbkey: ttbKey,
    output: 'js',
    Version: '20131101',
  });

  const url = `${ALADIN_OPEN_API_BASE}/${path}?${searchParams.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new AladinApiError('NETWORK', '도서 정보를 불러오지 못했어요.');
  }

  try {
    const data = await parseAladinResponse<T>(response);
    return assertAladinSuccess(data);
  } catch (error) {
    if (error instanceof AladinApiError) throw error;
    throw new AladinApiError('INVALID_RESPONSE', '도서 정보 형식을 해석하지 못했어요.');
  }
}

export function toAladinBookDetailFromSearchItem(item: AladinSearchBookItem): AladinBookDetail {
  return {
    ...item,
    description: '',
  };
}

export async function searchAladinBooks(
  query: string,
  options?: { maxResults?: number; start?: number },
): Promise<AladinSearchResult> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { totalResults: 0, items: [] };
  }

  const data = await fetchAladinApi<AladinItemSearchResponse>('ItemSearch.aspx', {
    Query: trimmed,
    QueryType: 'Keyword',
    MaxResults: String(options?.maxResults ?? 10),
    start: String(options?.start ?? 1),
    SearchTarget: 'Book',
  });

  return mapSearchResponse(data);
}

export async function lookupAladinBook(itemId: number): Promise<AladinBookDetail | null> {
  if (!Number.isFinite(itemId) || itemId <= 0) return null;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < LOOKUP_RETRY_COUNT; attempt += 1) {
    try {
      const data = await fetchAladinApi<AladinItemLookUpResponse>('ItemLookUp.aspx', {
        ItemId: String(Math.round(itemId)),
        itemIdType: 'ItemId',
      });

      const raw = toItemArray(data.item)[0];
      return raw ? mapBookDetail(raw) : null;
    } catch (error) {
      lastError = error;
      const shouldRetry =
        error instanceof AladinApiError &&
        error.code === 'INVALID_RESPONSE' &&
        attempt < LOOKUP_RETRY_COUNT - 1;

      if (!shouldRetry) break;
      await sleep(LOOKUP_RETRY_DELAY_MS);
    }
  }

  if (lastError instanceof AladinApiError) throw lastError;
  return null;
}

/** 검색 결과를 우선 사용하고, 가능하면 ItemLookUp으로 페이지 수 등을 보강합니다. */
export async function resolveAladinBookDetail(
  item: AladinSearchBookItem,
): Promise<AladinBookDetail> {
  try {
    const detail = await lookupAladinBook(item.itemId);
    if (detail) return detail;
  } catch {
    // ItemLookUp은 간헐적으로 실패할 수 있어 검색 결과로 폴백합니다.
  }

  return toAladinBookDetailFromSearchItem(item);
}
