import {
  buildOpenLibraryUserAgent,
  openLibraryCoverUrl,
  openLibraryWebUrl,
  OPEN_LIBRARY_BOOKS_API,
  OPEN_LIBRARY_SEARCH_API,
} from '@shared/config/openLibrary';

import {
  OpenLibraryApiError,
  type OpenLibraryBookDetail,
  type OpenLibrarySearchBookItem,
  type OpenLibrarySearchResult,
} from './openLibraryApiTypes';

type OpenLibrarySearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  edition_key?: string[];
  number_of_pages_median?: number;
  first_publish_year?: number;
};

type OpenLibrarySearchResponse = {
  numFound?: number;
  docs?: OpenLibrarySearchDoc[];
};

type OpenLibraryEditionResponse = {
  number_of_pages?: number;
  description?: string | { value?: string };
};

function clampText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function toPositiveInt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : undefined;
}

function normalizeEditionKey(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('/') ? trimmed : `/books/${trimmed.replace(/^\/books\//, '')}`;
}

function mapSearchDoc(raw: OpenLibrarySearchDoc): OpenLibrarySearchBookItem | null {
  const workKey = typeof raw.key === 'string' ? raw.key.trim() : '';
  const title = clampText(raw.title, 300);
  if (!workKey || title.length === 0) return null;

  const editionKey = normalizeEditionKey(raw.edition_key?.[0]);
  const coverId = toPositiveInt(raw.cover_i);
  const author = clampText(raw.author_name?.[0], 120);
  const publishYear =
    typeof raw.first_publish_year === 'number' && Number.isFinite(raw.first_publish_year)
      ? String(Math.round(raw.first_publish_year))
      : '';

  return {
    workKey,
    editionKey,
    title,
    author,
    coverUrl: coverId != null ? openLibraryCoverUrl(coverId) : '',
    link: openLibraryWebUrl(editionKey ?? workKey),
    publishYear,
  };
}

function extractDescription(raw: OpenLibraryEditionResponse['description']): string {
  if (typeof raw === 'string') return clampText(raw, 2000);
  if (raw && typeof raw === 'object' && typeof raw.value === 'string') {
    return clampText(raw.value, 2000);
  }
  return '';
}

async function fetchOpenLibraryJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': buildOpenLibraryUserAgent(),
    },
  });
  if (!response.ok) {
    throw new OpenLibraryApiError('NETWORK', '도서 정보를 불러오지 못했어요.');
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new OpenLibraryApiError('INVALID_RESPONSE', '도서 정보 형식을 해석하지 못했어요.');
  }
}

export function toOpenLibraryBookDetailFromSearchItem(
  item: OpenLibrarySearchBookItem,
  extras?: { totalPages?: number; description?: string },
): OpenLibraryBookDetail {
  return {
    ...item,
    totalPages: extras?.totalPages,
    description: extras?.description ?? '',
  };
}

export async function searchOpenLibraryBooks(
  query: string,
  options?: { limit?: number },
): Promise<OpenLibrarySearchResult> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { totalResults: 0, items: [] };
  }

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(options?.limit ?? 12),
    fields: 'key,title,author_name,cover_i,edition_key,number_of_pages_median,first_publish_year',
  });

  const data = await fetchOpenLibraryJson<OpenLibrarySearchResponse>(
    `${OPEN_LIBRARY_SEARCH_API}?${params.toString()}`,
  );

  const items = (Array.isArray(data.docs) ? data.docs : [])
    .map(mapSearchDoc)
    .filter((item): item is OpenLibrarySearchBookItem => item != null);

  return {
    totalResults:
      typeof data.numFound === 'number' && Number.isFinite(data.numFound)
        ? Math.max(0, Math.round(data.numFound))
        : items.length,
    items,
  };
}

export async function lookupOpenLibraryEdition(
  editionKey: string,
): Promise<{ totalPages?: number; description: string } | null> {
  const normalized = normalizeEditionKey(editionKey);
  if (!normalized) return null;

  try {
    const data = await fetchOpenLibraryJson<OpenLibraryEditionResponse>(
      `${OPEN_LIBRARY_BOOKS_API}${normalized}.json`,
    );
    return {
      totalPages: toPositiveInt(data.number_of_pages),
      description: extractDescription(data.description),
    };
  } catch {
    return null;
  }
}

export async function resolveOpenLibraryBookDetail(
  item: OpenLibrarySearchBookItem,
): Promise<OpenLibraryBookDetail> {
  if (item.editionKey) {
    const detail = await lookupOpenLibraryEdition(item.editionKey);
    if (detail) {
      return toOpenLibraryBookDetailFromSearchItem(item, detail);
    }
  }

  return toOpenLibraryBookDetailFromSearchItem(item);
}
